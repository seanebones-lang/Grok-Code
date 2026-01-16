'use client'

import { useState } from 'react'
import { SPECIALIZED_AGENTS } from '@/lib/specialized-agents'

type AgentId = keyof typeof SPECIALIZED_AGENTS

export default function SwarmUI() {
  const [agents, setAgents] = useState<string[]>([])
  const [code, setCode] = useState('// Paste code here...')
  const [results, setResults] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(false)

  const availableAgents = Object.keys(SPECIALIZED_AGENTS).slice(0, 6)

  const runSwarm = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/agent/swarm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agents, code }),
      })
      const data = await res.json()
      setResults(data.swarm_results || data)
    } catch (error) {
      setResults({ error: 'Swarm failed: ' + (error instanceof Error ? error.message : 'Unknown error') })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8 text-white font-sans">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-5xl font-black mb-12 text-center bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent drop-shadow-2xl">
          Agent Swarm Dashboard
        </h1>
        <p className="text-xl text-slate-300 mb-8 text-center">Select agents, paste code, unleash the swarm!</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Controls */}
          <div className="space-y-6">
            {/* Agents */}
            <div>
              <label className="block text-2xl font-bold mb-4 text-slate-200">Select Agents</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {availableAgents.map((agentId) => {
                  const agent = SPECIALIZED_AGENTS[agentId as AgentId]
                  return (
                    <label key={agentId} className="flex items-center p-4 bg-slate-800/50 hover:bg-slate-700 border-2 border-slate-600 rounded-xl cursor-pointer transition-all group">
                      <input
                        type="checkbox"
                        className="w-5 h-5 text-blue-500 rounded focus:ring-blue-500 mr-3"
                        checked={agents.includes(agentId)}
                        onChange={(e) => {
                          const newAgents = e.target.checked
                            ? [...agents, agentId]
                            : agents.filter(a => a !== agentId)
                          setAgents(newAgents)
                        }}
                      />
                      <span className="capitalize font-semibold group-hover:text-blue-400">
                        {agent?.emoji} {agent?.name || agentId}
                      </span>
                    </label>
                  )
                })}
              </div>
              <p className="mt-2 text-sm text-slate-400">Selected: {agents.length} / {availableAgents.length}</p>
            </div>
            {/* Code Editor */}
            <div>
              <label className="block text-2xl font-bold mb-4 text-slate-200">Code to Analyze</label>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full h-64 p-6 bg-slate-800/80 border-2 border-slate-600 rounded-2xl font-mono text-lg resize-vertical focus:border-blue-500 focus:outline-none transition-all shadow-xl"
                placeholder="// Example: def risky_func(): os.system('rm -rf /')  # Security will catch this!"
              />
            </div>
            <button
              onClick={runSwarm}
              disabled={loading || agents.length === 0}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-12 py-8 rounded-2xl font-black text-2xl shadow-2xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
            >
              {loading ? 'Swarming in Progress...' : `Unleash ${agents.length} Agent${agents.length !== 1 ? 's' : ''}!`}
            </button>
          </div>
          {/* Right: Results */}
          <div className="space-y-4">
            {Object.keys(results).length > 0 && (
              <div className="p-8 bg-slate-800/50 backdrop-blur-xl border-2 border-slate-600 rounded-3xl shadow-2xl">
                <h2 className="text-3xl font-bold mb-6 text-center text-green-400">Swarm Results</h2>
                <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
                  {Object.entries(results).map(([agent, data]) => (
                    <div key={agent} className="p-6 bg-gradient-to-br from-slate-700/80 to-slate-900/80 border rounded-2xl border-slate-500 shadow-lg">
                      <div className="flex items-center mb-3">
                        <h3 className="text-xl font-bold capitalize text-slate-200">{agent}</h3>
                      </div>
                      <pre className="text-sm overflow-auto bg-slate-900/50 p-4 rounded-xl font-mono max-h-32">
                        {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {loading && (
              <div className="p-8 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500 rounded-3xl animate-pulse">
                <h3 className="text-2xl font-bold text-yellow-300 mb-2">Agents Analyzing...</h3>
                <div className="flex space-x-2">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce"></div>
                  <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
