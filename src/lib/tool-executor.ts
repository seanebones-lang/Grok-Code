/**
 * Tool Executor
 * Handles execution of tools (read_file, write_file, etc.) for both local and GitHub repository contexts
 *
 * Performance: Octokit is only imported when needed (GitHub repository context)
 *
 * Enhanced features:
 * - patch_file: surgical find/replace edits without full file rewrite
 * - search_code: expanded file types, context lines, exclusions
 * - run_command: shell mode for pipes/redirects, configurable timeout
 * - Automatic retry with exponential backoff for transient failures
 */

import { spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import type { ToolCall, ToolExecutionResult } from '@/types/tools'
import { isToolCall, validateToolCallArguments } from '@/types/tools'
import { formatError } from '@/types/errors'
import { fetchWithErrorHandling } from '@/lib/utils/fetch-helpers'
import { createErrorResponse } from '@/lib/utils/error-handling'
import { resolveSafeCwd, AGENT_WORKSPACE } from '@/lib/workspace-guard'

// ============================================================================
// Retry Logic for Transient Failures
// ============================================================================

const TRANSIENT_ERROR_PATTERNS = [
  'ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND',
  'socket hang up', 'network', 'rate limit', '429', '503', '502',
]

function isTransientError(error: string): boolean {
  const lower = error.toLowerCase()
  return TRANSIENT_ERROR_PATTERNS.some(p => lower.includes(p.toLowerCase()))
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000,
): Promise<T> {
  let lastError: Error | undefined
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      if (attempt < maxRetries && isTransientError(lastError.message)) {
        const delay = baseDelay * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      throw lastError
    }
  }
  throw lastError
}

// ============================================================================
// File Cache (in-memory, per process lifetime)
// ============================================================================

const fileCache = new Map<string, { content: string; cachedAt: number }>()
const FILE_CACHE_TTL = 30_000 // 30 seconds

function getCachedFile(filePath: string): string | null {
  const entry = fileCache.get(filePath)
  if (entry && Date.now() - entry.cachedAt < FILE_CACHE_TTL) {
    return entry.content
  }
  fileCache.delete(filePath)
  return null
}

function setCachedFile(filePath: string, content: string): void {
  fileCache.set(filePath, { content, cachedAt: Date.now() })
}

function invalidateCache(filePath: string): void {
  fileCache.delete(filePath)
}

// Lazy load Octokit - only needed for GitHub operations
let Octokit: typeof import('@octokit/rest').Octokit | null = null
async function getOctokit() {
  if (!Octokit) {
    const octokitModule = await import('@octokit/rest')
    Octokit = octokitModule.Octokit
  }
  return Octokit
}

/**
 * Execute a tool locally (without GitHub repository)
 * 
 * @param toolCall - The tool call to execute
 * @returns Promise resolving to the tool execution result
 * @throws {ToolExecutionError} If tool execution fails
 */
export async function executeLocalTool(
  toolCall: ToolCall
): Promise<ToolExecutionResult> {
  // Validate tool call
  if (!isToolCall(toolCall)) {
    return {
      success: false,
      output: '',
      error: 'Invalid tool call structure',
    }
  }

  // Validate tool arguments
  const validation = validateToolCallArguments(toolCall.name, toolCall.arguments)
  if (!validation.valid) {
    return {
      success: false,
      output: '',
      error: validation.error || 'Invalid tool arguments',
    }
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

  switch (toolCall.name) {
    case 'read_file': {
      const pathArg = toolCall.arguments.path as string
      try {
        const response = await fetch(
          `${baseUrl}/api/agent/local?action=read&path=${encodeURIComponent(pathArg)}`
        )
        const data = await response.json()
        if (!response.ok) {
          return { success: false, output: '', error: data.error || 'Failed to read file' }
        }
        const content = data.file?.content ?? data.content ?? ''
        return { success: true, output: content }
      } catch (error) {
        return {
          success: false,
          output: '',
          error: error instanceof Error ? error.message : 'Failed to read file',
        }
      }
    }

    case 'list_files': {
      try {
        const pathArg = (toolCall.arguments.path as string) || '.'
        const response = await fetch(
          `${baseUrl}/api/agent/local?action=list&path=${encodeURIComponent(pathArg)}`
        )
        const data = await response.json()
        if (!response.ok) {
          return { success: false, output: '', error: data.error || 'Failed to list files' }
        }
        interface FileInfo {
          type: string
          name: string
          size?: number
        }
        const files = (data.files || []) as FileInfo[]
        const fileList = files
          .map((f: FileInfo) => {
            const isDir = f.type === 'dir' || f.type === 'directory'
            return `${isDir ? '📁' : '📄'} ${f.name}${f.size ? ` (${f.size} bytes)` : ''}`
          })
          .join('\n')
        return { success: true, output: fileList || 'Empty directory' }
      } catch (error) {
        return {
          success: false,
          output: '',
          error: error instanceof Error ? error.message : 'Failed to list files',
        }
      }
    }

    case 'write_file': {
      try {
        const response = await fetch(`${baseUrl}/api/agent/local`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: toolCall.arguments.path as string,
            content: toolCall.arguments.content as string,
            createDirs: true,
          }),
        })
        const data = await response.json()
        if (!response.ok) {
          return { success: false, output: '', error: data.error || 'Failed to write file' }
        }
        return {
          success: true,
          output: `File written: ${toolCall.arguments.path as string}`,
        }
      } catch (error) {
        return {
          success: false,
          output: '',
          error: error instanceof Error ? error.message : 'Failed to write file',
        }
      }
    }

    case 'delete_file': {
      const deletePath = (toolCall.arguments.path as string)?.trim() || ''
      if (!deletePath || deletePath === '.' || deletePath === '/' || deletePath.endsWith('/')) {
        return {
          success: false,
          output: '',
          error: 'delete_file requires a specific file path (not a directory or root)',
        }
      }
      try {
        const response = await fetch(`${baseUrl}/api/agent/local`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: deletePath,
          }),
        })
        const data = await response.json()
        if (!response.ok) {
          return { success: false, output: '', error: data.error || 'Failed to delete file' }
        }
        return {
          success: true,
          output: `File deleted: ${toolCall.arguments.path as string}`,
        }
      } catch (error) {
        return {
          success: false,
          output: '',
          error: error instanceof Error ? error.message : 'Failed to delete file',
        }
      }
    }

    case 'run_command': {
      const timeout = Math.min(
        (toolCall.arguments.timeout as number) || 30000,
        300000 // max 5 minutes
      )
      try {
        const response = await fetch(`${baseUrl}/api/agent/terminal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command: toolCall.arguments.command as string,
            cwd: toolCall.arguments.cwd as string | undefined,
            timeout,
          }),
        })
        const data = await response.json()
        if (!response.ok) {
          return { success: false, output: '', error: data.error || 'Command failed' }
        }
        return {
          success: data.exitCode === 0,
          output: data.output || data.stdout || '',
          error: data.exitCode !== 0 ? (data.stderr || 'Command failed') : undefined
        }
      } catch (error) {
        return {
          success: false,
          output: '',
          error: error instanceof Error ? error.message : 'Command failed'
        }
      }
    }

    case 'patch_file': {
      const patchPath = toolCall.arguments.path as string
      const patches = toolCall.arguments.patches as Array<{ find: string; replace: string }>
      if (!patchPath || !Array.isArray(patches) || patches.length === 0) {
        return { success: false, output: '', error: 'patch_file requires path and non-empty patches array' }
      }
      try {
        // Read current content
        const readResp = await fetch(
          `${baseUrl}/api/agent/local?action=read&path=${encodeURIComponent(patchPath)}`
        )
        const readData = await readResp.json()
        if (!readResp.ok) {
          return { success: false, output: '', error: readData.error || 'Failed to read file for patching' }
        }
        let content = readData.file?.content ?? readData.content ?? ''

        // Apply patches sequentially
        const applied: string[] = []
        for (const patch of patches) {
          if (!patch.find || typeof patch.replace !== 'string') continue
          const idx = content.indexOf(patch.find)
          if (idx === -1) {
            return { success: false, output: '', error: `Patch failed: could not find "${patch.find.substring(0, 80)}..." in ${patchPath}` }
          }
          content = content.substring(0, idx) + patch.replace + content.substring(idx + patch.find.length)
          applied.push(`"${patch.find.substring(0, 40)}..." → "${patch.replace.substring(0, 40)}..."`)
        }

        // Write patched content
        const writeResp = await fetch(`${baseUrl}/api/agent/local`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: patchPath, content, createDirs: false }),
        })
        const writeData = await writeResp.json()
        if (!writeResp.ok) {
          return { success: false, output: '', error: writeData.error || 'Failed to write patched file' }
        }
        invalidateCache(patchPath)
        return { success: true, output: `Patched ${patchPath} (${applied.length} changes):\n${applied.join('\n')}` }
      } catch (error) {
        return { success: false, output: '', error: error instanceof Error ? error.message : 'Patch failed' }
      }
    }

    case 'search_code': {
      const query = toolCall.arguments.query as string
      const searchPath = (toolCall.arguments.path as string) || '.'
      const contextLines = (toolCall.arguments.context_lines as number) || 0
      const exclude = (toolCall.arguments.exclude as string) || 'node_modules'

      // Comprehensive file extension list
      const includeFlags = [
        '*.ts', '*.tsx', '*.js', '*.jsx', '*.py', '*.json',
        '*.md', '*.yaml', '*.yml', '*.css', '*.scss', '*.less',
        '*.html', '*.sql', '*.prisma', '*.graphql', '*.gql',
        '*.env.example', '*.toml', '*.ini', '*.cfg', '*.xml',
        '*.sh', '*.bash', '*.zsh', '*.dockerfile', '*.sol',
      ].map(ext => `--include="${ext}"`).join(' ')

      const contextFlag = contextLines > 0 ? `-C ${contextLines}` : ''
      const excludeFlag = exclude ? `--exclude-dir="${exclude}"` : ''

      try {
        const response = await fetch(`${baseUrl}/api/agent/terminal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command: `grep -rn ${contextFlag} "${query.replace(/"/g, '\\"')}" ${searchPath} ${includeFlags} ${excludeFlag} 2>/dev/null | head -100`,
          }),
        })
        const data = await response.json()
        return { success: true, output: data.output || 'No results found' }
      } catch (error) {
        return {
          success: false,
          output: '',
          error: error instanceof Error ? error.message : 'Search failed'
        }
      }
    }

    case 'web_search': {
      const query = toolCall.arguments.query as string
      const maxResults = (toolCall.arguments.max_results as number) || 5
      try {
        // Use DuckDuckGo Instant Answer API (free, no API key required)
        // Fallback to a simple search API endpoint if available
        const response = await fetch(`${baseUrl}/api/agent/web-search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            max_results: maxResults,
          }),
        })
        
        if (response.ok) {
          const data = await response.json()
          return { 
            success: true, 
            output: data.results || data.output || 'No search results found' 
          }
        }
        
        // Fallback: Use DuckDuckGo HTML search (simple scraping)
        // This is a basic implementation - can be enhanced with proper search API
        const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
        const ddgResponse = await fetch(ddgUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; GrokCode/1.0)',
          },
        })
        
        if (ddgResponse.ok) {
          const html = await ddgResponse.text()
          // Simple extraction - in production, use proper HTML parsing
          const results: string[] = []
          const linkRegex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g
          let match
          let count = 0
          while ((match = linkRegex.exec(html)) !== null && count < maxResults) {
            results.push(`${count + 1}. ${match[2].trim()}\n   URL: ${match[1]}`)
            count++
          }
          
          if (results.length > 0) {
            return {
              success: true,
              output: `Search results for "${query}":\n\n${results.join('\n\n')}`,
            }
          }
        }
        
        return {
          success: false,
          output: '',
          error: 'Web search failed - no results found',
        }
      } catch (error) {
        return {
          success: false,
          output: '',
          error: error instanceof Error ? error.message : 'Web search failed',
        }
      }
    }

    case 'think': {
      const thought = (toolCall.arguments.thought as string) || ''
      return { success: true, output: thought || '(no thought content)' }
    }

    case 'complete': {
      const summary = (toolCall.arguments.summary as string) || 'Task complete'
      const filesChanged = toolCall.arguments.files_changed as string[] | undefined
      let output = `✅ Task complete.\n\n${summary}`
      if (Array.isArray(filesChanged) && filesChanged.length > 0) {
        output += `\n\nFiles changed:\n${filesChanged.map((f) => `- ${f}`).join('\n')}`
      }
      return { success: true, output }
    }

    case 'web_browse': {
      const url = toolCall.arguments.url as string
      try {
        // Use API route for server-side web browsing (handles CORS, parsing, etc.)
        const response = await fetch(`${baseUrl}/api/agent/web-browse`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        })
        
        if (response.ok) {
          const data = await response.json()
          return {
            success: true,
            output: data.content || data.output || 'No content extracted',
          }
        }
        
        // Fallback: Simple fetch (may fail due to CORS)
        const pageResponse = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; GrokCode/1.0)',
          },
        })
        
        if (pageResponse.ok) {
          const contentType = pageResponse.headers.get('content-type') || ''
          if (contentType.includes('text/html')) {
            const html = await pageResponse.text()
            // Simple text extraction - remove script and style tags
            const text = html
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 10000) // Limit to 10KB of text
            
            return {
              success: true,
              output: `Content from ${url}:\n\n${text}`,
            }
          } else {
            const text = await pageResponse.text()
            return {
              success: true,
              output: `Content from ${url}:\n\n${text.slice(0, 10000)}`,
            }
          }
        }
        
        return {
          success: false,
          output: '',
          error: `Failed to browse URL: ${pageResponse.status} ${pageResponse.statusText}`,
        }
      } catch (error) {
        return {
          success: false,
          output: '',
          error: error instanceof Error ? error.message : 'Web browse failed',
        }
      }
    }

    default:
      return { 
        success: false, 
        output: '', 
        error: `Tool '${toolCall.name}' not supported for local execution` 
      }
  }
}

/**
 * Execute a tool with GitHub repository context
 * 
 * @param toolCall - The tool call to execute
 * @param repository - Optional GitHub repository context
 * @param githubToken - Optional GitHub authentication token
 * @returns Promise resolving to the tool execution result
 */
export async function executeTool(
  toolCall: ToolCall,
  repository?: { owner: string; repo: string; branch?: string },
  githubToken?: string
): Promise<ToolExecutionResult> {
  // Validate tool call
  if (!isToolCall(toolCall)) {
    return {
      success: false,
      output: '',
      error: 'Invalid tool call structure',
    }
  }

  // Validate tool arguments
  const validation = validateToolCallArguments(toolCall.name, toolCall.arguments)
  if (!validation.valid) {
    return {
      success: false,
      output: '',
      error: validation.error || 'Invalid tool arguments',
    }
  }
  // If no repository, use local execution
  if (!repository) {
    return executeLocalTool(toolCall)
  }

  try {
    // Fall back to local execution if no GitHub token
    if (!githubToken) {
      return executeLocalTool(toolCall)
    }

    // Lazy load Octokit only when needed
    const OctokitClass = await getOctokit()
    const octokit = new OctokitClass({ auth: githubToken })
    const ref = repository.branch || 'main'
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

    switch (toolCall.name) {
      case 'think': {
        const thought = (toolCall.arguments.thought as string) || ''
        return { success: true, output: thought || '(no thought content)' }
      }

      case 'complete': {
        const summary = (toolCall.arguments.summary as string) || 'Task complete'
        const filesChanged = toolCall.arguments.files_changed as string[] | undefined
        let output = `✅ Task complete.\n\n${summary}`
        if (Array.isArray(filesChanged) && filesChanged.length > 0) {
          output += `\n\nFiles changed:\n${filesChanged.map((f) => `- ${f}`).join('\n')}`
        }
        return { success: true, output }
      }

      case 'read_file': {
        try {
          const { data } = await octokit.repos.getContent({
            owner: repository.owner,
            repo: repository.repo,
            path: toolCall.arguments.path as string,
            ref,
          })
          if (Array.isArray(data) || !('content' in data)) {
            return { success: false, output: '', error: 'Path is not a file' }
          }
          const content = Buffer.from(data.content, 'base64').toString('utf-8')
          return { success: true, output: content }
        } catch (error) {
          return { 
            success: false, 
            output: '', 
            error: error instanceof Error ? error.message : 'Failed to read file' 
          }
        }
      }

      case 'list_files': {
        const pathArg = (toolCall.arguments.path as string) || ''
        const githubPath = pathArg === '.' || pathArg === '' ? '' : pathArg
        try {
          const { data } = await octokit.repos.getContent({
            owner: repository.owner,
            repo: repository.repo,
            path: githubPath,
            ref,
          })
          const files = Array.isArray(data) ? data : [data]
          const fileList = files
            .map((f: { type: string; name: string; size?: number }) => 
              `${f.type === 'dir' ? '📁' : '📄'} ${f.name}${f.size ? ` (${f.size} bytes)` : ''}`
            )
            .join('\n')
          return { success: true, output: fileList || 'Empty directory' }
        } catch (error) {
          return { 
            success: false, 
            output: '', 
            error: error instanceof Error ? error.message : 'Failed to list files' 
          }
        }
      }

      case 'write_file': {
        const path = toolCall.arguments.path as string
        const content = toolCall.arguments.content as string

        try {
          // Get existing file SHA if it exists
          let fileSha: string | undefined
          try {
            const { data } = await octokit.repos.getContent({
              owner: repository.owner,
              repo: repository.repo,
              path,
              ref,
            })
            if (!Array.isArray(data) && 'sha' in data) {
              fileSha = data.sha
            }
          } catch {
            // File doesn't exist, that's fine
          }

          const { data } = await octokit.repos.createOrUpdateFileContents({
            owner: repository.owner,
            repo: repository.repo,
            path,
            message: `Eleven: Update ${path}`,
            content: Buffer.from(content).toString('base64'),
            branch: ref,
            ...(fileSha ? { sha: fileSha } : {}),
          })

          return { 
            success: true, 
            output: `File written: ${path}\nCommit: ${data.commit?.sha?.slice(0, 7) || 'unknown'}` 
          }
        } catch (error) {
          return { 
            success: false, 
            output: '', 
            error: error instanceof Error ? error.message : 'Failed to write file' 
          }
        }
      }

      case 'move_file': {
        const oldPath = toolCall.arguments.old_path as string
        const newPath = toolCall.arguments.new_path as string

        try {
          // Get file content
          const { data: oldFileData } = await octokit.repos.getContent({
            owner: repository.owner,
            repo: repository.repo,
            path: oldPath,
            ref,
          })

          if (Array.isArray(oldFileData) || !('content' in oldFileData)) {
            return { success: false, output: '', error: 'Old path is not a file' }
          }

          // Use the move file API
          const response = await fetch(`${baseUrl}/api/agent/files`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              owner: repository.owner,
              repo: repository.repo,
              oldPath,
              newPath,
              message: `Eleven: Move ${oldPath} to ${newPath}`,
              branch: ref,
            }),
          })

          const data = await response.json()
          if (!response.ok) {
            return { success: false, output: '', error: data.error || 'Failed to move file' }
          }

          return { 
            success: true, 
            output: `File moved: ${oldPath} → ${newPath}` 
          }
        } catch (error) {
          return { 
            success: false, 
            output: '', 
            error: error instanceof Error ? error.message : 'Failed to move file' 
          }
        }
      }

      case 'delete_file': {
        const path = ((toolCall.arguments.path as string) || '').trim()
        if (!path || path === '.' || path === '/' || path.endsWith('/')) {
          return {
            success: false,
            output: '',
            error: 'delete_file requires a specific file path (not a directory or root)',
          }
        }

        try {
          // Get file SHA
          const { data } = await octokit.repos.getContent({
            owner: repository.owner,
            repo: repository.repo,
            path,
            ref,
          })

          if (Array.isArray(data) || !('sha' in data)) {
            return { success: false, output: '', error: 'Path is not a file' }
          }

          await octokit.repos.deleteFile({
            owner: repository.owner,
            repo: repository.repo,
            path,
            message: `Eleven: Delete ${path}`,
            branch: ref,
            sha: data.sha,
          })

          return { 
            success: true, 
            output: `File deleted: ${path}` 
          }
        } catch (error) {
          return { 
            success: false, 
            output: '', 
            error: error instanceof Error ? error.message : 'Failed to delete file' 
          }
        }
      }

      case 'create_branch': {
        const branch = toolCall.arguments.branch as string
        const fromBranch = (toolCall.arguments.from_branch as string) || 'main'

        try {
          // Get SHA of base branch
          const { data: refData } = await octokit.git.getRef({
            owner: repository.owner,
            repo: repository.repo,
            ref: `heads/${fromBranch}`,
          })

          await octokit.git.createRef({
            owner: repository.owner,
            repo: repository.repo,
            ref: `refs/heads/${branch}`,
            sha: refData.object.sha,
          })

          return { 
            success: true, 
            output: `Branch created: ${branch} from ${fromBranch}` 
          }
        } catch (error) {
          return { 
            success: false, 
            output: '', 
            error: error instanceof Error ? error.message : 'Failed to create branch' 
          }
        }
      }

      case 'create_pull_request': {
        const title = toolCall.arguments.title as string
        const body = toolCall.arguments.body as string
        const head = toolCall.arguments.head as string
        const base = (toolCall.arguments.base as string) || 'main'

        try {
          const { data } = await octokit.pulls.create({
            owner: repository.owner,
            repo: repository.repo,
            title,
            body,
            head,
            base,
          })

          return { 
            success: true, 
            output: `Pull request created: #${data.number}\n${data.html_url}` 
          }
        } catch (error) {
          return { 
            success: false, 
            output: '', 
            error: error instanceof Error ? error.message : 'Failed to create pull request' 
          }
        }
      }

      case 'get_diff': {
        const base = (toolCall.arguments.base as string) || 'main'
        const head = toolCall.arguments.head as string
        const path = toolCall.arguments.path as string | undefined

        try {
          const { data } = await octokit.repos.compareCommits({
            owner: repository.owner,
            repo: repository.repo,
            base,
            head,
          })

          let diffOutput = `Diff between ${base} and ${head}:\n\n`
          for (const file of data.files || []) {
            if (path && !file.filename.includes(path)) continue
            diffOutput += `\n${file.filename}:\n${file.patch || 'No changes'}\n`
          }

          return { success: true, output: diffOutput }
        } catch (error) {
          return { 
            success: false, 
            output: '', 
            error: error instanceof Error ? error.message : 'Failed to get diff' 
          }
        }
      }

      case 'get_commit_history': {
        const branch = (toolCall.arguments.branch as string) || 'main'
        const path = toolCall.arguments.path as string | undefined
        const limit = (toolCall.arguments.limit as number) || 10

        try {
          const params = new URLSearchParams({
            owner: repository.owner,
            repo: repository.repo,
            branch,
            limit: String(limit),
            ...(path ? { path } : {}),
          })

          const response = await fetch(`${baseUrl}/api/agent/git?${params}`)
          const data = await response.json()

          if (!response.ok) {
            return { success: false, output: '', error: data.error || 'Failed to get commit history' }
          }

          const history = data.commits
            .map((c: { sha: string; message: string; author: { name: string; date: string } }) => 
              `${c.sha.slice(0, 7)} ${c.message.split('\n')[0]}\n   ${c.author.name} - ${c.author.date}`
            )
            .join('\n\n')

          return { 
            success: true, 
            output: `Recent commits:\n\n${history}` 
          }
        } catch (error) {
          return { 
            success: false, 
            output: '', 
            error: error instanceof Error ? error.message : 'Failed to get commit history' 
          }
        }
      }

      case 'run_command': {
        // Execute command in a safe cwd (never the Grok Code app directory)
        const command = toolCall.arguments.command as string
        const cwdRaw = toolCall.arguments.cwd as string | undefined
        const cwd = resolveSafeCwd(cwdRaw)
        const timeoutMs = Math.min(
          (toolCall.arguments.timeout as number) || 30000,
          300000 // max 5 minutes
        )

        // Detect if command needs shell (pipes, redirects, &&, ||, ;, $, etc.)
        const needsShell = /[|&;$`><(){}\n]/.test(command)

        return new Promise((resolve) => {
          let child
          if (needsShell) {
            // Shell mode for pipes, redirects, chaining
            child = spawn(command, [], {
              cwd,
              env: process.env,
              shell: true,
            })
          } else {
            // Direct exec (faster, more secure)
            const parts = command.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || []
            const cmd = parts[0]
            if (!cmd) {
              resolve({ success: false, output: '', error: 'Empty command' })
              return
            }
            const args = parts.slice(1).map(arg => arg.replace(/^["']|["']$/g, ''))
            child = spawn(cmd, args, {
              cwd,
              env: process.env,
              shell: false,
            })
          }

          let stdout = ''
          let stderr = ''
          const timer = setTimeout(() => {
            child.kill('SIGTERM')
            // Force kill after 5s grace period
            setTimeout(() => child.kill('SIGKILL'), 5000)
            resolve({
              success: false,
              output: stdout + (stderr ? `\nStderr:\n${stderr}` : ''),
              error: `Command timed out after ${timeoutMs / 1000}s`,
            })
          }, timeoutMs)

          child.stdout?.on('data', (data: Buffer | string) => {
            stdout += data.toString()
          })

          child.stderr?.on('data', (data: Buffer | string) => {
            stderr += data.toString()
          })

          child.on('close', (code) => {
            clearTimeout(timer)
            resolve({
              success: code === 0,
              output: stdout + (stderr ? `\nStderr:\n${stderr}` : ''),
              error: code !== 0 ? `Command exited with code ${code}` : undefined,
            })
          })

          child.on('error', (error) => {
            clearTimeout(timer)
            resolve({
              success: false,
              output: stdout + (stderr ? `\nStderr:\n${stderr}` : ''),
              error: error.message,
            })
          })
        })
      }

      case 'search_code': {
        const query = toolCall.arguments.query as string
        const language = toolCall.arguments.language as string | undefined
        const path = toolCall.arguments.path as string | undefined

        try {
          // Use GitHub Code Search API
          const searchQuery = [
            `repo:${repository.owner}/${repository.repo}`,
            query,
            ...(language ? [`language:${language}`] : []),
            ...(path ? [`path:${path}`] : []),
          ].join(' ')

          const { data } = await octokit.search.code({
            q: searchQuery,
          })

          const results = data.items
            .map((item: { path: string; html_url: string }) => 
              `${item.path}\n  ${item.html_url}`
            )
            .join('\n\n')

          return { 
            success: true, 
            output: results || 'No results found' 
          }
        } catch (error) {
          return { 
            success: false, 
            output: '', 
            error: error instanceof Error ? error.message : 'Search failed' 
          }
        }
      }

      default:
        // Fall back to local execution for unsupported tools
        return executeLocalTool(toolCall)
    }
  } catch (error) {
    return { 
      success: false, 
      output: '', 
      error: error instanceof Error ? error.message : 'Tool execution failed' 
    }
  }
}
