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
      // We only need GitHub token for client-side GitHub API access
      const githubToken = localStorage.getItem(GITHUB_TOKEN_KEY)
      const savedRepo = localStorage.getItem(REPO_KEY)
      
      if (githubToken && savedRepo) {
        try {
          const parsedRepo = JSON.parse(savedRepo)
          setRepository(parsedRepo)
          setIsSetupComplete(true)
        } catch {
          setIsSetupComplete(false)
        }
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
    const handleNewSession = (e: Event) => {
      const customEvent = e as CustomEvent<{ 
        message: string
        repository?: { owner: string; repo: string; branch: string }
      }>
      setNewSessionMessage(customEvent.detail.message)
      // Update repository if provided in the event
      if (customEvent.detail.repository) {
        setRepository(customEvent.detail.repository)
      }
    }
    window.addEventListener('newSession', handleNewSession)
    return () => window.removeEventListener('newSession', handleNewSession)
  }, [])

  // Listen for repo connect events from sidebar
  useEffect(() => {
    const handleRepoConnect = (e: Event) => {
      const customEvent = e as CustomEvent<{ repo: { owner: string; repo: string; branch: string } }>
      setRepository(customEvent.detail.repo)
    }
    window.addEventListener('repoConnect', handleRepoConnect)
    return () => window.removeEventListener('repoConnect', handleRepoConnect)
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
      <ErrorBoundary fallback={<ErrorFallback />}>
        <Suspense fallback={<ChatPaneLoading />}>
          <ChatPane 
            repository={repository || undefined}
            newSessionMessage={newSessionMessage}
            onNewSessionHandled={() => setNewSessionMessage(null)}
          />
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}
