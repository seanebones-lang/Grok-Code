'use client'

import { useState } from 'react'
import { SPECIALIZED_AGENTS } from '@/lib/specialized-agents'

// Force dynamic rendering - this page has interactive elements
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export default function Marketplace() {
  const [agents, setAgents] = useState(Object.keys(SPECIALIZED_AGENTS))
  const [newAgent, setNewAgent] = useState({ name: '', desc: '', tools: [] as string[] })

  const addAgent = async () => {
    const res = await fetch('/api/agents', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAgent) 
    })
    if (res.ok) setAgents([...agents, newAgent.name])
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900 p-8">
      <h1 className="text-5xl font-black mb-12 text-center text-white">Agent Marketplace</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {agents.map((agentId) => {
          const agent = SPECIALIZED_AGENTS[agentId]
          return (
            <div key={agentId} className="bg-white/10 backdrop-blur p-6 rounded-2xl shadow-xl hover:scale-105 transition-all">
              <h2 className="text-2xl font-bold mb-2 capitalize text-white">
                {agent?.emoji} {agent?.name || agentId}
              </h2>
              <p className="text-slate-300 mb-4">{agent?.description || 'Custom agent'}</p>
              <button className="w-full bg-green-500 hover:bg-green-600 px-4 py-2 rounded-xl text-white font-medium">
                Install → Swarm
              </button>
            </div>
          )
        })}
      </div>
      <div className="max-w-2xl mx-auto bg-white/5 p-8 rounded-3xl">
        <h2 className="text-3xl font-bold mb-6 text-white">Create Custom Agent</h2>
        <input 
          placeholder="Name (e.g., 'crypto-trader')" 
          value={newAgent.name} 
          onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })} 
          className="w-full p-4 bg-white/20 rounded-xl mb-4 text-white placeholder-slate-400" 
        />
        <textarea 
          placeholder="Description" 
          value={newAgent.desc} 
          onChange={(e) => setNewAgent({ ...newAgent, desc: e.target.value })} 
          className="w-full h-24 p-4 bg-white/20 rounded-xl mb-4 text-white placeholder-slate-400" 
        />
        <button 
          onClick={addAgent} 
          className="w-full bg-blue-500 hover:bg-blue-600 p-4 rounded-xl font-bold text-xl text-white"
        >
          Generate Agent!
        </button>
      </div>
    </div>
  )
}
