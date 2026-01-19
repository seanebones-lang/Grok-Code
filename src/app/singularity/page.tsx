'use client'

import { useEffect } from 'react'

// Force dynamic rendering - this page has interactive elements
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export default function Singularity() {
  useEffect(() => {
    const canvas = document.getElementById('holo') as HTMLCanvasElement;
    // Babylon.js CDN stub
    const script = document.createElement('script');
    script.src = 'https://cdn.babylonjs.com/babylon.js';
    script.onload = () => {
      // Simple neural sphere
      (window as any).BABYLON.Engine.ShadersRepository = 'https://cdn.babylonjs.com/shaders/';
      // Viz code...
      alert('🧠 Singularity Holo Loaded!');
    };
    document.body.append(script);
  }, []);
  return (<div className="min-h-screen bg-gradient-to-br from-purple-900 to-black p-8"><h1 className="text-6xl font-black text-white mb-8">🧠 Singularity Dashboard</h1><canvas id="holo" className="w-full h-96 bg-gray-900 rounded-3xl border-4 border-purple-500"></canvas><p className="text-xl text-white mt-4">Neural Evolution Viz ∞</p></div>);
}