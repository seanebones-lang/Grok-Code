'use client'

import { useState, useCallback, memo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Square,
  RotateCcw,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Terminal,
  FileText,
  FolderOpen,
  Search,
  Brain,
  Sparkles,
  AlertTriangle,
  Clock,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAgentLoop } from '@/hooks/useAgentLoop'
import type { AgentStep, AgentConfig, ToolName } from '@/lib/agent-loop'

// ============================================================================
// Types
// ============================================================================

interface AgentRunnerProps {
  onComplete?: (result: string) => void
  repository?: {
    owner: string
    repo: string
    branch?: string
  }
  className?: string
  initialTask?: string // Auto-start with this task
}

// ============================================================================
// Tool Icons
// ============================================================================

const TOOL_ICONS: Record<ToolName, React.ElementType> = {
  read_file: FileText,
  write_file: FileText,
  list_files: FolderOpen,
  delete_file: FileText,
  run_command: Terminal,
  search_code: Search,
  think: Brain,
  complete: CheckCircle,
}

const TOOL_COLORS: Record<ToolName, string> = {
  read_file: 'text-blue-400',
  write_file: 'text-green-400',
  list_files: 'text-yellow-400',
  delete_file: 'text-red-400',
  run_command: 'text-purple-400',
  search_code: 'text-cyan-400',
  think: 'text-pink-400',
  complete: 'text-emerald-400',
}

// ============================================================================
// Step Component
// ============================================================================

const AgentStepCard = memo(function AgentStepCard({
  step,
  isLast,
}: {
  step: AgentStep
  isLast: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(step.type === 'error')

  const getStepIcon = () => {
    if (step.toolCall) {
      const Icon = TOOL_ICONS[step.toolCall.name] || Zap
      return <Icon className={cn('h-4 w-4', TOOL_COLORS[step.toolCall.name])} />
    }
    
    switch (step.type) {
      case 'thought':
        return <Brain className="h-4 w-4 text-pink-400" />
      case 'observation':
        return <CheckCircle className="h-4 w-4 text-green-400" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-400" />
      case 'complete':
        return <Sparkles className="h-4 w-4 text-emerald-400" />
      default:
        return <Zap className="h-4 w-4 text-[#6841e7]" />
    }
  }

  const getStepTitle = () => {
    if (step.toolCall) {
      return `${step.toolCall.name.replace(/_/g, ' ')}`
    }
    return step.type.charAt(0).toUpperCase() + step.type.slice(1)
  }

  const getStepColor = () => {
    switch (step.type) {
      case 'thought':
        return 'border-pink-500/30 bg-pink-500/5'
      case 'action':
        return 'border-[#6841e7]/30 bg-[#6841e7]/5'
      case 'observation':
        return 'border-green-500/30 bg-green-500/5'
      case 'error':
        return 'border-red-500/30 bg-red-500/5'
      case 'complete':
        return 'border-emerald-500/30 bg-emerald-500/5'
      default:
        return 'border-[#404050] bg-[#2a2a3e]'
    }
  }

  return (
    <div className="relative">
      {/* Connector line */}
      {!isLast && (
        <div className="absolute left-4 top-10 bottom-0 w-0.5 bg-[#404050]" />
      )}

      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className={cn(
          'relative rounded-lg border p-3 ml-8',
          getStepColor()
        )}
      >
        {/* Step indicator */}
        <div className="absolute -left-8 top-3 w-8 h-8 rounded-full bg-[#1a1a2e] border border-[#404050] flex items-center justify-center">
          {getStepIcon()}
        </div>

        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white capitalize">
              {getStepTitle()}
            </span>
            {step.toolResult?.duration && (
              <span className="text-xs text-[#9ca3af]">
                {step.toolResult.duration}ms
              </span>
            )}
          </div>
          {step.content.length > 100 && (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 text-[#9ca3af]" />
            ) : (
              <ChevronRight className="h-4 w-4 text-[#9ca3af]" />
            )
          )}
        </button>

        {/* Content */}
        <div className={cn(
          'mt-2 text-sm text-[#e5e7eb] overflow-hidden',
          !isExpanded && step.content.length > 100 && 'max-h-20'
        )}>
          <pre className="whitespace-pre-wrap font-mono text-xs">
            {isExpanded ? step.content : step.content.slice(0, 200) + (step.content.length > 200 ? '...' : '')}
          </pre>
        </div>

        {/* Tool arguments */}
        {step.toolCall && isExpanded && (
          <div className="mt-2 p-2 rounded bg-[#0f0f23] text-xs font-mono">
            <span className="text-[#9ca3af]">Arguments: </span>
            <span className="text-[#e5e7eb]">
              {JSON.stringify(step.toolCall.arguments, null, 2)}
            </span>
          </div>
        )}

        {/* Timestamp */}
        <div className="mt-2 text-xs text-[#9ca3af]">
          {step.timestamp.toLocaleTimeString()}
        </div>
      </motion.div>
    </div>
  )
})

// ============================================================================
// Main Component
// ============================================================================

export const AgentRunner = memo(function AgentRunner({
  onComplete,
  repository,
  className,
  initialTask,
}: AgentRunnerProps) {
  const [taskInput, setTaskInput] = useState(initialTask || '')
  const [showConfig, setShowConfig] = useState(false)
  const [config, setConfig] = useState<Partial<AgentConfig>>({
    maxIterations: 20,
    autoFix: true,
  })
  const [hasAutoStarted, setHasAutoStarted] = useState(false)
  
  const stepsEndRef = useRef<HTMLDivElement>(null)

  const {
    task,
    isRunning,
    currentStep,
    startTask,
    stopTask,
    retryTask,
  } = useAgentLoop({
    onStepComplete: () => {
      // Scroll to bottom on new step
      stepsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    },
    onTaskComplete: (completedTask) => {
      if (completedTask.status === 'completed' && completedTask.result) {
        onComplete?.(completedTask.result)
      }
    },
  })

  const handleStart = useCallback(async () => {
    if (!taskInput.trim()) return
    
    await startTask(taskInput, {
      ...config,
      repository,
    })
  }, [taskInput, config, repository, startTask])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleStart()
    }
  }, [handleStart])

  // Auto-scroll to bottom
  useEffect(() => {
    stepsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [task?.steps.length])

  // Auto-start if initialTask is provided
  useEffect(() => {
    if (initialTask && !hasAutoStarted && !isRunning && !task) {
      setHasAutoStarted(true)
      handleStart()
    }
  }, [initialTask, hasAutoStarted, isRunning, task, handleStart])

  const getStatusColor = () => {
    switch (task?.status) {
      case 'running':
        return 'text-blue-400'
      case 'completed':
        return 'text-green-400'
      case 'failed':
        return 'text-red-400'
      case 'cancelled':
        return 'text-yellow-400'
      default:
        return 'text-[#9ca3af]'
    }
  }

  const getStatusIcon = () => {
    switch (task?.status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'failed':
        return <XCircle className="h-4 w-4" />
      case 'cancelled':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  return (
    <div className={cn('flex flex-col h-full bg-[#1a1a2e]', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#404050]">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[#6841e7]" />
          <h2 className="font-semibold text-white">Agent Mode</h2>
          {task && (
            <span className={cn('flex items-center gap-1 text-sm', getStatusColor())}>
              {getStatusIcon()}
              {task.status}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {repository && (
            <span className="text-xs text-[#9ca3af] bg-[#2a2a3e] px-2 py-1 rounded">
              {repository.owner}/{repository.repo}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowConfig(!showConfig)}
            className="text-[#9ca3af] hover:text-white"
          >
            Config
          </Button>
        </div>
      </div>

      {/* Config Panel */}
      <AnimatePresence>
        {showConfig && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-[#404050]"
          >
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-4">
                <label htmlFor="max-iterations" className="text-sm text-[#9ca3af]">Max Iterations:</label>
                <input
                  id="max-iterations"
                  type="number"
                  value={config.maxIterations}
                  onChange={(e) => setConfig({ ...config, maxIterations: parseInt(e.target.value) || 20 })}
                  className="w-20 px-2 py-1 rounded bg-[#0f0f23] border border-[#404050] text-white text-sm"
                  min={1}
                  max={50}
                  aria-label="Maximum iterations for agent execution"
                />
              </div>
              <div className="flex items-center gap-4">
                <label htmlFor="auto-fix" className="text-sm text-[#9ca3af]">Auto-fix Errors:</label>
                <input
                  id="auto-fix"
                  type="checkbox"
                  checked={config.autoFix}
                  onChange={(e) => setConfig({ ...config, autoFix: e.target.checked })}
                  className="rounded"
                  aria-label="Automatically fix errors during execution"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task Input */}
      {!isRunning && !task && (
        <div className="p-4 border-b border-[#404050]">
          <textarea
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want the agent to build or fix..."
            className="w-full h-24 px-3 py-2 rounded-lg bg-[#0f0f23] border border-[#404050] text-white placeholder:text-[#9ca3af] resize-none focus:outline-none focus:border-[#6841e7]"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-[#9ca3af]">
              <kbd className="font-mono text-[#6841e7]">⌘</kbd>+<kbd className="font-mono text-[#6841e7]">Enter</kbd> to start
            </span>
            <Button
              onClick={handleStart}
              disabled={!taskInput.trim()}
              className="bg-[#6841e7] hover:bg-[#7c5cff] text-white"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Agent
            </Button>
          </div>
        </div>
      )}

      {/* Task Description */}
      {task && (
        <div className="p-4 border-b border-[#404050] bg-[#2a2a3e]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-white mb-1">Task</h3>
              <p className="text-sm text-[#9ca3af]">{task.description}</p>
            </div>
            <div className="flex items-center gap-2">
              {isRunning ? (
                <Button
                  onClick={stopTask}
                  variant="destructive"
                  size="sm"
                >
                  <Square className="h-4 w-4 mr-1" />
                  Stop
                </Button>
              ) : (
                <Button
                  onClick={retryTask}
                  variant="outline"
                  size="sm"
                  className="border-[#404050] text-white hover:bg-[#404050]"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Retry
                </Button>
              )}
            </div>
          </div>
          
          {/* Progress */}
          {task.steps.length > 0 && (
            <div className="mt-3 flex items-center gap-4 text-xs text-[#9ca3af]">
              <span>{task.steps.length} steps</span>
              <span>•</span>
              <span>{task.steps.filter(s => s.toolCall).length} tool calls</span>
              {task.startTime && (
                <>
                  <span>•</span>
                  <span>
                    {task.endTime
                      ? `${((task.endTime.getTime() - task.startTime.getTime()) / 1000).toFixed(1)}s`
                      : 'Running...'}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Steps */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {task?.steps.map((step, index) => (
          <AgentStepCard
            key={step.id}
            step={step}
            isLast={index === task.steps.length - 1}
          />
        ))}
        
        {/* Current step indicator */}
        {isRunning && currentStep && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-sm text-[#9ca3af] ml-8"
          >
            <Loader2 className="h-4 w-4 animate-spin text-[#6841e7]" />
            Processing...
          </motion.div>
        )}
        
        <div ref={stepsEndRef} />
      </div>

      {/* Result */}
      {task?.status === 'completed' && task.result && (
        <div className="p-4 border-t border-[#404050] bg-green-500/10">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <h3 className="font-medium text-green-400">Task Completed</h3>
          </div>
          <p className="text-sm text-[#e5e7eb] whitespace-pre-wrap">{task.result}</p>
        </div>
      )}

      {/* Error */}
      {task?.status === 'failed' && task.error && (
        <div className="p-4 border-t border-[#404050] bg-red-500/10">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="h-5 w-5 text-red-400" />
            <h3 className="font-medium text-red-400">Task Failed</h3>
          </div>
          <p className="text-sm text-[#e5e7eb]">{task.error}</p>
        </div>
      )}
    </div>
  )
})
