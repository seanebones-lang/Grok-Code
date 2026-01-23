import type { Metadata, Viewport } from 'next'
import { JetBrains_Mono, Space_Grotesk } from 'next/font/google'
import '@/styles/globals.css'
import { Providers } from '@/components/Providers'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { SkipLinks } from '@/components/SkipLinks'
import { MobileMenu } from '@/components/ui/mobile-menu'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

// Lazy load Sidebar - large component with many dependencies
const Sidebar = dynamic(() => import('@/components/Layout/Sidebar'), {
  ssr: false,
  loading: () => (
    <div className="w-64 bg-[#1a1a2e] border-r border-[#2a2a3e] flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-[#6841e7]" />
    </div>
  ),
})

// Lazy load ErrorBoundary
const ErrorBoundary = dynamic(() => import('@/components/ErrorBoundary').then(mod => mod.ErrorBoundary), {
  ssr: false,
})

// Primary font for UI
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

// Monospace font for code
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'NextEleven Code - AI-Powered Development',
    template: '%s | NextEleven Code',
  },
  description: 'AI-powered code editor and assistant powered by NextEleven. Write, edit, and understand code with intelligent assistance.',
  keywords: ['AI', 'code editor', 'NextEleven', 'development', 'programming', 'assistant'],
  authors: [{ name: 'NextEleven Team' }],
  creator: 'NextEleven',
  publisher: 'NextEleven',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'NextEleven Code',
    title: 'NextEleven Code - AI-Powered Development',
    description: 'AI-powered code editor and assistant powered by NextEleven',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NextEleven Code - AI-Powered Development',
    description: 'AI-powered code editor and assistant powered by NextEleven',
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
    { media: '(prefers-color-scheme: light)', color: '#0a0a0a' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html 
      lang="en" 
      suppressHydrationWarning 
      className={`dark ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        {/* Preconnect to external services - Lighthouse optimization */}
        <link rel="preconnect" href="https://api.x.ai" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.github.com" crossOrigin="anonymous" />
        
        {/* DNS prefetch for faster resolution */}
        <link rel="dns-prefetch" href="https://api.x.ai" />
        <link rel="dns-prefetch" href="https://api.github.com" />
        
        {/* Note: Next.js font optimization handles font preloading automatically
            via next/font/google. These are only needed for custom fonts. */}
      </head>
      <body 
        className="font-sans bg-[#0a0a0a] text-white antialiased h-screen overflow-hidden"
        suppressHydrationWarning
      >
        <ErrorBoundary>
          <Providers>
            {/* Skip to main content link for accessibility */}
            <a 
              href="#main-content" 
              className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg"
            >
              Skip to main content
            </a>
            
            {/* Mobile Menu - Only visible on small screens */}
            <MobileMenu
              sidebar={
                <ErrorBoundary 
                  fallback={
                    <div 
                      className="h-full p-4 bg-[#1a1a2e] flex flex-col items-center justify-center text-white"
                      role="alert"
                      aria-live="assertive"
                    >
                      <div className="max-w-md text-center space-y-4">
                        <h2 className="text-lg font-semibold text-red-400">Sidebar Error</h2>
                        <p className="text-sm text-[#9ca3af]">
                          The sidebar encountered an error. Try refreshing the page.
                        </p>
                        <button
                          onClick={() => window.location.reload()}
                          className="px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-[#1a1a2e]"
                          aria-label="Reload page to fix sidebar error"
                        >
                          Reload Page
                        </button>
                      </div>
                    </div>
                  }
                >
                  <Sidebar />
                </ErrorBoundary>
              }
            />
            
            {/* Full-screen resizable split layout - two halves like Claude Code */}
            <ResizablePanelGroup 
              direction="horizontal" 
              className="h-screen w-full bg-[#0a0a0a]"
              autoSaveId="nexteleven-layout"
            >
              {/* Left Panel - Sidebar (hidden on mobile, shown via MobileMenu) */}
              <ResizablePanel 
                defaultSize={50}
                minSize={10}
                className="h-full hidden sm:block"
              >
                <aside className="h-full overflow-hidden" role="complementary" aria-label="Sidebar navigation">
                  <ErrorBoundary 
                    fallback={
                      <div 
                        className="h-full p-4 bg-[#1a1a2e] flex flex-col items-center justify-center text-white"
                        role="alert"
                        aria-live="assertive"
                      >
                        <div className="max-w-md text-center space-y-4">
                          <h2 className="text-lg font-semibold text-red-400">Sidebar Error</h2>
                          <p className="text-sm text-[#9ca3af]">
                            The sidebar encountered an error. Try refreshing the page or disconnecting and reconnecting your repository.
                          </p>
                          <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-[#1a1a2e]"
                            aria-label="Reload page to fix sidebar error"
                          >
                            Reload Page
                          </button>
                        </div>
                      </div>
                    }
                    onError={(error, errorInfo) => {
                      // Use proper error logging
                      if (process.env.NODE_ENV === 'development') {
                        console.error('[Sidebar] Error caught by boundary:', error)
                        console.error('[Sidebar] Error info:', errorInfo)
                      }
                    }}
                  >
                    <Sidebar />
                  </ErrorBoundary>
                </aside>
              </ResizablePanel>
              
              {/* Resizable Handle - Hidden on mobile */}
              <ResizableHandle 
                withHandle 
                className="hidden sm:block" 
                aria-label="Resize sidebar and main content panels"
              />
              
              {/* Right Panel - Chat Content (no header, just chat) */}
              <ResizablePanel defaultSize={50} minSize={10} className="w-full sm:w-auto">
                <main 
                  id="main-content"
                  className="h-full w-full overflow-hidden bg-[#0f0f23] text-white"
                  role="main"
                  tabIndex={-1}
                >
                  {children}
                </main>
              </ResizablePanel>
            </ResizablePanelGroup>
          </Providers>
        </ErrorBoundary>
        
        {/* Noscript fallback */}
        <noscript>
          <div className="fixed inset-0 flex items-center justify-center bg-[#0a0a0a] text-white p-8 text-center">
            <div className="max-w-md">
              <h1 className="text-2xl font-bold mb-4">JavaScript Required</h1>
              <p className="text-[#9ca3af]">
                NextEleven Code requires JavaScript to function. Please enable JavaScript in your browser settings.
              </p>
            </div>
          </div>
        </noscript>
      </body>
    </html>
  )
}
