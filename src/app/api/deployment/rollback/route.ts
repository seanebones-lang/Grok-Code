import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { Octokit } from '@octokit/rest'

/**
 * Deployment Rollback API
 * Rolls back to previous successful deployment
 */

const rollbackSchema = z.object({
  repoOwner: z.string(),
  repoName: z.string(),
  branch: z.string().default('main'),
})

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  
  try {
    const body = await request.json()
    const parseResult = rollbackSchema.safeParse(body)
    
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.issues, requestId },
        { status: 400 }
      )
    }
    
    const { repoOwner, repoName, branch } = parseResult.data

    // Get current and previous deployments
    const deployments = await prisma.deployment.findMany({
      where: {
        repoOwner,
        repoName,
        branch,
        status: 'success',
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 2,
    })

    if (deployments.length < 2) {
      return NextResponse.json(
        { 
          error: 'No previous deployment found for rollback',
          availableDeployments: deployments.length,
          requestId,
        },
        { status: 404 }
      )
    }

    const currentDeployment = deployments[0]
    const previousDeployment = deployments[1]

    console.log(`[${requestId}] Rolling back from ${currentDeployment.commitSha.slice(0, 7)} to ${previousDeployment.commitSha.slice(0, 7)}`)

    // Revert to previous commit via GitHub
    const githubToken = process.env.GITHUB_TOKEN
    if (!githubToken) {
      return NextResponse.json(
        { error: 'GITHUB_TOKEN not configured', requestId },
        { status: 503 }
      )
    }

    const octokit = new Octokit({ auth: githubToken })

    // Create revert commit
    try {
      // Get current branch SHA
      const { data: refData } = await octokit.rest.git.getRef({
        owner: repoOwner,
        repo: repoName,
        ref: `heads/${branch}`,
      })

      const currentSha = refData.object.sha

      // Get previous commit tree
      const { data: previousCommitData } = await octokit.rest.git.getCommit({
        owner: repoOwner,
        repo: repoName,
        commit_sha: previousDeployment.commitSha,
      })

      // Create revert commit
      const { data: revertCommit } = await octokit.rest.git.createCommit({
        owner: repoOwner,
        repo: repoName,
        message: `Revert to ${previousDeployment.commitSha.slice(0, 7)}\n\nRolled back from deployment ${currentDeployment.id}`,
        tree: previousCommitData.tree.sha,
        parents: [currentSha],
      })

      // Update branch reference
      await octokit.rest.git.updateRef({
        owner: repoOwner,
        repo: repoName,
        ref: `heads/${branch}`,
        sha: revertCommit.sha,
      })

      // Mark current deployment as rolled back
      await prisma.deployment.update({
        where: { id: currentDeployment.id },
        data: {
          status: 'rolled_back',
          rolledBackAt: new Date(),
        },
      })

      // Trigger new deployment with previous commit
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      const deployResponse = await fetch(`${baseUrl}/api/deployment/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: repoOwner,
          repo: repoName,
          branch,
          commitSha: previousDeployment.commitSha,
          target: previousDeployment.platform as 'vercel' | 'railway' | 'aws',
        }),
      })

      const deployData = await deployResponse.ok 
        ? await deployResponse.json().catch(() => ({}))
        : null

      return NextResponse.json({
        success: true,
        rollback: {
          from: {
            commitSha: currentDeployment.commitSha,
            deploymentUrl: currentDeployment.deploymentUrl,
            deployedAt: currentDeployment.deployedAt,
          },
          to: {
            commitSha: previousDeployment.commitSha,
            deploymentUrl: previousDeployment.deploymentUrl,
            deployedAt: previousDeployment.deployedAt,
          },
          revertCommitSha: revertCommit.sha,
          newDeploymentUrl: deployData?.deploymentUrl || null,
        },
        requestId,
      })
    } catch (error: any) {
      console.error(`[${requestId}] Rollback failed:`, error)
      return NextResponse.json(
        { 
          error: error.message || 'Rollback failed',
          details: error.response?.data || undefined,
          requestId,
        },
        { status: error.status || 500 }
      )
    }
  } catch (error: any) {
    console.error(`[${requestId}] Rollback error:`, error)
    return NextResponse.json(
      { error: error.message || 'Rollback failed', requestId },
      { status: 500 }
    )
  }
}
