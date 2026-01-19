'use client'

import { useState } from 'react'

// Client Component - already dynamic by nature, no route segment config needed

export default function Federate() {
  const [repo, setRepo] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)

  const analyze = async () => {
    if (!repo) return
    
    setLoading(true)
    try {
      const res = await fetch('/api/agent/swarm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          agents: ['code-review'],
          code: `Repo: ${repo}` 
        }),
      })
      const data = await res.json()
      setResults(data)
    } catch (error) {
      setResults({ error: error instanceof Error ? error.message : 'Analysis failed' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-cyan-900 p-8 text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-6xl font-black mb-8 text-center">🌐 Federate Analysis</h1>
        <p className="text-xl text-center mb-12 text-gray-200">
          Repo input → search_code → swarm analysis → results
        </p>
        
        <div className="bg-white/10 backdrop-blur p-8 rounded-3xl shadow-2xl space-y-6">
          <div>
            <label className="block text-2xl font-bold mb-4">Repository</label>
            <input
              type="text"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="owner/repo"
              className="w-full p-4 text-lg bg-white/20 border-2 border-white/30 rounded-xl focus:outline-none focus:border-cyan-400"
            />
          </div>
          
          <button
            onClick={analyze}
            disabled={!repo || loading}
            className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed px-8 py-6 rounded-xl text-2xl font-black transition-colors"
          >
            {loading ? 'Analyzing...' : 'Run Swarm Analysis'}
          </button>

          {results && (
            <div className="mt-6 p-6 bg-slate-900/50 rounded-xl">
              <pre className="text-sm overflow-auto max-h-96">
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
