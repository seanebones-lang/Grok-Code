import { useState, useCallback, useRef } from 'react'
import type { GitHubPushResult, GitHubFile } from '@/types'

/**
 * Git operations hook
 * Provides type-safe GitHub operations with loading and error states
 */

// ============================================================================
// Types
// ============================================================================

export interface PushOptions {
  owner: string
  repo: string
  branch?: string
  files: GitHubFile[]
  message?: string
}

export interface UseGitReturn {
  pushChanges: (options: PushOptions) => Promise<GitHubPushResult>
  loading: boolean
  error: string | null
  clearError: () => void
  lastPush: GitHubPushResult | null
}

interface ApiErrorResponse {
  error: string
  details?: unknown
  requestId?: string
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useGit(): UseGitReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastPush, setLastPush] = useState<GitHubPushResult | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  /**
   * Clear the current error
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  /**
   * Push changes to GitHub
   */
  const pushChanges = useCallback(async (options: PushOptions): Promise<GitHubPushResult> => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    abortControllerRef.current = new AbortController()
    
    setLoading(true)
    setError(null)

    try {
      // Validate options
      if (!options.owner || !options.repo) {
        throw new Error('Repository owner and name are required')
      }
      
      if (!options.files || options.files.length === 0) {
        throw new Error('At least one file is required')
      }

      const response = await fetch('/api/github/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          owner: options.owner,
          repo: options.repo,
          branch: options.branch || 'main',
          files: options.files.map(file => ({
            path: file.path,
            content: file.content,
            mode: file.mode || '100644',
          })),
          message: options.message || 'Update files via NextEleven Code',
        }),
        signal: abortControllerRef.current.signal,
      })

      // Parse response
      const data = await response.json()

      if (!response.ok) {
        const errorData = data as ApiErrorResponse
        throw new Error(errorData.error || `Push failed with status ${response.status}`)
      }

      const result: GitHubPushResult = {
        success: true,
        commit: {
          sha: data.commit.sha,
          message: data.commit.message,
          url: data.commit.url,
        },
        requestId: data.requestId,
      }

      setLastPush(result)
      return result
    } catch (err) {
      // Don't set error for aborted requests
      if (err instanceof Error && err.name === 'AbortError') {
        throw err
      }

      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
      abortControllerRef.current = null
    }
  }, [])

  return {
    pushChanges,
    loading,
    error,
    clearError,
    lastPush,
  }
}

/**
 * Hook for managing repository selection
 */
export function useRepository() {
  const [selectedRepo, setSelectedRepo] = useState<{
    owner: string
    repo: string
    branch: string
  } | null>(null)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectRepository = useCallback((owner: string, repo: string, branch: string = 'main') => {
    setSelectedRepo({ owner, repo, branch })
    setError(null)
  }, [])

  const clearRepository = useCallback(() => {
    setSelectedRepo(null)
    setError(null)
  }, [])

  return {
    selectedRepo,
    selectRepository,
    clearRepository,
    loading,
    error,
  }
}
