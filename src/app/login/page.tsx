'use client'

import { useState, useCallback, useEffect, Suspense } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Github, Code2, Loader2, Shield, Zap, GitBranch, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'

const FEATURES = [
  {
    icon: Zap,
    title: 'AI-Powered Coding',
    description: 'Get intelligent code suggestions powered by NextEleven',
  },
  {
    icon: GitBranch,
    title: 'GitHub Integration',
    description: 'Push code directly to your repositories',
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'Your code stays private and secure',
  },
]

// Map NextAuth error codes to user-friendly messages
const ERROR_MESSAGES: Record<string, string> = {
  Configuration: 'Server configuration error. Please contact support.',
  AccessDenied: 'Access denied. You may not have permission to sign in.',
  Verification: 'The verification link has expired or has already been used.',
  OAuthSignin: 'Error starting the sign-in process. Please try again.',
  OAuthCallback: 'Error during GitHub authentication. The callback URL may not match.',
  OAuthCreateAccount: 'Could not create your account. Please try again.',
  EmailCreateAccount: 'Could not create your account. Please try again.',
  Callback: 'Authentication callback error. Please try again.',
  OAuthAccountNotLinked: 'This email is already linked to another account.',
  EmailSignin: 'Error sending the sign-in email.',
  CredentialsSignin: 'Sign in failed. Check the details you provided.',
  SessionRequired: 'Please sign in to access this page.',
  Default: 'An error occurred during sign in. Please try again.',
}

// Inner component that uses useSearchParams
function LoginContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check for error in URL params (redirected from /api/auth/error)
  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      const errorMessage = ERROR_MESSAGES[errorParam] || ERROR_MESSAGES.Default
      setError(errorMessage)
      // Clean up URL
      const url = new URL(window.location.href)
      url.searchParams.delete('error')
      window.history.replaceState({}, '', url.pathname)
    }
  }, [searchParams])

  // Redirect to home if already authenticated
  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.replace('/')
    }
  }, [status, session, router])

  const handleSignIn = useCallback(async () => {
    // Don't sign in if already authenticated
    if (status === 'authenticated') {
      router.replace('/')
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      const result = await signIn('github', { 
        callbackUrl: '/',
        redirect: true 
      })
      
      // If signIn returns (which it shouldn't with redirect: true), handle error
      if (result?.error) {
        setError(ERROR_MESSAGES[result.error] || ERROR_MESSAGES.Default)
        setIsLoading(false)
      }
    } catch (err) {
      console.error('Sign in error:', err)
      setError('Failed to sign in. Please try again.')
      setIsLoading(false)
    }
  }, [status, router])

  // Show loading while checking auth status
  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f0f23]">
        <Loader2 className="h-8 w-8 animate-spin text-[#6841e7]" />
      </div>
    )
  }

  // If authenticated, show redirecting message (useEffect will redirect)
  if (status === 'authenticated') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f0f23]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#6841e7] mx-auto mb-4" />
          <p className="text-[#9ca3af]">Already signed in, redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#0f0f23] via-[#1a1a2e] to-[#0f0f23]">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#6841e7] rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#7c5cff] rounded-full blur-[100px]" />
        </div>
        
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 max-w-md"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 rounded-xl bg-[#6841e7]/20 border border-[#6841e7]/30">
              <Code2 className="h-10 w-10 text-[#6841e7]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">NextEleven Code</h1>
              <p className="text-[#9ca3af]">AI-Powered Development</p>
            </div>
          </div>
          
          <p className="text-lg text-[#9ca3af] mb-12 leading-relaxed">
            Transform your coding experience with intelligent AI assistance. 
            Write better code, faster.
          </p>
          
          <div className="space-y-6">
            {FEATURES.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className="flex items-start gap-4"
              >
                <div className="p-2 rounded-lg bg-[#2a2a3e] border border-[#404050]">
                  <feature.icon className="h-5 w-5 text-[#6841e7]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{feature.title}</h3>
                  <p className="text-sm text-[#9ca3af]">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
      
      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="bg-[#1a1a2e] p-8 rounded-2xl border border-[#404050] shadow-2xl">
            {/* Mobile logo */}
            <div className="flex items-center justify-center gap-2 mb-8 lg:hidden">
              <Code2 className="h-8 w-8 text-[#6841e7]" />
              <span className="text-2xl font-bold text-white">NextEleven Code</span>
            </div>
            
            <h2 className="text-2xl font-bold text-white text-center mb-2">
              Welcome Back
            </h2>
            <p className="text-[#9ca3af] text-center mb-8">
              Sign in to continue to NextEleven Code
            </p>
            
            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 p-3 mb-6 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
              >
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p>{error}</p>
                  {error.includes('callback') && (
                    <p className="text-xs mt-1 text-red-400/70">
                      This may be a GitHub OAuth configuration issue.
                    </p>
                  )}
                </div>
              </motion.div>
            )}
            
            {/* Sign in button */}
            <Button
              onClick={handleSignIn}
              disabled={isLoading}
              className="w-full h-12 bg-[#24292e] hover:bg-[#2f363d] text-white font-medium transition-all duration-200"
              size="lg"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Github className="h-5 w-5 mr-3" />
                  Continue with GitHub
                </>
              )}
            </Button>
            
            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#404050]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-[#1a1a2e] text-[#9ca3af]">
                  Secure authentication via GitHub
                </span>
              </div>
            </div>
            
            {/* Info */}
            <p className="text-xs text-[#9ca3af] text-center leading-relaxed">
              By signing in, you agree to our{' '}
              <a href="#" className="text-[#6841e7] hover:underline">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="text-[#6841e7] hover:underline">Privacy Policy</a>.
            </p>
          </div>
          
          {/* Mobile features */}
          <div className="mt-8 lg:hidden">
            <div className="grid grid-cols-3 gap-4 text-center">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="p-3">
                  <feature.icon className="h-6 w-6 text-[#6841e7] mx-auto mb-2" />
                  <p className="text-xs text-[#9ca3af]">{feature.title}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// Loading fallback for Suspense
function LoginLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f0f23]">
      <Loader2 className="h-8 w-8 animate-spin text-[#6841e7]" />
    </div>
  )
}

// Main page component with Suspense boundary
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginContent />
    </Suspense>
  )
}
