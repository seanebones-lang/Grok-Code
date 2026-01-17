'use client'

import { useState, useEffect, useCallback } from 'react'
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
  MoreVertical,
  Star,
  Pin,
  Plus,
  Trash2,
  MessageSquare,
  Clock,
  Workflow,
  ToggleLeft,
  ToggleRight,
  Activity,
  Shield,
  TestTube,
  Package,
  Gauge,
  Zap,
  Play,
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
import { GROK_MODELS, MODEL_PRIORITY, DEFAULT_MODEL } from '@/lib/grok-models'
import { getAllAgents } from '@/lib/specialized-agents'
import { sessionManager, type SessionSummary } from '@/lib/session-manager'
import { isOrchestratorModeEnabled, setOrchestratorMode } from '@/lib/orchestrator'
import { healthDashboard, type HealthReport, formatTimeAgo } from '@/lib/health-dashboard'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'nexteleven_fileTree'
const REPO_KEY = 'nexteleven_connectedRepo'
const MODEL_KEY = 'nexteleven_selectedModel'
const ENVIRONMENT_KEY = 'nexteleven_environment'
const PINNED_AGENTS_KEY = 'nexteleven_pinnedAgents'

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
  const [environment, setEnvironment] = useState<'cloud' | 'other'>('cloud')
  const [showAllAgents, setShowAllAgents] = useState(false)
  const [pinnedAgents, setPinnedAgents] = useState<Set<string>>(new Set())
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [showAllSessions, setShowAllSessions] = useState(false)
  const [orchestratorMode, setOrchestratorModeState] = useState(false)
  const [healthReport, setHealthReport] = useState<HealthReport | null>(null)
  const [healthExpanded, setHealthExpanded] = useState(false)

  // Load saved repo, model, and pinned agents from localStorage
  useEffect(() => {
    // Safety check for client-side
    if (typeof window === 'undefined') return
    
    try {
      const savedRepo = localStorage.getItem(REPO_KEY)
      if (savedRepo) {
        try {
          const parsed = JSON.parse(savedRepo)
          setConnectedRepo(parsed)
          onRepoConnect?.(parsed)
        } catch (e) {
          console.error('Failed to parse saved repo:', e)
        }
      }
      
      try {
        const savedModel = localStorage.getItem(MODEL_KEY)
        if (savedModel && savedModel in GROK_MODELS) {
          setSelectedModel(savedModel)
        }
      } catch (e) {
        console.error('Failed to load model:', e)
      }
      
      try {
        const savedEnv = localStorage.getItem(ENVIRONMENT_KEY)
        if (savedEnv === 'other' || savedEnv === 'cloud') {
          setEnvironment(savedEnv)
        }
      } catch (e) {
        console.error('Failed to load environment:', e)
      }
      
      try {
        const savedPinned = localStorage.getItem(PINNED_AGENTS_KEY)
        if (savedPinned) {
          setPinnedAgents(new Set(JSON.parse(savedPinned)))
        }
      } catch (e) {
        console.error('Failed to load pinned agents:', e)
      }
      
      // Load orchestrator mode
      try {
        setOrchestratorModeState(isOrchestratorModeEnabled())
      } catch (e) {
        console.error('Failed to load orchestrator mode:', e)
      }
      
      // Load health report
      try {
        setHealthReport(healthDashboard.load())
      } catch (e) {
        console.error('Failed to load health report:', e)
      }
    } catch (e) {
      console.error('Failed to load saved data:', e)
    }
  }, [onRepoConnect])

  // Toggle orchestrator mode
  const handleToggleOrchestratorMode = useCallback(() => {
    const newValue = !orchestratorMode
    setOrchestratorModeState(newValue)
    setOrchestratorMode(newValue)
    window.dispatchEvent(new CustomEvent('orchestratorModeChanged', { detail: { enabled: newValue } }))
  }, [orchestratorMode])

  // Run health scan
  const handleRunScan = useCallback((type: 'security' | 'coverage' | 'dependencies' | 'techDebt' | 'performance' | 'full') => {
    const prompts = healthDashboard.prompts
    const prompt = prompts[type]()
    
    const event = new CustomEvent('newSession', { 
      detail: { message: prompt } 
    })
    window.dispatchEvent(event)
  }, [])

  // Get status color
  const getStatusColor = (status: 'good' | 'warning' | 'critical' | undefined) => {
    switch (status) {
      case 'good': return 'text-green-400'
      case 'warning': return 'text-yellow-400'
      case 'critical': return 'text-red-400'
      default: return 'text-[#606070]'
    }
  }

  // Get status bg
  const getStatusBg = (status: 'good' | 'warning' | 'critical' | undefined) => {
    switch (status) {
      case 'good': return 'bg-green-400'
      case 'warning': return 'bg-yellow-400'
      case 'critical': return 'bg-red-400'
      default: return 'bg-[#606070]'
    }
  }

  // Toggle agent pinning
  const togglePinAgent = useCallback((agentId: string) => {
    setPinnedAgents(prev => {
      const newPinned = new Set(prev)
      if (newPinned.has(agentId)) {
        newPinned.delete(agentId)
      } else {
        newPinned.add(agentId)
      }
      localStorage.setItem(PINNED_AGENTS_KEY, JSON.stringify([...newPinned]))
      return newPinned
    })
  }, [])

  // Get sorted agents (pinned first)
  const getSortedAgents = useCallback(() => {
    const allAgents = getAllAgents()
    const pinned = allAgents.filter(a => pinnedAgents.has(a.id))
    const unpinned = allAgents.filter(a => !pinnedAgents.has(a.id))
    return [...pinned, ...unpinned]
  }, [pinnedAgents])

  // Load sessions and listen for updates
  useEffect(() => {
    const loadSessions = () => {
      setSessions(sessionManager.getRecent(20))
    }
    
    loadSessions()
    
    // Listen for session updates
    const handleSessionUpdate = () => loadSessions()
    window.addEventListener('sessionUpdated', handleSessionUpdate)
    
    // Also refresh on newSession events
    window.addEventListener('newSession', handleSessionUpdate)
    
    return () => {
      window.removeEventListener('sessionUpdated', handleSessionUpdate)
      window.removeEventListener('newSession', handleSessionUpdate)
    }
  }, [])

  // Create new session
  const handleNewSession = useCallback(() => {
    const event = new CustomEvent('newSession', { 
      detail: { message: '', forceNew: true } 
    })
    window.dispatchEvent(event)
  }, [])

  // Switch to session
  const handleSwitchSession = useCallback((sessionId: string) => {
    const session = sessionManager.switch(sessionId)
    if (session) {
      const event = new CustomEvent('loadSession', { detail: { session } })
      window.dispatchEvent(event)
    }
  }, [])

  // Delete session
  const handleDeleteSession = useCallback((sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    sessionManager.delete(sessionId)
    setSessions(sessionManager.getRecent(20))
    window.dispatchEvent(new CustomEvent('sessionUpdated'))
  }, [])

  // Format relative time
  const formatRelativeTime = useCallback((date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }, [])

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
    setLoadingRepos(true)
    try {
      // Get GitHub token from localStorage
      const githubToken = localStorage.getItem('nexteleven_github_token')
      
      const response = await fetch('/api/github/repos', {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          ...(githubToken && { 'X-Github-Token': githubToken }),
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
  }, [])

  // Fetch file tree for a repository
  const fetchFileTree = useCallback(async (owner: string, repo: string, branch: string) => {
    setLoading(true)
    setError(null)
    
    try {
      // Get GitHub token from localStorage
      const githubToken = localStorage.getItem('nexteleven_github_token')
      
      if (!githubToken) {
        throw new Error('GitHub token not found. Please configure it in the setup screen.')
      }
      
      // Use API route that handles GitHub token
      const response = await fetch(
        `/api/github/tree?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&branch=${encodeURIComponent(branch)}`,
        {
          headers: {
            Accept: 'application/vnd.github.v3+json',
            'X-Github-Token': githubToken,
          },
        }
      )
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to fetch file tree')
      }
      
      if (!data.tree || !Array.isArray(data.tree)) {
        throw new Error('Invalid response from server')
      }
      
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
      setError(null) // Clear any previous errors on success
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to fetch file tree'
      console.error('Failed to fetch file tree:', e)
      setError(errorMessage)
      // Don't clear files on error - keep what we have
    } finally {
      setLoading(false)
    }
  }, [])

  const handleConnectRepo = useCallback(async () => {
    // Check if we have a GitHub token before showing modal
    const githubToken = localStorage.getItem('nexteleven_github_token')
    if (!githubToken) {
      setError('Please configure your GitHub token in the setup screen first')
      return
    }
    
    setShowRepoModal(true)
    setError(null) // Clear any previous errors
    fetchRepos()
  }, [fetchRepos])

  const handleSelectRepo = useCallback(async (repo: Repository) => {
    const repoInfo = {
      owner: repo.owner.login,
      repo: repo.name,
      branch: repo.default_branch,
    }
    
    // Close modal first to avoid UI issues
    setShowRepoModal(false)
    
    try {
      setConnectedRepo(repoInfo)
      localStorage.setItem(REPO_KEY, JSON.stringify(repoInfo))
      onRepoConnect?.(repoInfo)
      
      // Dispatch event for page component
      const event = new CustomEvent('repoConnect', { detail: { repo: repoInfo } })
      window.dispatchEvent(event)
      
      // Fetch the file tree - handle errors gracefully
      await fetchFileTree(repo.owner.login, repo.name, repo.default_branch)
    } catch (error) {
      console.error('Failed to connect repository:', error)
      setError('Failed to load repository. Please try again.')
      // Don't reset state on error - keep repo selected
    }
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
      // Dispatch event for page component with model, environment, and repository
      const event = new CustomEvent('newSession', { 
        detail: { 
          message: newSessionInput.trim(),
          model: selectedModel,
          environment: environment,
          repository: connectedRepo
        } 
      })
      window.dispatchEvent(event)
      onNewSession?.(newSessionInput.trim())
      setNewSessionInput('')
    }
  }, [newSessionInput, onNewSession, selectedModel, environment, connectedRepo])

  const handleModelSelect = useCallback((modelId: string) => {
    setSelectedModel(modelId)
    localStorage.setItem(MODEL_KEY, modelId)
    setShowModelMenu(false)
  }, [])

  const handleEnvironmentChange = useCallback((env: 'cloud' | 'other') => {
    setEnvironment(env)
    localStorage.setItem(ENVIRONMENT_KEY, env)
    // Dispatch event for other components
    const event = new CustomEvent('environmentChange', { detail: { environment: env } })
    window.dispatchEvent(event)
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
            
            <div className="p-4 border-b border-[#404050] space-y-3">
              <div>
                <label className="block text-xs text-[#9ca3af] mb-2">GitHub Personal Access Token</label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-3 py-2 bg-[#2a2a3e] border border-[#404050] rounded-lg text-white placeholder-[#9ca3af] focus:outline-none focus:border-[#6841e7] text-sm"
                    onBlur={(e) => {
                      const token = e.target.value.trim()
                      if (token) {
                        // Store token suggestion (they still need to add to Vercel, but show instructions)
                        localStorage.setItem('github_token_suggestion', token)
                      }
                    }}
                  />
                </div>
                <p className="text-[10px] text-[#606070] mt-1">
                  Get token from: <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">github.com/settings/tokens</a>
                </p>
                <p className="text-[10px] text-[#606070] mt-1">
                  Add this to Vercel env vars as <code className="bg-[#2a2a3e] px-1 rounded">GITHUB_TOKEN</code> and redeploy
                </p>
              </div>
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
                  <p className="text-xs text-[#606070] mt-2">Set GITHUB_TOKEN in Vercel to see your repos</p>
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
        {/* Brand Header - Fixed */}
        <div className="flex-shrink-0 p-4 border-b border-[#404050]">
          <div className="mb-4">
            <h1 className="text-lg font-semibold text-white mb-1">NextEleven Code</h1>
            <span className="text-xs text-[#9ca3af] bg-[#2a2a3e] px-2 py-0.5 rounded">Research preview</span>
          </div>
          
          {/* New Session Input Box - Taller with icons */}
          <form onSubmit={handleNewSessionSubmit} className="mb-4">
            <div className="relative">
              {/* Textarea - double height (2 lines) with proper padding for icons */}
              <textarea
                value={newSessionInput}
                onChange={(e) => setNewSessionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (newSessionInput.trim()) {
                      const form = e.currentTarget.closest('form')
                      if (form) {
                        form.requestSubmit()
                      }
                    }
                  }
                }}
                placeholder="Find a small todo in the codebase and do it"
                className="w-full px-3 py-2 pl-20 pr-32 bg-[#2a2a3e] border border-[#404050] rounded-lg text-white text-sm placeholder-[#9ca3af] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                rows={2}
              />
              
              {/* Left icons: File selector and Model menu - positioned inside but above text */}
              <div className="absolute left-2 top-2 flex items-center gap-1 z-10 pointer-events-auto">
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
              
              {/* Right side: Environment selector and Send button */}
              <div className="absolute right-2 top-2 flex items-center gap-2 z-10">
                {/* Environment selector - clean like Claude */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="px-2 py-1 text-xs text-[#9ca3af] hover:text-white hover:bg-[#2a2a3e] rounded transition-colors"
                      aria-label="Select environment"
                    >
                      {environment === 'cloud' ? 'Cloud' : 'Other'}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="end" 
                    className="w-32 bg-[#1a1a2e] text-white border-[#404050]"
                  >
                    <DropdownMenuItem
                      onClick={() => handleEnvironmentChange('cloud')}
                      className={cn(
                        "text-white hover:bg-[#2a2a3e] hover:text-white cursor-pointer text-sm",
                        environment === 'cloud' && "bg-[#2a2a3e]"
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>Cloud</span>
                        {environment === 'cloud' && (
                          <span className="text-primary text-xs">✓</span>
                        )}
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleEnvironmentChange('other')}
                      className={cn(
                        "text-white hover:bg-[#2a2a3e] hover:text-white cursor-pointer text-sm",
                        environment === 'other' && "bg-[#2a2a3e]"
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>Other</span>
                        {environment === 'other' && (
                          <span className="text-primary text-xs">✓</span>
                        )}
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {/* Send arrow button */}
                <button
                  type="submit"
                  disabled={!newSessionInput.trim()}
                  className="p-1.5 text-[#9ca3af] hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Start new session"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
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
        </div>
          
        {/* Scrollable Content Area */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          {/* Orchestrator Mode Toggle */}
          <div className="pt-4 px-4">
            <button
              onClick={handleToggleOrchestratorMode}
              className={cn(
                "w-full p-3 rounded-lg border transition-all flex items-center gap-3",
                orchestratorMode 
                  ? "bg-primary/10 border-primary/50 hover:bg-primary/20" 
                  : "bg-[#1a1a2e] border-[#404050] hover:bg-[#2a2a3e]"
              )}
            >
              <div className={cn(
                "p-2 rounded-lg",
                orchestratorMode ? "bg-primary/20" : "bg-[#2a2a3e]"
              )}>
                <Workflow className={cn(
                  "h-4 w-4",
                  orchestratorMode ? "text-primary" : "text-[#9ca3af]"
                )} />
              </div>
              <div className="flex-1 text-left">
                <p className={cn(
                  "text-xs font-semibold",
                  orchestratorMode ? "text-primary" : "text-white"
                )}>
                  Auto-Orchestrator
                </p>
                <p className="text-[10px] text-[#9ca3af]">
                  {orchestratorMode ? 'ON - Routes to best agent' : 'OFF - Direct input'}
                </p>
              </div>
              {orchestratorMode ? (
                <ToggleRight className="h-5 w-5 text-primary" />
              ) : (
                <ToggleLeft className="h-5 w-5 text-[#606070]" />
              )}
            </button>
          </div>

          {/* Health Dashboard (Collapsed) */}
          <div className="mt-3 px-4">
            <button
              onClick={() => setHealthExpanded(!healthExpanded)}
              className="w-full p-2 rounded-lg bg-[#1a1a2e] border border-[#404050] hover:bg-[#2a2a3e] transition-all flex items-center gap-2"
            >
              <Activity className="h-4 w-4 text-[#9ca3af]" />
              <span className="text-xs font-medium text-white flex-1 text-left">Health</span>
              {healthReport?.overall.lastChecked ? (
                <>
                  <span className={cn("text-xs font-bold", getStatusColor(healthReport.overall.status))}>
                    {healthReport.overall.score}/100
                  </span>
                  <div className={cn("w-2 h-2 rounded-full", getStatusBg(healthReport.overall.status))} />
                </>
              ) : (
                <span className="text-[10px] text-[#606070]">Not scanned</span>
              )}
              {healthExpanded ? (
                <ChevronDown className="h-3 w-3 text-[#606070]" />
              ) : (
                <ChevronRight className="h-3 w-3 text-[#606070]" />
              )}
            </button>
            
            {/* Expanded Health Panel */}
            {healthExpanded && (
              <div className="mt-2 p-3 rounded-lg bg-[#1a1a2e] border border-[#404050] space-y-2">
                {/* Metrics */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-[#9ca3af]">
                      <Shield className="h-3 w-3" /> Security
                    </span>
                    <span className={getStatusColor(healthReport?.security.status)}>
                      {healthReport?.security.lastChecked ? `${healthReport.security.score}` : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-[#9ca3af]">
                      <TestTube className="h-3 w-3" /> Coverage
                    </span>
                    <span className={getStatusColor(healthReport?.coverage.status)}>
                      {healthReport?.coverage.lastChecked ? `${healthReport.coverage.score}%` : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-[#9ca3af]">
                      <Package className="h-3 w-3" /> Dependencies
                    </span>
                    <span className={getStatusColor(healthReport?.dependencies.status)}>
                      {healthReport?.dependencies.lastChecked ? `${healthReport.dependencies.score}` : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-[#9ca3af]">
                      <Gauge className="h-3 w-3" /> Tech Debt
                    </span>
                    <span className={getStatusColor(healthReport?.techDebt.status)}>
                      {healthReport?.techDebt.lastChecked ? `${healthReport.techDebt.score}` : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-[#9ca3af]">
                      <Zap className="h-3 w-3" /> Performance
                    </span>
                    <span className={getStatusColor(healthReport?.performance.status)}>
                      {healthReport?.performance.lastChecked ? `${healthReport.performance.score}` : '—'}
                    </span>
                  </div>
                </div>
                
                {/* Last scan info */}
                {healthReport?.lastFullScan && (
                  <p className="text-[10px] text-[#606070] pt-1 border-t border-[#404050]">
                    Last scan: {formatTimeAgo(healthReport.lastFullScan)}
                  </p>
                )}
                
                {/* Run Scan Button */}
                <button
                  onClick={() => handleRunScan('full')}
                  className="w-full mt-2 p-2 rounded bg-primary/20 hover:bg-primary/30 text-primary text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Play className="h-3 w-3" />
                  Run Full Audit
                </button>
              </div>
            )}
          </div>

          {/* Specialized Agents - Compact Dropdown */}
          <div className="mt-3 px-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full p-2 rounded-lg bg-[#1a1a2e] border border-[#404050] hover:bg-[#2a2a3e] transition-all flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-white flex-1 text-left">
                    Agents
                    <span className="text-[#606070] ml-1">({getAllAgents().length})</span>
                  </span>
                  {pinnedAgents.size > 0 && (
                    <span className="text-[10px] text-yellow-400">⭐{pinnedAgents.size}</span>
                  )}
                  <ChevronDown className="h-3 w-3 text-[#606070]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                className="w-72 max-h-[400px] overflow-y-auto bg-[#1a1a2e] border-[#404050]"
                align="start"
              >
                {pinnedAgents.size > 0 && (
                  <>
                    <DropdownMenuLabel className="text-[10px] text-yellow-400">⭐ Pinned</DropdownMenuLabel>
                    {getSortedAgents().filter(a => pinnedAgents.has(a.id)).map((agent) => (
                      <DropdownMenuItem
                        key={agent.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-[#2a2a3e] focus:bg-[#2a2a3e]"
                        onClick={() => {
                          const event = new CustomEvent('newSession', { 
                            detail: { message: `/agent ${agent.id}` } 
                          })
                          window.dispatchEvent(event)
                        }}
                      >
                        <span className="text-base">{agent.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm truncate">{agent.name}</p>
                          <p className="text-[10px] text-[#9ca3af] truncate">{agent.description}</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); togglePinAgent(agent.id) }}
                          className="text-yellow-400 hover:text-yellow-300 p-1"
                        >
                          <Star className="h-3 w-3 fill-current" />
                        </button>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator className="bg-[#404050]" />
                  </>
                )}
                <DropdownMenuLabel className="text-[10px] text-[#9ca3af]">All Agents</DropdownMenuLabel>
                {getSortedAgents().filter(a => !pinnedAgents.has(a.id)).map((agent) => (
                  <DropdownMenuItem
                    key={agent.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-[#2a2a3e] focus:bg-[#2a2a3e] group"
                    onClick={() => {
                      const event = new CustomEvent('newSession', { 
                        detail: { message: `/agent ${agent.id}` } 
                      })
                      window.dispatchEvent(event)
                    }}
                  >
                    <span className="text-base">{agent.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{agent.name}</p>
                      <p className="text-[10px] text-[#9ca3af] truncate">{agent.description}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); togglePinAgent(agent.id) }}
                      className="text-[#404050] hover:text-yellow-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Star className="h-3 w-3" />
                    </button>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* File Tree - Show when repo is connected */}
          {connectedRepo && (
            <div className="mt-4 pt-4 border-t border-[#404050] px-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-[#9ca3af] flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  Files
                  {loading && (
                    <Loader2 className="h-3 w-3 animate-spin ml-1" />
                  )}
                </h3>
                <button
                  onClick={handleRefresh}
                  className="p-1 rounded hover:bg-[#2a2a3e] text-[#9ca3af] hover:text-white transition-colors"
                  title="Refresh file tree"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              </div>
              
              {error && (
                <div className="mb-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-xs">
                  <div className="flex items-start gap-1.5">
                    <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                </div>
              )}
              
              {files.length > 0 ? (
                <FileTree
                  files={files}
                  onFileSelect={onFileSelect}
                  selectedPath={selectedPath}
                  className="text-sm"
                />
              ) : !loading && !error ? (
                <p className="text-xs text-[#606070] text-center py-4">No files loaded</p>
              ) : null}
            </div>
          )}

          {/* Recent Sessions - directly under Agents */}
          <div className="mt-4 pt-4 border-t border-[#404050] px-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-[#9ca3af] flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                Sessions
                {sessions.length > 0 && (
                  <span className="text-[#606070]">({sessions.length})</span>
                )}
              </h3>
              <div className="flex items-center gap-1">
                {sessions.length > 5 && (
                  <button
                    onClick={() => setShowAllSessions(!showAllSessions)}
                    className="text-[10px] text-primary hover:text-primary/80 transition-colors"
                  >
                    {showAllSessions ? 'Less' : 'More'}
                  </button>
                )}
                <button
                  onClick={handleNewSession}
                  className="p-1 rounded hover:bg-[#2a2a3e] text-[#9ca3af] hover:text-white transition-colors"
                  title="New session"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
            <div className="space-y-1 text-xs max-h-[300px] overflow-y-auto">
              {sessions.length === 0 ? (
                <div className="p-3 text-center text-[#606070]">
                  <MessageSquare className="h-6 w-6 mx-auto mb-2 opacity-50" />
                  <p>No sessions yet</p>
                  <p className="text-[10px] mt-1">Start chatting to create one</p>
                </div>
              ) : (
                (showAllSessions ? sessions : sessions.slice(0, 5)).map((session) => (
                  <div
                    key={session.id}
                    onClick={() => handleSwitchSession(session.id)}
                    className="p-2 hover:bg-[#2a2a3e] rounded cursor-pointer text-left transition-colors group relative"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          {session.agentName && (
                            <span className="text-xs">{getAllAgents().find(a => a.id === session.agentId)?.emoji || '💬'}</span>
                          )}
                          <p className="text-white truncate font-medium group-hover:text-primary transition-colors text-xs">
                            {session.title}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-[#606070] flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {formatRelativeTime(session.updatedAt)}
                          </span>
                          <span className="text-[10px] text-[#606070]">
                            {session.messageCount} msgs
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-[#606070] hover:text-red-400 transition-all"
                        title="Delete session"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        
      </motion.aside>
    </>
  )
}
