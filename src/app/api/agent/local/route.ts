import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'

/**
 * Local File System API for Agentic Operations
 * Provides direct access to local files for single-user mode
 * 
 * SECURITY: This gives full file system access.
 * Only enable for single-user deployments.
 */

// ============================================================================
// Configuration
// ============================================================================

// Maximum file size to read (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024

// Home directory
const HOME_DIR = os.homedir()

// ============================================================================
// Schemas
// ============================================================================

const readFileSchema = z.object({
  path: z.string().min(1),
  encoding: z.enum(['utf-8', 'base64', 'binary']).optional(),
})

const writeFileSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
  encoding: z.enum(['utf-8', 'base64']).optional(),
  createDirs: z.boolean().optional(),
})

const listDirSchema = z.object({
  path: z.string().min(1),
  recursive: z.boolean().optional(),
  maxDepth: z.number().min(1).max(10).optional(),
})

const deleteSchema = z.object({
  path: z.string().min(1),
  recursive: z.boolean().optional(),
})

const moveSchema = z.object({
  source: z.string().min(1),
  destination: z.string().min(1),
})

const searchSchema = z.object({
  directory: z.string().min(1),
  pattern: z.string().min(1),
  maxResults: z.number().min(1).max(1000).optional(),
})

// ============================================================================
// Helper Functions
// ============================================================================

function resolvePath(inputPath: string): string {
  // Expand ~ to home directory
  if (inputPath.startsWith('~')) {
    return path.join(HOME_DIR, inputPath.slice(1))
  }
  // Return absolute path or resolve relative to home
  return path.isAbsolute(inputPath) ? inputPath : path.resolve(inputPath)
}

async function getFileInfo(filePath: string) {
  const stats = await fs.stat(filePath)
  return {
    path: filePath,
    name: path.basename(filePath),
    type: stats.isDirectory() ? 'directory' : 'file',
    size: stats.size,
    modified: stats.mtime,
    created: stats.birthtime,
    permissions: stats.mode.toString(8).slice(-3),
  }
}

async function listDirectoryRecursive(
  dirPath: string, 
  maxDepth: number = 3, 
  currentDepth: number = 0
): Promise<any[]> {
  if (currentDepth >= maxDepth) return []
  
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  const results: any[] = []
  
  for (const entry of entries) {
    // Skip hidden files and node_modules
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
    
    const fullPath = path.join(dirPath, entry.name)
    
    if (entry.isDirectory()) {
      results.push({
        name: entry.name,
        path: fullPath,
        type: 'directory',
        children: await listDirectoryRecursive(fullPath, maxDepth, currentDepth + 1),
      })
    } else {
      const stats = await fs.stat(fullPath)
      results.push({
        name: entry.name,
        path: fullPath,
        type: 'file',
        size: stats.size,
        extension: path.extname(entry.name),
      })
    }
  }
  
  return results
}

async function searchFiles(
  directory: string, 
  pattern: string, 
  maxResults: number = 100
): Promise<string[]> {
  const results: string[] = []
  const regex = new RegExp(pattern, 'i')
  
  async function search(dir: string) {
    if (results.length >= maxResults) return
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      
      for (const entry of entries) {
        if (results.length >= maxResults) return
        
        // Skip hidden and node_modules
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
        
        const fullPath = path.join(dir, entry.name)
        
        if (regex.test(entry.name)) {
          results.push(fullPath)
        }
        
        if (entry.isDirectory()) {
          await search(fullPath)
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }
  
  await search(directory)
  return results
}

// ============================================================================
// GET - Read file or list directory
// ============================================================================

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()
  
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'read'
    const filePath = searchParams.get('path') || ''
    
    if (!filePath) {
      return NextResponse.json({ error: 'Path is required', requestId }, { status: 400 })
    }

    const resolvedPath = resolvePath(filePath)

    if (action === 'list') {
      // List directory
      const recursive = searchParams.get('recursive') === 'true'
      const maxDepth = parseInt(searchParams.get('maxDepth') || '3')
      
      const stats = await fs.stat(resolvedPath)
      if (!stats.isDirectory()) {
        return NextResponse.json({ error: 'Path is not a directory', requestId }, { status: 400 })
      }

      if (recursive) {
        const tree = await listDirectoryRecursive(resolvedPath, maxDepth)
        return NextResponse.json({ success: true, path: resolvedPath, tree, requestId })
      } else {
        const entries = await fs.readdir(resolvedPath, { withFileTypes: true })
        const files = await Promise.all(
          entries
            .filter(e => !e.name.startsWith('.'))
            .map(async (entry) => {
              const fullPath = path.join(resolvedPath, entry.name)
              const stats = await fs.stat(fullPath)
              return {
                name: entry.name,
                path: fullPath,
                type: entry.isDirectory() ? 'directory' : 'file',
                size: stats.size,
                modified: stats.mtime,
              }
            })
        )
        return NextResponse.json({ success: true, path: resolvedPath, files, requestId })
      }
    } else if (action === 'info') {
      // Get file/directory info
      const info = await getFileInfo(resolvedPath)
      return NextResponse.json({ success: true, info, requestId })
    } else if (action === 'search') {
      // Search for files
      const pattern = searchParams.get('pattern') || ''
      const maxResults = parseInt(searchParams.get('maxResults') || '100')
      
      const results = await searchFiles(resolvedPath, pattern, maxResults)
      return NextResponse.json({ success: true, results, count: results.length, requestId })
    } else {
      // Read file content
      const stats = await fs.stat(resolvedPath)
      
      if (stats.isDirectory()) {
        return NextResponse.json({ error: 'Path is a directory, use action=list', requestId }, { status: 400 })
      }
      
      if (stats.size > MAX_FILE_SIZE) {
        return NextResponse.json({ 
          error: `File too large (${(stats.size / 1024 / 1024).toFixed(2)}MB). Max: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          requestId 
        }, { status: 400 })
      }

      const encoding = searchParams.get('encoding') || 'utf-8'
      const content = await fs.readFile(resolvedPath, encoding as BufferEncoding)
      
      return NextResponse.json({
        success: true,
        file: {
          path: resolvedPath,
          name: path.basename(resolvedPath),
          content: typeof content === 'string' ? content : content.toString('base64'),
          size: stats.size,
          encoding,
        },
        requestId,
      })
    }
  } catch (error: any) {
    console.error(`[${requestId}] Local file read error:`, error)
    
    if (error.code === 'ENOENT') {
      return NextResponse.json({ error: 'File or directory not found', requestId }, { status: 404 })
    }
    if (error.code === 'EACCES') {
      return NextResponse.json({ error: 'Permission denied', requestId }, { status: 403 })
    }
    
    return NextResponse.json({ error: 'Failed to read file', details: error.message, requestId }, { status: 500 })
  }
}

// ============================================================================
// POST - Write file or create directory
// ============================================================================

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  
  try {
    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'write'

    if (action === 'mkdir') {
      // Create directory
      const dirPath = resolvePath(body.path)
      await fs.mkdir(dirPath, { recursive: true })
      return NextResponse.json({ success: true, path: dirPath, requestId })
    } else {
      // Write file
      const parsed = writeFileSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid parameters', details: parsed.error.issues, requestId }, { status: 400 })
      }

      const { path: filePath, content, encoding = 'utf-8', createDirs } = parsed.data
      const resolvedPath = resolvePath(filePath)
      
      // Create parent directories if requested
      if (createDirs) {
        await fs.mkdir(path.dirname(resolvedPath), { recursive: true })
      }

      // Write content
      const buffer = encoding === 'base64' 
        ? Buffer.from(content, 'base64') 
        : content
      
      await fs.writeFile(resolvedPath, buffer, encoding === 'base64' ? undefined : encoding)

      const stats = await fs.stat(resolvedPath)
      
      return NextResponse.json({
        success: true,
        file: {
          path: resolvedPath,
          name: path.basename(resolvedPath),
          size: stats.size,
        },
        requestId,
      })
    }
  } catch (error: any) {
    console.error(`[${requestId}] Local file write error:`, error)
    return NextResponse.json({ error: 'Failed to write file', details: error.message, requestId }, { status: 500 })
  }
}

// ============================================================================
// PATCH - Move/Rename file or directory
// ============================================================================

export async function PATCH(request: NextRequest) {
  const requestId = crypto.randomUUID()
  
  try {
    const body = await request.json()
    const parsed = moveSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid parameters', details: parsed.error.issues, requestId }, { status: 400 })
    }

    const { source, destination } = parsed.data
    const sourcePath = resolvePath(source)
    const destPath = resolvePath(destination)

    await fs.rename(sourcePath, destPath)

    return NextResponse.json({
      success: true,
      moved: { from: sourcePath, to: destPath },
      requestId,
    })
  } catch (error: any) {
    console.error(`[${requestId}] Local file move error:`, error)
    return NextResponse.json({ error: 'Failed to move file', details: error.message, requestId }, { status: 500 })
  }
}

// ============================================================================
// DELETE - Delete file or directory
// ============================================================================

export async function DELETE(request: NextRequest) {
  const requestId = crypto.randomUUID()
  
  try {
    const body = await request.json()
    const parsed = deleteSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid parameters', details: parsed.error.issues, requestId }, { status: 400 })
    }

    const { path: filePath, recursive } = parsed.data
    const resolvedPath = resolvePath(filePath)

    // Safety check - don't delete home directory or root
    if (resolvedPath === HOME_DIR || resolvedPath === '/' || resolvedPath === '/Users') {
      return NextResponse.json({ error: 'Cannot delete protected directory', requestId }, { status: 403 })
    }

    const stats = await fs.stat(resolvedPath)
    
    if (stats.isDirectory()) {
      if (recursive) {
        await fs.rm(resolvedPath, { recursive: true, force: true })
      } else {
        await fs.rmdir(resolvedPath)
      }
    } else {
      await fs.unlink(resolvedPath)
    }

    return NextResponse.json({
      success: true,
      deleted: resolvedPath,
      requestId,
    })
  } catch (error: any) {
    console.error(`[${requestId}] Local file delete error:`, error)
    
    if (error.code === 'ENOENT') {
      return NextResponse.json({ error: 'File or directory not found', requestId }, { status: 404 })
    }
    if (error.code === 'ENOTEMPTY') {
      return NextResponse.json({ error: 'Directory not empty. Use recursive=true to delete', requestId }, { status: 400 })
    }
    
    return NextResponse.json({ error: 'Failed to delete', details: error.message, requestId }, { status: 500 })
  }
}
