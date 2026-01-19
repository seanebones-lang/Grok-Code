/**
 * ML System Integration
 * Integrates RAG, Knowledge Graph, ML Learning, and Agent Precision systems
 * MIT Professor-Level Implementation
 * 
 * Last Updated: January 14, 2026
 */

import { ragSystem } from './rag-system'
import { knowledgeGraph } from './knowledge-graph'
import { mlLearningSystem } from './ml-learning-system'
import { agentPrecisionSystem } from './agent-precision-system'
import type { SpecializedAgent } from './specialized-agents'

// ============================================================================
// ML System Integration
// ============================================================================

/**
 * Integrated ML System
 * Provides unified interface for all ML capabilities
 */
export class MLSystemIntegration {
  private initialized = false

  /**
   * Initialize ML systems with agents
   */
  initialize(agents: Record<string, SpecializedAgent>): void {
    if (this.initialized) return

    // Initialize agent precision system
    agentPrecisionSystem.initialize(agents)

    this.initialized = true
  }

  /**
   * Process interaction through all ML systems
   */
  async processInteraction(data: {
    userQuery: string
    agentId?: string
    agentResponse: string
    success: boolean
    sessionId?: string
    context?: string
    metrics?: {
      responseTime: number
      tokenCount: number
      relevanceScore?: number
      accuracyScore?: number
      userSatisfaction?: number
    }
    userFeedback?: 'positive' | 'negative' | 'neutral'
  }): Promise<void> {
    // Record in ML learning system
    await mlLearningSystem.recordInteraction({
      userQuery: data.userQuery,
      agentId: data.agentId,
      agentResponse: data.agentResponse,
      context: data.context,
      success: data.success,
      userFeedback: data.userFeedback,
      metrics: data.metrics || {
        responseTime: 0,
        tokenCount: 0,
      },
      sessionId: data.sessionId,
    })

    // Update agent precision
    if (data.agentId) {
      await agentPrecisionSystem.updateMetrics(data.agentId, {
        success: data.success,
        relevanceScore: data.metrics?.relevanceScore,
        accuracyScore: data.metrics?.accuracyScore,
        userFeedback: data.userFeedback,
      })
    }
  }

  /**
   * Get enhanced context for agent
   */
  async getEnhancedContext(agentId: string, query: string): Promise<string> {
    // Get enhanced prompt
    const enhancedPrompt = await agentPrecisionSystem.getEnhancedPrompt(agentId, query)
    
    // Get learning context
    const learningContext = await mlLearningSystem.getEnhancedContext(agentId, query)
    
    // Get RAG context
    const ragContext = await ragSystem.getAgentContext(agentId, query, 5)

    // Combine contexts
    const contexts: string[] = []
    
    if (enhancedPrompt) {
      contexts.push(enhancedPrompt)
    }
    
    if (learningContext) {
      contexts.push(learningContext)
    }
    
    if (ragContext) {
      contexts.push(ragContext)
    }

    return contexts.join('\n\n---\n\n')
  }

  /**
   * Select best agent for query
   */
  async selectBestAgent(query: string, availableAgents: string[]): Promise<{
    agentId: string
    confidence: number
    reasoning: string
    enhancedContext: string
  }> {
    const selection = await agentPrecisionSystem.selectBestAgent(query, availableAgents)
    const enhancedContext = await this.getEnhancedContext(selection.agentId, query)

    return {
      agentId: selection.agentId,
      confidence: selection.confidence,
      reasoning: selection.reasoning,
      enhancedContext,
    }
  }

  /**
   * Get system health and metrics
   */
  getSystemHealth(): {
    rag: { documentCount: number }
    knowledgeGraph: { entityCount: number; relationshipCount: number }
    mlLearning: { interactionCount: number; agentCount: number }
    precision: { agentCount: number; averagePrecision: number }
  } {
    const ragStore = ragSystem.getVectorStore()
    const allEntities = knowledgeGraph.getAllEntities()
    const allRelationships = knowledgeGraph.getAllRelationships()
    const allPerformances = mlLearningSystem.getAllAgentPerformances()
    const allMetrics = agentPrecisionSystem.getAllMetrics()

    const averagePrecision = allMetrics.length > 0
      ? allMetrics.reduce((sum, m) => sum + m.precision, 0) / allMetrics.length
      : 0

    return {
      rag: {
        documentCount: ragStore.getAllDocuments().length,
      },
      knowledgeGraph: {
        entityCount: allEntities.length,
        relationshipCount: allRelationships.length,
      },
      mlLearning: {
        interactionCount: allPerformances.reduce((sum, p) => sum + p.totalInteractions, 0),
        agentCount: allPerformances.length,
      },
      precision: {
        agentCount: allMetrics.length,
        averagePrecision,
      },
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const mlSystemIntegration = new MLSystemIntegration()
