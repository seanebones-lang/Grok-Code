'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Keyboard } from 'lucide-react'

interface ShortcutGroup {
  title: string
  shortcuts: { keys: string[]; description: string }[]
}

const SHORTCUTS: ShortcutGroup[] = [
  {
    title: 'General',
    shortcuts: [
      { keys: ['⌘', 'K'], description: 'Open command palette' },
      { keys: ['⌘', '⇧', 'L'], description: 'New session / Clear chat' },
      { keys: ['?'], description: 'Show keyboard shortcuts' },
      { keys: ['Esc'], description: 'Cancel / Close modal' },
    ],
  },
  {
    title: 'Chat',
    shortcuts: [
      { keys: ['Enter'], description: 'Send message' },
      { keys: ['⇧', 'Enter'], description: 'New line in message' },
      { keys: ['↑'], description: 'Edit last message (when empty)' },
      { keys: ['⌘', 'Enter'], description: 'Send with agent mode' },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['⌘', '1-9'], description: 'Switch to session 1-9' },
      { keys: ['⌘', '['], description: 'Previous session' },
      { keys: ['⌘', ']'], description: 'Next session' },
      { keys: ['⌘', 'B'], description: 'Toggle sidebar' },
    ],
  },
  {
    title: 'Command Palette',
    shortcuts: [
      { keys: ['↑', '↓'], description: 'Navigate items' },
      { keys: ['Enter'], description: 'Select item' },
      { keys: ['Esc'], description: 'Close palette' },
      { keys: ['Tab'], description: 'Switch category' },
    ],
  },
  {
    title: 'Agents',
    shortcuts: [
      { keys: ['/agent'], description: 'Start agent command' },
      { keys: ['/agent', 'swarm'], description: 'Run all agents' },
      { keys: ['/agent', 'security'], description: 'Security scan' },
      { keys: ['/agent', 'mobile'], description: 'Mobile agent' },
    ],
  },
  {
    title: 'Git Workflows',
    shortcuts: [
      { keys: ['⌘', 'K'], description: 'Then type "commit" for commit msg' },
      { keys: ['⌘', 'K'], description: 'Then type "pr" for PR description' },
      { keys: ['⌘', 'K'], description: 'Then type "branch" for branch name' },
      { keys: ['⌘', 'K'], description: 'Then type "changelog" for changelog' },
    ],
  },
]

export function KeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open with ? (Shift + /)
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        // Don't trigger if typing in an input
        if (document.activeElement?.tagName === 'INPUT' || 
            document.activeElement?.tagName === 'TEXTAREA') {
          return
        }
        e.preventDefault()
        setIsOpen(true)
      }
      
      // Close with Escape
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault()
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.15 }}
            className="fixed top-[10%] left-1/2 -translate-x-1/2 w-full max-w-3xl max-h-[80vh] z-50 overflow-hidden"
          >
            <div className="bg-[#0f0f23] border border-[#404050] rounded-xl shadow-2xl flex flex-col max-h-[80vh]">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#404050]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/20 rounded-lg">
                    <Keyboard className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Keyboard Shortcuts</h2>
                    <p className="text-xs text-[#9ca3af]">Speed up your workflow</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-[#2a2a3e] rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-[#9ca3af]" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {SHORTCUTS.map((group) => (
                    <div key={group.title}>
                      <h3 className="text-sm font-semibold text-primary mb-3">{group.title}</h3>
                      <div className="space-y-2">
                        {group.shortcuts.map((shortcut, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between py-1.5"
                          >
                            <span className="text-sm text-[#9ca3af]">{shortcut.description}</span>
                            <div className="flex items-center gap-1">
                              {shortcut.keys.map((key, keyIndex) => (
                                <span key={keyIndex}>
                                  {key.startsWith('/') ? (
                                    <code className="px-2 py-1 bg-[#2a2a3e] rounded text-xs text-primary font-mono">
                                      {key}
                                    </code>
                                  ) : (
                                    <kbd className="px-2 py-1 bg-[#1a1a2e] border border-[#404050] rounded text-xs text-white min-w-[24px] text-center">
                                      {key}
                                    </kbd>
                                  )}
                                  {keyIndex < shortcut.keys.length - 1 && key.length <= 2 && (
                                    <span className="text-[#606070] mx-0.5">+</span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t border-[#404050] bg-[#1a1a2e]/50">
                <div className="flex items-center justify-between text-xs text-[#606070]">
                  <span>Press <kbd className="px-1.5 py-0.5 bg-[#2a2a3e] rounded mx-1">?</kbd> anytime to show this</span>
                  <span>Press <kbd className="px-1.5 py-0.5 bg-[#2a2a3e] rounded mx-1">Esc</kbd> to close</span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
