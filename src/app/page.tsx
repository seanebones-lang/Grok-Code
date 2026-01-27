// Force dynamic rendering - no static generation
export const dynamic = 'force-dynamic'

export default function Home() {
  return (
    <div className="flex items-center justify-center h-full bg-[#0a0a0a] text-white">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">NextEleven Code</h1>
        <p className="text-xl text-[#9ca3af] mb-8">AI-Powered Development Assistant</p>
        <div className="space-y-4">
          <p className="text-lg">🚀 Build optimizations applied</p>
          <p className="text-lg">⚡ Performance enhanced</p>
          <p className="text-lg">🔒 Security configured</p>
        </div>
        <p className="mt-8 text-sm text-[#6b7280]">
          Application will load once you sign in and complete setup.
        </p>
      </div>
    </div>
  )
}
