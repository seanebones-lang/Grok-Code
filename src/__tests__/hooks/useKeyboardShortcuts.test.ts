import { renderHook } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import { useKeyboardShortcuts, formatShortcut } from '@/hooks/useKeyboardShortcuts'

// Global mock for ResizeObserver (common in React Testing Library)
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

describe('useKeyboardShortcuts', () => {
  it('should call handler when shortcut is pressed', () => {
    const handler = vi.fn()
    
    renderHook(() => useKeyboardShortcuts([
      { key: 'k', metaKey: true, handler },
    ]))
    
    // Simulate Cmd+K
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
    })
    window.dispatchEvent(event)
    
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('should not call handler when wrong key is pressed', () => {
    const handler = vi.fn()
    
    renderHook(() => useKeyboardShortcuts([
      { key: 'k', metaKey: true, handler },
    ]))
    
    // Simulate Cmd+J (wrong key)
    const event = new KeyboardEvent('keydown', {
      key: 'j',
      metaKey: true,
    })
    window.dispatchEvent(event)
    
    expect(handler).not.toHaveBeenCalled()
  })

  it('should not call handler when modifier is missing', () => {
    const handler = vi.fn()
    
    renderHook(() => useKeyboardShortcuts([
      { key: 'k', metaKey: true, handler },
    ]))
    
    // Simulate K without Cmd
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: false,
    })
    window.dispatchEvent(event)
    
    expect(handler).not.toHaveBeenCalled()
  })

  it('should handle Escape key', () => {
    const handler = vi.fn()
    
    renderHook(() => useKeyboardShortcuts([
      { key: 'Escape', handler },
    ]))
    
    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
    })
    window.dispatchEvent(event)
    
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('should handle multiple shortcuts', () => {
    const handler1 = jest.fn()
    const handler2 = jest.fn()
    
    renderHook(() => useKeyboardShortcuts([
      { key: 'k', metaKey: true, handler: handler1 },
      { key: 'l', metaKey: true, handler: handler2 },
    ]))
    
    // Trigger first shortcut
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
    expect(handler1).toHaveBeenCalledTimes(1)
    expect(handler2).not.toHaveBeenCalled()
    
    // Trigger second shortcut
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'l', metaKey: true }))
    expect(handler2).toHaveBeenCalledTimes(1)
  })

  it('should respect enabled option', () => {
    const handler = vi.fn()
    
    renderHook(() => useKeyboardShortcuts(
      [{ key: 'k', metaKey: true, handler }],
      { enabled: false }
    ))
    
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
    
    expect(handler).not.toHaveBeenCalled()
  })

  it('should cleanup on unmount', () => {
    const handler = vi.fn()
    
    const { unmount } = renderHook(() => useKeyboardShortcuts([
      { key: 'k', metaKey: true, handler },
    ]))
    
    unmount()
    
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
    
    expect(handler).not.toHaveBeenCalled()
  })
})

describe('formatShortcut', () => {
  // Mock navigator.platform for consistent tests
  const originalPlatform = navigator.platform
  
  beforeAll(() => {
    Object.defineProperty(navigator, 'platform', {
      value: 'MacIntel',
      writable: true,
    })
  })
  
  afterAll(() => {
    Object.defineProperty(navigator, 'platform', {
      value: originalPlatform,
      writable: true,
    })
  })

  it('should format simple key', () => {
    expect(formatShortcut({ key: 'k', handler: () => {} })).toBe('K')
  })

  it('should format meta key shortcut', () => {
    expect(formatShortcut({ key: 'k', metaKey: true, handler: () => {} })).toBe('⌘K')
  })

  it('should format shift key shortcut', () => {
    expect(formatShortcut({ key: 'k', shiftKey: true, handler: () => {} })).toBe('⇧K')
  })

  it('should format combined modifiers', () => {
    expect(formatShortcut({ 
      key: 'k', 
      metaKey: true, 
      shiftKey: true, 
      handler: () => {} 
    })).toBe('⇧⌘K')
  })

  it('should format special keys', () => {
    expect(formatShortcut({ key: 'Enter', handler: () => {} })).toBe('↵')
    expect(formatShortcut({ key: 'Escape', handler: () => {} })).toBe('Esc')
    expect(formatShortcut({ key: 'ArrowUp', handler: () => {} })).toBe('↑')
  })
})
