'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const router = useRouter();

  useEffect(() => {
    if (!localStorage.getItem('grokcode_token')) router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Grok Code Dashboard</h1>
            <p className="text-white/70">AI coding workspace ready</p>
          </div>
          <button
            onClick={() => { localStorage.removeItem('grokcode_token'); router.push('/'); }}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors"
          >
            Logout
          </button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* New Project Card */}
          <div className="glass backdrop-blur-xl bg-white/10 rounded-2xl p-6 shadow-xl border border-white/10">
            <div className="text-center">
              <div className="text-6xl mb-4">🚀</div>
              <h3 className="text-2xl font-bold text-white mb-2">New Project</h3>
              <p className="text-white/70 mb-6">Start a new AI coding project</p>
              <button className="w-full px-6 py-3 bg-white text-gray-900 font-bold rounded-xl hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg">
                Create Project
              </button>
            </div>
          </div>

          {/* AI Code Gen Card */}
          <div className="glass backdrop-blur-xl bg-white/10 rounded-2xl p-6 shadow-xl border border-white/10">
            <div className="text-center">
              <div className="text-6xl mb-4">🤖</div>
              <h3 className="text-2xl font-bold text-white mb-2">AI Code Gen</h3>
              <p className="text-white/70 mb-6">Prompt → Production code</p>
              <button className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg">
                Generate Code
              </button>
            </div>
          </div>

          {/* Deploy Card */}
          <div className="glass backdrop-blur-xl bg-white/10 rounded-2xl p-6 shadow-xl border border-white/10">
            <div className="text-center">
              <div className="text-6xl mb-4">🚀</div>
              <h3 className="text-2xl font-bold text-white mb-2">Deploy</h3>
              <p className="text-white/70 mb-6">One-click Vercel deployment</p>
              <button className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg">
                Deploy Now
              </button>
            </div>
          </div>
        </div>

        {/* Workspace Placeholder */}
        <div className="mt-8 glass backdrop-blur-xl bg-white/10 rounded-2xl p-8 shadow-xl border border-white/10">
          <h2 className="text-2xl font-bold text-white mb-4">Your AI Coding Workspace</h2>
          <p className="text-white/70 mb-6">
            Ready for code generation, reviews, and deployments. Powered by Grok API.
          </p>
          <div className="bg-gray-800 rounded-xl p-6 text-center">
            <div className="text-6xl mb-4">💻</div>
            <p className="text-gray-400">Monaco Editor / Chat UI will be integrated here</p>
          </div>
        </div>
      </div>
    </div>
  );
}