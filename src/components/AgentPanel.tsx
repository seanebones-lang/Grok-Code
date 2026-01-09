'use client'

import { useState, memo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronDown, 
  ChevronRight,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Bot
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import type { Agent } from '@/hooks/useAgentOrchestrator'

/**
 * AgentPanel Component
 * Displays agent outputs in an expandable accordion-style panel
 */

interface AgentPanelProps {
  agents: Agent[]
  className?: string
}

interface SingleAgentProps {
  agent: Agent
  isExpanded: boolean
  onToggle: () => void
}

// Single agent card component
const SingleAgent = memo(function SingleAgent({ 
  agent, 
  isExpanded, 
  onToggle 
}: SingleAgentProps) {
  const [copied, setCopied] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(agent.output)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [agent.output])

  return (
    <motion.div
      layout
      className={cn(
        "rounded-lg border overflow-hidden transition-colors",
        isExpanded ? "border-[#6841e7]" : "border-[#404050]",
        isFullscreen && "fixed inset-4 z-50 flex flex-col"
      )}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 transition-colors",
          isExpanded ? "bg-[#6841e7]/10" : "bg-[#2a2a3e] hover:bg-[#323248]"
        )}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl" role="img" aria-label={agent.name}>
            {agent.emoji}
          </span>
          <div className="text-left">
            <h4 className="font-medium text-white">{agent.name} Agent</h4>
            <p className="text-xs text-[#9ca3af]">
              {agent.status === 'complete' ? 'Completed' : 'Processing...'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isExpanded && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-[#9ca3af] hover:text-white"
                onClick={(e) => {
                  e.stopPropagation()
                  handleCopy()
                }}
                aria-label="Copy output"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-[#9ca3af] hover:text-white"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsFullscreen(!isFullscreen)
                }}
                aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </Button>
            </>
          )}
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-[#9ca3af]" />
          ) : (
            <ChevronRight className="h-4 w-4 text-[#9ca3af]" />
          )}
        </div>
      </button>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "overflow-hidden",
              isFullscreen && "flex-1"
            )}
          >
            <div className={cn(
              "p-4 bg-[#1a1a2e] overflow-auto",
              isFullscreen ? "h-full" : "max-h-[400px]"
            )}>
              <div className="prose prose-invert prose-sm max-w-none text-white [&_*]:text-white [&_code]:bg-[#0f0f23] [&_code]:text-[#e5e7eb] [&_pre]:bg-[#0f0f23]">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {agent.output}
                </ReactMarkdown>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen backdrop */}
      {isFullscreen && (
        <div 
          className="fixed inset-0 bg-black/50 -z-10"
          onClick={() => setIsFullscreen(false)}
        />
      )}
    </motion.div>
  )
})

// Tabs view for agents
const AgentTabs = memo(function AgentTabs({ agents }: { agents: Agent[] }) {
  const [activeTab, setActiveTab] = useState(0)
  const [copied, setCopied] = useState(false)

  const activeAgent = agents[activeTab]

  const handleCopy = useCallback(async () => {
    if (!activeAgent) return
    try {
      await navigator.clipboard.writeText(activeAgent.output)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [activeAgent])

  return (
    <div className="rounded-lg border border-[#404050] overflow-hidden">
      {/* Tab headers */}
      <div className="flex overflow-x-auto bg-[#2a2a3e] border-b border-[#404050]">
        {agents.map((agent, index) => (
          <button
            key={agent.id}
            onClick={() => setActiveTab(index)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
              activeTab === index
                ? "bg-[#1a1a2e] text-white border-b-2 border-[#6841e7]"
                : "text-[#9ca3af] hover:text-white hover:bg-[#323248]"
            )}
          >
            <span>{agent.emoji}</span>
            <span>{agent.name}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-[#1a1a2e]">
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#404050]">
          <span className="text-xs text-[#9ca3af]">
            {activeAgent?.name} Agent Output
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-[#9ca3af] hover:text-white"
            onClick={handleCopy}
          >
            {copied ? (
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
        
        <div className="p-4 max-h-[500px] overflow-auto">
          <div className="prose prose-invert prose-sm max-w-none text-white [&_*]:text-white [&_code]:bg-[#0f0f23] [&_code]:text-[#e5e7eb] [&_pre]:bg-[#0f0f23]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {activeAgent?.output || ''}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  )
})

export const AgentPanel = memo(function AgentPanel({ agents, className }: AgentPanelProps) {
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'accordion' | 'tabs'>('accordion')

  const toggleAgent = useCallback((agentId: string) => {
    setExpandedAgents(prev => {
      const next = new Set(prev)
      if (next.has(agentId)) {
        next.delete(agentId)
      } else {
        next.add(agentId)
      }
      return next
    })
  }, [])

  const expandAll = useCallback(() => {
    setExpandedAgents(new Set(agents.map(a => a.id)))
  }, [agents])

  const collapseAll = useCallback(() => {
    setExpandedAgents(new Set())
  }, [])

  if (agents.length === 0) {
    return null
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-[#6841e7]/20">
            <Bot className="h-4 w-4 text-[#6841e7]" />
          </div>
          <h3 className="font-semibold text-white">Agent Orchestration</h3>
          <span className="text-xs text-[#9ca3af] bg-[#2a2a3e] px-2 py-0.5 rounded">
            {agents.length} agents
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex rounded-lg border border-[#404050] overflow-hidden">
            <button
              onClick={() => setViewMode('accordion')}
              className={cn(
                "px-2 py-1 text-xs",
                viewMode === 'accordion' 
                  ? "bg-[#6841e7] text-white" 
                  : "bg-[#2a2a3e] text-[#9ca3af] hover:text-white"
              )}
            >
              Accordion
            </button>
            <button
              onClick={() => setViewMode('tabs')}
              className={cn(
                "px-2 py-1 text-xs",
                viewMode === 'tabs' 
                  ? "bg-[#6841e7] text-white" 
                  : "bg-[#2a2a3e] text-[#9ca3af] hover:text-white"
              )}
            >
              Tabs
            </button>
          </div>
          
          {viewMode === 'accordion' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-[#9ca3af] hover:text-white"
                onClick={expandAll}
              >
                Expand All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-[#9ca3af] hover:text-white"
                onClick={collapseAll}
              >
                Collapse All
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {viewMode === 'accordion' ? (
        <div className="space-y-2">
          {agents.map(agent => (
            <SingleAgent
              key={agent.id}
              agent={agent}
              isExpanded={expandedAgents.has(agent.id)}
              onToggle={() => toggleAgent(agent.id)}
            />
          ))}
        </div>
      ) : (
        <AgentTabs agents={agents} />
      )}
    </div>
  )
})
