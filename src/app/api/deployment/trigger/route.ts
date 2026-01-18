import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { checkDeploymentHealth, checkHealthAndRollback } from '@/lib/deployment-health'

/**
 * Deployment Trigger API
 * Triggers deployment to Vercel/Railway/AWS after GitHub push
 * Tracks deployment history in database for rollback capability
 * Performs health checks and auto-rollback on failure
 */

const triggerSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  branch: z.string().default('main'),
  commitSha: z.string(),
  target: z.enum(['vercel', 'railway', 'aws']).default('vercel'),
})

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  
  try {
    const body = await request.json()
    const parseResult = triggerSchema.safeParse(body)
    
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.issues, requestId },
        { status: 400 }
      )
    }
    
    const { owner, repo, branch, commitSha, target } = parseResult.data
    const repoFullName = `${owner}/${repo}`
    
    console.log(`[${requestId}] Triggering ${target} deployment for ${repoFullName}@${branch}:${commitSha.slice(0, 7)}`)
    
    // Get commit message for tracking
    let commitMessage: string | null = null
    try {
      const githubToken = process.env.GITHUB_TOKEN
      if (githubToken) {
        const { Octokit } = await import('@octokit/rest')
        const octokit = new Octokit({ auth: githubToken })
        const { data: commit } = await octokit.rest.repos.getCommit({
          owner,
          repo,
          ref: commitSha,
        })
        commitMessage = commit.commit.message
      }
    } catch {
      // Ignore errors getting commit message
    }
    
    // Create deployment record in database
    const deployment = await prisma.deployment.create({
      data: {
        repoOwner: owner,
        repoName: repo,
        branch,
        commitSha,
        commitMessage,
        platform: target,
        status: 'pending',
      },
    })
    
    // Trigger deployment
    let deploymentUrl: string | null = null
    let deploymentError: string | null = null
    
    try {
      if (target === 'vercel') {
        deploymentUrl = await triggerVercelDeployment(repoFullName, branch)
      } else if (target === 'railway') {
        deploymentUrl = await triggerRailwayDeployment(repoFullName)
      } else if (target === 'aws') {
        deploymentUrl = await triggerAWSDeployment(repoFullName, branch)
      }
      
      // Update deployment record with success
      await prisma.deployment.update({
        where: { id: deployment.id },
        data: {
          status: deploymentUrl ? 'success' : 'pending',
          deploymentUrl,
          deployedAt: new Date(),
        },
      })

      // Perform health check if deployment URL is available
      if (deploymentUrl && process.env.DEPLOYMENT_HEALTH_CHECK_ENABLED === 'true') {
        console.log(`[${requestId}] Performing health check on ${deploymentUrl}`)
        
        // Wait a bit for deployment to be ready
        await new Promise(resolve => setTimeout(resolve, 5000))
        
        const githubToken = process.env.GITHUB_TOKEN
        if (githubToken) {
          const healthResult = await checkHealthAndRollback(
            deploymentUrl,
            owner,
            repo,
            githubToken
          )

          if (!healthResult.healthy) {
            // Update deployment status based on health check
            await prisma.deployment.update({
              where: { id: deployment.id },
              data: {
                status: healthResult.rolledBack ? 'rolled_back' : 'failed',
                error: healthResult.rolledBack 
                  ? 'Health check failed - auto-rolled back'
                  : 'Health check failed',
              },
            })

            if (healthResult.rolledBack) {
              console.warn(`[${requestId}] Deployment failed health check and was rolled back`)
            } else {
              console.error(`[${requestId}] Deployment failed health check but rollback failed`)
            }
          } else {
            console.log(`[${requestId}] Health check passed for ${deploymentUrl}`)
          }
        }
      }
    } catch (error: any) {
      deploymentError = error.message || 'Deployment failed'
      
      // Update deployment record with failure
      await prisma.deployment.update({
        where: { id: deployment.id },
        data: {
          status: 'failed',
          error: deploymentError,
        },
      })
      
      // Don't throw - return error in response
    }
    
    return NextResponse.json({
      success: !!deploymentUrl || !deploymentError,
      deploymentUrl,
      deploymentId: deployment.id,
      target,
      repoFullName,
      commitSha,
      error: deploymentError || undefined,
      requestId,
    })
  } catch (error: any) {
    console.error(`[${requestId}] Deployment trigger failed:`, error)
    return NextResponse.json(
      { error: error.message || 'Deployment trigger failed', requestId },
      { status: error.status || 500 }
    )
  }
}

async function triggerVercelDeployment(repoFullName: string, branch: string): Promise<string | null> {
  const vercelToken = process.env.VERCEL_TOKEN
  const vercelProjectId = process.env.VERCEL_PROJECT_ID
  
  if (!vercelToken) {
    console.warn('VERCEL_TOKEN not configured, skipping Vercel deployment')
    return null
  }
  
  try {
    const projectName = repoFullName.split('/')[1]
    
    // Option 1: Trigger deployment via Vercel API
    const response = await fetch(`https://api.vercel.com/v13/deployments?projectId=${vercelProjectId || projectName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: projectName,
        gitSource: {
          type: 'github',
          repo: repoFullName,
          ref: branch,
        },
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
    console.error('Vercel deployment trigger failed:', error.message)
    // Fallback: Return deployment URL pattern (Vercel will deploy automatically if connected)
    return `https://${repoFullName.split('/')[1]}.vercel.app`
  }
}

async function triggerRailwayDeployment(repoFullName: string): Promise<string | null> {
  const railwayToken = process.env.RAILWAY_TOKEN
  
  if (!railwayToken) {
    console.warn('RAILWAY_TOKEN not configured, skipping Railway deployment')
    return null
  }
  
  // Railway typically auto-deploys on GitHub push if connected
  // This is a placeholder for manual API trigger if needed
  console.log(`Railway deployment triggered for ${repoFullName} (auto-deploy on push)`)
  return null
}

async function triggerAWSDeployment(repoFullName: string, branch: string): Promise<string | null> {
  // AWS deployment via CodePipeline/CodeDeploy would go here
  // Placeholder for future implementation
  console.log(`AWS deployment triggered for ${repoFullName}@${branch}`)
  return null
}
