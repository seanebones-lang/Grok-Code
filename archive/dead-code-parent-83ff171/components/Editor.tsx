'use client'

import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import dynamic from 'next/dynamic'
import { Loader2, FileCode, Copy, Check, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { SupportedLanguage } from '@/types'

// Lazy load Monaco Editor with optimized chunking
const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then(mod => mod.default),
  {
  ssr: false,
  loading: () => (
      <div className="flex flex-col items-center justify-center h-full bg-[#1e1e1e]">
        <Loader2 className="h-8 w-8 animate-spin text-[#6841e7] mb-3" />
        <span className="text-sm text-[#9ca3af]">Loading editor...</span>
    </div>
  ),
  }
)

// Language mapping with file extension detection
const LANGUAGE_MAP: Record<string, SupportedLanguage> = {
        'ts': 'typescript',
        'tsx': 'typescript',
        'js': 'javascript',
        'jsx': 'javascript',
  'mjs': 'javascript',
  'cjs': 'javascript',
        'py': 'python',
  'pyw': 'python',
        'java': 'java',
        'cpp': 'cpp',
  'cc': 'cpp',
  'cxx': 'cpp',
        'c': 'c',
  'h': 'c',
  'hpp': 'cpp',
        'cs': 'csharp',
        'go': 'go',
        'rs': 'rust',
        'php': 'php',
        'rb': 'ruby',
        'swift': 'swift',
        'kt': 'kotlin',
  'kts': 'kotlin',
        'scala': 'scala',
        'sh': 'shell',
        'bash': 'shell',
        'zsh': 'shell',
  'fish': 'shell',
        'json': 'json',
  'jsonc': 'json',
        'yaml': 'yaml',
        'yml': 'yaml',
        'xml': 'xml',
        'html': 'html',
  'htm': 'html',
        'css': 'css',
        'scss': 'scss',
        'sass': 'sass',
        'less': 'less',
        'md': 'markdown',
  'mdx': 'markdown',
        'sql': 'sql',
        'dockerfile': 'dockerfile',
        'vue': 'vue',
        'svelte': 'svelte',
  'prisma': 'plaintext',
  'env': 'plaintext',
  'gitignore': 'plaintext',
  'toml': 'plaintext',
}

// Monaco editor options optimized for performance
const EDITOR_OPTIONS = {
  fontSize: 14,
  fontFamily: 'var(--font-mono), "JetBrains Mono", Monaco, Menlo, "Courier New", monospace',
  fontLigatures: true,
  minimap: { 
    enabled: true,
    maxColumn: 80,
    renderCharacters: false, // Performance optimization
  },
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 2,
  wordWrap: 'on' as const,
  lineNumbers: 'on' as const,
  renderLineHighlight: 'all' as const,
  selectOnLineNumbers: true,
  roundedSelection: false,
  readOnly: false,
  cursorStyle: 'line' as const,
  cursorBlinking: 'smooth' as const,
  smoothScrolling: true,
  padding: { top: 16, bottom: 16 },
  bracketPairColorization: { enabled: true },
  guides: {
    bracketPairs: true,
    indentation: true,
  },
  suggest: {
    showKeywords: true,
    showSnippets: true,
  },
  quickSuggestions: {
    other: true,
    comments: false,
    strings: false,
  },
  // Performance optimizations
  renderWhitespace: 'selection' as const,
  renderControlCharacters: false,
  renderIndentGuides: true,
  folding: true,
  foldingStrategy: 'indentation' as const,
  showFoldingControls: 'mouseover' as const,
  matchBrackets: 'always' as const,
  occurrencesHighlight: 'singleFile' as const,
} as const

interface EditorProps {
  filePath?: string
  content?: string
  onChange?: (value: string | undefined) => void
  readOnly?: boolean
  className?: string
}

export const Editor = memo(function Editor({ 
  filePath, 
  content = '', 
  onChange,
  readOnly = false,
  className,
}: EditorProps) {
  const [editorContent, setEditorContent] = useState(content)
  const [copied, setCopied] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  // Detect language from file path
  const language = useMemo(() => {
    if (!filePath) return 'typescript'
    
    const fileName = filePath.split('/').pop() || ''
    
    // Handle special filenames
    if (fileName.toLowerCase() === 'dockerfile') return 'dockerfile'
    if (fileName.startsWith('.')) {
      const name = fileName.slice(1).toLowerCase()
      if (name === 'gitignore' || name === 'dockerignore') return 'plaintext'
      if (name === 'env' || name.startsWith('env.')) return 'plaintext'
    }
    
    const ext = fileName.split('.').pop()?.toLowerCase() || ''
    return LANGUAGE_MAP[ext] || 'plaintext'
  }, [filePath])

  // Sync content from props
  useEffect(() => {
    setEditorContent(content)
    setIsDirty(false)
  }, [content])

  // Handle editor changes with debouncing
  const handleEditorChange = useCallback((value: string | undefined) => {
    const newValue = value || ''
    setEditorContent(newValue)
    setIsDirty(newValue !== content)
    onChange?.(value)
  }, [content, onChange])

  // Copy content to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(editorContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [editorContent])

  // Download file
  const handleDownload = useCallback(() => {
    const blob = new Blob([editorContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filePath?.split('/').pop() || 'untitled.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [editorContent, filePath])

  // Editor options with read-only state
  const editorOptions = useMemo(() => ({
    ...EDITOR_OPTIONS,
    readOnly,
  }), [readOnly])

  // Get file icon color based on language
  const iconColor = useMemo(() => {
    const colorMap: Record<string, string> = {
      typescript: 'text-blue-400',
      javascript: 'text-yellow-400',
      python: 'text-green-400',
      rust: 'text-orange-400',
      go: 'text-cyan-400',
      java: 'text-red-400',
      csharp: 'text-purple-400',
      html: 'text-orange-500',
      css: 'text-pink-400',
      json: 'text-amber-400',
      markdown: 'text-gray-400',
    }
    return colorMap[language] || 'text-[#9ca3af]'
  }, [language])

  return (
    <div className={cn("h-full w-full bg-[#1e1e1e] flex flex-col", className)}>
      {/* Editor Header */}
      <div className="h-10 bg-[#252526] border-b border-[#404050] flex items-center justify-between px-3 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode className={cn("h-4 w-4 flex-shrink-0", iconColor)} aria-hidden="true" />
          {filePath ? (
            <span className="text-sm text-[#cccccc] truncate" title={filePath}>
          {filePath}
            </span>
          ) : (
            <span className="text-sm text-[#9ca3af] italic">No file selected</span>
          )}
          {isDirty && (
            <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" title="Unsaved changes" />
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <span className="text-xs text-[#9ca3af] mr-2 hidden sm:inline">
            {language}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[#9ca3af] hover:text-white hover:bg-[#3c3c3c]"
            onClick={handleCopy}
            title={copied ? 'Copied!' : 'Copy content'}
            aria-label={copied ? 'Copied to clipboard' : 'Copy content to clipboard'}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[#9ca3af] hover:text-white hover:bg-[#3c3c3c]"
            onClick={handleDownload}
            title="Download file"
            aria-label="Download file"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      
      {/* Monaco Editor */}
      <div className="flex-1 min-h-0">
      <MonacoEditor
        height="100%"
        language={language}
        value={editorContent}
        onChange={handleEditorChange}
        theme="vs-dark"
          options={editorOptions}
          loading={
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-[#6841e7]" />
            </div>
          }
        />
      </div>
      
      {/* Status Bar */}
      <div className="h-6 bg-[#007acc] flex items-center justify-between px-3 text-xs text-white flex-shrink-0">
        <div className="flex items-center gap-4">
          <span>{language}</span>
          {readOnly && <span className="opacity-75">Read Only</span>}
        </div>
        <div className="flex items-center gap-4">
          <span>UTF-8</span>
          <span>LF</span>
        </div>
      </div>
    </div>
  )
})
