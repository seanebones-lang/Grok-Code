'use client'

import { ThemeProvider } from '@/components/theme-provider'
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
      {children}
      <CommandPalette />
      <KeyboardShortcuts />
    </ThemeProvider>
  )
}
