'use client'

import { signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SignOutPage() {
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(true)

  useEffect(() => {
    // Auto sign out when page loads
    const performSignOut = async () => {
      try {
        // Use redirect: true to ensure proper redirect after signout
        await signOut({ 
          callbackUrl: '/login',
          redirect: true 
        })
      } catch (error) {
        console.error('Sign out error:', error)
        // If signOut fails, manually redirect to login
        setIsSigningOut(false)
        router.push('/login')
      }
    }
    
    performSignOut()
  }, [router])

  const handleManualSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOut({ 
        callbackUrl: '/login',
        redirect: true 
      })
    } catch (error) {
      console.error('Sign out error:', error)
      router.push('/login')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f0f23]">
      <div className="text-center">
        <p className="text-white mb-4">
          {isSigningOut ? 'Signing out...' : 'Sign out failed. Please try again.'}
        </p>
        {!isSigningOut && (
          <button 
            onClick={handleManualSignOut}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  )
}
