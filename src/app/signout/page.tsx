'use client'

import { signOut, useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SignOutPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [isSigningOut, setIsSigningOut] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Auto sign out when page loads
    const performSignOut = async () => {
      try {
        // First, call NextAuth signout API endpoint directly to clear server-side session
        const signoutResponse = await fetch('/api/auth/signout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        // Clear all NextAuth cookies
        const cookiesToClear = [
          'next-auth.session-token',
          '__Secure-next-auth.session-token',
          'next-auth.csrf-token',
          '__Host-next-auth.csrf-token',
          'next-auth.callback-url',
          '__Secure-next-auth.callback-url',
        ]

        cookiesToClear.forEach((cookieName) => {
          // Clear for current domain
          document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`
          // Clear for .vercel.app domain
          document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=.vercel.app;`
          // Clear for grok-code2.vercel.app
          document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=grok-code2.vercel.app;`
        })

        // Clear all cookies (fallback)
        document.cookie.split(";").forEach((c) => {
          const cookieName = c.trim().split("=")[0]
          document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`
          document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=.vercel.app;`
        })

        // Clear localStorage and sessionStorage
        localStorage.clear()
        sessionStorage.clear()

        // Wait a moment for cookies to clear, then redirect
        setTimeout(() => {
          // Force a hard redirect to login page with signout parameter
          window.location.href = '/login?fromSignout=true'
        }, 500)
      } catch (error) {
        console.error('Sign out error:', error)
        setError('Failed to sign out. Clearing cookies and redirecting...')
        
        // Force clear all cookies
        document.cookie.split(";").forEach((c) => {
          const cookieName = c.trim().split("=")[0]
          document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`
          document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=.vercel.app;`
        })
        
        localStorage.clear()
        sessionStorage.clear()
        
        // Redirect after a short delay
        setTimeout(() => {
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
      // Call NextAuth signout API endpoint
      await fetch('/api/auth/signout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      // Clear all NextAuth cookies
      const cookiesToClear = [
        'next-auth.session-token',
        '__Secure-next-auth.session-token',
        'next-auth.csrf-token',
        '__Host-next-auth.csrf-token',
        'next-auth.callback-url',
        '__Secure-next-auth.callback-url',
      ]

      cookiesToClear.forEach((cookieName) => {
        document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`
        document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=.vercel.app;`
      })

      // Clear all cookies
      document.cookie.split(";").forEach((c) => {
        const cookieName = c.trim().split("=")[0]
        document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`
      })

      localStorage.clear()
      sessionStorage.clear()

      // Force redirect
      setTimeout(() => {
        window.location.href = '/login'
      }, 500)
    } catch (error) {
      console.error('Sign out error:', error)
      setError('Failed to sign out. Clearing cookies and redirecting...')
      
      // Force clear everything
      document.cookie.split(";").forEach((c) => {
        const cookieName = c.trim().split("=")[0]
        document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`
      })
      localStorage.clear()
      sessionStorage.clear()
      
      setTimeout(() => {
        window.location.href = '/login'
      }, 1000)
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
