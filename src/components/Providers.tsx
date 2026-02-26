'use client'

import { ToastProvider } from '@/components/Toast'
import { CommandPalette } from '@/components/CommandPalette'
import { KeyboardShortcuts } from '@/components/KeyboardShortcuts'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ToastProvider>
      {children}
      <CommandPalette />
      <KeyboardShortcuts />
    </ToastProvider>
  )
}
