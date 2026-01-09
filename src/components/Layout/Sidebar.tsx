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
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FileTree } from '@/components/FileTree'
import type { FileNode } from '@/types'

const STORAGE_KEY = 'grokcode_fileTree'

interface SidebarProps {
  onFileSelect?: (path: string) => void
  selectedPath?: string
}

export default function Sidebar({ onFileSelect, selectedPath }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [files, setFiles] = useState<FileNode[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const handleConnectRepo = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      // TODO: Implement GitHub repository connection
      // This would open a modal to select a repository
      console.log('Connect repo clicked')
    } catch (e) {
      setError('Failed to connect repository')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleRefresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      // TODO: Implement file refresh from GitHub
      loadSavedFiles()
    } catch (e) {
      setError('Failed to refresh files')
    } finally {
      setLoading(false)
    }
  }, [loadSavedFiles])

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev)
  }, [])

  return (
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
  )
}
