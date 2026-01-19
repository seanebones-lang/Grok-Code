'use client'

import { ThemeProvider } from '@/components/theme-provider'
import { ToastProvider } from '@/components/Toast'
import { CommandPalette } from '@/components/CommandPalette'
import { KeyboardShortcuts } from '@/components/KeyboardShortcuts'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider 
      attribute="class" 
      defaultTheme="dark" 
      forcedTheme="dark" 
      enableSystem={false}
      disableTransitionOnChange
    >
      <ToastProvider>
        {children}
        <CommandPalette />
        <KeyboardShortcuts />
      </ToastProvider>
    </ThemeProvider>
  )
}
