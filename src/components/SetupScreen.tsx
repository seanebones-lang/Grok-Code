'use client'

import { useState, FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Github, Key, ArrowRight, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

const GROK_TOKEN_KEY = 'nexteleven_grok_token'
const GITHUB_TOKEN_KEY = 'nexteleven_github_token'
const REPO_KEY = 'nexteleven_connectedRepo'

interface SetupScreenProps {
  onComplete: () => void
}

export function SetupScreen({ onComplete }: SetupScreenProps) {
  const [grokToken, setGrokToken] = useState('')
  const [githubToken, setGithubToken] = useState('')
  const [repoUrl, setRepoUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validating, setValidating] = useState(false)

  const parseRepoUrl = (url: string): { owner: string; repo: string; branch: string } | null => {
    // Support formats:
    // - https://github.com/owner/repo
    // - https://github.com/owner/repo/tree/branch
    // - owner/repo
    // - owner/repo@branch
    
    url = url.trim()
    
    // Remove trailing slashes
    url = url.replace(/\/$/, '')
    
    // GitHub URL pattern
    const githubUrlMatch = url.match(/github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/([^\/]+))?/i)
    if (githubUrlMatch) {
      return {
        owner: githubUrlMatch[1],
        repo: githubUrlMatch[2],
        branch: githubUrlMatch[3] || 'main',
      }
    }
    
    // owner/repo@branch or owner/repo pattern
    const simpleMatch = url.match(/^([^\/@]+)\/([^\/@]+)(?:@(.+))?$/)
    if (simpleMatch) {
      return {
        owner: simpleMatch[1],
        repo: simpleMatch[2],
        branch: simpleMatch[3] || 'main',
      }
    }
    
    return null
  }

  const validateRepo = async (owner: string, repo: string, token: string): Promise<boolean> => {
    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      })
      return response.ok
    } catch {
      return false
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Validate inputs
      if (!grokToken.trim()) {
        throw new Error('Grok API token is required')
      }

      if (!githubToken.trim()) {
        throw new Error('GitHub token is required')
      }

      if (!repoUrl.trim()) {
        throw new Error('Repository URL is required')
      }

      // Parse repo URL
      const repoInfo = parseRepoUrl(repoUrl)
      if (!repoInfo) {
        throw new Error('Invalid repository URL. Use format: owner/repo or https://github.com/owner/repo')
      }

      // Validate repo access
      setValidating(true)
      const isValid = await validateRepo(repoInfo.owner, repoInfo.repo, githubToken)
      if (!isValid) {
        throw new Error('Cannot access repository. Check your GitHub token permissions.')
      }
      setValidating(false)

      // Store tokens and repo info
      localStorage.setItem(GROK_TOKEN_KEY, grokToken.trim())
      localStorage.setItem(GITHUB_TOKEN_KEY, githubToken.trim())
      localStorage.setItem(REPO_KEY, JSON.stringify(repoInfo))

      // Notify parent component
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration')
      setValidating(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full w-full flex items-center justify-center bg-[#0a0a0a] p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-[#1a1a2e] border border-[#404050] rounded-lg p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-white">NextEleven Code</h1>
            <p className="text-[#9ca3af] text-sm">Enter your tokens to get started</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Grok API Token */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                <Key className="inline h-4 w-4 mr-1.5" />
                Grok API Token
              </label>
              <input
                type="password"
                value={grokToken}
                onChange={(e) => setGrokToken(e.target.value)}
                placeholder="xai-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full px-4 py-2.5 bg-[#2a2a3e] border border-[#404050] rounded-lg text-white placeholder-[#9ca3af] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                disabled={loading}
                required
              />
              <p className="text-xs text-[#606070] mt-1.5">
                Get your token from{' '}
                <a
                  href="https://console.x.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  console.x.ai
                </a>
              </p>
            </div>

            {/* GitHub Token */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                <Github className="inline h-4 w-4 mr-1.5" />
                GitHub Personal Access Token
              </label>
              <input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full px-4 py-2.5 bg-[#2a2a3e] border border-[#404050] rounded-lg text-white placeholder-[#9ca3af] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                disabled={loading}
                required
              />
              <p className="text-xs text-[#606070] mt-1.5">
                Get your token from{' '}
                <a
                  href="https://github.com/settings/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  github.com/settings/tokens
                </a>
                {' '}(needs repo access)
              </p>
            </div>

            {/* Repository URL */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                <Github className="inline h-4 w-4 mr-1.5" />
                Repository URL
              </label>
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="owner/repo or https://github.com/owner/repo"
                className="w-full px-4 py-2.5 bg-[#2a2a3e] border border-[#404050] rounded-lg text-white placeholder-[#9ca3af] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                disabled={loading}
                required
              />
              <p className="text-xs text-[#606070] mt-1.5">
                Format: <code className="bg-[#2a2a3e] px-1 rounded">owner/repo</code> or full GitHub URL
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading || validating}
              className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {validating ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="inline-block mr-2"
                  >
                    ⚙️
                  </motion.div>
                  Validating repository...
                </>
              ) : loading ? (
                'Saving...'
              ) : (
                <>
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4 inline" />
                </>
              )}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
