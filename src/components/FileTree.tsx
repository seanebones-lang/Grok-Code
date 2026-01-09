'use client'

import { useState, useCallback, memo, useMemo, KeyboardEvent } from 'react'
import { FileText, Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FileNode } from '@/types'

// File extension to icon color mapping
const FILE_COLORS: Record<string, string> = {
  ts: 'text-blue-400',
  tsx: 'text-blue-400',
  js: 'text-yellow-400',
  jsx: 'text-yellow-400',
  py: 'text-green-400',
  json: 'text-amber-400',
  md: 'text-gray-400',
  css: 'text-pink-400',
  scss: 'text-pink-400',
  html: 'text-orange-400',
  yml: 'text-purple-400',
  yaml: 'text-purple-400',
}

function getFileColor(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  return FILE_COLORS[ext] || 'text-muted-foreground'
}

interface FileTreeProps {
  files: FileNode[]
  onFileSelect?: (path: string) => void
  selectedPath?: string
  className?: string
}

export function FileTree({ files, onFileSelect, selectedPath, className }: FileTreeProps) {
  // Sort files: folders first, then alphabetically
  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })
  }, [files])

  if (files.length === 0) {
    return null
  }

  return (
    <div className={cn("space-y-0.5", className)} role="tree" aria-label="File tree">
      {sortedFiles.map((file) => (
        <TreeNode
          key={file.path}
          node={file}
          onFileSelect={onFileSelect}
          selectedPath={selectedPath}
          level={0}
        />
      ))}
    </div>
  )
}

interface TreeNodeProps {
  node: FileNode
  onFileSelect?: (path: string) => void
  selectedPath?: string
  level: number
}

const TreeNode = memo(function TreeNode({ 
  node, 
  onFileSelect, 
  selectedPath,
  level 
}: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const isSelected = selectedPath === node.path
  const fileColor = node.type === 'file' ? getFileColor(node.name) : 'text-muted-foreground'

  const handleClick = useCallback(() => {
    if (node.type === 'file') {
      onFileSelect?.(node.path)
    } else {
      setIsExpanded(prev => !prev)
    }
  }, [node.type, node.path, onFileSelect])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    } else if (e.key === 'ArrowRight' && node.type === 'folder' && !isExpanded) {
      e.preventDefault()
      setIsExpanded(true)
    } else if (e.key === 'ArrowLeft' && node.type === 'folder' && isExpanded) {
      e.preventDefault()
      setIsExpanded(false)
    }
  }, [handleClick, node.type, isExpanded])

  // Sort children if folder
  const sortedChildren = useMemo(() => {
    if (!node.children) return []
    return [...node.children].sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })
  }, [node.children])

  if (node.type === 'file') {
    return (
      <div
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm",
          "hover:bg-[#2a2a3e] transition-colors focus:outline-none focus:ring-2 focus:ring-[#6841e7] focus:ring-offset-1 focus:ring-offset-[#1a1a2e]",
          isSelected && "bg-[#6841e7]/20 text-white"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="treeitem"
        tabIndex={0}
        aria-selected={isSelected}
        aria-label={`File: ${node.name}`}
      >
        <FileText className={cn("h-4 w-4 flex-shrink-0", fileColor)} aria-hidden="true" />
        <span className="flex-1 truncate text-white">{node.name}</span>
      </div>
    )
  }

  return (
    <div role="treeitem" aria-expanded={isExpanded}>
      <div
        className={cn(
          "flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer text-sm",
          "hover:bg-[#2a2a3e] transition-colors focus:outline-none focus:ring-2 focus:ring-[#6841e7] focus:ring-offset-1 focus:ring-offset-[#1a1a2e]"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        aria-label={`Folder: ${node.name}, ${isExpanded ? 'expanded' : 'collapsed'}`}
      >
        <span className="flex-shrink-0" aria-hidden="true">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </span>
        <span className="flex-shrink-0" aria-hidden="true">
          {isExpanded ? (
            <FolderOpen className="h-4 w-4 text-amber-400" />
          ) : (
            <Folder className="h-4 w-4 text-amber-400" />
          )}
        </span>
        <span className="flex-1 truncate text-white font-medium">{node.name}</span>
        {node.children && (
          <span className="text-xs text-muted-foreground" aria-label={`${node.children.length} items`}>
            {node.children.length}
          </span>
        )}
      </div>
      {isExpanded && sortedChildren.length > 0 && (
        <div role="group" aria-label={`Contents of ${node.name}`}>
          {sortedChildren.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              onFileSelect={onFileSelect}
              selectedPath={selectedPath}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
})
