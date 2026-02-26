'use client'

import { useState, useEffect } from 'react'

export const useSetupState = () => {
  const [ready, setReady] = useState(false)
  const [step, setStep] = useState(0)
  
  useEffect(() => {
    // Simulate setup check
    const timeout = setTimeout(() => setReady(true), 1000)
    return () => clearTimeout(timeout)
  }, [])
  
  return { ready, step, setStep, setReady }
}