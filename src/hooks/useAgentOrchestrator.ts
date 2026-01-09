import { useState, useCallback, useMemo } from 'react'

/**
 * Agent Orchestrator Hook
 * Parses AI responses for agent sections and manages agent state
 */

// ============================================================================
// Types
// ============================================================================

export interface Agent {
  id: string
  name: string
  emoji: string
  output: string
  status: 'pending' | 'active' | 'complete'
}

export interface RefactorStep {
  step: number
  description: string
  before?: string
  after?: string
  rationale?: string
}

export interface RefactorPlan {
  analysis: string
  steps: RefactorStep[]
  impact: {
    performance?: string
    maintainability?: string
    testability?: string
  }
  suggestedTests: string[]
}

export interface ToolRequest {
  tool: string
  input: string
  purpose: string
}

export interface ParsedResponse {
  agents: Agent[]
  refactorPlan: RefactorPlan | null
  toolRequests: ToolRequest[]
  plainContent: string
  hasAgentOutput: boolean
  hasRefactorPlan: boolean
  hasOrchestratedContent: boolean
}

// ============================================================================
// Agent Definitions
// ============================================================================

const AGENT_DEFINITIONS: Record<string, { emoji: string; description: string }> = {
  'Planner': { emoji: '🎯', description: 'Strategy and task breakdown' },
  'Coder': { emoji: '💻', description: 'Implementation' },
  'Tester': { emoji: '🧪', description: 'Test cases and validation' },
  'Reviewer': { emoji: '🔍', description: 'Code review and quality' },
  'Debugger': { emoji: '🐛', description: 'Error analysis and fixes' },
  'Integrator': { emoji: '📦', description: 'Component integration' },
  'Optimizer': { emoji: '⚡', description: 'Performance optimization' },
  'Security': { emoji: '🔒', description: 'Security analysis' },
}

// ============================================================================
// Parsing Functions
// ============================================================================

/**
 * Parse agent sections from response
 */
function parseAgents(response: string): Agent[] {
  const agents: Agent[] = []
  
  // Match patterns like "### 🎯 Planner Agent Output" or "### Planner Agent Output"
  const agentPattern = /###\s*([🎯💻🧪🔍🐛📦⚡🔒]?)\s*(\w+)\s+Agent\s+Output\s*\n([\s\S]*?)(?=###\s*[🎯💻🧪🔍🐛📦⚡🔒]?\s*\w+\s+Agent|###\s*[📋🔍📊✅🔧]|$)/gi
  
  let match
  while ((match = agentPattern.exec(response)) !== null) {
    const [, emoji, name, output] = match
    const agentDef = AGENT_DEFINITIONS[name] || { emoji: '🤖', description: 'Agent' }
    
    agents.push({
      id: `agent-${name.toLowerCase()}-${Date.now()}`,
      name,
      emoji: emoji || agentDef.emoji,
      output: output.trim(),
      status: 'complete',
    })
  }
  
  return agents
}

/**
 * Parse refactor plan from response
 */
function parseRefactorPlan(response: string): RefactorPlan | null {
  // Check if this looks like a refactor response
  if (!response.includes('### 🔍 Analysis') && !response.includes('### 📋 Refactor Plan')) {
    return null
  }
  
  const plan: RefactorPlan = {
    analysis: '',
    steps: [],
    impact: {},
    suggestedTests: [],
  }
  
  // Parse analysis section
  const analysisMatch = response.match(/###\s*🔍\s*Analysis\s*\n([\s\S]*?)(?=###|$)/i)
  if (analysisMatch) {
    plan.analysis = analysisMatch[1].trim()
  }
  
  // Parse refactor steps
  const stepsMatch = response.match(/###\s*📋\s*Refactor Plan\s*\n([\s\S]*?)(?=###\s*📊|###\s*✅|$)/i)
  if (stepsMatch) {
    const stepsContent = stepsMatch[1]
    const stepPattern = /(\d+)\.\s*\*\*([^*]+)\*\*:?\s*([\s\S]*?)(?=\d+\.\s*\*\*|$)/g
    
    let stepMatch
    while ((stepMatch = stepPattern.exec(stepsContent)) !== null) {
      const [, stepNum, description, content] = stepMatch
      
      const step: RefactorStep = {
        step: parseInt(stepNum, 10),
        description: description.trim(),
      }
      
      // Parse before/after code blocks
      const beforeMatch = content.match(/Before:?\s*```[\w]*\n?([\s\S]*?)```/i)
      const afterMatch = content.match(/After:?\s*```[\w]*\n?([\s\S]*?)```/i)
      const rationaleMatch = content.match(/Rationale:?\s*([^\n]+(?:\n(?!-|\d|\*)[^\n]+)*)/i)
      
      if (beforeMatch) step.before = beforeMatch[1].trim()
      if (afterMatch) step.after = afterMatch[1].trim()
      if (rationaleMatch) step.rationale = rationaleMatch[1].trim()
      
      plan.steps.push(step)
    }
  }
  
  // Parse impact assessment
  const impactMatch = response.match(/###\s*📊\s*Impact Assessment\s*\n([\s\S]*?)(?=###|$)/i)
  if (impactMatch) {
    const impactContent = impactMatch[1]
    const perfMatch = impactContent.match(/Performance:?\s*([^\n]+)/i)
    const maintMatch = impactContent.match(/Maintainability:?\s*([^\n]+)/i)
    const testMatch = impactContent.match(/Testability:?\s*([^\n]+)/i)
    
    if (perfMatch) plan.impact.performance = perfMatch[1].trim()
    if (maintMatch) plan.impact.maintainability = maintMatch[1].trim()
    if (testMatch) plan.impact.testability = testMatch[1].trim()
  }
  
  // Parse suggested tests
  const testsMatch = response.match(/###\s*✅\s*Suggested Tests\s*\n([\s\S]*?)(?=###|$)/i)
  if (testsMatch) {
    const testsContent = testsMatch[1]
    const testItems = testsContent.match(/[-*]\s*([^\n]+)/g) || []
    plan.suggestedTests = testItems.map(t => t.replace(/^[-*]\s*/, '').trim())
  }
  
  // Only return if we found meaningful content
  if (plan.analysis || plan.steps.length > 0) {
    return plan
  }
  
  return null
}

/**
 * Parse tool requests from response
 */
function parseToolRequests(response: string): ToolRequest[] {
  const requests: ToolRequest[] = []
  
  const toolPattern = /###\s*🔧\s*Tool Request\s*\n([\s\S]*?)(?=###|$)/gi
  
  let match
  while ((match = toolPattern.exec(response)) !== null) {
    const content = match[1]
    
    const toolMatch = content.match(/Tool:?\s*([^\n]+)/i)
    const inputMatch = content.match(/Input:?\s*([^\n]+)/i)
    const purposeMatch = content.match(/Purpose:?\s*([^\n]+)/i)
    
    if (toolMatch) {
      requests.push({
        tool: toolMatch[1].trim(),
        input: inputMatch?.[1]?.trim() || '',
        purpose: purposeMatch?.[1]?.trim() || '',
      })
    }
  }
  
  return requests
}

/**
 * Extract plain content (non-agent, non-refactor sections)
 */
function extractPlainContent(response: string): string {
  // Remove agent sections
  let plain = response.replace(/###\s*[🎯💻🧪🔍🐛📦⚡🔒]?\s*\w+\s+Agent\s+Output[\s\S]*?(?=###\s*[🎯💻🧪🔍🐛📦⚡🔒]?\s*\w+\s+Agent|###\s*[📋🔍📊✅🔧]|$)/gi, '')
  
  // Remove refactor sections
  plain = plain.replace(/###\s*🔍\s*Analysis[\s\S]*?(?=###|$)/gi, '')
  plain = plain.replace(/###\s*📋\s*Refactor Plan[\s\S]*?(?=###|$)/gi, '')
  plain = plain.replace(/###\s*📊\s*Impact Assessment[\s\S]*?(?=###|$)/gi, '')
  plain = plain.replace(/###\s*✅\s*Suggested Tests[\s\S]*?(?=###|$)/gi, '')
  plain = plain.replace(/###\s*🔧\s*Tool Request[\s\S]*?(?=###|$)/gi, '')
  
  return plain.trim()
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useAgentOrchestrator() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [refactorPlan, setRefactorPlan] = useState<RefactorPlan | null>(null)
  const [toolRequests, setToolRequests] = useState<ToolRequest[]>([])
  const [isOrchestrating, setIsOrchestrating] = useState(false)

  /**
   * Parse a response and extract agent/refactor/tool information
   */
  const orchestrate = useCallback((response: string): ParsedResponse => {
    setIsOrchestrating(true)
    
    try {
      const parsedAgents = parseAgents(response)
      const parsedPlan = parseRefactorPlan(response)
      const parsedTools = parseToolRequests(response)
      const plainContent = extractPlainContent(response)
      
      setAgents(parsedAgents)
      setRefactorPlan(parsedPlan)
      setToolRequests(parsedTools)
      
      const hasAgentOutput = parsedAgents.length > 0
      const hasRefactorPlan = parsedPlan !== null
      const hasOrchestratedContent = hasAgentOutput || hasRefactorPlan || parsedTools.length > 0
      
      return {
        agents: parsedAgents,
        refactorPlan: parsedPlan,
        toolRequests: parsedTools,
        plainContent,
        hasAgentOutput,
        hasRefactorPlan,
        hasOrchestratedContent,
      }
    } finally {
      setIsOrchestrating(false)
    }
  }, [])

  /**
   * Clear all orchestration state
   */
  const clearOrchestration = useCallback(() => {
    setAgents([])
    setRefactorPlan(null)
    setToolRequests([])
  }, [])

  /**
   * Get a specific agent by name
   */
  const getAgent = useCallback((name: string): Agent | undefined => {
    return agents.find(a => a.name.toLowerCase() === name.toLowerCase())
  }, [agents])

  /**
   * Check if response has any orchestrated content
   */
  const hasOrchestratedContent = useMemo(() => {
    return agents.length > 0 || refactorPlan !== null || toolRequests.length > 0
  }, [agents, refactorPlan, toolRequests])

  return {
    agents,
    refactorPlan,
    toolRequests,
    isOrchestrating,
    hasOrchestratedContent,
    orchestrate,
    clearOrchestration,
    getAgent,
  }
}

/**
 * Get agent definition by name
 */
export function getAgentDefinition(name: string) {
  return AGENT_DEFINITIONS[name] || { emoji: '🤖', description: 'Agent' }
}

/**
 * Get all available agent definitions
 */
export function getAllAgentDefinitions() {
  return AGENT_DEFINITIONS
}
