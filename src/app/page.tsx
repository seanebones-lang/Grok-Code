'use client'

import { useState, useCallback, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { ChatPane } from '@/components/ChatPane'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { Loader2 } from 'lucide-react'

// Lazy load the Editor component since it includes Monaco
const Editor = dynamic(
  () => import('@/components/Editor').then(mod => ({ default: mod.Editor })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-[#1e1e1e]">
        <div className="flex flex-col items-center gap-3 text-[#9ca3af]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="text-sm">Loading editor...</span>
        </div>
      </div>
    ),
  }
)

// Loading fallback for chat pane
function ChatPaneLoading() {
  return (
    <div className="flex items-center justify-center h-full bg-[#1a1a2e]">
      <div className="flex flex-col items-center gap-3 text-[#9ca3af]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="text-sm">Loading chat...</span>
      </div>
    </div>
  )
}

// Error fallback component
function ErrorFallback() {
  return (
    <div className="flex items-center justify-center h-full bg-[#1a1a2e] text-white p-8">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Failed to load component</h2>
        <p className="text-[#9ca3af] mb-4">Please refresh the page to try again.</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-[#6841e7] hover:bg-[#7c5cff] rounded-lg transition-colors"
        >
          Refresh Page
        </button>
      </div>
    </div>
  )
}

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<string | undefined>()
  const [editorContent, setEditorContent] = useState('')

  const handleEditorChange = useCallback((value: string | undefined) => {
    setEditorContent(value || '')
  }, [])

  const handleFileSelect = useCallback((path: string) => {
    setSelectedFile(path)
    // TODO: Load file content from GitHub
  }, [])

  return (
    <div className="h-full w-full">
      <ResizablePanelGroup 
        orientation="horizontal" 
        className="h-full"
        autoSaveId="grokcode-panels"
      >
        {/* Editor Panel - Hidden on mobile */}
        <ResizablePanel 
          defaultSize={50} 
          minSize={25}
          maxSize={75}
          className="hidden md:block"
          id="editor-panel"
        >
          <ErrorBoundary fallback={<ErrorFallback />}>
            <Editor 
              filePath={selectedFile} 
              content={editorContent} 
              onChange={handleEditorChange}
            />
          </ErrorBoundary>
        </ResizablePanel>
        
        {/* Resize Handle */}
        <ResizableHandle 
          className="hidden md:flex w-1 bg-[#404050] hover:bg-[#6841e7] transition-colors"
          withHandle
        />
        
        {/* Chat Panel */}
        <ResizablePanel 
          defaultSize={50} 
          minSize={25}
          id="chat-panel"
        >
          <ErrorBoundary fallback={<ErrorFallback />}>
            <Suspense fallback={<ChatPaneLoading />}>
              <ChatPane />
            </Suspense>
          </ErrorBoundary>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
