# 🚀 ML System Integration Guide

**Quick Start Guide for Integrating Enterprise ML System**

---

## Step 1: Initialize ML System

Add to `src/app/api/chat/route.ts` at the top:

```typescript
import { mlSystemIntegration } from '@/lib/ml-integration'
import { SPECIALIZED_AGENTS } from '@/lib/specialized-agents'

// Initialize ML system (do this once, can be at module level)
if (!mlSystemIntegration['initialized']) {
  mlSystemIntegration.initialize(SPECIALIZED_AGENTS)
}
```

---

## Step 2: Enhance Agent Context

In your chat route handler, before calling Grok API:

```typescript
// Get enhanced context for selected agent
let enhancedSystemPrompt = SYSTEM_PROMPT

if (agentId) {
  try {
    const enhancedContext = await mlSystemIntegration.getEnhancedContext(agentId, message)
    if (enhancedContext) {
      enhancedSystemPrompt += `\n\n## Enhanced Context from ML System\n${enhancedContext}`
    }
  } catch (error) {
    console.error('[ML] Failed to get enhanced context:', error)
    // Continue with default prompt
  }
}
```

---

## Step 3: Record Interactions

After getting response from Grok, record the interaction:

```typescript
// Record interaction for learning (don't await, fire and forget)
mlSystemIntegration.processInteraction({
  userQuery: message,
  agentId: agentId,
  agentResponse: fullResponse,
  success: true, // Determine based on response quality or user feedback
  sessionId: conversationId,
  context: contextString,
  metrics: {
    responseTime: Date.now() - startTime,
    tokenCount: fullResponse.length,
    // Calculate relevance score (0-1)
    relevanceScore: calculateRelevanceScore(message, fullResponse),
  },
  userFeedback: undefined, // Can be set from user feedback mechanism
}).catch(error => {
  console.error('[ML] Failed to record interaction:', error)
  // Don't block response
})
```

---

## Step 4: Auto-Select Best Agent (Optional)

For automatic agent selection:

```typescript
// If no agent specified, select best one
if (!agentId && !explicitMode) {
  try {
    const selection = await mlSystemIntegration.selectBestAgent(
      message,
      Object.keys(SPECIALIZED_AGENTS)
    )
    
    if (selection.confidence > 0.6) {
      agentId = selection.agentId
      // Use selection.enhancedContext in system prompt
    }
  } catch (error) {
    console.error('[ML] Failed to select agent:', error)
  }
}
```

---

## Step 5: Add Helper Functions

Add these helper functions to your route:

```typescript
/**
 * Calculate relevance score between query and response
 */
function calculateRelevanceScore(query: string, response: string): number {
  // Simple keyword matching (can be enhanced with embeddings)
  const queryWords = new Set(query.toLowerCase().split(/\s+/).filter(w => w.length > 3))
  const responseWords = new Set(response.toLowerCase().split(/\s+/).filter(w => w.length > 3))
  
  const intersection = new Set([...queryWords].filter(w => responseWords.has(w)))
  const union = new Set([...queryWords, ...responseWords])
  
  return union.size > 0 ? intersection.size / union.size : 0
}
```

---

## Step 6: Monitor System Health (Optional)

Add health endpoint or dashboard:

```typescript
// GET /api/ml/health
export async function GET() {
  const health = mlSystemIntegration.getSystemHealth()
  return NextResponse.json(health)
}
```

---

## 🎯 Key Benefits

1. **Automatic Learning** - System learns from every interaction
2. **Improved Precision** - Agents get more precise over time
3. **Better Context** - Enhanced prompts with relevant past interactions
4. **Smart Routing** - Automatically selects best agent for query
5. **Performance Tracking** - Monitor agent performance and improvements

---

## ⚠️ Important Notes

1. **Non-Blocking** - ML operations should not block user responses
2. **Error Handling** - Always wrap ML calls in try-catch
3. **Performance** - Use async/await but don't block on ML operations
4. **Privacy** - Consider data privacy when storing interactions

---

## 📊 Monitoring

Check system health:

```typescript
const health = mlSystemIntegration.getSystemHealth()
console.log('ML System Health:', health)
```

---

**Status:** Ready for Integration  
**Next:** Follow steps above to integrate into your chat route
