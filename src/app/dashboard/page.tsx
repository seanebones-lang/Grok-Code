'use client';
import { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { Providers } from '@/components/Providers';

// Lazy load the Editor and ChatPane components
const Editor = dynamic(() => import('@/components/Editor').then(mod => ({ default: mod.Editor })), {
  loading: () => (
    <div className="flex items-center justify-center h-full bg-[#1e1e1e]">
      <Loader2 className="h-8 w-8 animate-spin text-[#6841e7]" />
    </div>
  ),
});

const ChatPane = dynamic(() => import('@/components/ChatPane').then(mod => ({ default: mod.ChatPane })), {
  loading: () => (
    <div className="flex items-center justify-center h-full bg-[#0f0f23]">
      <Loader2 className="h-8 w-8 animate-spin text-[#6841e7]" />
    </div>
  ),
});

export default function Dashboard() {
  const router = useRouter();

  useEffect(() => {
    if (!localStorage.getItem('grokcode_token')) router.replace('/');
  }, [router]);

  return (
    <Providers>
      <div className="h-screen w-full bg-[#0a0a0a] text-white">
        {/* Header */}
        <div className="h-14 bg-[#1a1a2e] border-b border-[#404050] flex items-center justify-between px-6">
          <div>
            <h1 className="text-xl font-bold text-white">Grok Code</h1>
            <p className="text-sm text-[#9ca3af]">AI-Powered Development Workspace</p>
          </div>
          <button
            onClick={() => { localStorage.removeItem('grokcode_token'); router.push('/'); }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
          >
            Logout
          </button>
        </div>

        {/* Main Content - Simple Split Layout */}
        <div className="flex h-[calc(100vh-3.5rem)]">
          {/* Left Panel - Monaco Editor */}
          <div className="w-1/2 h-full border-r border-[#404050]">
            <Suspense fallback={
              <div className="flex items-center justify-center h-full bg-[#1e1e1e]">
                <Loader2 className="h-8 w-8 animate-spin text-[#6841e7]" />
              </div>
            }>
              <Editor
                filePath="welcome.ts"
                content={`// Welcome to Grok Code!
// This is your AI-powered coding workspace

interface Welcome {
  message: string;
  features: string[];
}

const welcome: Welcome = {
  message: "Hello! I'm your AI coding assistant.",
  features: [
    "🤖 AI-powered code generation",
    "🚀 One-click deployments",
    "💬 Interactive chat interface",
    "📝 Multi-language support"
  ]
};

console.log(welcome.message);
export default welcome;`}
              />
            </Suspense>
          </div>

          {/* Right Panel - Chat Interface */}
          <div className="w-1/2 h-full">
            <Suspense fallback={
              <div className="flex items-center justify-center h-full bg-[#0f0f23]">
                <Loader2 className="h-8 w-8 animate-spin text-[#6841e7]" />
              </div>
            }>
              <ChatPane
                newSessionMessage="Hello! I'm your AI coding assistant. How can I help you with your project today?"
              />
            </Suspense>
          </div>
        </div>
      </div>
    </Providers>
  );
}