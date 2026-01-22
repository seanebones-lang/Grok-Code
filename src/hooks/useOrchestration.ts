/**
 * useOrchestration Hook
 * Manages orchestrator mode state and message preparation
 */

import { useState, useEffect, useCallback } from 'react'
import { analyzeTask, formatAnalysisForDisplay, isOrchestratorModeEnabled } from '@/lib/orchestrator'
import type { Message } from '@/types'
import type { ChatMode } from '@/components/InputBar'

export interface UseOrchestrationOptions {
  messages: Message[]
}

export interface UseOrchestrationReturn {
  orchestratorMode: boolean
  prepareMessage: (content: string, mode: ChatMode) => {
    processedContent: string
    orchestratorPrefix: string
    userMessage: Message
  }
}

/**
 * Hook for managing orchestrator mode and message preparation
 */
export function useOrchestration(options: UseOrchestrationOptions): UseOrchestrationReturn {
  const { messages } = options
  const [orchestratorMode, setOrchestratorModeState] = useState(false)

  // Initialize orchestrator mode
  useEffect(() => {
    setOrchestratorModeState(isOrchestratorModeEnabled())
  }, [])

  // Listen for orchestrator mode changes
  useEffect(() => {
    const handleOrchestratorChange = (e: CustomEvent<{ enabled: boolean }>) => {
      setOrchestratorModeState(e.detail.enabled)
    }
    window.addEventListener('orchestratorModeChanged', handleOrchestratorChange as EventListener)
    return () => window.removeEventListener('orchestratorModeChanged', handleOrchestratorChange as EventListener)
  }, [])

  // Prepare message content with orchestrator logic
  const prepareMessage = useCallback((content: string, mode: ChatMode): {
    processedContent: string
    orchestratorPrefix: string
    userMessage: Message
  } => {
    let processedContent = content
    let orchestratorPrefix = ''
    
    // Check if orchestrator mode is enabled and this is a new task (not already orchestrated)
    if (orchestratorMode && !content.startsWith('/agent') && messages.length === 0) {
      // Analyze the task
      const analysis = analyzeTask(content)
      
      // Show analysis to user
      orchestratorPrefix = `🎼 **Auto-Orchestrator Active**\n\n${formatAnalysisForDisplay(analysis)}\n\n---\n\n`
      
      // Route to the best agent
      if (analysis.suggestedAgents.length > 0) {
        const primaryAgent = analysis.suggestedAgents[0]
        processedContent = `/agent ${primaryAgent.agentId} ${content}`
        
        // Add orchestrator context
        orchestratorPrefix += `**Routing to ${primaryAgent.emoji} ${primaryAgent.agentName}**\n_${primaryAgent.reason}_\n\n---\n\n`
      }
    }
    
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: orchestratorPrefix ? `${orchestratorPrefix}${content}` : content,
      timestamp: new Date(),
      metadata: mode !== 'default' ? { mode } : undefined,
    }

    return { processedContent, orchestratorPrefix, userMessage }
  }, [orchestratorMode, messages.length])

  return {
    orchestratorMode,
    prepareMessage,
  }
}
