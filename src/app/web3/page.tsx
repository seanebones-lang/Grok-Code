'use client'

import { useState } from 'react'

// Force dynamic rendering - this page has interactive elements
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export default function Web3() {
  const [minting, setMinting] = useState(false)
  const [minted, setMinted] = useState(false)

  const handleMint = async () => {
    setMinting(true)
    try {
      // Placeholder for Web3 minting logic
      await new Promise(resolve => setTimeout(resolve, 2000))
      setMinted(true)
    } catch (error) {
      console.error('Mint failed:', error)
    } finally {
      setMinting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 p-8 text-white">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-6xl font-black mb-8">⚡ Web3 Swarm NFT</h1>
        <p className="text-xl mb-12 text-gray-200">
          Mint your Swarm NFT collection
        </p>
        
        <div className="bg-white/10 backdrop-blur p-8 rounded-3xl shadow-2xl inline-block">
          <div className="mb-6">
            <h2 className="text-3xl font-bold mb-4">Empire #1</h2>
            <p className="text-gray-300">Exclusive Swarm NFT</p>
          </div>
          
          <button
            onClick={handleMint}
            disabled={minting || minted}
            className="px-12 py-6 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-2xl font-black transition-colors"
          >
            {minting ? 'Minting...' : minted ? 'Minted ✓' : 'Mint NFT'}
          </button>
          
          {minted && (
            <p className="mt-4 text-green-400 font-bold">NFT Minted Successfully!</p>
          )}
        </div>
      </div>
    </div>
  )
}
