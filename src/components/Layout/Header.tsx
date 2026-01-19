'use client'

import { useState, useCallback, memo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  Code2, 
  Plus, 
  History, 
  Settings, 
  Keyboard,
  Info,
  ExternalLink,
  Trash2,
  Download,
  Github,
  LogOut,
  User
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { formatShortcut } from '@/hooks/useKeyboardShortcuts'

interface HeaderProps {
  onNewChat?: () => void
  onClearHistory?: () => void
  onExportChat?: () => void
}

// Keyboard shortcuts for display
const KEYBOARD_SHORTCUTS = [
  { key: 'k', metaKey: true, description: 'Focus input' },
  { key: 'Enter', metaKey: true, description: 'Send message' },
  { key: 'l', metaKey: true, shiftKey: true, description: 'Clear chat' },
  { key: 'Escape', description: 'Cancel request / Blur input' },
]

function Header({ onNewChat, onClearHistory, onExportChat }: HeaderProps) {
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showAbout, setShowAbout] = useState(false)

  const handleNewChat = useCallback(() => {
    // Create new session event - let ChatPane handle it gracefully
    const event = new CustomEvent('newSession', { 
      detail: { message: '', forceNew: true } 
    })
    window.dispatchEvent(event)
    onNewChat?.()
  }, [onNewChat])

  const handleClearHistory = useCallback(() => {
    if (confirm('Are you sure you want to clear all chat history?')) {
      onClearHistory?.()
      localStorage.removeItem('nexteleven_chatHistory')
      window.location.reload()
    }
  }, [onClearHistory])

  const handleExportChat = useCallback(() => {
    onExportChat?.()
    // TODO: Implement chat export
  }, [onExportChat])

  const handleLogout = useCallback(async () => {
    try {
      // Sign out via NextAuth
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
      })
      
      if (response.ok) {
        // Redirect to home after logout
        window.location.href = '/'
      } else {
        console.error('Logout failed')
      }
    } catch (error) {
      console.error('Error during logout:', error)
      // Still redirect even if API call fails
      window.location.href = '/'
    }
  }, [])

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="h-14 border-b border-[#1a1a1a] bg-[#0a0a0a] flex items-center justify-between px-4 sm:px-6 lg:px-8 text-white flex-shrink-0"
        role="banner"
      >
        {/* Logo with purple accent */}
        <div className="flex items-center gap-3">
          <Link 
            href="/" 
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity group"
            aria-label="NextEleven Code Home"
          >
            <div className="relative">
              <Code2 className="h-6 w-6 text-primary group-hover:text-primary/80 transition-colors" aria-hidden="true" />
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-base font-semibold text-white hidden sm:inline">NextEleven Code</span>
          </Link>
        </div>

        {/* Actions */}
        <nav className="flex items-center gap-2" aria-label="Main navigation">
          {/* New Chat Button */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="default"
              size="sm"
              className="bg-primary hover:bg-primary/90 text-white h-9 px-3 sm:px-4"
              onClick={handleNewChat}
              aria-label="Start new chat"
            >
              <Plus className="h-4 w-4 sm:mr-2" aria-hidden="true" />
              <span className="hidden sm:inline text-sm">New Chat</span>
            </Button>
          </motion.div>

          {/* History Button */}
          <Button
            variant="ghost"
            size="icon"
            title="Chat History"
            className="text-white hover:bg-[#1a1a1a] hover:text-white h-9 w-9"
            aria-label="View chat history"
          >
            <History className="h-4 w-4" aria-hidden="true" />
          </Button>

          {/* Settings Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-[#1a1a1a] hover:text-white h-9 w-9"
                aria-label="Settings menu"
              >
                <Settings className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-56 bg-[#1a1a1a] text-white border-[#1a1a1a] shadow-lg"
            >
              <DropdownMenuLabel className="text-[#9ca3af]">Settings</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[#1a1a1a]" />
              
              <DropdownMenuItem 
                onClick={() => setShowShortcuts(true)}
                className="text-white hover:bg-[#1a1a1a] hover:text-white cursor-pointer focus:bg-[#1a1a1a]"
              >
                <Keyboard className="h-4 w-4 mr-2" aria-hidden="true" />
                Keyboard Shortcuts
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                onClick={handleExportChat}
                className="text-white hover:bg-[#1a1a1a] hover:text-white cursor-pointer focus:bg-[#1a1a1a]"
              >
                <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                Export Chat
              </DropdownMenuItem>
              
              <DropdownMenuSeparator className="bg-[#1a1a1a]" />
              
              <DropdownMenuItem 
                onClick={handleClearHistory}
                className="text-red-400 hover:bg-red-500/10 hover:text-red-400 cursor-pointer focus:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                Clear All History
              </DropdownMenuItem>
              
              <DropdownMenuSeparator className="bg-[#1a1a1a]" />
              
              <DropdownMenuItem 
                onClick={() => setShowAbout(true)}
                className="text-white hover:bg-[#1a1a1a] hover:text-white cursor-pointer focus:bg-[#1a1a1a]"
              >
                <Info className="h-4 w-4 mr-2" aria-hidden="true" />
                About NextEleven Code
              </DropdownMenuItem>
              
              <DropdownMenuSeparator className="bg-[#1a1a1a]" />
              
              <DropdownMenuItem 
                onClick={handleLogout}
                className="text-red-400 hover:bg-red-500/10 hover:text-red-400 cursor-pointer focus:bg-red-500/10"
              >
                <LogOut className="h-4 w-4 mr-2" aria-hidden="true" />
                Sign Out
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                asChild
                className="text-white hover:bg-[#1a1a1a] hover:text-white cursor-pointer focus:bg-[#1a1a1a]"
              >
                <a 
                  href="https://github.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center"
                >
                  <Github className="h-4 w-4 mr-2" aria-hidden="true" />
                  GitHub
                  <ExternalLink className="h-3 w-3 ml-auto opacity-50" aria-hidden="true" />
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </motion.header>

      {/* Keyboard Shortcuts Dialog */}
      <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
        <DialogContent className="bg-[#1a1a1a] text-white border-[#1a1a1a] max-w-md shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5 text-primary" />
              Keyboard Shortcuts
            </DialogTitle>
            <DialogDescription className="text-[#9ca3af]">
              Quick actions to boost your productivity
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-4">
            {KEYBOARD_SHORTCUTS.map((shortcut, index) => (
              <div 
                key={index}
                className="flex items-center justify-between py-2 px-3 rounded bg-[#0a0a0a] border border-[#1a1a1a]"
              >
                <span className="text-sm text-white">{shortcut.description}</span>
                <kbd className="px-2 py-1 text-xs font-mono bg-[#0a0a0a] rounded border border-[#1a1a1a] text-primary">
                  {formatShortcut(shortcut as any)}
                </kbd>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* About Dialog */}
      <Dialog open={showAbout} onOpenChange={setShowAbout}>
        <DialogContent className="bg-[#1a1a1a] text-white border-[#1a1a1a] max-w-md shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-primary" />
              About NextEleven Code
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-[#9ca3af]">
              NextEleven Code is an AI-powered development interface that helps you write, 
              edit, and understand code with intelligent assistance.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-[#1a1a1a]">
                <span className="text-[#9ca3af]">Version</span>
                <span className="text-white">1.0.0</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#1a1a1a]">
                <span className="text-[#9ca3af]">AI Model</span>
                <span className="text-white">Eleven (powered by NextEleven)</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#1a1a1a]">
                <span className="text-[#9ca3af]">Framework</span>
                <span className="text-white">Next.js 15.0.1</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[#9ca3af]">Built with</span>
                <span className="text-white">TypeScript, Tailwind CSS</span>
              </div>
            </div>
            <p className="text-xs text-[#9ca3af] text-center pt-4 border-t border-[#1a1a1a]">
              © 2026 NextEleven Code. All rights reserved.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default memo(Header)
