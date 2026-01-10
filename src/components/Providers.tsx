'use client'

import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from '@/components/theme-provider'
import { CommandPalette } from '@/components/CommandPalette'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <ThemeProvider 
        attribute="class" 
        defaultTheme="dark" 
        forcedTheme="dark" 
        enableSystem={false}
        disableTransitionOnChange
      >
        {children}
        <CommandPalette />
      </ThemeProvider>
    </SessionProvider>
  )
}
