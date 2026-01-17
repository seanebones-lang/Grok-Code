import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Octokit } from '@octokit/rest'

/**
 * File System API for Agentic Operations
 * Allows Eleven to read, write, and manage files in connected GitHub repositories
 */

// ============================================================================
// Schemas
// ============================================================================

const readFileSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  path: z.string().min(1),
  branch: z.string().optional(),
})

const writeFileSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  path: z.string().min(1),
  content: z.string(),
  message: z.string().min(1),
  branch: z.string().optional(),
  sha: z.string().optional(), // Required for updates
})

const deleteFileSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  path: z.string().min(1),
  message: z.string().min(1),
  branch: z.string().optional(),
  sha: z.string(),
})

const listFilesSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  path: z.string().optional(),
  branch: z.string().optional(),
})

const batchWriteSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  files: z.array(z.object({
    path: z.string().min(1),
    content: z.string(),
  })),
  message: z.string().min(1),
  branch: z.string().optional(),
})

const moveFileSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  oldPath: z.string().min(1),
  newPath: z.string().min(1),
  message: z.string().min(1),
  branch: z.string().optional(),
})

// ============================================================================
// Helper Functions
// ============================================================================

function getOctokit() {
  const githubToken = process.env.GITHUB_TOKEN
  if (!githubToken) {
    throw new Error('GITHUB_TOKEN not configured')
  }
  return new Octokit({ auth: githubToken })
}

async function getDefaultBranch(octokit: Octokit, owner: string, repo: string): Promise<string> {
  const { data } = await octokit.repos.get({ owner, repo })
  return data.default_branch
}

// ============================================================================
// GET - Read file or list directory
// ============================================================================

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()
  
  try {
    if (!process.env.GITHUB_TOKEN) {
      return NextResponse.json(
        { error: 'Service configuration error', requestId },
        { status: 503 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'read'
    
    const octokit = getOctokit()

    if (action === 'list') {
      // List directory contents
      const params = {
        owner: searchParams.get('owner') || '',
        repo: searchParams.get('repo') || '',
        path: searchParams.get('path') || '',
        branch: searchParams.get('branch') || undefined,
      }
      
      const parsed = listFilesSchema.safeParse(params)
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid parameters', details: parsed.error.issues, requestId },
          { status: 400 }
        )
      }

      const { owner, repo, path, branch } = parsed.data
      const ref = branch || await getDefaultBranch(octokit, owner, repo)

      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path: path || '',
        ref,
      })

      // Format response
      const files = Array.isArray(data) ? data.map(item => ({
        name: item.name,
        path: item.path,
        type: item.type as 'file' | 'dir',
        size: item.size,
        sha: item.sha,
      })) : [{
        name: data.name,
        path: data.path,
        type: data.type as 'file' | 'dir',
        size: data.size,
        sha: data.sha,
      }]

      return NextResponse.json({
        success: true,
        files,
        requestId,
      })
    } else {
      // Read file content
      const params = {
        owner: searchParams.get('owner') || '',
        repo: searchParams.get('repo') || '',
        path: searchParams.get('path') || '',
        branch: searchParams.get('branch') || undefined,
      }
      
      const parsed = readFileSchema.safeParse(params)
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid parameters', details: parsed.error.issues, requestId },
          { status: 400 }
        )
      }

      const { owner, repo, path, branch } = parsed.data
      const ref = branch || await getDefaultBranch(octokit, owner, repo)

      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path,
        ref,
      })

      if (Array.isArray(data)) {
        return NextResponse.json(
          { error: 'Path is a directory, use action=list', requestId },
          { status: 400 }
        )
      }

      if (data.type !== 'file' || !('content' in data)) {
        return NextResponse.json(
          { error: 'Not a file', requestId },
          { status: 400 }
        )
      }

      const content = Buffer.from(data.content, 'base64').toString('utf-8')

      return NextResponse.json({
        success: true,
        file: {
          path: data.path,
          content,
          sha: data.sha,
          size: data.size,
          encoding: 'utf-8',
        },
        requestId,
      })
    }
  } catch (error) {
    console.error(`[${requestId}] File read error:`, error)
    
    if (error instanceof Error && error.message.includes('Not Found')) {
      return NextResponse.json(
        { error: 'File or repository not found', requestId },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to read file', requestId },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST - Write file(s)
// ============================================================================

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  
  try {
    if (!process.env.GITHUB_TOKEN) {
      return NextResponse.json(
        { error: 'Service configuration error', requestId },
        { status: 503 }
      )
    }

    const body = await request.json()
    const octokit = getOctokit()

    // Check if batch write
    if (body.files && Array.isArray(body.files)) {
      const parsed = batchWriteSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid parameters', details: parsed.error.issues, requestId },
          { status: 400 }
        )
      }

      const { owner, repo, files, message, branch } = parsed.data
      const ref = branch || await getDefaultBranch(octokit, owner, repo)

      // Get the current commit SHA
      const { data: refData } = await octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${ref}`,
      })
      const currentCommitSha = refData.object.sha

      // Get the current tree
      const { data: commitData } = await octokit.git.getCommit({
        owner,
        repo,
        commit_sha: currentCommitSha,
      })
      const currentTreeSha = commitData.tree.sha

      // Create blobs for each file
      const blobs = await Promise.all(
        files.map(async (file) => {
          const { data: blob } = await octokit.git.createBlob({
            owner,
            repo,
            content: Buffer.from(file.content).toString('base64'),
            encoding: 'base64',
          })
          return {
            path: file.path,
            mode: '100644' as const,
            type: 'blob' as const,
            sha: blob.sha,
          }
        })
      )

      // Create new tree
      const { data: newTree } = await octokit.git.createTree({
        owner,
        repo,
        base_tree: currentTreeSha,
        tree: blobs,
      })

      // Create commit
      const { data: newCommit } = await octokit.git.createCommit({
        owner,
        repo,
        message,
        tree: newTree.sha,
        parents: [currentCommitSha],
      })

      // Update reference
      await octokit.git.updateRef({
        owner,
        repo,
        ref: `heads/${ref}`,
        sha: newCommit.sha,
      })

      return NextResponse.json({
        success: true,
        commit: {
          sha: newCommit.sha,
          message: newCommit.message,
          url: newCommit.html_url,
        },
        filesWritten: files.length,
        requestId,
      })
    } else {
      // Single file write
      const parsed = writeFileSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid parameters', details: parsed.error.issues, requestId },
          { status: 400 }
        )
      }

      const { owner, repo, path, content, message, branch, sha } = parsed.data
      const ref = branch || await getDefaultBranch(octokit, owner, repo)

      // Try to get existing file SHA if not provided
      let fileSha = sha
      if (!fileSha) {
        try {
          const { data } = await octokit.repos.getContent({
            owner,
            repo,
            path,
            ref,
          })
          if (!Array.isArray(data) && 'sha' in data) {
            fileSha = data.sha
          }
        } catch {
          // File doesn't exist, that's fine for creation
        }
      }

      const { data } = await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message,
        content: Buffer.from(content).toString('base64'),
        branch: ref,
        ...(fileSha ? { sha: fileSha } : {}),
      })

      return NextResponse.json({
        success: true,
        file: {
          path: data.content?.path,
          sha: data.content?.sha,
        },
        commit: {
          sha: data.commit.sha,
          message: data.commit.message,
          url: data.commit.html_url,
        },
        requestId,
      })
    }
  } catch (error) {
    console.error(`[${requestId}] File write error:`, error)
    
    return NextResponse.json(
      { 
        error: 'Failed to write file',
        details: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// PATCH - Move/Rename file
// ============================================================================

export async function PATCH(request: NextRequest) {
  const requestId = crypto.randomUUID()
  
  try {
    if (!process.env.GITHUB_TOKEN) {
      return NextResponse.json(
        { error: 'Service configuration error', requestId },
        { status: 503 }
      )
    }

    const body = await request.json()
    const parsed = moveFileSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: parsed.error.issues, requestId },
        { status: 400 }
      )
    }

    const { owner, repo, oldPath, newPath, message, branch } = parsed.data
    const octokit = getOctokit()
    const ref = branch || await getDefaultBranch(octokit, owner, repo)

    // Get current commit SHA
    const { data: refData } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${ref}`,
    })
    const currentCommitSha = refData.object.sha

    // Get the current tree
    const { data: commitData } = await octokit.git.getCommit({
      owner,
      repo,
      commit_sha: currentCommitSha,
    })
    const currentTreeSha = commitData.tree.sha

    // Get the file content from old path
    const { data: oldFileData } = await octokit.repos.getContent({
      owner,
      repo,
      path: oldPath,
      ref,
    })

    if (Array.isArray(oldFileData) || !('content' in oldFileData)) {
      return NextResponse.json(
        { error: 'Old path is not a file', requestId },
        { status: 400 }
      )
    }

    const fileContent = Buffer.from(oldFileData.content, 'base64').toString('utf-8')
    const oldFileSha = oldFileData.sha

    // Create blob for new path
    const { data: newBlob } = await octokit.git.createBlob({
      owner,
      repo,
      content: Buffer.from(fileContent).toString('base64'),
      encoding: 'base64',
    })

    // Create new tree with moved file (delete old, add new)
    const { data: newTree } = await octokit.git.createTree({
      owner,
      repo,
      base_tree: currentTreeSha,
      tree: [
        {
          path: newPath,
          mode: '100644' as const,
          type: 'blob' as const,
          sha: newBlob.sha,
        },
        {
          path: oldPath,
          mode: '100644' as const,
          type: 'blob' as const,
          sha: null, // Delete old file
        },
      ],
    })

    // Create commit
    const { data: newCommit } = await octokit.git.createCommit({
      owner,
      repo,
      message,
      tree: newTree.sha,
      parents: [currentCommitSha],
    })

    // Update reference
    await octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${ref}`,
      sha: newCommit.sha,
    })

    return NextResponse.json({
      success: true,
      commit: {
        sha: newCommit.sha,
        message: newCommit.message,
        url: newCommit.html_url,
      },
      moved: {
        from: oldPath,
        to: newPath,
      },
      requestId,
    })
  } catch (error: any) {
    console.error(`[${requestId}] Move file error:`, error)
    return NextResponse.json(
      { 
        error: 'Failed to move file',
        details: error.message || 'Unknown error',
        requestId,
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// DELETE - Delete file
// ============================================================================

export async function DELETE(request: NextRequest) {
  const requestId = crypto.randomUUID()
  
  try {
    if (!process.env.GITHUB_TOKEN) {
      return NextResponse.json(
        { error: 'Service configuration error', requestId },
        { status: 503 }
      )
    }

    const body = await request.json()
    const parsed = deleteFileSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: parsed.error.issues, requestId },
        { status: 400 }
      )
    }

    const { owner, repo, path, message, branch, sha } = parsed.data
    
    if (!process.env.GITHUB_TOKEN) {
      return NextResponse.json(
        { error: 'Service configuration error', requestId },
        { status: 503 }
      )
    }
    
    const octokit = getOctokit()
    const ref = branch || await getDefaultBranch(octokit, owner, repo)

    const { data } = await octokit.repos.deleteFile({
      owner,
      repo,
      path,
      message,
      sha,
      branch: ref,
    })

    return NextResponse.json({
      success: true,
      commit: {
        sha: data.commit.sha,
        message: data.commit.message,
        url: data.commit.html_url,
      },
      requestId,
    })
  } catch (error) {
    console.error(`[${requestId}] File delete error:`, error)
    
    return NextResponse.json(
      { error: 'Failed to delete file', requestId },
      { status: 500 }
    )
  }
}
