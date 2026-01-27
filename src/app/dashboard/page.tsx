'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const router = useRouter();

  useEffect(() => {
    if (!localStorage.getItem('grokcode_token')) router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Grok Code Dashboard</h1>
            <p className="text-white/70">AI coding workspace - Components loading...</p>
          </div>
          <button
            onClick={() => { localStorage.removeItem('grokcode_token'); router.push('/'); }}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors"
          >
            Logout
          </button>
        </div>

        {/* Loading State */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Monaco Editor Placeholder */}
          <div className="glass backdrop-blur-xl bg-white/10 rounded-2xl p-8 shadow-xl border border-white/10">
            <h2 className="text-2xl font-bold text-white mb-4">Code Editor</h2>
            <div className="bg-gray-800 rounded-xl p-6 h-96 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">💻</div>
                <p className="text-gray-300">Monaco Editor will load here</p>
                <p className="text-gray-500 text-sm mt-2">Loading code editing interface...</p>
              </div>
            </div>
          </div>

          {/* Chat Interface Placeholder */}
          <div className="glass backdrop-blur-xl bg-white/10 rounded-2xl p-8 shadow-xl border border-white/10">
            <h2 className="text-2xl font-bold text-white mb-4">AI Chat</h2>
            <div className="bg-gray-800 rounded-xl p-6 h-96 flex flex-col items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">🤖</div>
                <p className="text-gray-300">Chat interface will load here</p>
                <p className="text-gray-500 text-sm mt-2">Connecting to AI assistant...</p>
              </div>
            </div>
          </div>
        </div>

        {/* Status Info */}
        <div className="mt-8 glass backdrop-blur-xl bg-white/10 rounded-2xl p-6 shadow-xl border border-white/10">
          <h3 className="text-xl font-bold text-white mb-4">System Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl mb-2">✅</div>
              <p className="text-white/70">Authentication</p>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">⏳</div>
              <p className="text-white/70">Components Loading</p>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">🚀</div>
              <p className="text-white/70">Ready for Development</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}