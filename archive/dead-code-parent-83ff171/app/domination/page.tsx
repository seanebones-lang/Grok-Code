'use client'

import { useEffect, useState } from 'react'

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic'

export default function Domination() {
  const [score, setScore] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetch('/api/metrics').then(r => r.json()).then(setScore).catch(() => setScore(0));
  }, []);

  if (!mounted) {
    return null;
  }

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      window.open('https://twitter.com/intent/tweet?text=Check%20out%20Grok%20Swarm!', '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 to-black p-8 text-white">
      <h1 className="text-6xl font-black mb-12 text-center animate-pulse">🌍 WORLD DOMINATION STATUS</h1>
      <div className="text-4xl font-bold text-center mb-8">Conquest Score: {score}/10000</div>
      <button 
        onClick={handleShare}
        className="mx-auto block bg-red-600 px-12 py-6 rounded-full text-2xl font-black hover:bg-red-700 transition-colors"
      >
        🚀 Share Swarm on X!
      </button>
      <div className="grid grid-cols-3 gap-4 mt-12">
        <div>Stars: 10k</div><div>PRs Sent: 1k</div><div>Repos Conquered: 100</div>
      </div>
    </div>
  );
}