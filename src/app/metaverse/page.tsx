'use client'

import { useEffect, useRef } from 'react'

// Force dynamic rendering - this page has interactive elements
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export default function Metaverse() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Simple animated background
    let animationId: number
    let hue = 0

    const animate = () => {
      hue = (hue + 0.5) % 360
      
      // Create gradient
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
      gradient.addColorStop(0, `hsl(${hue}, 70%, 20%)`)
      gradient.addColorStop(1, `hsl(${(hue + 60) % 360}, 70%, 10%)`)
      
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Draw some stars
      ctx.fillStyle = 'white'
      for (let i = 0; i < 100; i++) {
        const x = (Math.sin(i * 0.1 + hue * 0.01) * 0.5 + 0.5) * canvas.width
        const y = (Math.cos(i * 0.15 + hue * 0.01) * 0.5 + 0.5) * canvas.height
        const size = Math.sin(hue * 0.02 + i) * 1.5 + 1.5
        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.fill()
      }
      
      animationId = requestAnimationFrame(animate)
    }

    // Set canvas size
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)
    
    animate()

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <div className="relative min-h-screen overflow-hidden">
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full"
      />
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-white p-8">
        <h1 className="text-6xl font-black mb-8 text-center drop-shadow-2xl">
          Metaverse Portal
        </h1>
        <p className="text-xl text-center max-w-2xl mb-8 text-gray-300">
          3D visualization coming soon. This is a placeholder for the agent metaverse interface.
        </p>
        <div className="flex gap-4">
          <a 
            href="/" 
            className="px-8 py-4 bg-white/10 backdrop-blur rounded-xl hover:bg-white/20 transition-all"
          >
            Back to Home
          </a>
          <a 
            href="/swarm" 
            className="px-8 py-4 bg-purple-600 rounded-xl hover:bg-purple-700 transition-all"
          >
            Launch Swarm
          </a>
        </div>
      </div>
    </div>
  )
}
