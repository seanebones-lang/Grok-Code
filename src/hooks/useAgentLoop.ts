'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type {
  AgentTask,
  AgentStep,
  AgentConfig,
  ToolCall,
  ToolResult,
  ToolName,
} from '@/lib/agent-loop'
import {
  buildAgentSystemPrompt,
  parseToolCall,
  parseThought,
  createStep,
  analyzeError,
  isTaskComplete,
  TOOL_DEFINITIONS,
} from '@/lib/agent-loop'

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
// Tool Executors
// ============================================================================

async function executeReadFile(
  args: Record<string, unknown>,
  repository?: { owner: string; repo: string; branch?: string }
): Promise<ToolResult> {
  const path = args.path as string
  const startTime = Date.now()

  try {
    if (repository) {
      // Read from GitHub
      const params = new URLSearchParams({
        owner: repository.owner,
        repo: repository.repo,
        path,
        ...(repository.branch ? { branch: repository.branch } : {}),
      })

      const response = await fetch(`/api/agent/files?${params}`)
      const data = await response.json()

      if (!response.ok) {
        return {
          id: crypto.randomUUID(),
          name: 'read_file',
          success: false,
          output: '',
          error: data.error || 'Failed to read file',
          duration: Date.now() - startTime,
        }
      }

      return {
        id: crypto.randomUUID(),
        name: 'read_file',
        success: true,
        output: data.file.content,
        duration: Date.now() - startTime,
      }
    } else {
      // Local file reading not supported in browser
      return {
        id: crypto.randomUUID(),
        name: 'read_file',
        success: false,
        output: '',
        error: 'Local file reading requires a connected repository',
        duration: Date.now() - startTime,
      }
    }
  } catch (error) {
    return {
      id: crypto.randomUUID(),
      name: 'read_file',
      success: false,
      output: '',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    }
  }
}

async function executeWriteFile(
  args: Record<string, unknown>,
  repository?: { owner: string; repo: string; branch?: string }
): Promise<ToolResult> {
  const path = args.path as string
  const content = args.content as string
  const startTime = Date.now()

  try {
    if (repository) {
      const response = await fetch('/api/agent/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: repository.owner,
          repo: repository.repo,
          path,
          content,
          message: `Agent: Update ${path}`,
          branch: repository.branch,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          id: crypto.randomUUID(),
          name: 'write_file',
          success: false,
          output: '',
          error: data.error || 'Failed to write file',
          duration: Date.now() - startTime,
        }
      }

      return {
        id: crypto.randomUUID(),
        name: 'write_file',
        success: true,
        output: `File written successfully: ${path}\nCommit: ${data.commit?.sha?.slice(0, 7)}`,
        duration: Date.now() - startTime,
      }
    } else {
      return {
        id: crypto.randomUUID(),
        name: 'write_file',
        success: false,
        output: '',
        error: 'Local file writing requires a connected repository',
        duration: Date.now() - startTime,
      }
    }
  } catch (error) {
    return {
      id: crypto.randomUUID(),
      name: 'write_file',
      success: false,
      output: '',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    }
  }
}

async function executeListFiles(
  args: Record<string, unknown>,
  repository?: { owner: string; repo: string; branch?: string }
): Promise<ToolResult> {
  const path = (args.path as string) || ''
  const startTime = Date.now()

  try {
    if (repository) {
      const params = new URLSearchParams({
        action: 'list',
        owner: repository.owner,
        repo: repository.repo,
        path,
        ...(repository.branch ? { branch: repository.branch } : {}),
      })

      const response = await fetch(`/api/agent/files?${params}`)
      const data = await response.json()

      if (!response.ok) {
        return {
          id: crypto.randomUUID(),
          name: 'list_files',
          success: false,
          output: '',
          error: data.error || 'Failed to list files',
          duration: Date.now() - startTime,
        }
      }

      const fileList = data.files
        .map((f: { type: string; name: string; size?: number }) => 
          `${f.type === 'dir' ? '📁' : '📄'} ${f.name}${f.size ? ` (${f.size} bytes)` : ''}`
        )
        .join('\n')

      return {
        id: crypto.randomUUID(),
        name: 'list_files',
        success: true,
        output: fileList || 'Empty directory',
        duration: Date.now() - startTime,
      }
    } else {
      return {
        id: crypto.randomUUID(),
        name: 'list_files',
        success: false,
        output: '',
        error: 'Local file listing requires a connected repository',
        duration: Date.now() - startTime,
      }
    }
  } catch (error) {
    return {
      id: crypto.randomUUID(),
      name: 'list_files',
      success: false,
      output: '',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    }
  }
}

async function executeRunCommand(args: Record<string, unknown>): Promise<ToolResult> {
  const command = args.command as string
  const cwd = args.cwd as string | undefined
  const startTime = Date.now()

  try {
    const response = await fetch('/api/agent/terminal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, cwd }),
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        id: crypto.randomUUID(),
        name: 'run_command',
        success: false,
        output: '',
        error: data.error || 'Failed to execute command',
        duration: Date.now() - startTime,
      }
    }

    const output = [
      data.stdout,
      data.stderr ? `\nStderr:\n${data.stderr}` : '',
      `\nExit code: ${data.exitCode}`,
      data.killed ? '\n(Process was killed due to timeout)' : '',
    ].filter(Boolean).join('')

    return {
      id: crypto.randomUUID(),
      name: 'run_command',
      success: data.success,
      output,
      error: data.success ? undefined : data.stderr || 'Command failed',
      duration: data.duration || Date.now() - startTime,
    }
  } catch (error) {
    return {
      id: crypto.randomUUID(),
      name: 'run_command',
      success: false,
      output: '',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    }
  }
}

async function executeSearchCode(
  args: Record<string, unknown>,
  repository?: { owner: string; repo: string; branch?: string }
): Promise<ToolResult> {
  const pattern = args.pattern as string
  const path = (args.path as string) || ''
  const startTime = Date.now()

  // For now, use grep via terminal
  if (repository) {
    // GitHub code search would require different API
    return {
      id: crypto.randomUUID(),
      name: 'search_code',
      success: false,
      output: '',
      error: 'Code search in GitHub repositories is not yet implemented. Use list_files and read_file instead.',
      duration: Date.now() - startTime,
    }
  }

  return executeRunCommand({
    command: `grep -rn "${pattern}" ${path || '.'}`,
  })
}

function executeThink(args: Record<string, unknown>): ToolResult {
  const thought = args.thought as string
  return {
    id: crypto.randomUUID(),
    name: 'think',
    success: true,
    output: thought,
    duration: 0,
  }
}

function executeComplete(args: Record<string, unknown>): ToolResult {
  const summary = args.summary as string
  const filesChanged = args.files_changed as string[] | undefined
  
  let output = `✅ Task Complete\n\n${summary}`
  if (filesChanged && filesChanged.length > 0) {
    output += `\n\nFiles changed:\n${filesChanged.map(f => `- ${f}`).join('\n')}`
  }

  return {
    id: crypto.randomUUID(),
    name: 'complete',
    success: true,
    output,
    duration: 0,
  }
}

// ============================================================================
// Tool Executor Router
// ============================================================================

async function executeTool(
  toolCall: ToolCall,
  repository?: { owner: string; repo: string; branch?: string }
): Promise<ToolResult> {
  switch (toolCall.name) {
    case 'read_file':
      return executeReadFile(toolCall.arguments, repository)
    case 'write_file':
      return executeWriteFile(toolCall.arguments, repository)
    case 'list_files':
      return executeListFiles(toolCall.arguments, repository)
    case 'delete_file':
      // Implement delete if needed
      return {
        id: crypto.randomUUID(),
        name: 'delete_file',
        success: false,
        output: '',
        error: 'Delete file not yet implemented',
      }
    case 'run_command':
      return executeRunCommand(toolCall.arguments)
    case 'search_code':
      return executeSearchCode(toolCall.arguments, repository)
    case 'think':
      return executeThink(toolCall.arguments)
    case 'complete':
      return executeComplete(toolCall.arguments)
    default:
      return {
        id: crypto.randomUUID(),
        name: toolCall.name,
        success: false,
        output: '',
        error: `Unknown tool: ${toolCall.name}`,
      }
  }
}

// ============================================================================
// Hook Implementation
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
   * Call Grok API for next step
   */
  const callGrok = useCallback(async (
    messages: Array<{ role: string; content: string }>,
    signal: AbortSignal
  ): Promise<string> => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: messages[messages.length - 1].content,
        history: messages.slice(0, -1),
        mode: 'orchestrate',
      }),
      signal,
    })

    if (!response.ok) {
      throw new Error('Failed to get response from Grok')
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

    let currentTask = { ...initialTask }
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
        // Get Grok's response
        const response = await callGrok(messages, abortController.signal)

        // Parse thought
        const thought = parseThought(response)
        if (thought) {
          const thoughtStep = createStep('thought', thought)
          currentTask.steps.push(thoughtStep)
          setCurrentStep(thoughtStep)
          onStepComplete?.(thoughtStep)
        }

        // Parse tool call
        const toolCall = parseToolCall(response)
        if (!toolCall) {
          // No tool call found, might be a completion or error
          if (response.toLowerCase().includes('complete') || response.toLowerCase().includes('finished')) {
            currentTask.status = 'completed'
            currentTask.result = response
            break
          }
          
          // Ask Grok to provide a tool call
          messages.push({ role: 'assistant', content: response })
          messages.push({ role: 'user', content: 'Please provide a tool call in JSON format to continue, or call the "complete" tool if the task is finished.' })
          continue
        }

        // Create action step
        const actionStep = createStep('action', `Calling ${toolCall.name}`, toolCall)
        currentTask.steps.push(actionStep)
        setCurrentStep(actionStep)
        onStepComplete?.(actionStep)

        // Execute tool
        const result = await executeTool(toolCall, config.repository)

        // Create observation step
        const observationStep = createStep(
          result.success ? 'observation' : 'error',
          result.output || result.error || 'No output',
          undefined,
          result
        )
        currentTask.steps.push(observationStep)
        setCurrentStep(observationStep)
        onStepComplete?.(observationStep)

        // Check if task is complete
        if (toolCall.name === 'complete') {
          currentTask.status = 'completed'
          currentTask.result = result.output
          break
        }

        // Add to conversation
        messages.push({ role: 'assistant', content: response })
        messages.push({
          role: 'user',
          content: `**Observation**:\n${result.success ? result.output : `Error: ${result.error}`}\n\nContinue with the next step.`,
        })

        // Auto-fix errors if enabled
        if (!result.success && config.autoFix) {
          const errorAnalysis = analyzeError(result.error || '')
          messages[messages.length - 1].content += `\n\nError analysis: ${errorAnalysis.suggestion}`
        }

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
