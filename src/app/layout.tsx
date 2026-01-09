import type { Metadata, Viewport } from 'next'
import { JetBrains_Mono, Space_Grotesk } from 'next/font/google'
import '@/styles/globals.css'
import { Providers } from '@/components/Providers'
import Header from '@/components/Layout/Header'
import Sidebar from '@/components/Layout/Sidebar'

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
    default: 'GrokCode - AI-Powered Development',
    template: '%s | GrokCode',
  },
  description: 'AI-powered code editor and assistant powered by Grok 4.1. Write, edit, and understand code with intelligent assistance.',
  keywords: ['AI', 'code editor', 'Grok', 'development', 'programming', 'assistant'],
  authors: [{ name: 'GrokCode Team' }],
  creator: 'GrokCode',
  publisher: 'GrokCode',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'GrokCode',
    title: 'GrokCode - AI-Powered Development',
    description: 'AI-powered code editor and assistant powered by Grok 4.1',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GrokCode - AI-Powered Development',
    description: 'AI-powered code editor and assistant powered by Grok 4.1',
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
        {/* Preconnect to external services */}
        <link rel="preconnect" href="https://api.x.ai" />
        <link rel="preconnect" href="https://api.github.com" />
        
        {/* DNS prefetch for faster resolution */}
        <link rel="dns-prefetch" href="https://api.x.ai" />
        <link rel="dns-prefetch" href="https://api.github.com" />
      </head>
      <body 
        className="font-sans bg-[#0a0a0a] text-white antialiased"
        suppressHydrationWarning
      >
        <Providers>
          {/* Skip to main content link for accessibility */}
          <a 
            href="#main-content" 
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg"
          >
            Skip to main content
          </a>
          
          <div className="flex h-screen overflow-hidden bg-[#0a0a0a] text-white">
            {/* Sidebar */}
            <Sidebar />
            
            {/* Main Content */}
            <div className="flex flex-col flex-1 min-w-0">
              <Header />
              <main 
                id="main-content"
                className="flex-1 overflow-hidden bg-[#0a0a0a] text-white"
                role="main"
              >
                {children}
              </main>
            </div>
          </div>
        </Providers>
        
        {/* Noscript fallback */}
        <noscript>
          <div className="fixed inset-0 flex items-center justify-center bg-[#0a0a0a] text-white p-8 text-center">
            <div>
              <h1 className="text-2xl font-bold mb-4">JavaScript Required</h1>
              <p className="text-[#9ca3af]">
                GrokCode requires JavaScript to function. Please enable JavaScript in your browser settings.
              </p>
            </div>
          </div>
        </noscript>
      </body>
    </html>
  )
}
