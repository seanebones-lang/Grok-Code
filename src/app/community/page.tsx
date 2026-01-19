'use client'

import { useState } from 'react'

// Force dynamic rendering - this page has interactive elements
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export default function Community() {
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/review', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      setResult(res.ok ? 'PASS - Auto-PR created!' : `FAIL: ${data.error || 'Review failed'}`)
    } catch (error) {
      setResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 to-emerald-900 p-8 text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-6xl font-black mb-8 text-center">🌍 Community Agent Hub</h1>
        <p className="text-xl text-center mb-12 text-gray-200">
          Upload your code → Review → Auto-PR if PASS
        </p>
        
        <div className="bg-white/10 backdrop-blur p-8 rounded-3xl shadow-2xl">
          <label className="block mb-6">
            <span className="text-2xl font-bold mb-4 block">Upload Code for Review</span>
            <input
              type="file"
              onChange={handleUpload}
              disabled={uploading}
              className="block w-full text-lg p-4 bg-white/20 border-2 border-white/30 rounded-xl cursor-pointer hover:bg-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              accept=".js,.ts,.jsx,.tsx,.py,.java,.cpp,.c,.h"
            />
          </label>

          {uploading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
              <p className="mt-4 text-xl">Reviewing code...</p>
            </div>
          )}

          {result && (
            <div className={`mt-6 p-6 rounded-xl text-center text-xl font-bold ${
              result.startsWith('PASS') 
                ? 'bg-green-500/20 border-2 border-green-400' 
                : 'bg-red-500/20 border-2 border-red-400'
            }`}>
              {result}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
