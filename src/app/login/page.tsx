'use client'

import { useState, useCallback } from 'react'
import { signIn } from 'next-auth/react'
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

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSignIn = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      await signIn('github', { callbackUrl: '/' })
    } catch (err) {
      setError('Failed to sign in. Please try again.')
      setIsLoading(false)
    }
  }, [])

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
                className="flex items-center gap-2 p-3 mb-6 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
              >
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
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
