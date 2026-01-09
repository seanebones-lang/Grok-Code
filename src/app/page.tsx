'use client'

import { Suspense } from 'react'
import { ChatPane } from '@/components/ChatPane'
import { ErrorBoundary } from '@/components/ErrorBoundary'
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

export default function Home() {
  return (
    <div className="flex flex-col h-full w-full bg-[#0a0a0a]">
      {/* Scrollable chat main area matching Claude */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8">
          <ErrorBoundary fallback={<ErrorFallback />}>
            <Suspense fallback={<ChatPaneLoading />}>
              <ChatPane />
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </div>
  )
}
