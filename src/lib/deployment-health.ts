/**
 * Deployment Health Checks
 * Validates that deployments are healthy after deployment
 * Auto-rollback on health check failure
 */

export interface HealthCheckOptions {
  url: string
  timeout?: number
  retries?: number
  retryDelay?: number
  expectedStatus?: number
  expectedContent?: string
}

export interface HealthCheckResult {
  healthy: boolean
  status?: number
  responseTime?: number
  error?: string
  timestamp: Date
}

/**
 * Perform health check on deployment URL
 */
export async function checkDeploymentHealth(
  options: HealthCheckOptions
): Promise<HealthCheckResult> {
  const {
    url,
    timeout = 30000,
    retries = 3,
    retryDelay = 2000,
    expectedStatus = 200,
    expectedContent,
  } = options

  const startTime = Date.now()
  let lastError: string | undefined

  // Retry logic for health checks
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      try {
        const response = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'User-Agent': 'NextEleven-HealthCheck/1.0',
          },
        })

        clearTimeout(timeoutId)
        const responseTime = Date.now() - startTime

        // Check status code
        if (response.status !== expectedStatus) {
          lastError = `Status ${response.status} (expected ${expectedStatus})`
          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, retryDelay))
            continue
          }
          return {
            healthy: false,
            status: response.status,
            responseTime,
            error: lastError,
            timestamp: new Date(),
          }
        }

        // Check content if specified
        if (expectedContent) {
          const text = await response.text()
          if (!text.includes(expectedContent)) {
            lastError = `Content check failed (expected content not found)`
            if (attempt < retries) {
              await new Promise(resolve => setTimeout(resolve, retryDelay))
              continue
            }
            return {
              healthy: false,
              status: response.status,
              responseTime,
              error: lastError,
              timestamp: new Date(),
            }
          }
        }

        // Health check passed
        return {
          healthy: true,
          status: response.status,
          responseTime,
          timestamp: new Date(),
        }
      } catch (error: any) {
        clearTimeout(timeoutId)
        if (error.name === 'AbortError') {
          lastError = `Timeout after ${timeout}ms`
        } else {
          lastError = error.message || 'Health check failed'
        }
        
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay))
          continue
        }
      }
    } catch (error: any) {
      lastError = error.message || 'Health check failed'
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay))
        continue
      }
    }
  }

  // All retries exhausted
  return {
    healthy: false,
    responseTime: Date.now() - startTime,
    error: lastError || 'Health check failed after all retries',
    timestamp: new Date(),
  }
}

/**
 * Health check with auto-rollback on failure
 */
export async function checkHealthAndRollback(
  deploymentUrl: string,
  repoOwner: string,
  repoName: string,
  githubToken: string
): Promise<{ healthy: boolean; rolledBack: boolean }> {
  const healthResult = await checkDeploymentHealth({ url: deploymentUrl })

  if (!healthResult.healthy) {
    console.error(`Health check failed for ${deploymentUrl}: ${healthResult.error}`)
    
    // Attempt automatic rollback
    try {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      const rollbackResponse = await fetch(`${baseUrl}/api/deployment/rollback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repoOwner,
          repoName,
        }),
      })

      if (rollbackResponse.ok) {
        console.log(`Auto-rolled back ${repoOwner}/${repoName} due to health check failure`)
        return { healthy: false, rolledBack: true }
      }
    } catch (error) {
      console.error('Rollback failed:', error)
    }

    return { healthy: false, rolledBack: false }
  }

  return { healthy: true, rolledBack: false }
}
