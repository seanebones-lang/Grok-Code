/**
 * Validation Utilities
 * Common validation functions
 */

import type { ToolCall } from '@/types/tools'
import type { Message } from '@/types'
import { validateToolCallArguments, isToolCall } from '@/types/tools'
import { isValidMessage, isValidRepository } from './type-guards'

/**
 * Validate tool call structure and arguments
 * 
 * @param toolCall - Tool call to validate
 * @returns Validation result with error message if invalid
 */
export function validateToolCall(toolCall: unknown): { valid: boolean; error?: string } {
  if (!isToolCall(toolCall)) {
    return { valid: false, error: 'Invalid tool call structure' }
  }

  return validateToolCallArguments(toolCall.name, toolCall.arguments)
}

/**
 * Validate message structure
 * 
 * @param message - Message to validate
 * @returns Validation result with error message if invalid
 */
export function validateMessage(message: unknown): { valid: boolean; error?: string } {
  if (!isValidMessage(message)) {
    return { valid: false, error: 'Invalid message structure' }
  }

  if (!message.id || message.id.trim() === '') {
    return { valid: false, error: 'Message ID is required' }
  }

  if (!message.content || message.content.trim() === '') {
    return { valid: false, error: 'Message content is required' }
  }

  if (!['user', 'assistant', 'system'].includes(message.role)) {
    return { valid: false, error: 'Invalid message role' }
  }

  return { valid: true }
}

/**
 * Validate repository object
 * 
 * @param repository - Repository to validate
 * @returns Validation result with error message if invalid
 */
export function validateRepository(
  repository: unknown
): { valid: boolean; error?: string } {
  if (!repository) {
    return { valid: true } // Repository is optional
  }

  if (!isValidRepository(repository)) {
    return { valid: false, error: 'Invalid repository structure' }
  }

  if (!repository.owner || repository.owner.trim() === '') {
    return { valid: false, error: 'Repository owner is required' }
  }

  if (!repository.repo || repository.repo.trim() === '') {
    return { valid: false, error: 'Repository name is required' }
  }

  return { valid: true }
}

/**
 * Validate string is not empty
 * 
 * @param value - Value to validate
 * @param fieldName - Name of the field for error message
 * @returns Validation result
 */
export function validateNonEmptyString(
  value: unknown,
  fieldName: string
): { valid: boolean; error?: string } {
  if (typeof value !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` }
  }

  if (value.trim() === '') {
    return { valid: false, error: `${fieldName} cannot be empty` }
  }

  return { valid: true }
}
