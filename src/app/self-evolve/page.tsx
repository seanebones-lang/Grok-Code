'use client'

import { useState } from 'react'

// Force dynamic rendering - this page has interactive elements
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export default function SelfEvolve() {
  const [goal, setGoal] = useState('');
  const [log, setLog] = useState([]);
  const evolve = async () => {
    const res = await fetch('/api/self-evolve', { method: 'POST', body: JSON.stringify({ goal }) });
    setLog(await res.json());
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-900 to-red-900 p-8">
      <h1 className="text-5xl font-black mb-12 text-white text-center">🧬 AI Self-Evolution</h1>
      <input placeholder="Goal: optimize latency" value={goal} onChange={e => setGoal(e.target.value)} className="w-full p-8 text-2xl mb-8 rounded-3xl bg-white/10" />
      <button onClick={evolve} className="w-full bg-orange-500 p-8 rounded-3xl text-2xl font-black">Evolve Swarm!</button>
      <pre className="mt-8 p-8 bg-white/5 rounded-3xl max-h-96 overflow-auto">{JSON.stringify(log, null, 2)}</pre>
    </div>
  );
}