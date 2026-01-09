'use client'

import { useState, useCallback, memo } from 'react'
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
  Github
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
    onNewChat?.()
    // Reload the page to clear state
    window.location.reload()
  }, [onNewChat])

  const handleClearHistory = useCallback(() => {
    if (confirm('Are you sure you want to clear all chat history?')) {
      onClearHistory?.()
      localStorage.removeItem('grokcode_chatHistory')
      window.location.reload()
    }
  }, [onClearHistory])

  const handleExportChat = useCallback(() => {
    onExportChat?.()
    // TODO: Implement chat export
  }, [onExportChat])

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="h-[60px] border-b border-[#404050] bg-[#1a1a2e] flex items-center justify-between px-4 text-white flex-shrink-0"
        role="banner"
      >
        {/* Logo */}
        <div className="flex items-center gap-4">
          <a 
            href="/" 
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            aria-label="GrokCode Home"
          >
            <Code2 className="h-6 w-6 text-[#6841e7]" aria-hidden="true" />
            <span className="text-lg font-semibold text-white hidden sm:inline">GrokCode</span>
          </a>
          <span className="text-xs text-[#9ca3af] hidden md:inline px-2 py-0.5 bg-[#2a2a3e] rounded">
            Powered by Grok 4.1
          </span>
        </div>

        {/* Actions */}
        <nav className="flex items-center gap-2" aria-label="Main navigation">
          {/* New Chat Button */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="default"
              size="sm"
              className="bg-[#6841e7] hover:bg-[#7c5cff] text-white"
              onClick={handleNewChat}
              aria-label="Start new chat"
            >
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
              <span className="hidden sm:inline">New Chat</span>
            </Button>
          </motion.div>

          {/* History Button */}
          <Button
            variant="ghost"
            size="icon"
            title="Chat History"
            className="text-white hover:bg-[#2a2a3e] hover:text-white"
            aria-label="View chat history"
          >
            <History className="h-5 w-5" aria-hidden="true" />
          </Button>

          {/* Settings Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-[#2a2a3e] hover:text-white"
                aria-label="Settings menu"
              >
                <Settings className="h-5 w-5" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-56 bg-[#1a1a2e] text-white border-[#404050]"
            >
              <DropdownMenuLabel className="text-[#9ca3af]">Settings</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[#404050]" />
              
              <DropdownMenuItem 
                onClick={() => setShowShortcuts(true)}
                className="text-white hover:bg-[#2a2a3e] hover:text-white cursor-pointer"
              >
                <Keyboard className="h-4 w-4 mr-2" aria-hidden="true" />
                Keyboard Shortcuts
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                onClick={handleExportChat}
                className="text-white hover:bg-[#2a2a3e] hover:text-white cursor-pointer"
              >
                <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                Export Chat
              </DropdownMenuItem>
              
              <DropdownMenuSeparator className="bg-[#404050]" />
              
              <DropdownMenuItem 
                onClick={handleClearHistory}
                className="text-red-400 hover:bg-red-500/10 hover:text-red-400 cursor-pointer"
              >
                <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                Clear All History
              </DropdownMenuItem>
              
              <DropdownMenuSeparator className="bg-[#404050]" />
              
              <DropdownMenuItem 
                onClick={() => setShowAbout(true)}
                className="text-white hover:bg-[#2a2a3e] hover:text-white cursor-pointer"
              >
                <Info className="h-4 w-4 mr-2" aria-hidden="true" />
                About GrokCode
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                asChild
                className="text-white hover:bg-[#2a2a3e] hover:text-white cursor-pointer"
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
        <DialogContent className="bg-[#1a1a2e] text-white border-[#404050] max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5 text-[#6841e7]" />
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
                className="flex items-center justify-between py-2 px-3 rounded bg-[#2a2a3e]"
              >
                <span className="text-sm text-white">{shortcut.description}</span>
                <kbd className="px-2 py-1 text-xs font-mono bg-[#0f0f23] rounded border border-[#404050] text-[#6841e7]">
                  {formatShortcut(shortcut as any)}
                </kbd>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* About Dialog */}
      <Dialog open={showAbout} onOpenChange={setShowAbout}>
        <DialogContent className="bg-[#1a1a2e] text-white border-[#404050] max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-[#6841e7]" />
              About GrokCode
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-[#9ca3af]">
              GrokCode is an AI-powered development interface that helps you write, 
              edit, and understand code with intelligent assistance.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-[#404050]">
                <span className="text-[#9ca3af]">Version</span>
                <span className="text-white">1.0.0</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#404050]">
                <span className="text-[#9ca3af]">AI Model</span>
                <span className="text-white">Grok 4.1 Fast</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#404050]">
                <span className="text-[#9ca3af]">Framework</span>
                <span className="text-white">Next.js 16</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[#9ca3af]">Built with</span>
                <span className="text-white">TypeScript, Tailwind CSS</span>
              </div>
            </div>
            <p className="text-xs text-[#9ca3af] text-center pt-4 border-t border-[#404050]">
              © 2026 GrokCode. All rights reserved.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default memo(Header)
