/**
 * Model Configuration
 * Defines available models and their capabilities
 */

import type { GrokModelInfo } from '@/types'

// ============================================================================
// Model Definitions
// ============================================================================

export const GROK_MODELS: Record<string, GrokModelInfo> = {
  'grok-4.1-fast': {
    id: 'grok-4.1-fast',
    name: 'Eleven (Fast)',
    maxTokens: 8192,
    contextWindow: 131072,
  },
  'grok-4-1-fast': {
    id: 'grok-4-1-fast',
    name: 'Eleven (Fast Alt)',
    maxTokens: 8192,
    contextWindow: 131072,
  },
  'grok-4': {
    id: 'grok-4',
    name: 'Eleven',
    maxTokens: 8192,
    contextWindow: 131072,
  },
  'grok-3': {
    id: 'grok-3',
    name: 'Eleven (Legacy)',
    maxTokens: 4096,
    contextWindow: 65536,
  },
} as const

// ============================================================================
// Model Selection
// ============================================================================

export const DEFAULT_MODEL = 'grok-4.1-fast'

export const MODEL_PRIORITY = [
  'grok-4.1-fast',
  'grok-4-1-fast',
  'grok-4',
  'grok-3',
] as const

/**
 * Get model info by ID
 */
export function getModelInfo(modelId: string): GrokModelInfo | undefined {
  return GROK_MODELS[modelId]
}

/**
 * Get all available models
 */
export function getAvailableModels(): GrokModelInfo[] {
  return Object.values(GROK_MODELS)
}

/**
 * Check if a model ID is valid
 */
export function isValidModel(modelId: string): boolean {
  return modelId in GROK_MODELS
}

// ============================================================================
// System Prompts
// ============================================================================

export const SYSTEM_PROMPTS = {
  default: `You are Eleven, an AI assistant powered by NextEleven. You help developers write, edit, and understand code. You can:
- Generate code in any programming language
- Explain code and concepts
- Debug and fix errors
- Refactor and optimize code
- Work with multiple files and repositories
- Generate Git commits and push changes

Always provide clear, well-commented code. When generating code, make it production-ready and follow best practices.

Security guidelines:
- Never execute arbitrary code
- Never expose sensitive information
- Always sanitize user inputs in generated code
- Follow OWASP security best practices`,

  codeReview: `You are a code review assistant. Analyze the provided code for:
- Bugs and potential issues
- Security vulnerabilities
- Performance optimizations
- Code style and best practices
- Accessibility concerns

Provide specific, actionable feedback with code examples.`,

  refactor: `You are a code refactoring assistant. Help improve code by:
- Simplifying complex logic
- Extracting reusable functions
- Improving naming conventions
- Adding proper error handling
- Following SOLID principles

Always explain your changes and why they improve the code.`,

  explain: `You are a code explanation assistant. When explaining code:
- Break down complex logic step by step
- Use simple language and analogies
- Highlight important patterns and concepts
- Point out potential gotchas
- Suggest related topics to learn

Make explanations accessible to developers of all levels.`,

  debug: `You are a debugging assistant. When helping debug code:
- Identify the root cause of issues
- Explain why the bug occurs
- Provide a clear fix with explanation
- Suggest ways to prevent similar bugs
- Recommend testing strategies

Be thorough but concise in your analysis.`,
} as const

export type SystemPromptKey = keyof typeof SYSTEM_PROMPTS

/**
 * Get a system prompt by key
 */
export function getSystemPrompt(key: SystemPromptKey = 'default'): string {
  return SYSTEM_PROMPTS[key]
}

// ============================================================================
// Token Estimation
// ============================================================================

/**
 * Estimate token count for a string
 * Uses a simple heuristic: ~4 characters per token for English text
 * This is an approximation - actual tokenization varies by model
 */
export function estimateTokens(text: string): number {
  // Average ~4 characters per token for English
  // Code tends to have more tokens per character due to special characters
  const avgCharsPerToken = 3.5
  return Math.ceil(text.length / avgCharsPerToken)
}

/**
 * Check if content fits within model context
 */
export function fitsInContext(
  content: string,
  modelId: string = DEFAULT_MODEL,
  reserveTokens: number = 4096
): boolean {
  const model = getModelInfo(modelId)
  if (!model) return false
  
  const estimatedTokens = estimateTokens(content)
  return estimatedTokens + reserveTokens <= model.contextWindow
}

/**
 * Truncate content to fit within token limit
 */
export function truncateToFit(
  content: string,
  maxTokens: number,
  suffix: string = '\n\n[Content truncated...]'
): string {
  const estimatedTokens = estimateTokens(content)
  
  if (estimatedTokens <= maxTokens) {
    return content
  }
  
  // Estimate characters to keep
  const avgCharsPerToken = 3.5
  const maxChars = Math.floor(maxTokens * avgCharsPerToken) - suffix.length
  
  return content.slice(0, maxChars) + suffix
}
