'use client'

import { useMemo, useCallback, useState, memo } from 'react'
import { Copy, Check, FileCode, Plus, Minus, Equal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { DiffLine, DiffResult } from '@/types'

/**
 * Diff Modal Component
 * Displays a side-by-side comparison of original and modified code
 */

interface DiffModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  original: string
  modified: string
  fileName?: string
  language?: string
}

// Compute diff between two strings
function computeDiff(original: string, modified: string): DiffResult {
  const originalLines = original.split('\n')
  const modifiedLines = modified.split('\n')
  const maxLines = Math.max(originalLines.length, modifiedLines.length)
  
  let additions = 0
  let deletions = 0
  let changes = 0
  
  const lines: DiffLine[] = Array.from({ length: maxLines }, (_, i) => {
    const orig = originalLines[i] || ''
    const mod = modifiedLines[i] || ''
    const lineNumber = i + 1
    
    if (orig === mod) {
      return { type: 'equal', original: orig, modified: mod, lineNumber }
    }
    if (!orig && mod) {
      additions++
      return { type: 'added', original: '', modified: mod, lineNumber }
    }
    if (orig && !mod) {
      deletions++
      return { type: 'removed', original: orig, modified: '', lineNumber }
    }
    changes++
    return { type: 'modified', original: orig, modified: mod, lineNumber }
  })
  
  return { lines, additions, deletions, changes }
}

// Line component for better performance
const DiffLineComponent = memo(function DiffLineComponent({
  line,
  side,
}: {
  line: DiffLine
  side: 'original' | 'modified'
}) {
  const content = side === 'original' ? line.original : line.modified
  const isHighlighted = 
    (side === 'original' && (line.type === 'removed' || line.type === 'modified')) ||
    (side === 'modified' && (line.type === 'added' || line.type === 'modified'))
  
  const bgColor = {
    original: {
      removed: 'bg-red-500/10',
      modified: 'bg-amber-500/10',
      added: '',
      equal: '',
    },
    modified: {
      added: 'bg-green-500/10',
      modified: 'bg-amber-500/10',
      removed: '',
      equal: '',
    },
  }
  
  return (
    <div
      className={cn(
        "flex items-start px-2 py-0.5 font-mono text-sm border-b border-[#404050]/50",
        bgColor[side][line.type]
      )}
      role="row"
    >
      <span 
        className="w-10 flex-shrink-0 text-right pr-3 text-[#9ca3af] select-none"
        aria-label={`Line ${line.lineNumber}`}
      >
        {line.lineNumber}
      </span>
      <span 
        className="w-6 flex-shrink-0 text-center"
        aria-hidden="true"
      >
        {line.type === 'added' && side === 'modified' && (
          <Plus className="h-3 w-3 text-green-400 inline" />
        )}
        {line.type === 'removed' && side === 'original' && (
          <Minus className="h-3 w-3 text-red-400 inline" />
        )}
        {line.type === 'modified' && (
          <span className="text-amber-400 text-xs">~</span>
        )}
      </span>
      <pre 
        className={cn(
          "flex-1 whitespace-pre-wrap break-all",
          line.type === 'removed' && side === 'original' && "text-red-300 line-through opacity-70",
          line.type === 'added' && side === 'modified' && "text-green-300",
          line.type === 'modified' && isHighlighted && "text-amber-300"
        )}
      >
        {content || '\u00A0'}
      </pre>
    </div>
  )
})

export const DiffModal = memo(function DiffModal({ 
  open, 
  onOpenChange, 
  original, 
  modified, 
  fileName,
  language = 'text',
}: DiffModalProps) {
  const [copiedSide, setCopiedSide] = useState<'original' | 'modified' | null>(null)
  
  // Compute diff
  const diff = useMemo(() => computeDiff(original, modified), [original, modified])
  
  // Copy handlers
  const handleCopy = useCallback(async (side: 'original' | 'modified') => {
    const content = side === 'original' ? original : modified
    try {
      await navigator.clipboard.writeText(content)
      setCopiedSide(side)
      setTimeout(() => setCopiedSide(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [original, modified])
  
  // Stats summary
  const statsSummary = useMemo(() => {
    const parts: string[] = []
    if (diff.additions > 0) parts.push(`+${diff.additions} added`)
    if (diff.deletions > 0) parts.push(`-${diff.deletions} removed`)
    if (diff.changes > 0) parts.push(`~${diff.changes} modified`)
    return parts.join(', ') || 'No changes'
  }, [diff])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[95vw] w-[1400px] max-h-[90vh] overflow-hidden flex flex-col bg-[#1a1a2e] border-[#404050]"
        aria-describedby="diff-description"
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-white">
            <FileCode className="h-5 w-5 text-[#6841e7]" aria-hidden="true" />
            {fileName || 'Code Diff'}
            <span className="text-xs font-normal text-[#9ca3af] ml-2">
              ({language})
            </span>
          </DialogTitle>
          <DialogDescription id="diff-description" className="text-[#9ca3af]">
            {statsSummary}
          </DialogDescription>
        </DialogHeader>
        
        {/* Stats bar */}
        <div className="flex items-center gap-4 px-4 py-2 bg-[#0f0f23] border-y border-[#404050] text-xs flex-shrink-0">
          <div className="flex items-center gap-1">
            <Plus className="h-3 w-3 text-green-400" aria-hidden="true" />
            <span className="text-green-400">{diff.additions} additions</span>
          </div>
          <div className="flex items-center gap-1">
            <Minus className="h-3 w-3 text-red-400" aria-hidden="true" />
            <span className="text-red-400">{diff.deletions} deletions</span>
          </div>
          <div className="flex items-center gap-1">
            <Equal className="h-3 w-3 text-amber-400" aria-hidden="true" />
            <span className="text-amber-400">{diff.changes} modifications</span>
          </div>
        </div>
        
        {/* Diff content */}
        <div className="flex-1 overflow-auto" role="table" aria-label="Code diff comparison">
          <div className="grid grid-cols-2 min-w-[800px]">
            {/* Original side */}
            <div className="border-r border-[#404050]">
              <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2 bg-[#2a2a3e] border-b border-[#404050]">
                <span className="font-semibold text-sm text-white">Original</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-[#9ca3af] hover:text-white hover:bg-[#1a1a2e]"
                  onClick={() => handleCopy('original')}
                  aria-label="Copy original code"
                >
                  {copiedSide === 'original' ? (
                    <>
                      <Check className="h-3 w-3 mr-1 text-green-400" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <div role="rowgroup">
                {diff.lines.map((line, i) => (
                  <DiffLineComponent key={i} line={line} side="original" />
                ))}
              </div>
            </div>
            
            {/* Modified side */}
            <div>
              <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2 bg-[#2a2a3e] border-b border-[#404050]">
                <span className="font-semibold text-sm text-white">Modified</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-[#9ca3af] hover:text-white hover:bg-[#1a1a2e]"
                  onClick={() => handleCopy('modified')}
                  aria-label="Copy modified code"
                >
                  {copiedSide === 'modified' ? (
                    <>
                      <Check className="h-3 w-3 mr-1 text-green-400" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <div role="rowgroup">
                {diff.lines.map((line, i) => (
                  <DiffLineComponent key={i} line={line} side="modified" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
})
