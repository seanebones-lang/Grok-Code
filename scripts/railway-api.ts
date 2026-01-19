/**
 * Railway API Utility
 * Secure Railway API token management and deployment automation
 * Last Updated: January 14, 2026
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

/**
 * Get Railway API token from secure storage
 */
export function getRailwayToken(): string | null {
  // Try multiple locations
  const tokenPaths = [
    join(process.cwd(), '.railway-token'),
    join(process.cwd(), 'railway-token.txt'),
    process.env.RAILWAY_TOKEN,
  ]

  for (const path of tokenPaths) {
    if (!path) continue

    if (typeof path === 'string' && path.length > 0 && !path.includes('/') && !path.includes('\\')) {
      // Already a token (UUID format)
      if (path.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        return path
      }
    }

    if (existsSync(path)) {
      try {
        const token = readFileSync(path, 'utf8').trim()
        if (token.length > 0) {
          return token
        }
      } catch (error) {
        console.warn(`[Railway API] Failed to read token from ${path}:`, error)
      }
    }
  }

  return null
}

/**
 * Railway API client using stored token
 */
export class RailwayAPIClient {
  private token: string
  private baseURL = 'https://backboard.railway.app'

  constructor(token?: string) {
    this.token = token || getRailwayToken() || ''
    if (!this.token) {
      throw new Error('Railway API token not found. Set RAILWAY_TOKEN env var or create .railway-token file.')
    }
  }

  /**
   * Make authenticated API request
   */
  async request<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const url = `${this.baseURL}/graphql/v2`
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query,
        variables: variables || {},
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }))
      throw new Error(`Railway API error (${response.status}): ${JSON.stringify(error)}`)
    }

    const data = await response.json()
    if (data.errors) {
      throw new Error(`Railway API GraphQL error: ${JSON.stringify(data.errors)}`)
    }

    return data.data as T
  }

  /**
   * Get project information
   */
  async getProject(projectId: string) {
    const query = `
      query GetProject($projectId: String!) {
        project(id: $projectId) {
          id
          name
          description
          createdAt
          updatedAt
        }
      }
    `
    return this.request(query, { projectId })
  }

  /**
   * List deployments
   */
  async listDeployments(projectId: string, limit = 10) {
    const query = `
      query ListDeployments($projectId: String!, $limit: Int) {
        deployments(projectId: $projectId, limit: $limit) {
          id
          status
          createdAt
          updatedAt
          url
        }
      }
    `
    return this.request(query, { projectId, limit })
  }

  /**
   * Get deployment status
   */
  async getDeployment(deploymentId: string) {
    const query = `
      query GetDeployment($deploymentId: String!) {
        deployment(id: $deploymentId) {
          id
          status
          createdAt
          updatedAt
          url
        }
      }
    `
    return this.request(query, { deploymentId })
  }

  /**
   * Get environment variables
   */
  async getEnvVars(projectId: string) {
    const query = `
      query GetEnvVars($projectId: String!) {
        project(id: $projectId) {
          environments {
            edges {
              node {
                id
                name
                variables {
                  edges {
                    node {
                      name
                      value
                    }
                  }
                }
              }
            }
          }
        }
      }
    `
    return this.request(query, { projectId })
  }

  /**
   * Set environment variable
   */
  async setEnvVar(projectId: string, environmentId: string, key: string, value: string) {
    const query = `
      mutation SetEnvVar($projectId: String!, $environmentId: String!, $key: String!, $value: String!) {
        variableUpsert(input: {
          projectId: $projectId
          environmentId: $environmentId
          name: $key
          value: $value
        }) {
          id
          name
        }
      }
    `
    return this.request(query, { projectId, environmentId, key, value })
  }

  /**
   * Trigger deployment
   */
  async triggerDeployment(projectId: string, serviceId: string) {
    const query = `
      mutation TriggerDeployment($projectId: String!, $serviceId: String!) {
        deploymentCreate(input: {
          projectId: $projectId
          serviceId: $serviceId
        }) {
          id
          status
        }
      }
    `
    return this.request(query, { projectId, serviceId })
  }
}

/**
 * Quick deployment helper
 */
export async function deployToRailway(options: {
  projectId?: string
  serviceId?: string
  token?: string
}) {
  const client = new RailwayAPIClient(options.token)
  
  // If project ID and service ID provided, trigger deployment
  if (options.projectId && options.serviceId) {
    try {
      const result = await client.triggerDeployment(options.projectId, options.serviceId)
      
      return {
        success: true,
        deployment: result,
        message: 'Deployment triggered successfully.',
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
    message: 'Use Railway CLI or git push to deploy. Token stored for future use.',
  }
}
