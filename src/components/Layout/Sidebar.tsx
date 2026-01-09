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
  Search
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FileTree } from '@/components/FileTree'
import type { FileNode } from '@/types'

const STORAGE_KEY = 'grokcode_fileTree'
const REPO_KEY = 'grokcode_connectedRepo'

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
}

export default function Sidebar({ onFileSelect, selectedPath, onRepoConnect }: SidebarProps) {
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

  // Load saved repo from localStorage
  useEffect(() => {
    try {
      const savedRepo = localStorage.getItem(REPO_KEY)
      if (savedRepo) {
        const parsed = JSON.parse(savedRepo)
        setConnectedRepo(parsed)
        onRepoConnect?.(parsed)
      }
    } catch (e) {
      console.error('Failed to load saved repo:', e)
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
        className={`bg-[#1a1a2e] border-r border-[#404050] transition-all duration-300 text-white ${
          isCollapsed ? 'w-0 overflow-hidden hidden' : 'w-[240px] min-w-[240px] max-w-[320px]'
        } flex flex-col h-full hidden md:flex`}
        role="complementary"
        aria-label="File explorer"
      >
        <div className="p-4 border-b border-[#404050]">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-white" id="sidebar-title">Files</h2>
            <div className="flex items-center gap-1">
              {files.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-white hover:bg-[#2a2a3e]"
                  onClick={handleRefresh}
                  disabled={loading}
                  aria-label="Refresh files"
                >
                  <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white hover:bg-[#2a2a3e]"
                onClick={toggleCollapse}
                aria-expanded={!isCollapsed}
                aria-controls="file-tree"
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          
          {/* Connected repo info or connect button */}
          {connectedRepo ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 bg-[#2a2a3e] rounded-lg">
                <Github className="h-4 w-4 text-green-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate font-medium">{connectedRepo.repo}</p>
                  <p className="text-[10px] text-[#9ca3af] truncate">{connectedRepo.owner}/{connectedRepo.branch}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-white hover:text-white border-[#404050] bg-[#1a1a2e] hover:bg-[#2a2a3e] text-xs"
                  onClick={handleConnectRepo}
                >
                  Switch
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-400 hover:text-red-300 border-[#404050] bg-[#1a1a2e] hover:bg-red-500/10 text-xs"
                  onClick={handleDisconnectRepo}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
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

      <div 
        id="file-tree"
        className="flex-1 overflow-y-auto p-2"
        role="tree"
        aria-labelledby="sidebar-title"
      >
        {error && (
          <div className="flex items-center gap-2 p-2 mb-2 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-xs">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        
        {loading ? (
          <div className="flex items-center justify-center py-8" role="status" aria-label="Loading files">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="sr-only">Loading files...</span>
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-8 text-[#9ca3af] text-sm">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50 text-[#9ca3af]" aria-hidden="true" />
            <p className="text-[#9ca3af]">No files loaded</p>
            <p className="text-xs mt-1 text-[#9ca3af]">Connect a GitHub repo to get started</p>
          </div>
        ) : (
          <FileTree 
            files={files} 
            onFileSelect={onFileSelect}
            selectedPath={selectedPath}
          />
        )}
      </div>
      </motion.aside>
    </>
  )
}
