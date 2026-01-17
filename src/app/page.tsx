'use client'

import { useState, useEffect, Suspense } from 'react'
import { ChatPane } from '@/components/ChatPane'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { SetupScreen } from '@/components/SetupScreen'
import { Loader2 } from 'lucide-react'

// Loading fallback for chat pane
function ChatPaneLoading() {
  return (
    <div className="flex items-center justify-center h-full bg-[#0a0a0a]">
      <div className="flex flex-col items-center gap-3 text-[#9ca3af]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm">Loading chat...</span>
      </div>
    </div>
  )
}

// Error fallback component
function ErrorFallback() {
  return (
    <div className="flex items-center justify-center h-full bg-[#0a0a0a] text-white p-8">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Failed to load component</h2>
        <p className="text-[#9ca3af] mb-4">Please refresh the page to try again.</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary hover:bg-primary/90 rounded-lg transition-colors"
        >
          Refresh Page
        </button>
      </div>
    </div>
  )
}

const GROK_TOKEN_KEY = 'nexteleven_grok_token'
const GITHUB_TOKEN_KEY = 'nexteleven_github_token'
const REPO_KEY = 'nexteleven_connectedRepo'

export default function Home() {
  const [isSetupComplete, setIsSetupComplete] = useState<boolean | null>(null)
  const [repository, setRepository] = useState<{ owner: string; repo: string; branch: string } | null>(null)
  const [newSessionMessage, setNewSessionMessage] = useState<string | null>(null)

  // Check if setup is complete on mount
  useEffect(() => {
    // Safety check for localStorage availability
    if (typeof window === 'undefined') return
    
    try {
      // GROK_API_KEY is server-side only (Vercel env vars)
      // Setup is complete if we have a setup flag (even if empty)
      // GitHub token and repo are optional - can be added later
      const hasSetupFlag = localStorage.getItem('nexteleven_setup_complete') === 'true'
      const githubToken = localStorage.getItem(GITHUB_TOKEN_KEY)
      const savedRepo = localStorage.getItem(REPO_KEY)
      
      // If already marked as complete, we're good
      if (hasSetupFlag) {
        if (savedRepo) {
          try {
            const parsedRepo = JSON.parse(savedRepo)
            setRepository(parsedRepo)
          } catch {
            // Ignore parse errors
          }
        }
        setIsSetupComplete(true)
        return
      }
      
      // Legacy check: if we have token/repo, mark as complete
      if (githubToken || savedRepo) {
        if (savedRepo) {
          try {
            const parsedRepo = JSON.parse(savedRepo)
            setRepository(parsedRepo)
          } catch {
            // Ignore parse errors
          }
        }
        localStorage.setItem('nexteleven_setup_complete', 'true')
        setIsSetupComplete(true)
      } else {
        setIsSetupComplete(false)
      }
    } catch (error) {
      // Handle localStorage errors gracefully
      console.error('Error accessing localStorage:', error)
      setIsSetupComplete(false)
    }
  }, [])

  // Listen for new session events from sidebar
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    try {
      const handleNewSession = (e: Event) => {
        try {
          const customEvent = e as CustomEvent<{ 
            message: string
            repository?: { owner: string; repo: string; branch: string }
          }>
          setNewSessionMessage(customEvent.detail?.message || null)
          // Update repository if provided in the event
          if (customEvent.detail?.repository) {
            setRepository(customEvent.detail.repository)
          }
        } catch (e) {
          console.error('Error handling newSession event:', e)
        }
      }
      window.addEventListener('newSession', handleNewSession)
      return () => {
        try {
          window.removeEventListener('newSession', handleNewSession)
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    } catch (e) {
      console.error('Error setting up newSession listener:', e)
    }
  }, [])

  // Listen for repo connect events from sidebar
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    try {
      const handleRepoConnect = (e: Event) => {
        try {
          const customEvent = e as CustomEvent<{ repo: { owner: string; repo: string; branch: string } }>
          if (customEvent.detail?.repo) {
            setRepository(customEvent.detail.repo)
          }
        } catch (e) {
          console.error('Error handling repoConnect event:', e)
        }
      }
      window.addEventListener('repoConnect', handleRepoConnect)
      return () => {
        try {
          window.removeEventListener('repoConnect', handleRepoConnect)
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    } catch (e) {
      console.error('Error setting up repoConnect listener:', e)
    }
  }, [])

  // Show loading while checking setup
  if (isSetupComplete === null) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Show setup screen if not configured
  if (!isSetupComplete) {
    return (
      <SetupScreen 
        onComplete={() => {
          try {
            if (typeof window !== 'undefined') {
              const savedRepo = localStorage.getItem(REPO_KEY)
              if (savedRepo) {
                try {
                  setRepository(JSON.parse(savedRepo))
                } catch {
                  // Ignore parse errors
                }
              }
            }
          } catch (error) {
            console.error('Error reading repository from localStorage:', error)
          }
          setIsSetupComplete(true)
        }}
      />
    )
  }

  return (
    <div className="h-full w-full">
      <ErrorBoundary 
        fallback={<ErrorFallback />}
        onError={(error, errorInfo) => {
          console.error('Page error:', error, errorInfo)
        }}
      >
        <Suspense fallback={<ChatPaneLoading />}>
          <ErrorBoundary fallback={<ErrorFallback />}>
            <ChatPane 
              repository={repository || undefined}
              newSessionMessage={newSessionMessage}
              onNewSessionHandled={() => setNewSessionMessage(null)}
            />
          </ErrorBoundary>
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}
