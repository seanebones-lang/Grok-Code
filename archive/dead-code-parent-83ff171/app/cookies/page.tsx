'use client'

import { useEffect, useState } from 'react'

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic'

export default function CookiesPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Cookie Policy</h1>
      <div className="prose prose-invert max-w-none">
        <p className="text-lg mb-4">
          This website uses cookies to enhance your experience and provide personalized content.
        </p>
        <h2 className="text-2xl font-semibold mt-8 mb-4">What are cookies?</h2>
        <p className="mb-4">
          Cookies are small text files that are placed on your device when you visit our website.
        </p>
        <h2 className="text-2xl font-semibold mt-8 mb-4">How we use cookies</h2>
        <ul className="list-disc list-inside mb-4 space-y-2">
          <li>To remember your preferences</li>
          <li>To analyze website traffic</li>
          <li>To provide personalized content</li>
        </ul>
        <h2 className="text-2xl font-semibold mt-8 mb-4">Managing cookies</h2>
        <p className="mb-4">
          You can control and manage cookies through your browser settings.
        </p>
      </div>
    </div>
  )
}
