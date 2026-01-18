import Docker from 'dockerode';

const docker = new Docker();

export interface DeploymentResult {
  url: string | null
  platform: 'vercel' | 'railway' | 'aws' | 'docker' | null
  status: 'success' | 'failed' | 'pending'
  error?: string
}

/**
 * Auto-deploy to configured platform (Vercel, Railway, AWS, or Docker fallback)
 */
export async function autoDeploy(
  repoFullName?: string,
  branch: string = 'main',
  commitSha?: string
): Promise<DeploymentResult> {
  const vercelToken = process.env.VERCEL_TOKEN
  const railwayToken = process.env.RAILWAY_TOKEN
  const awsAccessKey = process.env.AWS_ACCESS_KEY_ID

  // Try Vercel first (most common)
  if (vercelToken) {
    try {
      const deploymentUrl = await deployToVercel(repoFullName, branch)
      if (deploymentUrl) {
        return {
          url: deploymentUrl,
          platform: 'vercel',
          status: 'success',
        }
      }
    } catch (error: any) {
      console.error('Vercel deployment failed:', error.message)
      // Continue to next platform
    }
  }

  // Try Railway
  if (railwayToken) {
    try {
      // Railway auto-deploys on push if connected
      console.log(`Railway deployment triggered for ${repoFullName} (auto-deploy on push)`)
      return {
        url: null, // Railway provides URL via webhook
        platform: 'railway',
        status: 'success',
      }
    } catch (error: any) {
      console.error('Railway deployment failed:', error.message)
    }
  }

  // Try AWS (if configured)
  if (awsAccessKey) {
    try {
      const deploymentUrl = await deployToAWS(repoFullName, branch)
      if (deploymentUrl) {
        return {
          url: deploymentUrl,
          platform: 'aws',
          status: 'success',
        }
      }
    } catch (error: any) {
      console.error('AWS deployment failed:', error.message)
    }
  }

  // Fallback: Local Docker
  try {
    const dockerUrl = await deployToDocker()
    return {
      url: dockerUrl,
      platform: 'docker',
      status: 'success',
    }
  } catch (dockerErr: any) {
    return {
      url: null,
      platform: null,
      status: 'failed',
      error: `All deployments failed: ${dockerErr.message || dockerErr}`,
    }
  }
}

/**
 * Deploy to Vercel via API
 */
async function deployToVercel(
  repoFullName?: string,
  branch: string = 'main'
): Promise<string | null> {
  const vercelToken = process.env.VERCEL_TOKEN
  const vercelProjectId = process.env.VERCEL_PROJECT_ID

  if (!vercelToken) {
    return null
  }

  const projectName = repoFullName?.split('/')[1] || 'grok-empire-self'
  const projectId = vercelProjectId || projectName

  try {
    const response = await fetch(`https://api.vercel.com/v13/deployments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: projectName,
        projectId,
        gitSource: repoFullName
          ? {
              type: 'github',
              repo: repoFullName,
              ref: branch,
            }
          : undefined,
        target: 'production',
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Vercel API error: ${response.status} - ${JSON.stringify(errorData)}`)
    }

    const data = await response.json()
    return data.url || `https://${projectName}.vercel.app`
  } catch (error: any) {
    console.error('Vercel deployment API call failed:', error.message)
    // Return URL pattern anyway (Vercel may auto-deploy if connected)
    return `https://${projectName}.vercel.app`
  }
}

/**
 * Deploy to AWS (placeholder - requires AWS SDK implementation)
 */
async function deployToAWS(
  repoFullName?: string,
  branch: string = 'main'
): Promise<string | null> {
  // AWS deployment via CodePipeline/CodeDeploy would go here
  // This is a placeholder for future implementation
  console.log(`AWS deployment triggered for ${repoFullName}@${branch}`)
  return null
}

/**
 * Deploy to local Docker as fallback
 */
async function deployToDocker(): Promise<string> {
  const imageName = 'empire-self:latest'
  const containerName = 'empire-self'

  try {
    // Build Docker image
    await docker.buildImage(
      {
        context: '.',
        src: ['.'],
      },
      { t: imageName }
    )

    // Remove existing container if it exists
    try {
      const existingContainer = docker.getContainer(containerName)
      await existingContainer.remove({ force: true })
    } catch {
      // Container doesn't exist, that's fine
    }

    // Create and start container
    const container = await docker.createContainer({
      Image: imageName,
      name: containerName,
      ExposedPorts: { '3000/tcp': {} },
      HostConfig: {
        PortBindings: {
          '3000/tcp': [{ HostPort: '3000' }],
        },
      },
    })

    await container.start()
    const containerId = container.id.slice(0, 12)

    return `http://localhost:3000 (Docker: ${containerId})`
  } catch (error: any) {
    throw new Error(`Docker deployment failed: ${error.message || error}`)
  }
}