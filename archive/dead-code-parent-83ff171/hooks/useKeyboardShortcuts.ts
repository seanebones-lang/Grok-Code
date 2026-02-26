import { useEffect, useCallback, useRef } from 'react'
import type { KeyboardShortcut } from '@/types'

/**
 * Custom hook for handling keyboard shortcuts
 * 
 * @param shortcuts - Array of keyboard shortcut configurations
 * @param options - Optional configuration
 * 
 * @example
 * ```tsx
 * useKeyboardShortcuts([
 *   { key: 'k', metaKey: true, handler: () => focusSearch() },
 *   { key: 'Escape', handler: () => closeModal() },
 * ])
 * ```
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: {
    enabled?: boolean
    preventDefault?: boolean
    stopPropagation?: boolean
  } = {}
) {
  const { 
    enabled = true, 
    preventDefault = true,
    stopPropagation = false,
  } = options

  // Use ref to avoid recreating handler on every render
  const shortcutsRef = useRef(shortcuts)
  shortcutsRef.current = shortcuts

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Skip if disabled or if user is typing in an input/textarea (unless it's Escape)
    if (!enabled) return
    
    const target = event.target as HTMLElement
    const isInputField = target.tagName === 'INPUT' || 
                         target.tagName === 'TEXTAREA' || 
                         target.isContentEditable

    for (const shortcut of shortcutsRef.current) {
      // Normalize key comparison (case-insensitive for letters)
      const eventKey = event.key.length === 1 ? event.key.toLowerCase() : event.key
      const shortcutKey = shortcut.key.length === 1 ? shortcut.key.toLowerCase() : shortcut.key
      const keyMatch = eventKey === shortcutKey

      // Check modifier keys
      const ctrlMatch = shortcut.ctrlKey ? event.ctrlKey : !event.ctrlKey
      const metaMatch = shortcut.metaKey ? event.metaKey : !event.metaKey
      const shiftMatch = shortcut.shiftKey ? event.shiftKey : !event.shiftKey
      const altMatch = shortcut.altKey ? event.altKey : !event.altKey

      if (keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch) {
        // Allow Escape to work in input fields, but block other shortcuts
        if (isInputField && shortcut.key !== 'Escape' && !shortcut.metaKey && !shortcut.ctrlKey) {
          continue
        }

        if (preventDefault) {
          event.preventDefault()
        }
        if (stopPropagation) {
          event.stopPropagation()
        }
        
        shortcut.handler()
        break
      }
    }
  }, [enabled, preventDefault, stopPropagation])

  useEffect(() => {
    if (!enabled) return

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, handleKeyDown])
}

/**
 * Format a keyboard shortcut for display
 * @param shortcut - The keyboard shortcut to format
 * @returns Formatted string like "⌘+K" or "Ctrl+Shift+P"
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = []
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)

  if (shortcut.ctrlKey) {
    parts.push(isMac ? '⌃' : 'Ctrl')
  }
  if (shortcut.altKey) {
    parts.push(isMac ? '⌥' : 'Alt')
  }
  if (shortcut.shiftKey) {
    parts.push(isMac ? '⇧' : 'Shift')
  }
  if (shortcut.metaKey) {
    parts.push(isMac ? '⌘' : 'Win')
  }

  // Format special keys
  const keyMap: Record<string, string> = {
    'Enter': '↵',
    'Escape': 'Esc',
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→',
    'Backspace': '⌫',
    'Delete': '⌦',
    'Tab': '⇥',
    ' ': 'Space',
  }

  const displayKey = keyMap[shortcut.key] || shortcut.key.toUpperCase()
  parts.push(displayKey)

  return parts.join(isMac ? '' : '+')
}
