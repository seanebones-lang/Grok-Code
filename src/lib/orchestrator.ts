/**
 * Orchestrator System
 * Automatically routes tasks to the right specialized agents
 */

import { getAllAgents, getAgent, type SpecializedAgent } from './specialized-agents'

// ============================================================================
// Types
// ============================================================================

export interface TaskAnalysis {
  originalTask: string
  taskType: TaskType
  complexity: 'simple' | 'moderate' | 'complex'
  suggestedAgents: AgentAssignment[]
  executionPlan: ExecutionStep[]
  estimatedTime: string
}

export interface AgentAssignment {
  agentId: string
  agentName: string
  emoji: string
  task: string
  reason: string
  priority: number
}

export interface ExecutionStep {
  phase: number
  agents: AgentAssignment[]
  parallel: boolean
  dependsOn?: number[]
}

export type TaskType = 
  | 'feature' 
  | 'bugfix' 
  | 'refactor' 
  | 'security' 
  | 'performance' 
  | 'testing' 
  | 'documentation' 
  | 'deployment' 
  | 'mobile' 
  | 'api' 
  | 'database' 
  | 'ui' 
  | 'ai' 
  | 'data' 
  | 'review' 
  | 'general'

// ============================================================================
// Task Analysis Keywords
// ============================================================================

const TASK_KEYWORDS: Record<TaskType, string[]> = {
  feature: ['build', 'create', 'add', 'implement', 'develop', 'new feature', 'functionality'],
  bugfix: ['bug', 'fix', 'error', 'issue', 'broken', 'not working', 'crash', 'fails', 'wrong'],
  refactor: ['refactor', 'clean', 'improve', 'optimize code', 'restructure', 'simplify'],
  security: ['security', 'vulnerability', 'auth', 'authentication', 'authorization', 'encrypt', 'secure', 'hack', 'attack'],
  performance: ['performance', 'slow', 'fast', 'speed', 'optimize', 'memory', 'cpu', 'bottleneck', 'latency'],
  testing: ['test', 'testing', 'coverage', 'unit test', 'e2e', 'integration test', 'spec'],
  documentation: ['document', 'docs', 'readme', 'api docs', 'comment', 'explain'],
  deployment: ['deploy', 'release', 'production', 'ci/cd', 'pipeline', 'docker', 'kubernetes'],
  mobile: ['mobile', 'ios', 'android', 'react native', 'flutter', 'app', 'phone', 'tablet'],
  api: ['api', 'endpoint', 'rest', 'graphql', 'route', 'request', 'response'],
  database: ['database', 'db', 'sql', 'query', 'schema', 'migration', 'postgres', 'mongodb'],
  ui: ['ui', 'ux', 'design', 'style', 'css', 'component', 'layout', 'responsive', 'dark mode'],
  ai: ['ai', 'ml', 'machine learning', 'llm', 'gpt', 'embedding', 'rag', 'prompt'],
  data: ['data', 'etl', 'pipeline', 'analytics', 'transform', 'process'],
  review: ['review', 'check', 'audit', 'analyze', 'evaluate'],
  general: [],
}

// Task type to agent mapping
const TASK_TO_AGENT: Record<TaskType, string[]> = {
  feature: ['fullstack', 'api', 'database', 'uiux'],
  bugfix: ['bugHunter', 'testing'],
  refactor: ['optimization', 'codeReview'],
  security: ['security'],
  performance: ['performance', 'optimization'],
  testing: ['testing'],
  documentation: ['documentation'],
  deployment: ['devops', 'security'],
  mobile: ['mobile', 'uiux', 'testing'],
  api: ['api', 'database', 'documentation'],
  database: ['database', 'api'],
  ui: ['uiux', 'accessibility'],
  ai: ['aiml', 'api'],
  data: ['data', 'database'],
  review: ['codeReview', 'security', 'performance'],
  general: ['fullstack'],
}

// ============================================================================
// Task Analyzer
// ============================================================================

export function analyzeTask(input: string): TaskAnalysis {
  const lowerInput = input.toLowerCase()
  
  // Detect task type
  let taskType: TaskType = 'general'
  let maxMatches = 0
  
  for (const [type, keywords] of Object.entries(TASK_KEYWORDS)) {
    const matches = keywords.filter(k => lowerInput.includes(k)).length
    if (matches > maxMatches) {
      maxMatches = matches
      taskType = type as TaskType
    }
  }
  
  // Determine complexity
  const wordCount = input.split(/\s+/).length
  const hasMultipleTasks = lowerInput.includes(' and ') || lowerInput.includes(' then ') || lowerInput.includes(' also ')
  const complexity: TaskAnalysis['complexity'] = 
    wordCount > 50 || hasMultipleTasks ? 'complex' :
    wordCount > 20 ? 'moderate' : 'simple'
  
  // Get suggested agents
  const agentIds = TASK_TO_AGENT[taskType] || ['fullstack']
  const suggestedAgents: AgentAssignment[] = agentIds.map((id, index) => {
    const agent = getAgent(id)
    return {
      agentId: id,
      agentName: agent?.name || id,
      emoji: agent?.emoji || '🤖',
      task: generateAgentTask(input, id, taskType),
      reason: getAgentReason(id, taskType),
      priority: index + 1,
    }
  })
  
  // Create execution plan
  const executionPlan = createExecutionPlan(suggestedAgents, complexity)
  
  // Estimate time
  const estimatedTime = 
    complexity === 'simple' ? '5-10 min' :
    complexity === 'moderate' ? '15-30 min' : '30-60 min'
  
  return {
    originalTask: input,
    taskType,
    complexity,
    suggestedAgents,
    executionPlan,
    estimatedTime,
  }
}

function generateAgentTask(input: string, agentId: string, taskType: TaskType): string {
  const taskPrefixes: Record<string, string> = {
    bugHunter: 'Diagnose and fix: ',
    security: 'Security review for: ',
    performance: 'Optimize performance of: ',
    testing: 'Create tests for: ',
    documentation: 'Document: ',
    codeReview: 'Review code quality for: ',
    optimization: 'Optimize and refactor: ',
    fullstack: 'Implement end-to-end: ',
    mobile: 'Build mobile implementation of: ',
    api: 'Design and implement API for: ',
    database: 'Design database schema for: ',
    uiux: 'Design UI/UX for: ',
    aiml: 'Integrate AI capabilities for: ',
    data: 'Build data pipeline for: ',
    devops: 'Set up deployment for: ',
    accessibility: 'Ensure accessibility for: ',
  }
  
  return (taskPrefixes[agentId] || 'Work on: ') + input
}

function getAgentReason(agentId: string, taskType: TaskType): string {
  const reasons: Record<string, string> = {
    bugHunter: 'Expert at finding root causes and fixing bugs',
    security: 'Specialized in vulnerability detection',
    performance: 'Optimizes speed and resource usage',
    testing: 'Creates comprehensive test coverage',
    documentation: 'Generates clear, helpful docs',
    codeReview: 'Ensures code quality and best practices',
    optimization: 'Improves code efficiency',
    fullstack: 'Handles end-to-end implementation',
    mobile: 'Expert in mobile development patterns',
    api: 'Designs robust, scalable APIs',
    database: 'Optimizes data structures and queries',
    uiux: 'Creates beautiful, intuitive interfaces',
    aiml: 'Integrates AI/ML capabilities',
    data: 'Builds reliable data pipelines',
    devops: 'Sets up reliable deployment',
    accessibility: 'Ensures inclusive design',
  }
  
  return reasons[agentId] || 'Best fit for this task'
}

function createExecutionPlan(agents: AgentAssignment[], complexity: TaskAnalysis['complexity']): ExecutionStep[] {
  if (agents.length === 0) return []
  
  if (complexity === 'simple' || agents.length === 1) {
    return [{
      phase: 1,
      agents: agents,
      parallel: false,
    }]
  }
  
  // For moderate/complex, create phased execution
  const plan: ExecutionStep[] = []
  
  // Phase 1: Primary agent
  plan.push({
    phase: 1,
    agents: [agents[0]],
    parallel: false,
  })
  
  // Phase 2+: Supporting agents
  if (agents.length > 1) {
    const supportAgents = agents.slice(1)
    const canParallel = supportAgents.every(a => 
      !['testing', 'documentation'].includes(a.agentId)
    )
    
    plan.push({
      phase: 2,
      agents: supportAgents,
      parallel: canParallel,
      dependsOn: [1],
    })
  }
  
  return plan
}

// ============================================================================
// Orchestrator Prompt Generator
// ============================================================================

export function generateOrchestratorPrompt(analysis: TaskAnalysis): string {
  const agentList = getAllAgents()
  const agentDescriptions = agentList
    .map(a => `- **${a.emoji} ${a.name}** (${a.id}): ${a.description}`)
    .join('\n')

  return `You are the Orchestrator Agent. Your job is to analyze tasks and coordinate specialized agents to complete them efficiently.

## Task Received
"${analysis.originalTask}"

## My Analysis
- **Task Type:** ${analysis.taskType}
- **Complexity:** ${analysis.complexity}
- **Estimated Time:** ${analysis.estimatedTime}

## Suggested Execution Plan

${analysis.executionPlan.map(step => `
### Phase ${step.phase} ${step.parallel ? '(Parallel)' : '(Sequential)'}
${step.agents.map(a => `
**${a.emoji} ${a.agentName}**
- Task: ${a.task}
- Reason: ${a.reason}
`).join('')}
`).join('\n')}

## Available Agents
${agentDescriptions}

## Your Instructions
1. Review my suggested plan above
2. Adjust if needed based on your expertise
3. Execute Phase 1 first, then proceed to subsequent phases
4. After each agent completes, summarize their output
5. Coordinate handoffs between agents
6. Provide a final summary when all phases complete

## Response Format
Start by confirming the plan or suggesting adjustments, then begin execution.

When delegating to an agent, use this format:
\`\`\`
[Delegating to ${analysis.suggestedAgents[0]?.emoji || '🤖'} ${analysis.suggestedAgents[0]?.agentName || 'Agent'}]

<agent_task>
${analysis.suggestedAgents[0]?.task || 'Task description'}
</agent_task>
\`\`\`

Begin orchestration now.`
}

// ============================================================================
// Quick Route (for simple tasks)
// ============================================================================

export function quickRoute(input: string): { agentId: string; prompt: string } | null {
  const analysis = analyzeTask(input)
  
  // For simple tasks, route directly to the best agent
  if (analysis.complexity === 'simple' && analysis.suggestedAgents.length > 0) {
    const agent = analysis.suggestedAgents[0]
    return {
      agentId: agent.agentId,
      prompt: input,
    }
  }
  
  return null
}

// ============================================================================
// Format for Display
// ============================================================================

export function formatAnalysisForDisplay(analysis: TaskAnalysis): string {
  const lines = [
    `## 🎼 Orchestrator Analysis`,
    ``,
    `**Task Type:** ${analysis.taskType}`,
    `**Complexity:** ${analysis.complexity}`,
    `**Estimated Time:** ${analysis.estimatedTime}`,
    ``,
    `### Execution Plan`,
  ]
  
  for (const step of analysis.executionPlan) {
    lines.push(``)
    lines.push(`**Phase ${step.phase}** ${step.parallel ? '(parallel)' : ''}`)
    for (const agent of step.agents) {
      lines.push(`- ${agent.emoji} **${agent.agentName}**: ${agent.task}`)
    }
  }
  
  return lines.join('\n')
}

// ============================================================================
// Storage for Orchestrator Mode
// ============================================================================

const ORCHESTRATOR_MODE_KEY = 'nexteleven_orchestratorMode'

export function isOrchestratorModeEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(ORCHESTRATOR_MODE_KEY) === 'true'
}

export function setOrchestratorMode(enabled: boolean): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ORCHESTRATOR_MODE_KEY, enabled ? 'true' : 'false')
}

export function toggleOrchestratorMode(): boolean {
  const current = isOrchestratorModeEnabled()
  setOrchestratorMode(!current)
  return !current
}
