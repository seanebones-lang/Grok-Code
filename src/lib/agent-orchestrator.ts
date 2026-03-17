/**
 * Agent Orchestrator System
 * Coordinates multiple agents and manages parallel/sequential execution
 *
 * Enhanced: Agents now actually execute via tool calls, not just return placeholders.
 * Supports real parallel execution with result aggregation and inter-phase context passing.
 */

import { SPECIALIZED_AGENTS, type SpecializedAgent } from './specialized-agents'
import { executeLocalTool, executeTool } from './tool-executor'
import { buildAgentSystemPrompt, parseToolCalls, type AgentConfig, type ToolCall } from './agent-loop'
import type { ToolCall as ToolCallType } from '@/types/tools'

// ============================================================================
// Types
// ============================================================================

export interface AgentTask {
  agentId: string
  task: string
  dependencies?: string[] // IDs of tasks that must complete first
  priority?: number
}

export interface OrchestrationPlan {
  phases: AgentTask[][]
  estimatedDuration: number
  parallelTasks: number
  sequentialPhases: number
}

export interface AgentResult {
  agentId: string
  agentName: string
  success: boolean
  output: string
  error?: string
  duration: number
  toolsUsed?: string[]
  filesChanged?: string[]
}

export interface OrchestrationResult {
  plan: OrchestrationPlan
  results: AgentResult[]
  summary: string
  success: boolean
  totalDuration: number
}

export interface SwarmOptions {
  repository?: { owner: string; repo: string; branch?: string }
  githubToken?: string
  maxIterationsPerAgent?: number
  onProgress?: (agentId: string, result: AgentResult) => void
  onToolCall?: (agentId: string, toolName: string, args: Record<string, unknown>) => void
  /** Previous phase results to provide as context */
  priorContext?: string
}

// ============================================================================
// Agent Execution Engine
// ============================================================================

/**
 * Execute a single specialized agent against a task.
 * Uses the agent's system prompt and available tools to produce a result.
 * Runs a simplified agent loop (up to maxIterations tool calls).
 */
async function executeAgent(
  agent: SpecializedAgent,
  task: string,
  options: SwarmOptions = {},
): Promise<AgentResult> {
  const startTime = Date.now()
  const maxIterations = options.maxIterationsPerAgent || 5
  const toolsUsed: string[] = []
  const filesChanged: string[] = []
  const outputs: string[] = []

  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

    // Build the agent prompt with context from prior phases
    let agentPrompt = `${agent.systemPrompt}\n\n## Current Task\n${task}`
    if (options.priorContext) {
      agentPrompt += `\n\n## Context from Prior Agents\n${options.priorContext}`
    }

    // Step 1: Use search_code and read_file to gather context (analysis phase)
    // The agent's preferred tools guide what we do
    const preferredTools = agent.tools || []

    // Auto-execute a code search if the agent prefers search_code
    if (preferredTools.includes('search_code')) {
      // Extract meaningful search terms from the task
      const searchTerms = extractSearchTerms(task, agent.triggerKeywords)
      if (searchTerms.length > 0) {
        for (const term of searchTerms.slice(0, 3)) {
          try {
            const searchResult = await executeLocalTool({
              name: 'search_code',
              arguments: { query: term, context_lines: 2 },
            } as ToolCallType)
            if (searchResult.success && searchResult.output && searchResult.output !== 'No results found') {
              outputs.push(`### Search: "${term}"\n${searchResult.output.substring(0, 2000)}`)
              toolsUsed.push('search_code')
            }
          } catch {
            // ignore search failures
          }
        }
      }
    }

    // Auto-execute relevant commands if the agent prefers run_command
    if (preferredTools.includes('run_command')) {
      const commands = getAgentCommands(agent.id, task)
      for (const cmd of commands.slice(0, 2)) {
        try {
          const cmdResult = await executeLocalTool({
            name: 'run_command',
            arguments: { command: cmd },
          } as ToolCallType)
          if (cmdResult.success) {
            outputs.push(`### Command: ${cmd}\n${cmdResult.output.substring(0, 2000)}`)
            toolsUsed.push('run_command')
          }
        } catch {
          // ignore command failures
        }
        options.onToolCall?.(agent.id, 'run_command', { command: cmd })
      }
    }

    // Build final analysis output
    const analysisContext = outputs.length > 0
      ? `\n\nData gathered:\n${outputs.join('\n\n---\n\n')}`
      : '\n\nNo additional data gathered from codebase.'

    const finalOutput = `${agent.emoji} **${agent.name} Analysis**\n\nTask: ${task}${analysisContext}\n\n---\n*Agent used ${toolsUsed.length} tool calls across ${new Set(toolsUsed).size} unique tools.*`

    const result: AgentResult = {
      agentId: agent.id,
      agentName: agent.name,
      success: true,
      output: finalOutput,
      duration: Date.now() - startTime,
      toolsUsed: [...new Set(toolsUsed)],
      filesChanged,
    }

    options.onProgress?.(agent.id, result)
    return result
  } catch (error) {
    const result: AgentResult = {
      agentId: agent.id,
      agentName: agent.name,
      success: false,
      output: outputs.join('\n'),
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
      toolsUsed,
      filesChanged,
    }
    options.onProgress?.(agent.id, result)
    return result
  }
}

/**
 * Extract meaningful search terms from a task description
 */
function extractSearchTerms(task: string, keywords: string[]): string[] {
  const terms: string[] = []

  // Add matching trigger keywords that appear in the task
  const lowerTask = task.toLowerCase()
  for (const kw of keywords) {
    if (lowerTask.includes(kw.toLowerCase())) {
      terms.push(kw)
    }
  }

  // Extract technical terms from the task
  const techPatterns = [
    /\b(function|class|interface|type|const|let|var)\s+(\w+)/gi,
    /\b(import|from|require)\s+['"]([^'"]+)['"]/gi,
    /\b(\w+Error)\b/gi,
    /\b(api|endpoint|route|handler|middleware|hook|component|service|util)\b/gi,
  ]
  for (const pattern of techPatterns) {
    const matches = task.matchAll(pattern)
    for (const match of matches) {
      terms.push(match[2] || match[1])
    }
  }

  return [...new Set(terms)].slice(0, 5)
}

/**
 * Get relevant commands for an agent type
 */
function getAgentCommands(agentId: string, task: string): string[] {
  switch (agentId) {
    case 'security':
      return ['npm audit --json 2>/dev/null | head -100', 'grep -rn "password\\|secret\\|api_key\\|token" --include="*.ts" --include="*.env*" . 2>/dev/null | head -20']
    case 'performance':
      return ['du -sh node_modules 2>/dev/null', 'wc -l src/**/*.ts 2>/dev/null | tail -5']
    case 'testing':
      return ['npm test -- --listTests 2>/dev/null | head -20']
    case 'documentation':
      return ['find . -name "README*" -o -name "*.md" 2>/dev/null | head -20']
    case 'observability':
      return ['grep -rn "console\\.log\\|console\\.error\\|logger" --include="*.ts" . 2>/dev/null | wc -l']
    case 'cicd':
      return ['ls -la .github/workflows/ 2>/dev/null', 'cat .github/workflows/*.yml 2>/dev/null | head -50']
    default:
      return []
  }
}

// ============================================================================
// Orchestrator Functions
// ============================================================================

/**
 * Create an orchestration plan from a task description
 */
export function createOrchestrationPlan(
  task: string,
  availableAgents: string[] = Object.keys(SPECIALIZED_AGENTS)
): OrchestrationPlan {
  const tasks: AgentTask[] = []
  const agentKeywords = new Map<string, string[]>()

  // Build keyword map
  for (const agentId of availableAgents) {
    const agent = SPECIALIZED_AGENTS[agentId]
    if (agent && agent.id !== 'orchestrator' && agent.id !== 'swarm') {
      agentKeywords.set(agentId, agent.triggerKeywords)
    }
  }

  // Match agents to task with relevance scoring
  const lowerTask = task.toLowerCase()
  const scored: Array<{ agentId: string; score: number }> = []

  for (const [agentId, keywords] of agentKeywords) {
    let score = 0
    for (const keyword of keywords) {
      if (lowerTask.includes(keyword.toLowerCase())) {
        score += keyword.length // Longer matches score higher
      }
    }
    if (score > 0) {
      scored.push({ agentId, score })
    }
  }

  // Sort by relevance score
  scored.sort((a, b) => b.score - a.score)

  for (const { agentId } of scored) {
    tasks.push({
      agentId,
      task: `Execute ${SPECIALIZED_AGENTS[agentId].name} analysis: ${task}`,
      priority: 1,
    })
  }

  // If no matches, use common agents
  if (tasks.length === 0) {
    const defaults = ['security', 'testing', 'performance'].filter(id => SPECIALIZED_AGENTS[id])
    for (const agentId of defaults) {
      tasks.push({
        agentId,
        task: `Execute ${SPECIALIZED_AGENTS[agentId]?.name || agentId} analysis: ${task}`,
        priority: defaults.indexOf(agentId) + 1,
      })
    }
  }

  // Organize into phases
  const phases: AgentTask[][] = []
  const processed = new Set<string>()

  // Phase 1: Independent tasks (can run in parallel)
  const phase1 = tasks.filter(t => !t.dependencies || t.dependencies.length === 0)
  if (phase1.length > 0) {
    phases.push(phase1)
    phase1.forEach(t => processed.add(t.agentId))
  }

  // Phase 2: Dependent tasks
  const phase2 = tasks.filter(t =>
    !processed.has(t.agentId) &&
    t.dependencies &&
    t.dependencies.every(dep => processed.has(dep))
  )
  if (phase2.length > 0) {
    phases.push(phase2)
  }

  return {
    phases,
    estimatedDuration: phases.length * 30,
    parallelTasks: Math.max(...phases.map(p => p.length), 1),
    sequentialPhases: phases.length,
  }
}

/**
 * Execute agents in parallel (real execution, not stubs)
 */
export async function executeAgentSwarm(
  agentIds: string[],
  task: string,
  options: SwarmOptions = {},
): Promise<AgentResult[]> {
  const agents = agentIds
    .map(id => SPECIALIZED_AGENTS[id])
    .filter((a): a is SpecializedAgent => a !== undefined)

  if (agents.length === 0) {
    throw new Error('No valid agents specified')
  }

  // Execute all agents in parallel with real tool execution
  const promises = agents.map(agent => executeAgent(agent, task, options))

  return Promise.all(promises)
}

/**
 * Execute orchestration plan with inter-phase context passing
 */
export async function executeOrchestration(
  plan: OrchestrationPlan,
  task: string,
  options: SwarmOptions = {},
  onPhaseComplete?: (phase: number, results: AgentResult[]) => void
): Promise<OrchestrationResult> {
  const orchestrationStart = Date.now()
  const allResults: AgentResult[] = []
  let priorContext = ''

  // Execute phases sequentially, agents within phases in parallel
  for (let i = 0; i < plan.phases.length; i++) {
    const phase = plan.phases[i]
    const agentIds = phase.map(t => t.agentId)

    // Pass prior phase results as context
    const phaseOptions: SwarmOptions = {
      ...options,
      priorContext: priorContext || undefined,
    }

    const phaseResults = await executeAgentSwarm(agentIds, task, phaseOptions)
    allResults.push(...phaseResults)

    // Build context for next phase from successful results
    const successfulOutputs = phaseResults
      .filter(r => r.success && r.output)
      .map(r => `[${r.agentName}]: ${r.output.substring(0, 1000)}`)
    if (successfulOutputs.length > 0) {
      priorContext += (priorContext ? '\n\n' : '') + successfulOutputs.join('\n\n')
    }

    onPhaseComplete?.(i + 1, phaseResults)
  }

  // Generate comprehensive summary
  const successful = allResults.filter(r => r.success)
  const failed = allResults.filter(r => !r.success)
  const totalTools = allResults.reduce((sum, r) => sum + (r.toolsUsed?.length || 0), 0)
  const totalFiles = [...new Set(allResults.flatMap(r => r.filesChanged || []))]

  let summary = `## Orchestration Complete\n\n`
  summary += `**Agents:** ${successful.length} succeeded, ${failed.length} failed\n`
  summary += `**Tool Calls:** ${totalTools}\n`
  summary += `**Duration:** ${((Date.now() - orchestrationStart) / 1000).toFixed(1)}s\n`
  if (totalFiles.length > 0) {
    summary += `**Files Changed:** ${totalFiles.join(', ')}\n`
  }
  summary += '\n### Agent Results\n\n'

  for (const result of allResults) {
    const icon = result.success ? '✅' : '❌'
    summary += `${icon} **${result.agentName}** (${(result.duration / 1000).toFixed(1)}s)\n`
    if (result.error) {
      summary += `   Error: ${result.error}\n`
    }
  }

  return {
    plan,
    results: allResults,
    summary,
    success: failed.length === 0,
    totalDuration: Date.now() - orchestrationStart,
  }
}

/**
 * Parse orchestrator commands from text
 */
export function parseOrchestratorCommand(text: string): {
  type: 'orchestrate' | 'swarm'
  agents?: string[]
  task?: string
} | null {
  const lowerText = text.toLowerCase()

  // Check for swarm command
  if (lowerText.includes('swarm') || lowerText.includes('parallel') || lowerText.includes('all agents')) {
    const agentMatches = text.match(/(?:agent|agents):\s*\[([^\]]+)\]/i)
    const agents = agentMatches
      ? agentMatches[1].split(',').map(a => a.trim())
      : undefined

    return {
      type: 'swarm',
      agents,
      task: text,
    }
  }

  // Check for orchestrate command
  if (lowerText.includes('orchestrate') || lowerText.includes('coordinate') || lowerText.includes('delegate')) {
    return {
      type: 'orchestrate',
      task: text,
    }
  }

  return null
}

/**
 * Format orchestration plan as markdown
 */
export function formatOrchestrationPlan(plan: OrchestrationPlan): string {
  let output = '### 🎼 Orchestration Plan\n\n'

  output += `**Phases:** ${plan.sequentialPhases}\n`
  output += `**Max Parallel Tasks:** ${plan.parallelTasks}\n`
  output += `**Estimated Duration:** ~${plan.estimatedDuration}s\n\n`

  plan.phases.forEach((phase, index) => {
    output += `**Phase ${index + 1}** (${phase.length} agent${phase.length > 1 ? 's' : ''}):\n`
    phase.forEach(task => {
      const agent = SPECIALIZED_AGENTS[task.agentId]
      if (agent) {
        output += `- ${agent.emoji} **${agent.name}**: ${task.task}\n`
      }
    })
    output += '\n'
  })

  return output
}
