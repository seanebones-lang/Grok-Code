/**
 * Advanced ML Learning System
 * MIT Professor-Level Implementation
 * 
 * Features:
 * - Learns from every interaction
 * - Improves agent precision over time
 * - Pattern recognition and adaptation
 * - Feedback loop integration
 * - Continuous model refinement
 * 
 * Last Updated: January 14, 2026
 */

import type { SpecializedAgent } from './specialized-agents'
import { ragSystem } from './rag-system'
import { knowledgeGraph } from './knowledge-graph'

// ============================================================================
// Types
// ============================================================================

export interface Interaction {
  id: string
  timestamp: Date
  userQuery: string
  agentId?: string
  agentResponse: string
  context?: string
  success: boolean
  userFeedback?: 'positive' | 'negative' | 'neutral'
  metrics: InteractionMetrics
  sessionId?: string
}

export interface InteractionMetrics {
  responseTime: number
  tokenCount: number
  relevanceScore?: number
  accuracyScore?: number
  userSatisfaction?: number
}

export interface AgentPerformance {
  agentId: string
  totalInteractions: number
  successRate: number
  averageResponseTime: number
  averageRelevanceScore: number
  improvementTrend: 'improving' | 'stable' | 'declining'
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  lastUpdated: Date
}

export interface LearningPattern {
  id: string
  pattern: string
  context: string
  frequency: number
  successRate: number
  agentId?: string
  confidence: number
  createdAt: Date
  lastSeen: Date
}

export interface MLModel {
  id: string
  type: 'classification' | 'regression' | 'clustering' | 'embedding'
  version: number
  accuracy: number
  trainingDataSize: number
  lastTrained: Date
  parameters: Record<string, unknown>
}

// ============================================================================
// ML Learning System
// ============================================================================

/**
 * Advanced ML Learning System
 * Continuously learns and improves from interactions
 */
export class MLLearningSystem {
  private interactions: Map<string, Interaction> = new Map()
  private agentPerformance: Map<string, AgentPerformance> = new Map()
  private learningPatterns: Map<string, LearningPattern> = new Map()
  private models: Map<string, MLModel> = new Map()

  /**
   * Record interaction for learning
   */
  async recordInteraction(interaction: Omit<Interaction, 'id' | 'timestamp'>): Promise<Interaction> {
    const fullInteraction: Interaction = {
      ...interaction,
      id: `interaction_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date(),
    }

    this.interactions.set(fullInteraction.id, fullInteraction)

    // Learn from interaction
    await this.learnFromInteraction(fullInteraction)

    // Update agent performance
    if (fullInteraction.agentId) {
      this.updateAgentPerformance(fullInteraction.agentId, fullInteraction)
    }

    // Extract patterns
    this.extractPatterns(fullInteraction)

    // Store in RAG system
    await ragSystem.addInteraction({
      userQuery: fullInteraction.userQuery,
      agentResponse: fullInteraction.agentResponse,
      agentId: fullInteraction.agentId,
      sessionId: fullInteraction.sessionId,
      context: fullInteraction.context,
      importance: fullInteraction.success ? 'high' : 'medium',
    })

    // Store in knowledge graph
    knowledgeGraph.learnFromInteraction({
      userQuery: fullInteraction.userQuery,
      agentResponse: fullInteraction.agentResponse,
      agentId: fullInteraction.agentId,
      sessionId: fullInteraction.sessionId,
      success: fullInteraction.success,
    })

    return fullInteraction
  }

  /**
   * Learn from interaction
   */
  private async learnFromInteraction(interaction: Interaction): Promise<void> {
    // Analyze success factors
    if (interaction.success) {
      // Extract what made it successful
      const successFactors = this.analyzeSuccessFactors(interaction)
      
      // Update learning patterns
      successFactors.forEach(factor => {
        const patternId = `pattern_${factor}`
        let pattern = this.learningPatterns.get(patternId)
        
        if (!pattern) {
          pattern = {
            id: patternId,
            pattern: factor,
            context: interaction.context || '',
            frequency: 1,
            successRate: 1.0,
            agentId: interaction.agentId,
            confidence: 0.5,
            createdAt: new Date(),
            lastSeen: new Date(),
          }
        } else {
          pattern.frequency++
          pattern.successRate = (pattern.successRate * (pattern.frequency - 1) + 1) / pattern.frequency
          pattern.lastSeen = new Date()
          pattern.confidence = Math.min(1.0, pattern.confidence + 0.05)
        }
        
        this.learningPatterns.set(patternId, pattern)
      })
    } else {
      // Learn from failures
      const failureFactors = this.analyzeFailureFactors(interaction)
      
      failureFactors.forEach(factor => {
        const patternId = `pattern_${factor}`
        let pattern = this.learningPatterns.get(patternId)
        
        if (!pattern) {
          pattern = {
            id: patternId,
            pattern: factor,
            context: interaction.context || '',
            frequency: 1,
            successRate: 0.0,
            agentId: interaction.agentId,
            confidence: 0.3,
            createdAt: new Date(),
            lastSeen: new Date(),
          }
        } else {
          pattern.frequency++
          pattern.successRate = (pattern.successRate * (pattern.frequency - 1) + 0) / pattern.frequency
          pattern.lastSeen = new Date()
        }
        
        this.learningPatterns.set(patternId, pattern)
      })
    }
  }

  /**
   * Analyze success factors
   */
  private analyzeSuccessFactors(interaction: Interaction): string[] {
    const factors: string[] = []

    // Check response quality
    if (interaction.metrics.relevanceScore && interaction.metrics.relevanceScore > 0.8) {
      factors.push('high_relevance')
    }

    if (interaction.metrics.accuracyScore && interaction.metrics.accuracyScore > 0.8) {
      factors.push('high_accuracy')
    }

    // Check response time
    if (interaction.metrics.responseTime < 2000) {
      factors.push('fast_response')
    }

    // Check user feedback
    if (interaction.userFeedback === 'positive') {
      factors.push('positive_feedback')
    }

    // Extract keywords from query
    const keywords = this.extractKeywords(interaction.userQuery)
    factors.push(...keywords.map(k => `keyword_${k}`))

    return factors
  }

  /**
   * Analyze failure factors
   */
  private analyzeFailureFactors(interaction: Interaction): string[] {
    const factors: string[] = []

    // Check response quality
    if (interaction.metrics.relevanceScore && interaction.metrics.relevanceScore < 0.5) {
      factors.push('low_relevance')
    }

    if (interaction.metrics.accuracyScore && interaction.metrics.accuracyScore < 0.5) {
      factors.push('low_accuracy')
    }

    // Check response time
    if (interaction.metrics.responseTime > 5000) {
      factors.push('slow_response')
    }

    // Check user feedback
    if (interaction.userFeedback === 'negative') {
      factors.push('negative_feedback')
    }

    return factors
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase().split(/\s+/)
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'])
    
    return words
      .filter(word => word.length > 3 && !stopWords.has(word))
      .slice(0, 5)
  }

  /**
   * Update agent performance
   */
  private updateAgentPerformance(agentId: string, interaction: Interaction): void {
    let performance = this.agentPerformance.get(agentId)

    if (!performance) {
      performance = {
        agentId,
        totalInteractions: 0,
        successRate: 0,
        averageResponseTime: 0,
        averageRelevanceScore: 0,
        improvementTrend: 'stable',
        strengths: [],
        weaknesses: [],
        recommendations: [],
        lastUpdated: new Date(),
      }
    }

    // Update metrics
    performance.totalInteractions++
    performance.successRate = (performance.successRate * (performance.totalInteractions - 1) + (interaction.success ? 1 : 0)) / performance.totalInteractions
    performance.averageResponseTime = (performance.averageResponseTime * (performance.totalInteractions - 1) + interaction.metrics.responseTime) / performance.totalInteractions
    
    if (interaction.metrics.relevanceScore) {
      performance.averageRelevanceScore = (performance.averageRelevanceScore * (performance.totalInteractions - 1) + interaction.metrics.relevanceScore) / performance.totalInteractions
    }

    // Analyze trends
    const recentInteractions = this.getRecentInteractions(agentId, 10)
    if (recentInteractions.length >= 5) {
      const recentSuccessRate = recentInteractions.filter(i => i.success).length / recentInteractions.length
      if (recentSuccessRate > performance.successRate * 1.1) {
        performance.improvementTrend = 'improving'
      } else if (recentSuccessRate < performance.successRate * 0.9) {
        performance.improvementTrend = 'declining'
      } else {
        performance.improvementTrend = 'stable'
      }
    }

    // Generate recommendations
    performance.recommendations = this.generateRecommendations(performance, recentInteractions)

    performance.lastUpdated = new Date()
    this.agentPerformance.set(agentId, performance)
  }

  /**
   * Get recent interactions for agent
   */
  private getRecentInteractions(agentId: string, count: number): Interaction[] {
    return Array.from(this.interactions.values())
      .filter(i => i.agentId === agentId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, count)
  }

  /**
   * Generate recommendations for agent improvement
   */
  private generateRecommendations(performance: AgentPerformance, recentInteractions: Interaction[]): string[] {
    const recommendations: string[] = []

    if (performance.successRate < 0.7) {
      recommendations.push('Focus on improving success rate - analyze failure patterns')
    }

    if (performance.averageResponseTime > 3000) {
      recommendations.push('Optimize response time - consider caching or pre-computation')
    }

    if (performance.averageRelevanceScore < 0.7) {
      recommendations.push('Improve relevance - enhance context retrieval and understanding')
    }

    // Analyze common failure patterns
    const failures = recentInteractions.filter(i => !i.success)
    if (failures.length > 0) {
      const commonIssues = this.findCommonIssues(failures)
      recommendations.push(`Address common issues: ${commonIssues.join(', ')}`)
    }

    return recommendations
  }

  /**
   * Find common issues in failed interactions
   */
  private findCommonIssues(failures: Interaction[]): string[] {
    const issueCounts = new Map<string, number>()

    failures.forEach(failure => {
      if (failure.metrics.relevanceScore && failure.metrics.relevanceScore < 0.5) {
        issueCounts.set('low_relevance', (issueCounts.get('low_relevance') || 0) + 1)
      }
      if (failure.metrics.accuracyScore && failure.metrics.accuracyScore < 0.5) {
        issueCounts.set('low_accuracy', (issueCounts.get('low_accuracy') || 0) + 1)
      }
      if (failure.metrics.responseTime > 5000) {
        issueCounts.set('slow_response', (issueCounts.get('slow_response') || 0) + 1)
      }
    })

    return Array.from(issueCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([issue]) => issue)
  }

  /**
   * Extract patterns from interaction
   */
  private extractPatterns(interaction: Interaction): void {
    // Extract query patterns
    const queryPattern = this.identifyQueryPattern(interaction.userQuery)
    if (queryPattern) {
      const patternId = `query_pattern_${queryPattern}`
      let pattern = this.learningPatterns.get(patternId)

      if (!pattern) {
        pattern = {
          id: patternId,
          pattern: queryPattern,
          context: interaction.context || '',
          frequency: 1,
          successRate: interaction.success ? 1.0 : 0.0,
          agentId: interaction.agentId,
          confidence: 0.5,
          createdAt: new Date(),
          lastSeen: new Date(),
        }
      } else {
        pattern.frequency++
        pattern.successRate = (pattern.successRate * (pattern.frequency - 1) + (interaction.success ? 1 : 0)) / pattern.frequency
        pattern.lastSeen = new Date()
        pattern.confidence = Math.min(1.0, pattern.confidence + 0.02)
      }

      this.learningPatterns.set(patternId, pattern)
    }
  }

  /**
   * Identify query pattern
   */
  private identifyQueryPattern(query: string): string | null {
    const lowerQuery = query.toLowerCase()

    if (lowerQuery.includes('how to') || lowerQuery.includes('how do')) {
      return 'how_to_question'
    }
    if (lowerQuery.includes('what is') || lowerQuery.includes('what are')) {
      return 'what_question'
    }
    if (lowerQuery.includes('why')) {
      return 'why_question'
    }
    if (lowerQuery.includes('fix') || lowerQuery.includes('error') || lowerQuery.includes('bug')) {
      return 'fix_request'
    }
    if (lowerQuery.includes('implement') || lowerQuery.includes('create') || lowerQuery.includes('build')) {
      return 'implementation_request'
    }
    if (lowerQuery.includes('explain') || lowerQuery.includes('describe')) {
      return 'explanation_request'
    }

    return null
  }

  /**
   * Get agent performance
   */
  getAgentPerformance(agentId: string): AgentPerformance | undefined {
    return this.agentPerformance.get(agentId)
  }

  /**
   * Get all agent performances
   */
  getAllAgentPerformances(): AgentPerformance[] {
    return Array.from(this.agentPerformance.values())
  }

  /**
   * Get learning patterns
   */
  getLearningPatterns(agentId?: string): LearningPattern[] {
    const patterns = Array.from(this.learningPatterns.values())
    return agentId ? patterns.filter(p => p.agentId === agentId) : patterns
  }

  /**
   * Get context for agent based on learning
   */
  async getEnhancedContext(agentId: string, query: string): Promise<string> {
    const contextParts: string[] = []

    // Get RAG context
    const ragContext = await ragSystem.getAgentContext(agentId, query)
    if (ragContext) {
      contextParts.push('## Relevant Past Interactions\n' + ragContext)
    }

    // Get agent performance insights
    const performance = this.getAgentPerformance(agentId)
    if (performance) {
      contextParts.push(`## Agent Performance Insights\n- Success Rate: ${(performance.successRate * 100).toFixed(1)}%\n- Average Response Time: ${performance.averageResponseTime.toFixed(0)}ms\n- Trend: ${performance.improvementTrend}`)
      
      if (performance.recommendations.length > 0) {
        contextParts.push(`- Recommendations: ${performance.recommendations.join(', ')}`)
      }
    }

    // Get relevant learning patterns
    const patterns = this.getLearningPatterns(agentId)
      .filter(p => p.successRate > 0.7 && p.confidence > 0.6)
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 3)

    if (patterns.length > 0) {
      contextParts.push('## Successful Patterns\n' + patterns.map(p => `- ${p.pattern} (${(p.successRate * 100).toFixed(0)}% success, seen ${p.frequency} times)`).join('\n'))
    }

    return contextParts.join('\n\n')
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const mlLearningSystem = new MLLearningSystem()
