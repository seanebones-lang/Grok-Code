'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem('grokcode_token')) router.replace('/dashboard');
  }, [router]);

  const login = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return setError('Fill all fields');
    setLoading(true);
    // Mock/Real API key auth
    const token = btoa(JSON.stringify({ email, exp: Date.now() + 24*60*60*1000 }));
    localStorage.setItem('grokcode_token', token);
    router.push('/dashboard');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Grok Code</h1>
          <p className="text-white/70">Login to unlock AI coding magic</p>
        </div>

        {/* Login Form */}
        <div className="glass backdrop-blur-xl bg-white/20 rounded-2xl p-8 shadow-2xl border border-white/20">
          <form onSubmit={login} className="space-y-6">
            <div>
              <input
                type="email"
                placeholder="admin@grokcode.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full p-4 rounded-xl bg-white/30 backdrop-blur border border-white/30 text-lg placeholder-white/70 focus:outline-none focus:ring-4 focus:ring-white/50 transition-all"
                required
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full p-4 rounded-xl bg-white/30 backdrop-blur border border-white/30 text-lg placeholder-white/70 focus:outline-none focus:ring-4 focus:ring-white/50 transition-all"
                required
              />
            </div>
            {error && (
              <div className="text-red-300 text-center bg-red-900/50 rounded-lg p-3">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full p-5 bg-white text-gray-900 font-bold text-xl rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200"
            >
              {loading ? '🚀 Entering...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center text-white/60">
            Demo: admin@grokcode.com / password
          </div>
        </div>

        {/* Features Preview */}
        <div className="mt-8 glass backdrop-blur-xl bg-white/10 rounded-2xl p-6 shadow-xl border border-white/10">
          <h3 className="text-white text-lg font-semibold mb-4 text-center">Features Unlocked</h3>
          <div className="grid grid-cols-1 gap-4 text-center">
            <div className="p-4 bg-white/10 rounded-lg">
              <div className="text-2xl mb-2">🤖</div>
              <div className="text-white font-medium">AI Code Gen</div>
              <div className="text-white/60 text-sm">Prompt → Production code</div>
            </div>
            <div className="p-4 bg-white/10 rounded-lg">
              <div className="text-2xl mb-2">🚀</div>
              <div className="text-white font-medium">Deploy</div>
              <div className="text-white/60 text-sm">One-click Vercel</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
