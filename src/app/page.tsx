'use client'

import { useState, useEffect, Suspense, lazy } from 'react'
import { useSession } from 'next-auth/react'
import { ChatPane } from '@/components/ChatPane'
import { useSetupState } from '@/hooks/useSetupState'
import { useSearchStore } from '@/lib/stores/search-store'
import { getSessionManager } from '@/lib/session-manager'
import { Loader2 } from 'lucide-react'

// Lazy load components that are conditionally rendered
const ErrorBoundary = lazy(() => import('@/components/ErrorBoundary').then(module => ({ default: module.ErrorBoundary })))
const SetupScreen = lazy(() => import('@/components/SetupScreen').then(module => ({ default: module.SetupScreen })))
const SignInView = lazy(() => import('@/components/SignInView').then(module => ({ default: module.SignInView })))
const SessionSearch = lazy(() => import('@/components/SessionSearch').then(module => ({ default: module.SessionSearch })))

function ChatPaneLoading() {
  return (
    <div 
      className="flex items-center justify-center h-full bg-[#0a0a0a]"
      role="status"
      aria-live="polite"
      aria-label="Loading chat interface"
    >
      <div className="flex flex-col items-center gap-3 text-[#9ca3af]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <span className="text-sm">Loading chat...</span>
      </div>
    </div>
  )
}

function ErrorFallback() {
  return (
    <div 
      className="flex items-center justify-center h-full bg-[#0a0a0a] text-white p-8"
      role="alert"
      aria-live="assertive"
    >
      <div className="text-center max-w-md">
        <h1 className="text-xl font-semibold mb-2">Failed to load component</h1>
        <p className="text-[#9ca3af] mb-4">Please refresh the page to try again.</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary hover:bg-primary/90 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-[#0a0a0a]"
          aria-label="Refresh page to retry loading"
        >
          Refresh Page
        </button>
      </div>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div 
      className="h-full w-full flex items-center justify-center bg-[#0a0a0a]"
      role="status"
      aria-live="polite"
      aria-label="Loading application"
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
      <span className="sr-only">Loading application...</span>
    </div>
  )
}

export default function Home() {
  const { status } = useSession()
  const {
    isLoading: setupLoading,
    isSetupComplete,
    repository,
    setRepository,
    markComplete,
  } = useSetupState()
  const [newSessionMessage, setNewSessionMessage] = useState<string | null>(null)
  const { isOpen: isSearchOpen } = useSearchStore()

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const onNewSession = (e: Event) => {
      try {
        const ev = e as CustomEvent<{ message?: string; repository?: { owner: string; repo: string; branch: string } }>
        const message = ev.detail?.message
        setNewSessionMessage(typeof message === 'string' ? message : null)
        
        const repo = ev.detail?.repository
        if (repo && typeof repo === 'object' && repo.owner && repo.repo) {
          setRepository({
            owner: String(repo.owner),
            repo: String(repo.repo),
            branch: String(repo.branch || 'main'),
          })
        }
      } catch (error) {
        // Log error in development, use proper logging service in production
        if (process.env.NODE_ENV === 'development') {
          console.error('[Home] Error handling newSession event:', error)
        }
      }
    }
    
    window.addEventListener('newSession', onNewSession)
    return () => window.removeEventListener('newSession', onNewSession)
  }, [setRepository])

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const onRepoConnect = (e: Event) => {
      try {
        const ev = e as CustomEvent<{ repo?: { owner: string; repo: string; branch?: string } }>
        const repo = ev.detail?.repo
        
        if (repo && typeof repo === 'object' && repo.owner && repo.repo) {
          setRepository({
            owner: String(repo.owner),
            repo: String(repo.repo),
            branch: String(repo.branch || 'main'),
          })
        }
      } catch (error) {
        // Log error in development, use proper logging service in production
        if (process.env.NODE_ENV === 'development') {
          console.error('[Home] Error handling repoConnect event:', error)
        }
      }
    }
    
    window.addEventListener('repoConnect', onRepoConnect)
    return () => window.removeEventListener('repoConnect', onRepoConnect)
  }, [setRepository])

  if (status === 'loading') return <LoadingSpinner />
  if (status === 'unauthenticated') {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <SignInView />
      </Suspense>
    )
  }

  if (setupLoading || isSetupComplete === null) return <LoadingSpinner />
  if (!isSetupComplete) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <SetupScreen onComplete={markComplete} />
      </Suspense>
    )
  }

  const handleSelectSession = (sessionId: string) => {
    if (!sessionId || typeof sessionId !== 'string') {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Home] Invalid sessionId provided to handleSelectSession:', sessionId)
      }
      return
    }
    
    try {
      const sessionManager = getSessionManager()
      const session = sessionManager.switchSession(sessionId)
      
      if (!session) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[Home] Session ${sessionId} not found`)
        }
        return
      }
      
      // Validate session before loading
      if (!session.id || !Array.isArray(session.messages)) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[Home] Invalid session structure for ${sessionId}`, session)
        }
        return
      }
      
      // Load session messages into chat
      const event = new CustomEvent('loadSession', {
        detail: { session },
      })
      window.dispatchEvent(event)
    } catch (error) {
      // Log error in development, use proper logging service in production
      if (process.env.NODE_ENV === 'development') {
        console.error(`[Home] Failed to load session ${sessionId}:`, error)
      }
    }
  }

  return (
    <div className="h-full w-full">
      <ErrorBoundary
        fallback={<ErrorFallback />}
        onError={(err, info) => {
          // Use proper error logging in production
          if (process.env.NODE_ENV === 'development') {
            console.error('Page error:', err, info)
          }
        }}
      >
        <Suspense fallback={<ChatPaneLoading />}>
          <ErrorBoundary fallback={<ErrorFallback />}>
            <ChatPane
              repository={repository ?? undefined}
              newSessionMessage={newSessionMessage}
              onNewSessionHandled={() => setNewSessionMessage(null)}
            />
          </ErrorBoundary>
        </Suspense>
      </ErrorBoundary>
      
      {/* Session Search Modal */}
      {isSearchOpen && (
        <Suspense fallback={null}>
          <SessionSearch
            onSelectSession={handleSelectSession}
            onClose={() => {}}
          />
        </Suspense>
      )}
    </div>
  )
}
