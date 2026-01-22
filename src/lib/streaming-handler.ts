/**
 * Streaming Handler
 * Handles SSE streaming logic for chat responses
 */

import { z } from 'zod'
import { executeTool, type ToolCall } from './tool-executor'
import { createStreamError, type StreamError } from './error-handler'

// API response schema for type-safe parsing
const grokDeltaSchema = z.object({
  choices: z.array(
    z.object({
      delta: z.object({
        content: z.string().optional(),
        role: z.string().optional(),
      }).optional(),
      finish_reason: z.string().nullable().optional(),
    })
  ).optional(),
  error: z.object({
    message: z.string(),
    type: z.string().optional(),
  }).optional(),
})

export interface StreamingOptions {
  requestId: string
  repository?: { owner: string; repo: string; branch?: string }
  githubToken?: string
  detectedMode?: string
  explicitMode?: string
}

/**
 * Extract tool calls from response text
 */
export function extractToolCalls(responseText: string): ToolCall[] {
  const toolCalls: ToolCall[] = []
  const seen = new Set<string>()

  // Search for all JSON code blocks
  const codeBlockPatterns = [
    /```json\s*([\s\S]*?)\s*```/g,
    /```\s*([\s\S]*?)\s*```/g,
  ]

  for (const pattern of codeBlockPatterns) {
    const matches = [...responseText.matchAll(pattern)]
    for (const match of matches) {
      try {
        const parsed = JSON.parse(match[1].trim())
        if (parsed.name && parsed.arguments && typeof parsed.name === 'string') {
          const key = `${parsed.name}:${JSON.stringify(parsed.arguments)}`
          if (!seen.has(key)) {
            seen.add(key)
            toolCalls.push(parsed as ToolCall)
          }
        }
      } catch {
        // Not valid JSON, continue
      }
    }
  }

  // Also search for raw JSON objects
  const rawJsonPattern = /\{\s*"name"\s*:\s*"([^"]+)"\s*,\s*"arguments"\s*:\s*(\{[^}]+\})\s*\}/g
  let rawMatch
  while ((rawMatch = rawJsonPattern.exec(responseText)) !== null) {
    try {
      const jsonStr = `{"name": "${rawMatch[1]}", "arguments": ${rawMatch[2]}}`
      const parsed = JSON.parse(jsonStr)
      if (parsed.name && parsed.arguments) {
        const key = `${parsed.name}:${JSON.stringify(parsed.arguments)}`
        if (!seen.has(key)) {
          seen.add(key)
          toolCalls.push(parsed as ToolCall)
        }
      }
    } catch {
      // Not valid JSON, continue
    }
  }

  // Also parse formatted Tool Request sections
  const toolRequestPattern = /###\s*🔧\s*Tool Request\s*\n([\s\S]*?)(?=###|$)/gi
  let toolRequestMatch
  while ((toolRequestMatch = toolRequestPattern.exec(responseText)) !== null) {
    const content = toolRequestMatch[1]
    const toolMatch = content.match(/Tool:?\s*([^\n]+)/i)
    const inputMatch = content.match(/Input:?\s*([^\n]+)/i)
    const pathMatch = content.match(/Path:?\s*([^\n]+)/i)
    const commandMatch = content.match(/Command:?\s*([^\n]+)/i)
    const contentMatch = content.match(/Content:?\s*```[\s\S]*?\n([\s\S]*?)```/i)

    if (toolMatch) {
      const toolName = toolMatch[1].trim().toLowerCase().replace(/\s+/g, '_')
      const args: Record<string, unknown> = {}

      // Build arguments based on what we found
      if (pathMatch) args.path = pathMatch[1].trim()
      if (inputMatch && !pathMatch) args.path = inputMatch[1].trim()
      if (commandMatch) args.command = commandMatch[1].trim()
      if (contentMatch) args.content = contentMatch[1].trim()

      if (Object.keys(args).length > 0) {
        const key = `${toolName}:${JSON.stringify(args)}`
        if (!seen.has(key)) {
          seen.add(key)
          toolCalls.push({ name: toolName, arguments: args })
        }
      }
    }
  }

  return toolCalls
}

/**
 * Execute tool calls and format results
 * Returns formatted string for follow-up message
 */
export async function executeToolCalls(
  toolCalls: ToolCall[],
  options: StreamingOptions
): Promise<string> {
  if (toolCalls.length === 0) {
    return ''
  }

  const toolResults: string[] = []

  for (const toolCall of toolCalls) {
    try {
      const { executeTool } = await import('./tool-executor')
      const result = await executeTool(
        toolCall,
        options.repository,
        options.githubToken
      )

      if (result.success) {
        toolResults.push(`✅ ${toolCall.name}: ${result.output}`)
      } else {
        toolResults.push(`❌ ${toolCall.name}: ${result.error || 'Failed'}`)
      }
    } catch (error) {
      toolResults.push(`❌ ${toolCall.name}: ${error instanceof Error ? error.message : 'Execution failed'}`)
    }
  }

  return toolResults.join('\n\n')
}

/**
 * Process streaming response chunks
 */
export function processStreamChunk(
  data: string,
  buffer: string
): { content?: string; done?: boolean; error?: string; newBuffer: string } {
  buffer += data
  const lines = buffer.split('\n')
  const newBuffer = lines.pop() || '' // Keep incomplete line in buffer

  for (const line of lines) {
    const trimmedLine = line.trim()
    if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue

    const dataContent = trimmedLine.slice(6)
    if (dataContent === '[DONE]') {
      return { done: true, newBuffer }
    }

    try {
      const parsed = JSON.parse(dataContent)
      const validated = grokDeltaSchema.safeParse(parsed)

      if (validated.success) {
        if (validated.data.error) {
          return {
            error: validated.data.error.message,
            newBuffer,
          }
        }

        const content = validated.data.choices?.[0]?.delta?.content
        if (content) {
          return { content, newBuffer }
        }
      }
    } catch {
      // Not valid JSON, continue
    }
  }

  return { newBuffer }
}

/**
 * Create safe stream controller helpers
 */
export function createStreamController(controller: ReadableStreamDefaultController<Uint8Array>) {
  let streamClosed = false
  const encoder = new TextEncoder()

  const safeEnqueue = (data: string) => {
    if (!streamClosed) {
      try {
        controller.enqueue(encoder.encode(data))
      } catch (e) {
        console.warn('Failed to enqueue:', e)
      }
    }
  }

  const safeClose = () => {
    if (!streamClosed) {
      streamClosed = true
      try {
        controller.close()
      } catch (e) {
        console.warn('Failed to close stream:', e)
      }
    }
  }

  const sendError = (error: StreamError) => {
    safeEnqueue(createStreamError(error))
  }

  const sendData = (data: Record<string, unknown>) => {
    safeEnqueue(`data: ${JSON.stringify(data)}\n\n`)
  }

  return {
    safeEnqueue,
    safeClose,
    sendError,
    sendData,
    isClosed: () => streamClosed,
  }
}
