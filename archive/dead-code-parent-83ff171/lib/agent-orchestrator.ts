/**
 * Agent Orchestrator System
 * Coordinates multiple agents and manages parallel/sequential execution
 */

import { SPECIALIZED_AGENTS, type SpecializedAgent } from './specialized-agents'
import type { ToolCall } from './agent-loop'

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
}

export interface OrchestrationResult {
  plan: OrchestrationPlan
  results: AgentResult[]
  summary: string
  success: boolean
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
  
  // Match agents to task
  const lowerTask = task.toLowerCase()
  for (const [agentId, keywords] of agentKeywords) {
    const matches = keywords.some(keyword => lowerTask.includes(keyword.toLowerCase()))
    if (matches) {
      tasks.push({
        agentId,
        task: `Execute ${SPECIALIZED_AGENTS[agentId].name} analysis`,
        priority: 1,
      })
    }
  }
  
  // If no matches, use common agents
  if (tasks.length === 0) {
    tasks.push(
      { agentId: 'codeReview', task: 'Code review', priority: 1 },
      { agentId: 'bugHunter', task: 'Bug detection', priority: 2 },
      { agentId: 'security', task: 'Security scan', priority: 3 },
    )
  }
  
  // Organize into phases (can run in parallel)
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
    t.dependencies && 
    t.dependencies.every(dep => processed.has(dep))
  )
  if (phase2.length > 0) {
    phases.push(phase2)
  }
  
  return {
    phases,
    estimatedDuration: phases.length * 30, // 30 seconds per phase
    parallelTasks: Math.max(...phases.map(p => p.length), 1),
    sequentialPhases: phases.length,
  }
}

/**
 * Execute agents in parallel
 */
export async function executeAgentSwarm(
  agentIds: string[],
  task: string,
  repository?: { owner: string; repo: string; branch?: string },
  onProgress?: (agentId: string, result: AgentResult) => void
): Promise<AgentResult[]> {
  const agents = agentIds
    .map(id => SPECIALIZED_AGENTS[id])
    .filter((a): a is SpecializedAgent => a !== undefined)
  
  if (agents.length === 0) {
    throw new Error('No valid agents specified')
  }
  
  // Execute all agents in parallel
  const promises = agents.map(async (agent): Promise<AgentResult> => {
    const startTime = Date.now()
    try {
      // In a real implementation, this would call the agent's execution function
      // For now, we return a placeholder that indicates the agent should be invoked
      const result: AgentResult = {
        agentId: agent.id,
        agentName: agent.name,
        success: true,
        output: `${agent.emoji} ${agent.name} ready to execute: ${task}`,
        duration: Date.now() - startTime,
      }
      
      onProgress?.(agent.id, result)
      return result
    } catch (error) {
      const result: AgentResult = {
        agentId: agent.id,
        agentName: agent.name,
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      }
      
      onProgress?.(agent.id, result)
      return result
    }
  })
  
  return Promise.all(promises)
}

/**
 * Execute orchestration plan
 */
export async function executeOrchestration(
  plan: OrchestrationPlan,
  task: string,
  repository?: { owner: string; repo: string; branch?: string },
  onPhaseComplete?: (phase: number, results: AgentResult[]) => void
): Promise<OrchestrationResult> {
  const allResults: AgentResult[] = []
  
  // Execute phases sequentially
  for (let i = 0; i < plan.phases.length; i++) {
    const phase = plan.phases[i]
    const agentIds = phase.map(t => t.agentId)
    
    // Execute agents in this phase in parallel
    const phaseResults = await executeAgentSwarm(
      agentIds,
      task,
      repository,
      (agentId, result) => {
        // Progress callback
      }
    )
    
    allResults.push(...phaseResults)
    onPhaseComplete?.(i + 1, phaseResults)
  }
  
  // Generate summary
  const successful = allResults.filter(r => r.success).length
  const failed = allResults.filter(r => !r.success).length
  const summary = `Orchestration complete: ${successful} agents succeeded, ${failed} failed`
  
  return {
    plan,
    results: allResults,
    summary,
    success: failed === 0,
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
    // Extract agent IDs if specified
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
