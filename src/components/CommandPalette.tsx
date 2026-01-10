'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Command,
  Search,
  Bot,
  FileText,
  GitBranch,
  Settings,
  Zap,
  Code,
  Bug,
  Shield,
  Rocket,
  Database,
  Smartphone,
  Palette,
  Brain,
  BarChart,
  Layers,
  X,
  ArrowRight,
  Keyboard,
} from 'lucide-react'
import { getAllAgents, type SpecializedAgent } from '@/lib/specialized-agents'
import { cn } from '@/lib/utils'

interface CommandItem {
  id: string
  label: string
  description?: string
  icon: React.ReactNode
  category: 'agents' | 'actions' | 'navigation' | 'workflows'
  action: () => void
  keywords?: string[]
}

interface CommandPaletteProps {
  onSelectAgent?: (agentId: string) => void
  onAction?: (actionId: string) => void
}

export function CommandPalette({ onSelectAgent, onAction }: CommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Get agent icon based on emoji
  const getAgentIcon = (emoji: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      '🔒': <Shield className="h-4 w-4" />,
      '⚡': <Zap className="h-4 w-4" />,
      '🧪': <Code className="h-4 w-4" />,
      '📚': <FileText className="h-4 w-4" />,
      '🔄': <GitBranch className="h-4 w-4" />,
      '📦': <Layers className="h-4 w-4" />,
      '🔍': <Search className="h-4 w-4" />,
      '🐛': <Bug className="h-4 w-4" />,
      '🎯': <Zap className="h-4 w-4" />,
      '♿': <Settings className="h-4 w-4" />,
      '🎼': <Command className="h-4 w-4" />,
      '🐝': <Bot className="h-4 w-4" />,
      '📱': <Smartphone className="h-4 w-4" />,
      '🚀': <Rocket className="h-4 w-4" />,
      '🗄️': <Database className="h-4 w-4" />,
      '🔌': <Code className="h-4 w-4" />,
      '🎨': <Palette className="h-4 w-4" />,
      '🤖': <Brain className="h-4 w-4" />,
      '📊': <BarChart className="h-4 w-4" />,
      '🏗️': <Layers className="h-4 w-4" />,
    }
    return iconMap[emoji] || <Bot className="h-4 w-4" />
  }

  // Build command items
  const commands = useMemo<CommandItem[]>(() => {
    const agents = getAllAgents()
    
    const agentCommands: CommandItem[] = agents.map(agent => ({
      id: `agent-${agent.id}`,
      label: agent.name,
      description: agent.description,
      icon: <span className="text-lg">{agent.emoji}</span>,
      category: 'agents',
      action: () => {
        const event = new CustomEvent('newSession', { 
          detail: { message: `/agent ${agent.id}` } 
        })
        window.dispatchEvent(event)
        onSelectAgent?.(agent.id)
        setIsOpen(false)
      },
      keywords: [agent.id, ...agent.triggerKeywords],
    }))

    const actionCommands: CommandItem[] = [
      {
        id: 'new-chat',
        label: 'New Chat',
        description: 'Start a fresh conversation',
        icon: <Zap className="h-4 w-4" />,
        category: 'actions',
        action: () => {
          const event = new CustomEvent('newSession', { detail: { message: '' } })
          window.dispatchEvent(event)
          onAction?.('new-chat')
          setIsOpen(false)
        },
        keywords: ['new', 'fresh', 'start', 'clear'],
      },
      {
        id: 'run-swarm',
        label: 'Run Agent Swarm',
        description: 'Analyze with multiple agents in parallel',
        icon: <Bot className="h-4 w-4" />,
        category: 'actions',
        action: () => {
          const event = new CustomEvent('newSession', { 
            detail: { message: '/agent swarm Run a comprehensive analysis of my codebase' } 
          })
          window.dispatchEvent(event)
          setIsOpen(false)
        },
        keywords: ['swarm', 'parallel', 'all', 'comprehensive'],
      },
      {
        id: 'security-scan',
        label: 'Quick Security Scan',
        description: 'Scan for vulnerabilities',
        icon: <Shield className="h-4 w-4" />,
        category: 'actions',
        action: () => {
          const event = new CustomEvent('newSession', { 
            detail: { message: '/agent security Scan this codebase for security vulnerabilities' } 
          })
          window.dispatchEvent(event)
          setIsOpen(false)
        },
        keywords: ['security', 'vuln', 'scan', 'audit'],
      },
      {
        id: 'code-review',
        label: 'Quick Code Review',
        description: 'Review code quality and best practices',
        icon: <Search className="h-4 w-4" />,
        category: 'actions',
        action: () => {
          const event = new CustomEvent('newSession', { 
            detail: { message: '/agent codeReview Review this codebase for quality and best practices' } 
          })
          window.dispatchEvent(event)
          setIsOpen(false)
        },
        keywords: ['review', 'quality', 'best practices'],
      },
    ]

    const workflowCommands: CommandItem[] = [
      {
        id: 'workflow-feature',
        label: '🆕 New Feature Workflow',
        description: 'Full Stack → Testing → Documentation',
        icon: <Layers className="h-4 w-4" />,
        category: 'workflows',
        action: () => {
          const event = new CustomEvent('newSession', { 
            detail: { message: '/agent fullstack I need to build a new feature. Help me plan and implement it end-to-end.' } 
          })
          window.dispatchEvent(event)
          setIsOpen(false)
        },
        keywords: ['feature', 'new', 'build', 'create'],
      },
      {
        id: 'workflow-bugfix',
        label: '🐛 Bug Fix Workflow',
        description: 'Bug Hunter → Fix → Test',
        icon: <Bug className="h-4 w-4" />,
        category: 'workflows',
        action: () => {
          const event = new CustomEvent('newSession', { 
            detail: { message: '/agent bugHunter I have a bug to fix. Help me identify, fix, and test it.' } 
          })
          window.dispatchEvent(event)
          setIsOpen(false)
        },
        keywords: ['bug', 'fix', 'error', 'issue'],
      },
      {
        id: 'workflow-mobile',
        label: '📱 Mobile App Workflow',
        description: 'Mobile Agent → UI/UX → Testing',
        icon: <Smartphone className="h-4 w-4" />,
        category: 'workflows',
        action: () => {
          const event = new CustomEvent('newSession', { 
            detail: { message: '/agent mobile I need help with mobile app development.' } 
          })
          window.dispatchEvent(event)
          setIsOpen(false)
        },
        keywords: ['mobile', 'app', 'ios', 'android', 'react native'],
      },
      {
        id: 'workflow-deploy',
        label: '🚀 Deploy Workflow',
        description: 'DevOps → Security → Performance',
        icon: <Rocket className="h-4 w-4" />,
        category: 'workflows',
        action: () => {
          const event = new CustomEvent('newSession', { 
            detail: { message: '/agent devops I need help setting up deployment and CI/CD.' } 
          })
          window.dispatchEvent(event)
          setIsOpen(false)
        },
        keywords: ['deploy', 'ci', 'cd', 'devops', 'production'],
      },
      {
        id: 'workflow-api',
        label: '🔌 API Development Workflow',
        description: 'API Design → Database → Documentation',
        icon: <Code className="h-4 w-4" />,
        category: 'workflows',
        action: () => {
          const event = new CustomEvent('newSession', { 
            detail: { message: '/agent api I need help designing and building an API.' } 
          })
          window.dispatchEvent(event)
          setIsOpen(false)
        },
        keywords: ['api', 'rest', 'graphql', 'endpoint'],
      },
    ]

    return [...workflowCommands, ...actionCommands, ...agentCommands]
  }, [onSelectAgent, onAction])

  // Filter commands based on search
  const filteredCommands = useMemo(() => {
    if (!search.trim()) return commands
    
    const searchLower = search.toLowerCase()
    return commands.filter(cmd => {
      const labelMatch = cmd.label.toLowerCase().includes(searchLower)
      const descMatch = cmd.description?.toLowerCase().includes(searchLower)
      const keywordMatch = cmd.keywords?.some(k => k.toLowerCase().includes(searchLower))
      return labelMatch || descMatch || keywordMatch
    })
  }, [commands, search])

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {
      workflows: [],
      actions: [],
      agents: [],
    }
    
    filteredCommands.forEach(cmd => {
      groups[cmd.category]?.push(cmd)
    })
    
    return groups
  }, [filteredCommands])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open with Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(prev => !prev)
        setSearch('')
        setSelectedIndex(0)
      }

      // Close with Escape
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault()
        setIsOpen(false)
      }

      // Navigate with arrows
      if (isOpen && e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1))
      }
      
      if (isOpen && e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
      }

      // Select with Enter
      if (isOpen && e.key === 'Enter') {
        e.preventDefault()
        filteredCommands[selectedIndex]?.action()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, filteredCommands, selectedIndex])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen])

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`)
    selectedElement?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  const categoryLabels: Record<string, string> = {
    workflows: '⚡ Workflows',
    actions: '🎯 Quick Actions',
    agents: '🤖 Agents',
  }

  let globalIndex = 0

  return (
    <>
      {/* Keyboard shortcut hint - shown in bottom right */}
      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={() => {
            setIsOpen(true)
            setSearch('')
            setSelectedIndex(0)
          }}
          className="flex items-center gap-2 px-3 py-2 bg-[#1a1a2e] border border-[#404050] rounded-lg text-xs text-[#9ca3af] hover:text-white hover:border-primary/50 transition-colors shadow-lg"
        >
          <Command className="h-3 w-3" />
          <span>K</span>
          <span className="text-[#606070]">Command Palette</span>
        </button>
      </div>

      {/* Command Palette Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setIsOpen(false)}
            />

            {/* Palette */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.15 }}
              className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-2xl z-50"
            >
              <div className="bg-[#0f0f23] border border-[#404050] rounded-xl shadow-2xl overflow-hidden">
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-[#404050]">
                  <Search className="h-5 w-5 text-[#9ca3af]" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search agents, actions, workflows..."
                    className="flex-1 bg-transparent text-white placeholder-[#606070] outline-none text-sm"
                  />
                  <div className="flex items-center gap-1 text-xs text-[#606070]">
                    <kbd className="px-1.5 py-0.5 bg-[#1a1a2e] rounded text-[10px]">↑↓</kbd>
                    <span>navigate</span>
                    <kbd className="px-1.5 py-0.5 bg-[#1a1a2e] rounded text-[10px] ml-2">↵</kbd>
                    <span>select</span>
                    <kbd className="px-1.5 py-0.5 bg-[#1a1a2e] rounded text-[10px] ml-2">esc</kbd>
                    <span>close</span>
                  </div>
                </div>

                {/* Results */}
                <div ref={listRef} className="max-h-[400px] overflow-y-auto py-2">
                  {filteredCommands.length === 0 ? (
                    <div className="px-4 py-8 text-center text-[#9ca3af]">
                      <p>No results found for "{search}"</p>
                    </div>
                  ) : (
                    Object.entries(groupedCommands).map(([category, items]) => {
                      if (items.length === 0) return null
                      
                      return (
                        <div key={category} className="mb-2">
                          <div className="px-4 py-1.5 text-xs font-semibold text-[#9ca3af]">
                            {categoryLabels[category]}
                          </div>
                          {items.map((item) => {
                            const itemIndex = globalIndex++
                            const isSelected = itemIndex === selectedIndex
                            
                            return (
                              <button
                                key={item.id}
                                data-index={itemIndex}
                                onClick={item.action}
                                onMouseEnter={() => setSelectedIndex(itemIndex)}
                                className={cn(
                                  "w-full px-4 py-2 flex items-center gap-3 transition-colors",
                                  isSelected ? "bg-primary/20 text-white" : "text-[#9ca3af] hover:bg-[#1a1a2e]"
                                )}
                              >
                                <div className={cn(
                                  "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                                  isSelected ? "bg-primary/30" : "bg-[#1a1a2e]"
                                )}>
                                  {item.icon}
                                </div>
                                <div className="flex-1 text-left min-w-0">
                                  <p className={cn(
                                    "font-medium truncate",
                                    isSelected ? "text-white" : "text-[#e5e5e5]"
                                  )}>
                                    {item.label}
                                  </p>
                                  {item.description && (
                                    <p className="text-xs text-[#9ca3af] truncate">
                                      {item.description}
                                    </p>
                                  )}
                                </div>
                                {isSelected && (
                                  <ArrowRight className="h-4 w-4 text-primary flex-shrink-0" />
                                )}
                              </button>
                            )
                          })}
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t border-[#404050] flex items-center justify-between text-xs text-[#606070]">
                  <span>{filteredCommands.length} results</span>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Keyboard className="h-3 w-3" />
                      <kbd className="px-1 py-0.5 bg-[#1a1a2e] rounded text-[10px]">⌘K</kbd>
                      to toggle
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
