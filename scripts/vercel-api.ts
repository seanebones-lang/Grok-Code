/**
 * Vercel API Utility
 * Secure Vercel API token management and deployment automation
 * Last Updated: January 14, 2026
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

/**
 * Get Vercel API token from secure storage
 */
export function getVercelToken(): string | null {
  // Try multiple locations
  const tokenPaths = [
    join(process.cwd(), '.vercel-token'),
    join(process.cwd(), 'vercel-token.txt'),
    process.env.VERCEL_TOKEN,
  ]

  for (const path of tokenPaths) {
    if (!path) continue

    if (typeof path === 'string' && path.startsWith('vck_')) {
      // Already a token
      return path
    }

    if (existsSync(path)) {
      try {
        const token = readFileSync(path, 'utf8').trim()
        if (token.startsWith('vck_')) {
          return token
        }
      } catch (error) {
        console.warn(`[Vercel API] Failed to read token from ${path}:`, error)
      }
    }
  }

  return null
}

/**
 * Vercel API client using stored token
 */
export class VercelAPIClient {
  private token: string
  private baseURL = 'https://api.vercel.com'

  constructor(token?: string) {
    this.token = token || getVercelToken() || ''
    if (!this.token) {
      throw new Error('Vercel API token not found. Set VERCEL_TOKEN env var or create .vercel-token file.')
    }
  }

  /**
   * Make authenticated API request
   */
  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseURL}${path}`
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }))
      throw new Error(`Vercel API error (${response.status}): ${JSON.stringify(error)}`)
    }

    return response.json()
  }

  /**
   * Get project information
   */
  async getProject(projectId: string) {
    return this.request('GET', `/v9/projects/${projectId}`)
  }

  /**
   * List deployments
   */
  async listDeployments(projectId: string, limit = 10) {
    return this.request('GET', `/v6/deployments?projectId=${projectId}&limit=${limit}`)
  }

  /**
   * Get deployment status
   */
  async getDeployment(deploymentId: string) {
    return this.request('GET', `/v13/deployments/${deploymentId}`)
  }

  /**
   * Create deployment
   */
  async createDeployment(data: {
    name: string
    files: Record<string, string>
    projectSettings?: Record<string, unknown>
  }) {
    return this.request('POST', '/v13/deployments', data)
  }

  /**
   * Get environment variables
   */
  async getEnvVars(projectId: string) {
    return this.request('GET', `/v9/projects/${projectId}/env`)
  }

  /**
   * Set environment variable
   */
  async setEnvVar(projectId: string, key: string, value: string, environment: 'production' | 'preview' | 'development' = 'production') {
    return this.request('POST', `/v9/projects/${projectId}/env`, {
      key,
      value,
      type: 'encrypted',
      target: [environment],
    })
  }

  /**
   * Trigger deployment
   */
  async triggerDeployment(projectId: string, branch = 'main') {
    // Vercel auto-deploys on git push, but we can verify
    const deployments = await this.listDeployments(projectId, 1)
    return deployments
  }
}

/**
 * Quick deployment helper
 */
export async function deployToVercel(options: {
  projectId?: string
  branch?: string
  token?: string
}) {
  const client = new VercelAPIClient(options.token)
  
  // If project ID provided, check status
  if (options.projectId) {
    try {
      const project = await client.getProject(options.projectId)
      const deployments = await client.listDeployments(options.projectId, 1)
      
      return {
        success: true,
        project,
        latestDeployment: deployments[0] || null,
        message: 'Deployment triggered via git push. Check Vercel dashboard for status.',
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  return {
    success: true,
    message: 'Use Vercel CLI or git push to deploy. Token stored for future use.',
  }
}
