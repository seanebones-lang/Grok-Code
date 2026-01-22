/**
 * Type Guard Utilities
 * Reusable type guard functions for runtime type checking
 */

import type { ToolCall, ToolExecutionResult } from '@/types/tools'
import type { Message } from '@/types'
import { isToolCall, isToolExecutionResult } from '@/types/tools'

/**
 * Check if value is a string
 * 
 * @param value - Value to check
 * @returns True if value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

/**
 * Check if value is a number
 * 
 * @param value - Value to check
 * @returns True if value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value)
}

/**
 * Check if value is a record (object with string keys)
 * 
 * @param value - Value to check
 * @returns True if value is a record
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Check if value is an array
 * 
 * @param value - Value to check
 * @returns True if value is an array
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

/**
 * Check if value is a valid tool call
 * 
 * @param value - Value to check
 * @returns True if value is a valid tool call
 */
export function isValidToolCall(value: unknown): value is ToolCall {
  return isToolCall(value)
}

/**
 * Check if value is a valid tool execution result
 * 
 * @param value - Value to check
 * @returns True if value is a valid tool execution result
 */
export function isValidToolExecutionResult(value: unknown): value is ToolExecutionResult {
  return isToolExecutionResult(value)
}

/**
 * Check if value is a valid message
 * 
 * @param value - Value to check
 * @returns True if value is a valid message
 */
export function isValidMessage(value: unknown): value is Message {
  return (
    isRecord(value) &&
    'id' in value &&
    isString(value.id) &&
    'role' in value &&
    (value.role === 'user' || value.role === 'assistant' || value.role === 'system') &&
    'content' in value &&
    isString(value.content) &&
    'timestamp' in value &&
    value.timestamp instanceof Date
  )
}

/**
 * Check if value is a valid repository object
 * 
 * @param value - Value to check
 * @returns True if value is a valid repository
 */
export function isValidRepository(
  value: unknown
): value is { owner: string; repo: string; branch?: string } {
  return (
    isRecord(value) &&
    'owner' in value &&
    isString(value.owner) &&
    'repo' in value &&
    isString(value.repo) &&
    (!('branch' in value) || isString(value.branch))
  )
}
