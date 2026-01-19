'use client'

import { useEffect, useState } from 'react'

export default function NewslettersPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Newsletters</h1>
      <div className="prose prose-invert max-w-none">
        <p className="text-lg mb-4">
          Subscribe to our newsletter to stay updated with the latest news and updates.
        </p>
        <div className="mt-8">
          <form className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className="w-full px-4 py-2 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="your@email.com"
                required
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg transition-colors"
            >
              Subscribe
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
