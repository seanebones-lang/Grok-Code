'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { AgentTask, AgentStep, AgentConfig, ToolCall } from '@/lib/agent-loop'
import {
  buildAgentSystemPrompt,
  parseToolCall,
  parseThought,
  createStep,
  isTaskComplete,
} from '@/lib/agent-loop'
import { getStorageItem } from '@/lib/storage'
import { STORAGE_KEYS } from '@/lib/storage-keys'

function getGitHubHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined'
    ? (getStorageItem<string>(STORAGE_KEYS.githubToken, '') || localStorage.getItem('nexteleven_github_token') || '')
    : ''
  return token ? { 'X-Github-Token': token } : {}
}

function getChatHeaders(): Record<string, string> {
  const gh = getGitHubHeaders()
  const grok = typeof window !== 'undefined'
    ? (getStorageItem<string>(STORAGE_KEYS.grokApiKey, '') || '')
    : ''
  if (grok) gh['X-Grok-Token'] = grok
  return gh
}

// ============================================================================
// Types
// ============================================================================

interface UseAgentLoopOptions {
  onStepComplete?: (step: AgentStep) => void
  onTaskComplete?: (task: AgentTask) => void
  onError?: (error: Error) => void
}

interface UseAgentLoopReturn {
  task: AgentTask | null
  isRunning: boolean
  currentStep: AgentStep | null
  startTask: (description: string, config?: Partial<AgentConfig>) => Promise<void>
  stopTask: () => void
  retryTask: () => Promise<void>
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: AgentConfig = {
  maxIterations: 20,
  maxTokensPerStep: 4000,
  autoFix: true,
  verbose: true,
}

// ============================================================================
// Hook Implementation (tool execution is server-side in /api/chat)
// ============================================================================

export function useAgentLoop(options: UseAgentLoopOptions = {}): UseAgentLoopReturn {
  const { onStepComplete, onTaskComplete, onError } = options

  const [task, setTask] = useState<AgentTask | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [currentStep, setCurrentStep] = useState<AgentStep | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)
  const configRef = useRef<AgentConfig>(DEFAULT_CONFIG)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  /**
   * Call Eleven API for next step.
   * Tool execution is handled server-side by /api/chat; we only consume the stream.
   */
  const callGrok = useCallback(async (
    messages: Array<{ role: string; content: string }>,
    signal: AbortSignal,
    repository?: { owner: string; repo: string; branch?: string }
  ): Promise<string> => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getChatHeaders() },
      body: JSON.stringify({
        message: messages[messages.length - 1].content,
        history: messages.slice(0, -1),
        mode: 'orchestrate',
        repository: repository ?? configRef.current?.repository,
      }),
      signal,
    })

    if (!response.ok) {
      throw new Error('Failed to get response from Eleven')
    }

    // Read SSE stream
    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let fullResponse = ''
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6)
        if (data === '[DONE]') break

        try {
          const parsed = JSON.parse(data)
          if (parsed.content) {
            fullResponse += parsed.content
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }

    return fullResponse
  }, [])

  /**
   * Run the agent loop
   */
  const runAgentLoop = useCallback(async (
    initialTask: AgentTask,
    config: AgentConfig
  ) => {
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    const currentTask = { ...initialTask }
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: buildAgentSystemPrompt(config) },
      { role: 'user', content: `Task: ${currentTask.description}\n\nBegin by analyzing what needs to be done, then use the available tools to complete the task.` },
    ]

    let iteration = 0

    while (iteration < config.maxIterations && !isTaskComplete(currentTask)) {
      if (abortController.signal.aborted) {
        currentTask.status = 'cancelled'
        break
      }

      iteration++

      try {
        // Get Eleven's response (server may run tools and stream follow-up; we only consume)
        const response = await callGrok(messages, abortController.signal, config.repository)

        // Parse thought for UI step
        const thought = parseThought(response)
        if (thought) {
          const thoughtStep = createStep('thought', thought)
          currentTask.steps.push(thoughtStep)
          setCurrentStep(thoughtStep)
          onStepComplete?.(thoughtStep)
        }

        // Check for completion (server already executed tools; look for complete tool or markers in streamed text)
        const toolCall = parseToolCall(response)
        if (toolCall?.name === 'complete') {
          currentTask.status = 'completed'
          currentTask.result = typeof toolCall.arguments?.summary === 'string' ? toolCall.arguments.summary : response
          break
        }
        if (response.toLowerCase().includes('complete') || response.toLowerCase().includes('finished') || response.toLowerCase().includes('task complete')) {
          currentTask.status = 'completed'
          currentTask.result = response
          break
        }

        // Optional: show action step for display when we detect a tool call in the response
        if (toolCall) {
          const actionStep = createStep('action', `Called ${toolCall.name}`, toolCall)
          currentTask.steps.push(actionStep)
          setCurrentStep(actionStep)
          onStepComplete?.(actionStep)
        }

        // Add assistant message and continue loop (server already ran tools and may have streamed follow-up)
        messages.push({ role: 'assistant', content: response })
        messages.push({ role: 'user', content: 'Continue with the next step, or call the "complete" tool if the task is finished.' })

        // Update task state
        setTask({ ...currentTask })

      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          currentTask.status = 'cancelled'
          break
        }

        const errorStep = createStep('error', error instanceof Error ? error.message : 'Unknown error')
        currentTask.steps.push(errorStep)
        setCurrentStep(errorStep)
        onStepComplete?.(errorStep)
        onError?.(error instanceof Error ? error : new Error('Unknown error'))

        if (!config.autoFix) {
          currentTask.status = 'failed'
          currentTask.error = error instanceof Error ? error.message : 'Unknown error'
          break
        }

        // Try to recover
        messages.push({
          role: 'user',
          content: `An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease analyze the error and try a different approach.`,
        })
      }
    }

    // Finalize task
    if (iteration >= config.maxIterations && !isTaskComplete(currentTask)) {
      currentTask.status = 'failed'
      currentTask.error = 'Maximum iterations reached'
    }

    currentTask.endTime = new Date()
    setTask(currentTask)
    setIsRunning(false)
    setCurrentStep(null)
    onTaskComplete?.(currentTask)

    return currentTask
  }, [callGrok, onStepComplete, onTaskComplete, onError])

  /**
   * Start a new task
   */
  const startTask = useCallback(async (
    description: string,
    config: Partial<AgentConfig> = {}
  ) => {
    if (isRunning) {
      throw new Error('A task is already running')
    }

    const fullConfig: AgentConfig = { ...DEFAULT_CONFIG, ...config }
    configRef.current = fullConfig

    const newTask: AgentTask = {
      id: crypto.randomUUID(),
      description,
      status: 'running',
      steps: [],
      startTime: new Date(),
    }

    setTask(newTask)
    setIsRunning(true)

    await runAgentLoop(newTask, fullConfig)
  }, [isRunning, runAgentLoop])

  /**
   * Stop the current task
   */
  const stopTask = useCallback(() => {
    abortControllerRef.current?.abort()
    setIsRunning(false)
    
    if (task) {
      setTask({
        ...task,
        status: 'cancelled',
        endTime: new Date(),
      })
    }
  }, [task])

  /**
   * Retry the last task
   */
  const retryTask = useCallback(async () => {
    if (!task || isRunning) return

    await startTask(task.description, configRef.current)
  }, [task, isRunning, startTask])

  return {
    task,
    isRunning,
    currentStep,
    startTask,
    stopTask,
    retryTask,
  }
}
