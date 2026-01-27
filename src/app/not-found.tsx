'use client'

// Force dynamic rendering - not-found pages cannot be statically generated
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a] text-white p-8">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-4">Page Not Found</h2>
        <p className="text-[#9ca3af] mb-8">
          The page you're looking for doesn't exist.
        </p>
        <Link
          href="/"
          className="px-6 py-3 bg-primary hover:bg-primary/80 rounded-lg transition-colors inline-block"
        >
          Go Home
        </Link>
      </div>
    </div>
  )
}
