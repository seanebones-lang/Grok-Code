'use client'

import { useState, useCallback, KeyboardEvent, forwardRef, useEffect, useRef, useMemo } from 'react'
import { Send, Loader2, X, Wand2, GitBranch, Bug, FileSearch, ChevronDown, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

// Chat mode types
export type ChatMode = 'default' | 'refactor' | 'orchestrate' | 'debug' | 'review' | 'agent'

interface InputBarProps {
  onSend: (message: string, mode?: ChatMode) => void
  isLoading?: boolean
  disabled?: boolean
  placeholder?: string
  maxLength?: number
}

// Command definitions
const COMMANDS = [
  { 
    prefix: '/agent', 
    mode: 'agent' as ChatMode, 
    icon: Bot, 
    label: 'Agent',
    description: 'Autonomous building mode',
    color: 'text-emerald-400'
  },
  { 
    prefix: '/refactor', 
    mode: 'refactor' as ChatMode, 
    icon: Wand2, 
    label: 'Refactor',
    description: 'Analyze and improve code structure',
    color: 'text-purple-400'
  },
  { 
    prefix: '/orchestrate', 
    mode: 'orchestrate' as ChatMode, 
    icon: GitBranch, 
    label: 'Orchestrate',
    description: 'Multi-agent task decomposition',
    color: 'text-blue-400'
  },
  { 
    prefix: '/debug', 
    mode: 'debug' as ChatMode, 
    icon: Bug, 
    label: 'Debug',
    description: 'Find and fix issues',
    color: 'text-red-400'
  },
  { 
    prefix: '/review', 
    mode: 'review' as ChatMode, 
    icon: FileSearch, 
    label: 'Review',
    description: 'Comprehensive code review',
    color: 'text-green-400'
  },
] as const

const MAX_MESSAGE_LENGTH = 50000
const MIN_HEIGHT = 60
const MAX_HEIGHT = 200

export const InputBar = forwardRef<HTMLTextAreaElement, InputBarProps>(
  ({ 
    onSend, 
    isLoading = false, 
    disabled = false,
    placeholder = "Ask Eleven to write or edit code...",
    maxLength = MAX_MESSAGE_LENGTH,
  }, ref) => {
  const [input, setInput] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [selectedMode, setSelectedMode] = useState<ChatMode>('default')
  const [showModeMenu, setShowModeMenu] = useState(false)
  const [showCommandHints, setShowCommandHints] = useState(false)
  const internalRef = useRef<HTMLTextAreaElement>(null)
  const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef

  // Detect command prefix in input
  const detectedCommand = useMemo(() => {
    if (!input.startsWith('/')) return null
    const inputLower = input.toLowerCase()
    return COMMANDS.find(cmd => inputLower.startsWith(cmd.prefix))
  }, [input])

  // Show command hints when typing /
  useEffect(() => {
    setShowCommandHints(input === '/' || (input.startsWith('/') && !detectedCommand))
  }, [input, detectedCommand])

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      const newHeight = Math.min(Math.max(textarea.scrollHeight, MIN_HEIGHT), MAX_HEIGHT)
      textarea.style.height = `${newHeight}px`
    }
  }, [input, textareaRef])

  const handleSend = useCallback(() => {
    let trimmedInput = input.trim()
    let mode: ChatMode = selectedMode
    
    // Check for command prefix
    if (detectedCommand) {
      mode = detectedCommand.mode
      trimmedInput = trimmedInput.slice(detectedCommand.prefix.length).trim()
    }
    
    if (trimmedInput && !isLoading && !disabled) {
      onSend(trimmedInput, mode)
      setInput('')
      setSelectedMode('default')
      setShowCommandHints(false)
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = `${MIN_HEIGHT}px`
      }
    }
  }, [input, isLoading, disabled, onSend, textareaRef, selectedMode, detectedCommand])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Cmd/Ctrl + Enter
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSend()
    }
    // Allow regular Enter for new lines
  }, [handleSend])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    if (value.length <= maxLength) {
      setInput(value)
    }
  }, [maxLength])

  const handleClear = useCallback(() => {
    setInput('')
    setSelectedMode('default')
    textareaRef.current?.focus()
  }, [textareaRef])

  const handleCommandSelect = useCallback((command: typeof COMMANDS[number]) => {
    setInput(command.prefix + ' ')
    setShowCommandHints(false)
    textareaRef.current?.focus()
  }, [textareaRef])

  const charCount = input.length
  const isNearLimit = charCount > maxLength * 0.9
  const isAtLimit = charCount >= maxLength
  const canSend = input.trim().length > 0 && !isLoading && !disabled
  const activeMode = detectedCommand?.mode || selectedMode

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="border-t border-[#404050] bg-[#1a1a2e] p-4"
      role="form"
      aria-label="Message input"
    >
      <div className="max-w-4xl mx-auto">
        {/* Command hints dropdown */}
        <AnimatePresence>
          {showCommandHints && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mb-2 p-2 rounded-lg bg-[#2a2a3e] border border-[#404050]"
            >
              <p className="text-xs text-[#9ca3af] mb-2 px-2">Available commands:</p>
              <div className="grid grid-cols-2 gap-1">
                {COMMANDS.map((cmd) => (
                  <button
                    key={cmd.prefix}
                    onClick={() => handleCommandSelect(cmd)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#404050] transition-colors text-left"
                  >
                    <cmd.icon className={cn("h-4 w-4", cmd.color)} />
                    <div>
                      <span className="text-sm font-medium text-white">{cmd.prefix}</span>
                      <span className="text-xs text-[#9ca3af] ml-2">{cmd.description}</span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mode indicator */}
        {activeMode !== 'default' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-2"
          >
            <div className={cn(
              "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
              activeMode === 'agent' && "bg-emerald-500/20 text-emerald-400",
              activeMode === 'refactor' && "bg-purple-500/20 text-purple-400",
              activeMode === 'orchestrate' && "bg-blue-500/20 text-blue-400",
              activeMode === 'debug' && "bg-red-500/20 text-red-400",
              activeMode === 'review' && "bg-green-500/20 text-green-400"
            )}>
              {COMMANDS.find(c => c.mode === activeMode)?.icon && (
                (() => {
                  const Icon = COMMANDS.find(c => c.mode === activeMode)!.icon
                  return <Icon className="h-3 w-3" />
                })()
              )}
              {activeMode.charAt(0).toUpperCase() + activeMode.slice(1)} Mode
              <button
                onClick={() => {
                  setSelectedMode('default')
                  if (detectedCommand) {
                    setInput(input.slice(detectedCommand.prefix.length).trim())
                  }
                }}
                className="ml-1 hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </motion.div>
        )}

        <div 
          className={cn(
            "relative flex items-end gap-2 rounded-lg border transition-all duration-200",
            isFocused 
              ? "border-[#6841e7] ring-2 ring-[#6841e7]/20" 
              : "border-[#404050]",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {/* Mode selector button */}
          <div className="relative">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-[60px] w-[48px] shrink-0 rounded-r-none rounded-l-lg text-[#9ca3af] hover:text-white hover:bg-[#2a2a3e]"
              onClick={() => setShowModeMenu(!showModeMenu)}
              aria-label="Select mode"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            
            {/* Mode dropdown */}
            <AnimatePresence>
              {showModeMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full left-0 mb-2 w-48 rounded-lg bg-[#2a2a3e] border border-[#404050] shadow-xl overflow-hidden z-50"
                >
                  <div className="p-1">
                    <button
                      onClick={() => {
                        setSelectedMode('default')
                        setShowModeMenu(false)
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 rounded text-left text-sm",
                        selectedMode === 'default' ? "bg-[#6841e7] text-white" : "text-[#9ca3af] hover:bg-[#404050] hover:text-white"
                      )}
                    >
                      <Send className="h-4 w-4" />
                      Default
                    </button>
                    {COMMANDS.map((cmd) => (
                      <button
                        key={cmd.mode}
                        onClick={() => {
                          setSelectedMode(cmd.mode)
                          setShowModeMenu(false)
                        }}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 rounded text-left text-sm",
                          selectedMode === cmd.mode ? "bg-[#6841e7] text-white" : "text-[#9ca3af] hover:bg-[#404050] hover:text-white"
                        )}
                      >
                        <cmd.icon className={cn("h-4 w-4", selectedMode !== cmd.mode && cmd.color)} />
                        {cmd.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={activeMode !== 'default' 
              ? `${activeMode.charAt(0).toUpperCase() + activeMode.slice(1)} mode: Describe what you need...`
              : placeholder
            }
            className={cn(
              "flex-1 min-h-[60px] max-h-[200px] px-4 py-3",
              "bg-[#0f0f23] text-white placeholder:text-[#9ca3af]",
              "resize-none focus:outline-none",
              "scrollbar-thin scrollbar-thumb-[#404050] scrollbar-track-transparent"
            )}
            disabled={isLoading || disabled}
            aria-label="Message input"
            aria-describedby="input-help char-count"
            maxLength={maxLength}
            rows={1}
          />
          
          {/* Clear button */}
          <AnimatePresence>
            {input.length > 0 && !isLoading && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute right-[72px] bottom-3"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-[#9ca3af] hover:text-white hover:bg-[#2a2a3e]"
                  onClick={handleClear}
                  aria-label="Clear input"
                >
                  <X className="h-4 w-4" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Send button */}
          <Button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            size="icon"
            className={cn(
              "h-[60px] w-[60px] shrink-0 rounded-l-none rounded-r-lg transition-all duration-200",
              canSend 
                ? "bg-[#6841e7] hover:bg-[#7c5cff] text-white" 
                : "bg-[#2a2a3e] text-[#9ca3af] cursor-not-allowed"
            )}
            aria-label={isLoading ? "Sending message..." : "Send message"}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-5 w-5" aria-hidden="true" />
            )}
          </Button>
        </div>
        
        {/* Footer info */}
        <div className="flex items-center justify-between mt-2 px-1">
          <p id="input-help" className="text-xs text-[#9ca3af]">
            <kbd className="font-mono text-[#6841e7]">⌘</kbd>+<kbd className="font-mono text-[#6841e7]">Enter</kbd> to send
            <span className="mx-2">•</span>
            Type <kbd className="font-mono text-[#6841e7]">/</kbd> for commands
          </p>
          <p 
            id="char-count"
            className={cn(
              "text-xs transition-colors",
              isAtLimit ? "text-red-400" : isNearLimit ? "text-amber-400" : "text-[#9ca3af]"
            )}
            aria-live="polite"
          >
            {charCount.toLocaleString()}/{maxLength.toLocaleString()}
          </p>
        </div>
      </div>
    </motion.div>
  )
})

InputBar.displayName = 'InputBar'
