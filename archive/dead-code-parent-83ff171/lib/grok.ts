import { z } from 'zod'

/**
 * API Client
 * Type-safe wrapper for NextEleven API
 */

// ============================================================================
// Types & Schemas
// ============================================================================

export interface GrokMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface GrokResponse {
  content: string
  done: boolean
}

export interface GrokStreamOptions {
  model?: GrokModel
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  signal?: AbortSignal
}

export type GrokModel = 
  | 'grok-4.1-fast' 
  | 'grok-4-1-fast' 
  | 'grok-4' 
  | 'grok-3'

// Zod schema for API response validation
const grokDeltaSchema = z.object({
  choices: z.array(
    z.object({
      index: z.number().optional(),
      delta: z.object({
        role: z.string().optional(),
        content: z.string().optional(),
      }).optional(),
      finish_reason: z.string().nullable().optional(),
    })
  ).optional(),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    total_tokens: z.number(),
  }).optional(),
})

// ============================================================================
// Constants
// ============================================================================

const GROK_API_URL = 'https://api.x.ai/v1/chat/completions'
const DEFAULT_MODEL: GrokModel = 'grok-4.1-fast'
const DEFAULT_TEMPERATURE = 0.7
const DEFAULT_MAX_TOKENS = 4000
const REQUEST_TIMEOUT = 30000

// Models to try in order of preference
const MODEL_FALLBACK_ORDER: GrokModel[] = [
  'grok-4.1-fast',
  'grok-4-1-fast', 
  'grok-4',
  'grok-3',
]

// ============================================================================
// Error Classes
// ============================================================================

export class GrokAPIError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string,
    public readonly retryable: boolean = false
  ) {
    super(message)
    this.name = 'GrokAPIError'
  }
}

export class GrokConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GrokConfigError'
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function getApiKey(): string {
  const apiKey = process.env.GROK_API_KEY
  if (!apiKey) {
    throw new GrokConfigError('GROK_API_KEY environment variable is not configured')
  }
  return apiKey
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: options.signal || controller.signal,
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

function parseSSELine(line: string): { content?: string; done?: boolean; error?: string } | null {
  const trimmedLine = line.trim()
  if (!trimmedLine || !trimmedLine.startsWith('data: ')) {
    return null
  }
  
  const data = trimmedLine.slice(6)
  if (data === '[DONE]') {
    return { done: true }
  }
  
  try {
    const parsed = JSON.parse(data)
    const validated = grokDeltaSchema.safeParse(parsed)
    
    if (!validated.success) {
      return null
    }
    
    const content = validated.data.choices?.[0]?.delta?.content
    return content ? { content } : null
  } catch {
    return null
  }
}

// ============================================================================
// Main API Functions
// ============================================================================

/**
 * Stream a response from the API
 * 
 * @param messages - Array of messages in the conversation
 * @param onChunk - Callback for each content chunk
 * @param onError - Optional error callback
 * @param options - Optional configuration
 */
export async function streamGrokResponse(
  messages: GrokMessage[],
  onChunk: (content: string) => void,
  onError?: (error: Error) => void,
  options: GrokStreamOptions = {}
): Promise<void> {
  const {
    model = DEFAULT_MODEL,
    temperature = DEFAULT_TEMPERATURE,
    maxTokens = DEFAULT_MAX_TOKENS,
    topP,
    frequencyPenalty,
    presencePenalty,
    signal,
  } = options

  const apiKey = getApiKey()

  // Build request body
  const requestBody = {
    model,
    messages,
    stream: true,
    temperature,
    max_tokens: maxTokens,
    ...(topP !== undefined && { top_p: topP }),
    ...(frequencyPenalty !== undefined && { frequency_penalty: frequencyPenalty }),
    ...(presencePenalty !== undefined && { presence_penalty: presencePenalty }),
  }

  try {
    const response = await fetchWithTimeout(
      GROK_API_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal,
      },
      REQUEST_TIMEOUT
    )

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new GrokAPIError(
        `API error: ${response.status} - ${errorText}`,
        response.status,
        'API_ERROR',
        response.status >= 500
      )
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new GrokAPIError('No response body received', undefined, 'NO_BODY')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const result = parseSSELine(line)
        if (!result) continue
        
        if (result.done) {
          return
        }
        
        if (result.content) {
          onChunk(result.content)
        }
      }
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      // Request was cancelled - don't treat as error
      return
    }
    
    const grokError = error instanceof GrokAPIError 
      ? error 
      : new GrokAPIError(
          error instanceof Error ? error.message : 'Unknown error',
          undefined,
          'UNKNOWN',
          true
        )
    
    onError?.(grokError)
    throw grokError
  }
}

/**
 * Stream a response with automatic model fallback
 * Tries multiple models in order until one succeeds
 */
export async function streamGrokResponseWithFallback(
  messages: GrokMessage[],
  onChunk: (content: string) => void,
  onError?: (error: Error) => void,
  options: Omit<GrokStreamOptions, 'model'> = {}
): Promise<{ model: GrokModel }> {
  let lastError: Error | null = null
  
  for (const model of MODEL_FALLBACK_ORDER) {
    try {
      await streamGrokResponse(messages, onChunk, undefined, { ...options, model })
      return { model }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')
      console.warn(`Model ${model} failed:`, lastError.message)
    }
  }
  
  const finalError = new GrokAPIError(
    `All models failed. Last error: ${lastError?.message}`,
    undefined,
    'ALL_MODELS_FAILED',
    true
  )
  
  onError?.(finalError)
  throw finalError
}

/**
 * Get a non-streaming response from the API
 * Useful for simple queries where streaming isn't needed
 */
export async function getGrokResponse(
  messages: GrokMessage[],
  options: Omit<GrokStreamOptions, 'signal'> = {}
): Promise<string> {
  let content = ''
  
  await streamGrokResponse(
    messages,
    (chunk) => { content += chunk },
    undefined,
    options
  )
  
  return content
}

/**
 * Check if the API is available
 */
export async function checkGrokHealth(): Promise<boolean> {
  try {
    const apiKey = getApiKey()
    
    const response = await fetchWithTimeout(
      GROK_API_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: DEFAULT_MODEL,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
        }),
      },
      5000
    )
    
    return response.ok
  } catch {
    return false
  }
}
