/**
 * GitHub API Utility
 * Secure GitHub token management and API operations
 * Last Updated: January 14, 2026
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { Octokit } from '@octokit/rest'

/**
 * Get GitHub token from secure storage
 */
export function getGitHubToken(): string | null {
  // Try multiple locations
  const tokenPaths = [
    join(process.cwd(), '.github-token'),
    join(process.cwd(), 'github-token.txt'),
    process.env.GITHUB_TOKEN,
  ]

  for (const path of tokenPaths) {
    if (!path) continue

    if (typeof path === 'string' && (path.startsWith('ghp_') || path.startsWith('github_pat_'))) {
      // Already a token
      return path
    }

    if (existsSync(path)) {
      try {
        const token = readFileSync(path, 'utf8').trim()
        if (token.startsWith('ghp_') || token.startsWith('github_pat_')) {
          return token
        }
      } catch (error) {
        console.warn(`[GitHub API] Failed to read token from ${path}:`, error)
      }
    }
  }

  return null
}

/**
 * GitHub API client using stored token
 */
export class GitHubAPIClient {
  private token: string
  private octokit: Octokit

  constructor(token?: string) {
    this.token = token || getGitHubToken() || ''
    if (!this.token) {
      throw new Error('GitHub token not found. Set GITHUB_TOKEN env var or create .github-token file.')
    }
    
    this.octokit = new Octokit({
      auth: this.token,
    })
  }

  /**
   * Get Octokit instance
   */
  getOctokit(): Octokit {
    return this.octokit
  }

  /**
   * Get repository information
   */
  async getRepo(owner: string, repo: string) {
    return this.octokit.repos.get({
      owner,
      repo,
    })
  }

  /**
   * List repositories for authenticated user
   */
  async listRepos(options?: { type?: 'all' | 'owner' | 'member'; sort?: 'created' | 'updated' | 'pushed' | 'full_name' }) {
    return this.octokit.repos.listForAuthenticatedUser(options)
  }

  /**
   * Get repository contents
   */
  async getContents(owner: string, repo: string, path: string, ref?: string) {
    return this.octokit.repos.getContent({
      owner,
      repo,
      path,
      ref,
    })
  }

  /**
   * Create or update file
   */
  async createOrUpdateFile(owner: string, repo: string, path: string, message: string, content: string, branch?: string, sha?: string) {
    return this.octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message,
      content: Buffer.from(content).toString('base64'),
      branch,
      sha, // Required for updates
    })
  }

  /**
   * Create pull request
   */
  async createPullRequest(owner: string, repo: string, title: string, head: string, base: string, body?: string) {
    return this.octokit.pulls.create({
      owner,
      repo,
      title,
      head,
      base,
      body,
    })
  }

  /**
   * Get repository tree
   */
  async getTree(owner: string, repo: string, treeSha: string, recursive = false) {
    return this.octokit.git.getTree({
      owner,
      repo,
      tree_sha: treeSha,
      recursive: recursive ? 1 : undefined,
    })
  }

  /**
   * Get authenticated user
   */
  async getUser() {
    return this.octokit.users.getAuthenticated()
  }

  /**
   * Search repositories
   */
  async searchRepos(query: string) {
    return this.octokit.search.repos({
      q: query,
    })
  }

  /**
   * Get repository branches
   */
  async listBranches(owner: string, repo: string) {
    return this.octokit.repos.listBranches({
      owner,
      repo,
    })
  }

  /**
   * Create branch
   */
  async createBranch(owner: string, repo: string, branch: string, sha: string) {
    return this.octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branch}`,
      sha,
    })
  }
}

/**
 * Quick GitHub operations helper
 */
export async function performGitHubOperation<T>(
  operation: (client: GitHubAPIClient) => Promise<T>,
  token?: string
): Promise<T> {
  const client = new GitHubAPIClient(token)
  return operation(client)
}
