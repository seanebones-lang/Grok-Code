'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { 
  FileText, 
  ChevronRight, 
  ChevronDown,
  Github,
  Loader2,
  RefreshCw,
  AlertCircle,
  X,
  Search,
  Send,
  Sparkles,
  Image,
  MoreVertical
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FileTree } from '@/components/FileTree'
import type { FileNode } from '@/types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { GROK_MODELS, MODEL_PRIORITY } from '@/lib/grok-models'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'nexteleven_fileTree'
const REPO_KEY = 'nexteleven_connectedRepo'
const MODEL_KEY = 'nexteleven_selectedModel'

interface Repository {
  id: number
  name: string
  full_name: string
  owner: {
    login: string
  }
  default_branch: string
  private: boolean
}

interface SidebarProps {
  onFileSelect?: (path: string) => void
  selectedPath?: string
  onRepoConnect?: (repo: { owner: string; repo: string; branch: string }) => void
  onNewSession?: (message: string) => void
}

export default function Sidebar({ onFileSelect, selectedPath, onRepoConnect, onNewSession }: SidebarProps) {
  const { data: session } = useSession()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [files, setFiles] = useState<FileNode[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showRepoModal, setShowRepoModal] = useState(false)
  const [repos, setRepos] = useState<Repository[]>([])
  const [repoSearch, setRepoSearch] = useState('')
  const [loadingRepos, setLoadingRepos] = useState(false)
  const [connectedRepo, setConnectedRepo] = useState<{ owner: string; repo: string; branch: string } | null>(null)
  const [newSessionInput, setNewSessionInput] = useState('')
  const [selectedModel, setSelectedModel] = useState<string>('grok-4.1-fast')
  const [showModelMenu, setShowModelMenu] = useState(false)

  // Load saved repo and model from localStorage
  useEffect(() => {
    try {
      const savedRepo = localStorage.getItem(REPO_KEY)
      if (savedRepo) {
        const parsed = JSON.parse(savedRepo)
        setConnectedRepo(parsed)
        onRepoConnect?.(parsed)
      }
      const savedModel = localStorage.getItem(MODEL_KEY)
      if (savedModel && savedModel in GROK_MODELS) {
        setSelectedModel(savedModel)
      }
    } catch (e) {
      console.error('Failed to load saved data:', e)
    }
  }, [onRepoConnect])

  // Load files from localStorage with error handling
  const loadSavedFiles = useCallback(() => {
    try {
      const savedFiles = localStorage.getItem(STORAGE_KEY)
      if (savedFiles) {
        const parsed = JSON.parse(savedFiles)
        if (Array.isArray(parsed)) {
          setFiles(parsed)
          setError(null)
        }
      }
    } catch (e) {
      console.error('Failed to load saved files:', e)
      setError('Failed to load saved files')
      // Clear corrupted data
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  useEffect(() => {
    loadSavedFiles()
  }, [loadSavedFiles])

  // Save files to localStorage when they change
  useEffect(() => {
    if (files.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(files))
      } catch (e) {
        console.error('Failed to save files:', e)
      }
    }
  }, [files])

  // Fetch user's repositories
  const fetchRepos = useCallback(async () => {
    if (!session?.accessToken) return
    
    setLoadingRepos(true)
    try {
      const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch repositories')
      }
      
      const data = await response.json()
      setRepos(data)
    } catch (e) {
      console.error('Failed to fetch repos:', e)
      setError('Failed to fetch repositories')
    } finally {
      setLoadingRepos(false)
    }
  }, [session?.accessToken])

  // Fetch file tree for a repository
  const fetchFileTree = useCallback(async (owner: string, repo: string, branch: string) => {
    if (!session?.accessToken) return
    
    setLoading(true)
    setError(null)
    
    try {
      // Get the tree recursively
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch file tree')
      }
      
      const data = await response.json()
      
      // Convert flat tree to nested structure
      const fileNodes: FileNode[] = []
      const nodeMap = new Map<string, FileNode>()
      
      // Sort by path to ensure parents come before children
      const sortedTree = data.tree.sort((a: { path: string }, b: { path: string }) => 
        a.path.localeCompare(b.path)
      )
      
      for (const item of sortedTree) {
        const parts = item.path.split('/')
        const name = parts[parts.length - 1]
        const isDirectory = item.type === 'tree'
        
        const node: FileNode = {
          name,
          path: item.path,
          type: isDirectory ? 'directory' : 'file',
          children: isDirectory ? [] : undefined,
        }
        
        nodeMap.set(item.path, node)
        
        if (parts.length === 1) {
          // Root level item
          fileNodes.push(node)
        } else {
          // Find parent
          const parentPath = parts.slice(0, -1).join('/')
          const parent = nodeMap.get(parentPath)
          if (parent && parent.children) {
            parent.children.push(node)
          }
        }
      }
      
      // Sort: directories first, then alphabetically
      const sortNodes = (nodes: FileNode[]): FileNode[] => {
        return nodes.sort((a, b) => {
          if (a.type === 'directory' && b.type !== 'directory') return -1
          if (a.type !== 'directory' && b.type === 'directory') return 1
          return a.name.localeCompare(b.name)
        }).map(node => ({
          ...node,
          children: node.children ? sortNodes(node.children) : undefined,
        }))
      }
      
      setFiles(sortNodes(fileNodes))
    } catch (e) {
      console.error('Failed to fetch file tree:', e)
      setError('Failed to fetch file tree')
    } finally {
      setLoading(false)
    }
  }, [session?.accessToken])

  const handleConnectRepo = useCallback(async () => {
    if (!session) {
      // Redirect to login
      window.location.href = '/login'
      return
    }
    
    setShowRepoModal(true)
    fetchRepos()
  }, [session, fetchRepos])

  const handleSelectRepo = useCallback(async (repo: Repository) => {
    const repoInfo = {
      owner: repo.owner.login,
      repo: repo.name,
      branch: repo.default_branch,
    }
    
    setConnectedRepo(repoInfo)
    localStorage.setItem(REPO_KEY, JSON.stringify(repoInfo))
    onRepoConnect?.(repoInfo)
    
    // Dispatch event for page component
    const event = new CustomEvent('repoConnect', { detail: { repo: repoInfo } })
    window.dispatchEvent(event)
    
    setShowRepoModal(false)
    
    // Fetch the file tree
    await fetchFileTree(repo.owner.login, repo.name, repo.default_branch)
  }, [fetchFileTree, onRepoConnect])

  const handleDisconnectRepo = useCallback(() => {
    setConnectedRepo(null)
    setFiles([])
    localStorage.removeItem(REPO_KEY)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const handleRefresh = useCallback(async () => {
    if (connectedRepo) {
      await fetchFileTree(connectedRepo.owner, connectedRepo.repo, connectedRepo.branch)
    } else {
      loadSavedFiles()
    }
  }, [connectedRepo, fetchFileTree, loadSavedFiles])

  // Filter repos by search
  const filteredRepos = repos.filter(repo => 
    repo.full_name.toLowerCase().includes(repoSearch.toLowerCase())
  )

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev)
  }, [])

  const handleNewSessionSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (newSessionInput.trim()) {
      // Dispatch event for page component with model
      const event = new CustomEvent('newSession', { 
        detail: { 
          message: newSessionInput.trim(),
          model: selectedModel
        } 
      })
      window.dispatchEvent(event)
      onNewSession?.(newSessionInput.trim())
      setNewSessionInput('')
    }
  }, [newSessionInput, onNewSession, selectedModel])

  const handleModelSelect = useCallback((modelId: string) => {
    setSelectedModel(modelId)
    localStorage.setItem(MODEL_KEY, modelId)
    setShowModelMenu(false)
  }, [])

  const handleFileSelect = useCallback(() => {
    // TODO: Implement file selection
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*,.pdf,.txt,.md,.js,.ts,.tsx,.jsx,.json,.py,.java,.cpp,.c,.h,.hpp,.css,.html,.xml,.yaml,.yml'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        // TODO: Handle file upload
        console.log('File selected:', file.name)
      }
    }
    input.click()
  }, [])

  return (
    <>
      {/* Repository Selection Modal */}
      {showRepoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#1a1a2e] border border-[#404050] rounded-lg w-full max-w-md mx-4 max-h-[80vh] flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-[#404050]">
              <h3 className="text-lg font-semibold text-white">Select Repository</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowRepoModal(false)}
                className="text-[#9ca3af] hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-4 border-b border-[#404050]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9ca3af]" />
                <input
                  type="text"
                  placeholder="Search repositories..."
                  value={repoSearch}
                  onChange={(e) => setRepoSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#2a2a3e] border border-[#404050] rounded-lg text-white placeholder-[#9ca3af] focus:outline-none focus:border-[#6841e7]"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              {loadingRepos ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[#6841e7]" />
                </div>
              ) : filteredRepos.length === 0 ? (
                <div className="text-center py-8 text-[#9ca3af]">
                  <p>No repositories found</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredRepos.map((repo) => (
                    <button
                      key={repo.id}
                      onClick={() => handleSelectRepo(repo)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-[#2a2a3e] transition-colors text-left"
                    >
                      <Github className="h-5 w-5 text-[#9ca3af] flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{repo.name}</p>
                        <p className="text-xs text-[#9ca3af] truncate">{repo.full_name}</p>
                      </div>
                      {repo.private && (
                        <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                          Private
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={`h-full w-full flex flex-col bg-[#1a1a2e] border-r border-[#404050] transition-all duration-300 text-white ${
          isCollapsed ? 'hidden' : ''
        }`}
        role="complementary"
        aria-label="File explorer"
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-[#404050]">
          <div className="mb-4">
            <h1 className="text-lg font-semibold text-white mb-1">NextEleven Code</h1>
            <span className="text-xs text-[#9ca3af] bg-[#2a2a3e] px-2 py-0.5 rounded">Research preview</span>
          </div>
          
          {/* New Session Input Box - Taller with icons */}
          <form onSubmit={handleNewSessionSubmit} className="mb-4">
            <div className="relative">
              {/* Left icons: File selector and Model menu */}
              <div className="absolute left-2 top-2 flex items-center gap-1 z-10">
                <button
                  type="button"
                  onClick={handleFileSelect}
                  className="p-1.5 text-[#9ca3af] hover:text-white hover:bg-[#2a2a3e] rounded transition-colors"
                  aria-label="Select files or photos"
                >
                  <Image className="h-4 w-4" />
                </button>
                <DropdownMenu open={showModelMenu} onOpenChange={setShowModelMenu}>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="p-1.5 text-[#9ca3af] hover:text-white hover:bg-[#2a2a3e] rounded transition-colors"
                      aria-label="Select model"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="start" 
                    className="w-56 bg-[#1a1a2e] text-white border-[#404050]"
                  >
                    <DropdownMenuLabel className="text-[#9ca3af]">Select Model</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-[#404050]" />
                    {/* Models ordered from most expensive to least */}
                    {MODEL_PRIORITY.map((modelId) => {
                      const model = GROK_MODELS[modelId]
                      if (!model) return null
                      return (
                        <DropdownMenuItem
                          key={modelId}
                          onClick={() => handleModelSelect(modelId)}
                          className={cn(
                            "text-white hover:bg-[#2a2a3e] hover:text-white cursor-pointer",
                            selectedModel === modelId && "bg-[#2a2a3e]"
                          )}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span>{model.name}</span>
                            {selectedModel === modelId && (
                              <span className="text-primary text-xs">✓</span>
                            )}
                          </div>
                        </DropdownMenuItem>
                      )
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              {/* Textarea - double height (2 lines) */}
              <textarea
                value={newSessionInput}
                onChange={(e) => setNewSessionInput(e.target.value)}
                placeholder="Find a small todo in the codebase and do it"
                className="w-full px-3 py-2 pl-20 pr-10 bg-[#2a2a3e] border border-[#404050] rounded-lg text-white text-sm placeholder-[#9ca3af] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                rows={2}
              />
              
              {/* Submit button */}
              {newSessionInput.trim() && (
                <button
                  type="submit"
                  className="absolute right-2 bottom-2 p-1.5 text-primary hover:text-primary/80 transition-colors"
                  aria-label="Start new session"
                >
                  <Sparkles className="h-4 w-4" />
                </button>
              )}
            </div>
          </form>
          
          {/* Repo Selector */}
          {connectedRepo ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 bg-[#2a2a3e] rounded-lg">
                <Github className="h-4 w-4 text-green-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate font-medium">{connectedRepo.repo}</p>
                  <p className="text-[10px] text-[#9ca3af] truncate">{connectedRepo.owner}/{connectedRepo.branch}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-white hover:text-white border-[#404050] bg-[#1a1a2e] hover:bg-[#2a2a3e] text-xs"
                onClick={handleConnectRepo}
              >
                Switch
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-white hover:text-white border-[#404050] bg-[#1a1a2e] hover:bg-[#2a2a3e]"
              onClick={handleConnectRepo}
              disabled={loading}
              aria-label="Connect GitHub repository"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin text-white" />
              ) : (
                <Github className="h-4 w-4 mr-2 text-white" />
              )}
              <span className="text-white">Connect Repo</span>
            </Button>
          )}
          
          {/* Recent Sessions - directly under Connect Repo */}
          <div className="mt-4 pt-4 border-t border-[#404050]">
            <h3 className="text-xs font-semibold text-[#9ca3af] mb-2">Sessions</h3>
            <div className="space-y-1 text-xs text-[#9ca3af]">
              {/* TODO: Load sessions from localStorage or API */}
              <div className="p-2 hover:bg-[#2a2a3e] rounded cursor-pointer">
                <p className="text-white truncate">No sessions yet</p>
                <p className="text-[10px] text-[#9ca3af]">Start a session to see history</p>
              </div>
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  )
}
