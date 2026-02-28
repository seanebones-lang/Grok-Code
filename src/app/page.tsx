'use client'

import { useState, useCallback, useEffect } from 'react'
import Header from '@/components/Layout/Header'
import Sidebar from '@/components/Layout/Sidebar'
import { ChatPane } from '@/components/ChatPane'
import type { RepoInfo } from '@/lib/utils/repo'
import { getStorageItem } from '@/lib/storage'
import { STORAGE_KEYS } from '@/lib/storage-keys'

export default function HomePage() {
  const [repository, setRepository] = useState<RepoInfo | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const repo = getStorageItem<RepoInfo | null>(STORAGE_KEYS.connectedRepo, null)
    if (repo?.owner && repo?.repo) setRepository(repo)
  }, [])

  const handleRepoConnect = useCallback((repo: RepoInfo | null) => {
    setRepository(repo ?? null)
  }, [])

  const handleNewSession = useCallback((message: string) => {
    const event = new CustomEvent('newSession', { detail: { message } })
    window.dispatchEvent(event)
  }, [])

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden">
      <aside className="flex-shrink-0 w-72 h-full overflow-hidden min-w-[280px]">
        <Sidebar
          onFileSelect={() => {}}
          onRepoConnect={handleRepoConnect}
          onNewSession={handleNewSession}
        />
      </aside>
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <div className="flex-1 min-h-0 overflow-hidden">
          <ChatPane
            repository={
              repository
                ? {
                    owner: repository.owner,
                    repo: repository.repo,
                    branch: repository.branch,
                  }
                : undefined
            }
          />
        </div>
      </main>
    </div>
  )
}
