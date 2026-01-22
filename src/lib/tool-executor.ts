/**
 * Tool Executor
 * Handles execution of tools (read_file, write_file, etc.) for both local and GitHub repository contexts
 */

import { Octokit } from '@octokit/rest'
import { spawn } from 'child_process'
import type { ToolCall, ToolExecutionResult, ToolName, ToolCallArguments } from '@/types/tools'
import { ToolExecutionError, isRetryableError, formatError } from '@/types/errors'
import { validateToolCallArguments, isToolCall } from '@/types/tools'

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
      try {
        const response = await fetch(`${baseUrl}/api/agent/files?path=${encodeURIComponent(toolCall.arguments.path as string)}`)
        const data = await response.json()
        if (!response.ok) {
          return { success: false, output: '', error: data.error || 'Failed to read file' }
        }
        return { success: true, output: data.content || '' }
      } catch (error) {
        const errorMessage = formatError(error, 'Failed to read file')
        return { 
          success: false, 
          output: '', 
          error: errorMessage
        }
      }
    }

    case 'list_files': {
      try {
        const path = (toolCall.arguments.path as string) || '.'
        const response = await fetch(`${baseUrl}/api/agent/files?path=${encodeURIComponent(path)}`)
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
          .map((f: FileInfo) => 
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
      try {
        const response = await fetch(`${baseUrl}/api/agent/files`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: toolCall.arguments.path as string,
            content: toolCall.arguments.content as string,
          }),
        })
        const data = await response.json()
        if (!response.ok) {
          return { success: false, output: '', error: data.error || 'Failed to write file' }
        }
        return { 
          success: true, 
          output: `File written: ${toolCall.arguments.path as string}` 
        }
      } catch (error) {
        return { 
          success: false, 
          output: '', 
          error: error instanceof Error ? error.message : 'Failed to write file' 
        }
      }
    }

    case 'delete_file': {
      try {
        const response = await fetch(`${baseUrl}/api/agent/files`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: toolCall.arguments.path as string,
          }),
        })
        const data = await response.json()
        if (!response.ok) {
          return { success: false, output: '', error: data.error || 'Failed to delete file' }
        }
        return { 
          success: true, 
          output: `File deleted: ${toolCall.arguments.path as string}` 
        }
      } catch (error) {
        return { 
          success: false, 
          output: '', 
          error: error instanceof Error ? error.message : 'Failed to delete file' 
        }
      }
    }

    case 'run_command': {
      try {
        const response = await fetch(`${baseUrl}/api/agent/terminal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command: toolCall.arguments.command as string,
            cwd: toolCall.arguments.cwd as string | undefined,
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

    case 'search_code': {
      const query = toolCall.arguments.query as string
      const path = (toolCall.arguments.path as string) || '.'
      try {
        const response = await fetch(`${baseUrl}/api/agent/terminal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command: `grep -rn "${query.replace(/"/g, '\\"')}" ${path} --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.py" --include="*.json" 2>/dev/null | head -50`,
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

    const octokit = new Octokit({ auth: githubToken })
    const ref = repository.branch || 'main'
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

    switch (toolCall.name) {
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
        const path = (toolCall.arguments.path as string) || ''
        try {
          const { data } = await octokit.repos.getContent({
            owner: repository.owner,
            repo: repository.repo,
            path: path || '',
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
        const path = toolCall.arguments.path as string

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
        // Execute command directly using spawn
        const command = toolCall.arguments.command as string
        const cwd = toolCall.arguments.cwd as string | undefined

        return new Promise((resolve) => {
          // Parse command
          const parts = command.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || []
          const cmd = parts[0]
          if (!cmd) {
            resolve({ success: false, output: '', error: 'Empty command' })
            return
          }
          const args = parts.slice(1).map(arg => arg.replace(/^["']|["']$/g, ''))

          // Execute command with timeout
          const child = spawn(cmd, args, {
            cwd: cwd || process.cwd(),
            env: process.env,
            shell: false,
          })

          let stdout = ''
          let stderr = ''
          const timeout = setTimeout(() => {
            child.kill('SIGTERM')
            resolve({ 
              success: false, 
              output: stdout + (stderr ? `\nStderr:\n${stderr}` : ''), 
              error: 'Command timed out' 
            })
          }, 30000) // 30 second timeout

          child.stdout?.on('data', (data: Buffer | string) => {
            stdout += data.toString()
          })

          child.stderr?.on('data', (data: Buffer | string) => {
            stderr += data.toString()
          })

          child.on('close', (code) => {
            clearTimeout(timeout)
            resolve({
              success: code === 0,
              output: stdout + (stderr ? `\nStderr:\n${stderr}` : ''),
              error: code !== 0 ? `Command exited with code ${code}` : undefined,
            })
          })

          child.on('error', (error) => {
            clearTimeout(timeout)
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
