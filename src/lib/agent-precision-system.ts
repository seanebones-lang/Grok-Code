/**
 * Agent Precision Improvement System
 * MIT Professor-Level Implementation
 * 
 * Features:
 * - Continuous agent precision improvement
 * - Adaptive prompt engineering
 * - Context-aware agent selection
 * - Performance-based agent routing
 * - Self-improving agent prompts
 * 
 * Last Updated: January 14, 2026
 */

import type { SpecializedAgent } from './specialized-agents'
import { mlLearningSystem } from './ml-learning-system'
import { ragSystem } from './rag-system'
import { knowledgeGraph } from './knowledge-graph'

// ============================================================================
// Types
// ============================================================================

export interface AgentPrecisionMetrics {
  agentId: string
  precision: number // 0-1, how precise the agent is
  recall: number // 0-1, how well agent handles relevant tasks
  f1Score: number // Harmonic mean of precision and recall
  accuracy: number // Overall accuracy
  confidence: number // How confident we are in these metrics
  lastUpdated: Date
}

export interface AgentEnhancement {
  agentId: string
  originalPrompt: string
  enhancedPrompt: string
  enhancements: string[]
  performanceImprovement: number // Percentage improvement
  appliedAt: Date
}

export interface AgentSelection {
  agentId: string
  confidence: number
  reasoning: string
  alternatives: Array<{ agentId: string; confidence: number }>
}

// ============================================================================
// Agent Precision System
// ============================================================================

/**
 * Agent Precision Improvement System
 * Continuously improves agent precision and accuracy
 */
export class AgentPrecisionSystem {
  private precisionMetrics: Map<string, AgentPrecisionMetrics> = new Map()
  private enhancements: Map<string, AgentEnhancement[]> = new Map()
  private agentPrompts: Map<string, string> = new Map()

  /**
   * Initialize with agent definitions
   */
  initialize(agents: Record<string, SpecializedAgent>): void {
    Object.values(agents).forEach(agent => {
      this.agentPrompts.set(agent.id, agent.systemPrompt)
      
      // Initialize metrics
      this.precisionMetrics.set(agent.id, {
        agentId: agent.id,
        precision: 0.7, // Start with moderate precision
        recall: 0.7,
        f1Score: 0.7,
        accuracy: 0.7,
        confidence: 0.5, // Low confidence initially
        lastUpdated: new Date(),
      })
    })
  }

  /**
   * Update precision metrics based on interaction
   */
  async updateMetrics(agentId: string, interaction: {
    success: boolean
    relevanceScore?: number
    accuracyScore?: number
    userFeedback?: 'positive' | 'negative' | 'neutral'
  }): Promise<void> {
    const metrics = this.precisionMetrics.get(agentId)
    if (!metrics) return

    // Update precision (true positives / (true positives + false positives))
    // Simplified: based on success rate
    const alpha = 0.1 // Learning rate
    if (interaction.success) {
      metrics.precision = Math.min(1.0, metrics.precision + alpha * (1 - metrics.precision))
      metrics.recall = Math.min(1.0, metrics.recall + alpha * (1 - metrics.recall))
    } else {
      metrics.precision = Math.max(0.0, metrics.precision - alpha * metrics.precision)
      metrics.recall = Math.max(0.0, metrics.recall - alpha * metrics.recall)
    }

    // Update accuracy
    if (interaction.accuracyScore !== undefined) {
      metrics.accuracy = metrics.accuracy * 0.9 + interaction.accuracyScore * 0.1
    }

    // Update F1 score
    metrics.f1Score = 2 * (metrics.precision * metrics.recall) / (metrics.precision + metrics.recall || 1)

    // Increase confidence over time
    metrics.confidence = Math.min(1.0, metrics.confidence + 0.01)

    metrics.lastUpdated = new Date()
    this.precisionMetrics.set(agentId, metrics)

    // Check if enhancement is needed
    if (metrics.precision < 0.6 || metrics.f1Score < 0.6) {
      await this.enhanceAgent(agentId)
    }
  }

  /**
   * Enhance agent prompt based on learning
   */
  async enhanceAgent(agentId: string): Promise<AgentEnhancement | null> {
    const metrics = this.precisionMetrics.get(agentId)
    const originalPrompt = this.agentPrompts.get(agentId)
    
    if (!metrics || !originalPrompt) return null

    // Get performance data
    const performance = mlLearningSystem.getAgentPerformance(agentId)
    const patterns = mlLearningSystem.getLearningPatterns(agentId)
      .filter(p => p.agentId === agentId && p.successRate > 0.7)
      .slice(0, 5)

    // Generate enhancements
    const enhancements: string[] = []

    // Add successful patterns
    if (patterns.length > 0) {
      enhancements.push(`## Successful Patterns\n${patterns.map(p => `- ${p.pattern} (${(p.successRate * 100).toFixed(0)}% success)`).join('\n')}`)
    }

    // Add performance insights
    if (performance) {
      if (performance.strengths.length > 0) {
        enhancements.push(`## Strengths\n${performance.strengths.map(s => `- ${s}`).join('\n')}`)
      }
      if (performance.recommendations.length > 0) {
        enhancements.push(`## Recommendations\n${performance.recommendations.map(r => `- ${r}`).join('\n')}`)
      }
    }

    // Add context from knowledge graph
    const graphQuery = knowledgeGraph.query({
      entityType: 'agent',
      filters: { tags: [agentId] },
    })

    if (graphQuery.insights.length > 0) {
      enhancements.push(`## Knowledge Graph Insights\n${graphQuery.insights.join('\n')}`)
    }

    // Create enhanced prompt
    const enhancedPrompt = `${originalPrompt}\n\n## Enhanced Context (Auto-Generated)\n${enhancements.join('\n\n')}`

    // Calculate performance improvement (estimate)
    const performanceImprovement = Math.min(20, metrics.precision < 0.6 ? 15 : 5)

    const enhancement: AgentEnhancement = {
      agentId,
      originalPrompt,
      enhancedPrompt,
      enhancements,
      performanceImprovement,
      appliedAt: new Date(),
    }

    // Store enhancement
    if (!this.enhancements.has(agentId)) {
      this.enhancements.set(agentId, [])
    }
    this.enhancements.get(agentId)!.push(enhancement)

    // Update prompt (keep original, enhance dynamically)
    // In production, you might want to update the actual agent prompt
    // For now, we'll enhance it dynamically when needed

    return enhancement
  }

  /**
   * Get enhanced prompt for agent
   */
  async getEnhancedPrompt(agentId: string, query: string): Promise<string> {
    const basePrompt = this.agentPrompts.get(agentId)
    if (!basePrompt) return ''

    // Get learning context
    const learningContext = await mlLearningSystem.getEnhancedContext(agentId, query)
    
    // Get RAG context
    const ragContext = await ragSystem.getAgentContext(agentId, query, 3)

    // Get precision metrics
    const metrics = this.precisionMetrics.get(agentId)

    // Build enhanced prompt
    let enhancedPrompt = basePrompt

    if (learningContext) {
      enhancedPrompt += `\n\n## Learning Context\n${learningContext}`
    }

    if (ragContext) {
      enhancedPrompt += `\n\n## Relevant Context\n${ragContext}`
    }

    if (metrics && metrics.confidence > 0.7) {
      enhancedPrompt += `\n\n## Performance Metrics\n- Precision: ${(metrics.precision * 100).toFixed(1)}%\n- Recall: ${(metrics.recall * 100).toFixed(1)}%\n- F1 Score: ${(metrics.f1Score * 100).toFixed(1)}%\n- Accuracy: ${(metrics.accuracy * 100).toFixed(1)}%`
    }

    return enhancedPrompt
  }

  /**
   * Select best agent for query
   */
  async selectBestAgent(query: string, availableAgents: string[]): Promise<AgentSelection> {
    // Get RAG results for each agent
    const agentScores: Array<{ agentId: string; score: number; reasoning: string }> = []

    for (const agentId of availableAgents) {
      const ragResult = await ragSystem.query({
        query,
        agentId,
        maxResults: 1,
      })

      const metrics = this.precisionMetrics.get(agentId)
      const performance = mlLearningSystem.getAgentPerformance(agentId)

      // Calculate score
      let score = ragResult.confidence * 0.4 // RAG relevance
      if (metrics) {
        score += metrics.f1Score * 0.3 // Agent precision
        score += metrics.accuracy * 0.2 // Agent accuracy
      }
      if (performance) {
        score += performance.successRate * 0.1 // Historical success
      }

      const reasoning = `RAG relevance: ${(ragResult.confidence * 100).toFixed(1)}%, Precision: ${metrics ? (metrics.f1Score * 100).toFixed(1) : 'N/A'}%, Success rate: ${performance ? (performance.successRate * 100).toFixed(1) : 'N/A'}%`

      agentScores.push({ agentId, score, reasoning })
    }

    // Sort by score
    agentScores.sort((a, b) => b.score - a.score)

    const best = agentScores[0]
    const alternatives = agentScores.slice(1, 4).map(a => ({
      agentId: a.agentId,
      confidence: a.score,
    }))

    return {
      agentId: best.agentId,
      confidence: best.score,
      reasoning: best.reasoning,
      alternatives,
    }
  }

  /**
   * Get precision metrics
   */
  getMetrics(agentId: string): AgentPrecisionMetrics | undefined {
    return this.precisionMetrics.get(agentId)
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): AgentPrecisionMetrics[] {
    return Array.from(this.precisionMetrics.values())
  }

  /**
   * Get enhancements for agent
   */
  getEnhancements(agentId: string): AgentEnhancement[] {
    return this.enhancements.get(agentId) || []
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const agentPrecisionSystem = new AgentPrecisionSystem()
