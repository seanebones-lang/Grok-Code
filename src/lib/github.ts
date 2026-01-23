import { Octokit } from '@octokit/rest'
import type { FileNode, GitHubCommit, GitHubRepository } from '@/types'
import { getCircuitBreaker } from './circuit-breaker'

/**
 * GitHub API Client
 * Type-safe wrapper for GitHub's REST API via Octokit
 */

// ============================================================================
// Types
// ============================================================================

export interface GitHubFile {
  path: string
  content: string
  mode?: '100644' | '100755' | '040000' | '160000' | '120000'
}

export interface GitHubPushOptions {
  owner: string
  repo: string
  branch?: string
  files: GitHubFile[]
  message?: string
}

export interface GitHubPushResult {
  sha: string
  url: string
  message: string
}

export interface GitHubFileInfo {
  name: string
  type: 'file' | 'dir' | 'symlink' | 'submodule'
  path: string
  sha: string
  size?: number
  url?: string
}

export interface GitHubBranch {
  name: string
  sha: string
  protected: boolean
}

// ============================================================================
// Error Classes
// ============================================================================

export class GitHubAPIError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string
  ) {
    super(message)
    this.name = 'GitHubAPIError'
  }
  
  get isNotFound(): boolean {
    return this.status === 404
  }
  
  get isUnauthorized(): boolean {
    return this.status === 401
  }
  
  get isForbidden(): boolean {
    return this.status === 403
  }
  
  get isRateLimited(): boolean {
    return this.status === 403 && this.message.includes('rate limit')
  }
}

// ============================================================================
// Retry Logic
// ============================================================================

interface RetryOptions {
  maxRetries?: number
  initialDelayMs?: number
  maxDelayMs?: number
}

/**
 * Execute a function with exponential backoff retry logic
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
  } = options

  let lastError: unknown
  let attempt = 0

  while (attempt < maxRetries) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error
      attempt++

      // Check if error is retryable
      const isRetryable = 
        error.status >= 500 || // Server errors
        error.status === 429 || // Rate limit
        error.status === 408 || // Request timeout
        error.message?.includes('network') ||
        error.message?.includes('timeout') ||
        error.message?.includes('ECONNRESET') ||
        error.message?.includes('ETIMEDOUT')

      // Don't retry non-retryable errors or on last attempt
      if (!isRetryable || attempt >= maxRetries) {
        throw error
      }

      // Calculate exponential backoff delay
      const backoffDelay = Math.min(
        initialDelayMs * Math.pow(2, attempt - 1),
        maxDelayMs
      )

      // Check for Retry-After header (rate limiting)
      const retryAfter = error.response?.headers?.['retry-after']
      const delay = retryAfter 
        ? parseInt(retryAfter, 10) * 1000 
        : backoffDelay

      console.log(`GitHub API retry attempt ${attempt}/${maxRetries} after ${delay}ms`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

// ============================================================================
// Helper Functions
// ============================================================================

function createOctokit(token: string): Octokit {
  return new Octokit({
    auth: token,
    userAgent: 'NextEleven-Code/1.0',
    timeoutMs: 30000,
  })
}

// GitHub API circuit breaker
const githubCircuitBreaker = getCircuitBreaker('github-api', {
  failureThreshold: 5,
  timeout: 60000, // 1 minute before attempting half-open
  resetTimeout: 300000, // 5 minutes before resetting failure count
})

function handleGitHubError(error: unknown): never {
  if (error instanceof GitHubAPIError) {
    throw error
  }
  
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const e = error as { status: number; message?: string }
    throw new GitHubAPIError(
      e.message || `GitHub API error: ${e.status}`,
      e.status
    )
  }
  
  throw new GitHubAPIError(
    error instanceof Error ? error.message : 'Unknown GitHub error'
  )
}

// ============================================================================
// Repository Operations
// ============================================================================

/**
 * Get repository information
 */
export async function getRepository(
  token: string,
  owner: string,
  repo: string
): Promise<GitHubRepository> {
  try {
    const octokit = createOctokit(token)
    const { data } = await octokit.rest.repos.get({ owner, repo })
    
    return {
      owner: data.owner.login,
      name: data.name,
      fullName: data.full_name,
      defaultBranch: data.default_branch,
      private: data.private,
      url: data.html_url,
    }
  } catch (error) {
    handleGitHubError(error)
  }
}

/**
 * List branches in a repository
 */
export async function listBranches(
  token: string,
  owner: string,
  repo: string
): Promise<GitHubBranch[]> {
  try {
    const octokit = createOctokit(token)
    const { data } = await octokit.rest.repos.listBranches({
      owner,
      repo,
      per_page: 100,
    })
    
    return data.map(branch => ({
      name: branch.name,
      sha: branch.commit.sha,
      protected: branch.protected,
    }))
  } catch (error) {
    handleGitHubError(error)
  }
}

// ============================================================================
// File Operations
// ============================================================================

/**
 * Get files in a repository directory
 */
export async function getRepoFiles(
  token: string,
  owner: string,
  repo: string,
  path: string = '',
  branch?: string
): Promise<GitHubFileInfo[]> {
  try {
    const octokit = createOctokit(token)
    
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    })

    if (Array.isArray(data)) {
      return data.map((item) => ({
        name: item.name,
        type: item.type as GitHubFileInfo['type'],
        path: item.path,
        sha: item.sha,
        size: item.size,
        url: item.html_url || undefined,
      }))
    }

    // Single file
    return [{
      name: data.name,
      type: data.type as GitHubFileInfo['type'],
      path: data.path,
      sha: data.sha,
      size: data.size,
      url: data.html_url || undefined,
    }]
  } catch (error) {
    handleGitHubError(error)
  }
}

/**
 * Get file content from a GitHub repository
 * 
 * @param token - GitHub personal access token
 * @param owner - Repository owner username
 * @param repo - Repository name
 * @param path - File path relative to repository root
 * @param branch - Branch name (optional, defaults to default branch)
 * @returns Promise resolving to file content and SHA
 * @throws {GitHubAPIError} If file is not found or path is invalid
 * 
 * @example
 * ```typescript
 * const { content, sha } = await getFileContent(token, 'user', 'repo', 'src/file.ts', 'main')
 * ```
 */
export async function getFileContent(
  token: string,
  owner: string,
  repo: string,
  path: string,
  branch?: string
): Promise<{ content: string; sha: string }> {
  try {
    const octokit = createOctokit(token)
    
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    })

    if (Array.isArray(data)) {
      throw new GitHubAPIError('Path is a directory, not a file', 400)
    }

    if (data.type !== 'file' || !('content' in data)) {
      throw new GitHubAPIError('Not a file', 400)
    }

    const content = Buffer.from(data.content, 'base64').toString('utf-8')
    return { content, sha: data.sha }
  } catch (error) {
    handleGitHubError(error)
  }
}

/**
 * Build a file tree from repository contents
 * 
 * @param token - GitHub personal access token
 * @param owner - Repository owner username
 * @param repo - Repository name
 * @param branch - Branch name (optional, defaults to default branch)
 * @param maxDepth - Maximum directory depth to traverse (default: 3)
 * @returns Promise resolving to hierarchical file tree structure
 * 
 * @example
 * ```typescript
 * const tree = await buildFileTree(token, 'user', 'repo', 'main', 2)
 * // Returns: [{ name: 'src', type: 'folder', children: [...] }]
 * ```
 */
export async function buildFileTree(
  token: string,
  owner: string,
  repo: string,
  branch?: string,
  maxDepth: number = 3
): Promise<FileNode[]> {
  async function fetchDirectory(path: string, depth: number): Promise<FileNode[]> {
    if (depth > maxDepth) return []
    
    const files = await getRepoFiles(token, owner, repo, path, branch)
    
    const nodes: FileNode[] = await Promise.all(
      files.map(async (file): Promise<FileNode> => {
        if (file.type === 'dir') {
          const children = await fetchDirectory(file.path, depth + 1)
          return {
            name: file.name,
            type: 'folder',
            path: file.path,
            children,
            sha: file.sha,
          }
        }
        
        return {
          name: file.name,
          type: 'file',
          path: file.path,
          size: file.size,
          sha: file.sha,
        }
      })
    )
    
    return nodes
  }
  
  return fetchDirectory('', 0)
}

// ============================================================================
// Commit Operations
// ============================================================================

/**
 * Push files to a GitHub repository
 * 
 * @param token - GitHub personal access token
 * @param options - Push options including owner, repo, branch, files, and commit message
 * @returns Promise resolving to push result with commit SHA and URL
 * @throws {GitHubAPIError} If the push operation fails
 * 
 * @example
 * ```typescript
 * const result = await pushToGitHub(token, {
 *   owner: 'username',
 *   repo: 'my-repo',
 *   branch: 'main',
 *   files: [{ path: 'src/file.ts', content: 'code' }],
 *   message: 'Update file'
 * })
 * ```
 */
export async function pushToGitHub(
  token: string,
  options: GitHubPushOptions
): Promise<GitHubPushResult> {
  const { 
    owner, 
    repo, 
    branch = 'main', 
    files, 
    message = 'Update files via NextEleven Code' 
  } = options

  // Wrap with circuit breaker + retry
  return githubCircuitBreaker.execute(async () => {
    return withRetry(async () => {
      const octokit = createOctokit(token)

    // Get current commit SHA
    const { data: refData } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    })

    const currentSha = refData.object.sha

    // Get the tree SHA
    const { data: commitData } = await octokit.rest.git.getCommit({
      owner,
      repo,
      commit_sha: currentSha,
    })

    const baseTreeSha = commitData.tree.sha

    // Create blobs for all files
    const tree = await Promise.all(
      files.map(async (file) => {
        const { data: blobData } = await octokit.rest.git.createBlob({
          owner,
          repo,
          content: Buffer.from(file.content).toString('base64'),
          encoding: 'base64',
        })

        return {
          path: file.path,
          mode: file.mode || '100644' as const,
          type: 'blob' as const,
          sha: blobData.sha,
        }
      })
    )

    // Create a new tree
    const { data: treeData } = await octokit.rest.git.createTree({
      owner,
      repo,
      base_tree: baseTreeSha,
      tree,
    })

    // Create a new commit
    const { data: commit } = await octokit.rest.git.createCommit({
      owner,
      repo,
      message,
      tree: treeData.sha,
      parents: [currentSha],
    })

    // Update the branch reference
    await octokit.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: commit.sha,
    })

        return {
          sha: commit.sha,
          url: commit.html_url || `https://github.com/${owner}/${repo}/commit/${commit.sha}`,
          message: commit.message,
        }
      }, {
        maxRetries: 3,
        initialDelayMs: 1000,
      })
    })
  } catch (error) {
    handleGitHubError(error)
  }
}

/**
 * Get recent commits from a repository
 */
export async function getRecentCommits(
  token: string,
  owner: string,
  repo: string,
  branch?: string,
  limit: number = 10
): Promise<GitHubCommit[]> {
  try {
    const octokit = createOctokit(token)
    
    const { data } = await octokit.rest.repos.listCommits({
      owner,
      repo,
      sha: branch,
      per_page: limit,
    })
    
    return data.map(commit => ({
      sha: commit.sha,
      message: commit.commit.message,
      url: commit.html_url,
      author: commit.commit.author ? {
        name: commit.commit.author.name || 'Unknown',
        email: commit.commit.author.email || '',
        date: commit.commit.author.date || new Date().toISOString(),
      } : undefined,
    }))
  } catch (error) {
    handleGitHubError(error)
  }
}

// ============================================================================
// User Operations
// ============================================================================

/**
 * Get authenticated user's repositories
 */
export async function getUserRepos(
  token: string,
  options: { 
    sort?: 'created' | 'updated' | 'pushed' | 'full_name'
    perPage?: number 
  } = {}
): Promise<GitHubRepository[]> {
  try {
    const octokit = createOctokit(token)
    
    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
      sort: options.sort || 'updated',
      per_page: options.perPage || 30,
    })
    
    return data.map(repo => ({
      owner: repo.owner.login,
      name: repo.name,
      fullName: repo.full_name,
      defaultBranch: repo.default_branch,
      private: repo.private,
      url: repo.html_url,
    }))
  } catch (error) {
    handleGitHubError(error)
  }
}
