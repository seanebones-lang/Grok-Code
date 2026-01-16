'use client'

import { signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SignOutPage() {
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Auto sign out when page loads
    const performSignOut = async () => {
      try {
        // Try client-side signOut first
        const result = await signOut({ 
          callbackUrl: '/login',
          redirect: false 
        })
        
        // If successful, redirect manually
        if (result?.url) {
          window.location.href = result.url
        } else {
          // Fallback: clear cookies and redirect
          document.cookie.split(";").forEach((c) => {
            document.cookie = c
              .replace(/^ +/, "")
              .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
          })
          router.push('/login')
        }
      } catch (error) {
        console.error('Sign out error:', error)
        setError('Failed to sign out. Clearing cookies and redirecting...')
        
        // Force clear all cookies
        document.cookie.split(";").forEach((c) => {
          const cookieName = c.trim().split("=")[0]
          document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`
          document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=.vercel.app;`
        })
        
        // Redirect after a short delay
        setTimeout(() => {
          router.push('/login')
          window.location.href = '/login'
        }, 1000)
      }
    }
    
    performSignOut()
  }, [router])

  const handleManualSignOut = async () => {
    setIsSigningOut(true)
    setError(null)
    
    try {
      const result = await signOut({ 
        callbackUrl: '/login',
        redirect: false 
      })
      
      if (result?.url) {
        window.location.href = result.url
      } else {
        // Clear cookies and redirect
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
        })
        window.location.href = '/login'
      }
    } catch (error) {
      console.error('Sign out error:', error)
      setError('Failed to sign out. Please try again or clear cookies manually.')
      setIsSigningOut(false)
      
      // Force redirect
      setTimeout(() => {
        window.location.href = '/login'
      }, 2000)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f0f23]">
      <div className="text-center max-w-md mx-auto px-4">
        {isSigningOut ? (
          <div>
            <p className="text-white mb-4">Signing out...</p>
            {error && (
              <p className="text-yellow-400 text-sm mb-4">{error}</p>
            )}
          </div>
        ) : (
          <div>
            <p className="text-white mb-4">
              {error || 'Sign out failed. Please try again.'}
            </p>
            <div className="space-y-2">
              <button 
                onClick={handleManualSignOut}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 mr-2"
              >
                Try Again
              </button>
              <button 
                onClick={() => window.location.href = '/login'}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Go to Login
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
