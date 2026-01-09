'use client'

import { useState, useCallback, memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Copy, RefreshCw, Check, AlertTriangle, User, Bot, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Message } from '@/types'
import { cn } from '@/lib/utils'
import { useAgentOrchestrator } from '@/hooks/useAgentOrchestrator'
import { AgentPanel } from '@/components/AgentPanel'
import { RefactorPlan } from '@/components/RefactorPlan'

interface ChatMessageProps {
  message: Message
  onRetry?: () => void
}

// Memoized code block component for better performance
const CodeBlock = memo(function CodeBlock({ 
  children, 
  className 
}: { 
  children: React.ReactNode
  className?: string 
}) {
  const [copied, setCopied] = useState(false)
  const language = className?.replace('language-', '') || 'text'
  const code = String(children).replace(/\n$/, '')

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [code])

  return (
    <div className="relative group my-3">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0f0f23] border-b border-[#404050] rounded-t-lg">
        <span className="text-xs text-[#9ca3af] font-mono">{language}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-[#9ca3af] hover:text-white hover:bg-[#2a2a3e] opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleCopy}
          aria-label={copied ? 'Copied!' : 'Copy code'}
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 mr-1 text-[#10b981]" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </>
          )}
        </Button>
      </div>
      <pre className="!mt-0 !rounded-t-none overflow-x-auto bg-[#0f0f23] p-3 text-sm">
        <code className={cn("text-[#e5e7eb]", className)}>{code}</code>
      </pre>
    </div>
  )
})

export const ChatMessage = memo(function ChatMessage({ message, onRetry }: ChatMessageProps) {
  const [copied, setCopied] = useState(false)
  const [showRaw, setShowRaw] = useState(false)
  const isError = message.metadata?.error
  const { orchestrate } = useAgentOrchestrator()

  // Parse the message for agent/refactor content
  const parsedContent = useMemo(() => {
    if (message.role === 'user') return null
    return orchestrate(message.content)
  }, [message.content, message.role, orchestrate])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [message.content])

  const formatTimestamp = useCallback((date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date)
  }, [])

  if (message.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        layout
        className="flex justify-end gap-2"
      >
        <div 
          className="max-w-[80%] rounded-lg bg-[#6841e7] px-4 py-2 text-white shadow-lg"
          role="article"
          aria-label={`Your message at ${formatTimestamp(message.timestamp)}`}
        >
          <p className="text-sm whitespace-pre-wrap text-white leading-relaxed">
            {message.content}
          </p>
          <time 
            className="block text-xs text-white/60 mt-1 text-right"
            dateTime={message.timestamp.toISOString()}
          >
            {formatTimestamp(message.timestamp)}
          </time>
        </div>
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#6841e7] flex items-center justify-center" aria-hidden="true">
          <User className="h-4 w-4 text-white" />
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      layout
      className="flex gap-2"
    >
      <div 
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isError ? "bg-red-500/20" : "bg-[#2a2a3e]"
        )}
        aria-hidden="true"
      >
        {isError ? (
          <AlertTriangle className="h-4 w-4 text-red-400" />
        ) : (
          <Bot className="h-4 w-4 text-[#6841e7]" />
        )}
      </div>
      <div 
        className={cn(
          "flex-1 rounded-lg px-4 py-3 border text-white shadow-sm",
          isError 
            ? "bg-red-500/10 border-red-500/20" 
            : "bg-[#2a2a3e] border-[#404050]"
        )}
        role="article"
        aria-label={`Grok's response at ${formatTimestamp(message.timestamp)}${isError ? ' (error)' : ''}`}
      >
        {/* Orchestrated content indicator */}
        {parsedContent?.hasOrchestratedContent && (
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-[#404050]">
            <Sparkles className="h-4 w-4 text-[#6841e7]" />
            <span className="text-xs text-[#9ca3af]">
              {parsedContent.hasAgentOutput && parsedContent.hasRefactorPlan
                ? 'Agent orchestration with refactor plan'
                : parsedContent.hasAgentOutput
                ? 'Agent orchestration active'
                : 'Refactor plan generated'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-6 px-2 text-xs text-[#9ca3af] hover:text-white"
              onClick={() => setShowRaw(!showRaw)}
            >
              {showRaw ? 'Show Formatted' : 'Show Raw'}
            </Button>
          </div>
        )}

        {/* Render based on content type */}
        {showRaw || !parsedContent?.hasOrchestratedContent ? (
          // Standard markdown rendering
          <div className="prose prose-invert prose-sm max-w-none text-white [&_*]:text-white [&_p]:leading-relaxed [&_li]:leading-relaxed">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                code({ className, children, ...props }) {
                  const isInline = !className
                  if (isInline) {
                    return (
                      <code 
                        className="px-1.5 py-0.5 rounded bg-[#1a1a2e] text-[#e5e7eb] text-sm font-mono"
                        {...props}
                      >
                        {children}
                      </code>
                    )
                  }
                  return <CodeBlock className={className}>{children}</CodeBlock>
                },
                pre({ children }) {
                  return <>{children}</>
                },
                a({ href, children }) {
                  return (
                    <a 
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#6841e7] hover:text-[#7c5cff] underline"
                    >
                      {children}
                    </a>
                  )
                },
                table({ children }) {
                  return (
                    <div className="overflow-x-auto my-3">
                      <table className="min-w-full border border-[#404050] rounded">
                        {children}
                      </table>
                    </div>
                  )
                },
                th({ children }) {
                  return (
                    <th className="px-3 py-2 bg-[#1a1a2e] border-b border-[#404050] text-left text-sm font-semibold">
                      {children}
                    </th>
                  )
                },
                td({ children }) {
                  return (
                    <td className="px-3 py-2 border-b border-[#404050] text-sm">
                      {children}
                    </td>
                  )
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        ) : (
          // Orchestrated content rendering
          <div className="space-y-6">
            {/* Plain content (non-agent sections) */}
            {parsedContent.plainContent && (
              <div className="prose prose-invert prose-sm max-w-none text-white [&_*]:text-white [&_p]:leading-relaxed [&_li]:leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {parsedContent.plainContent}
                </ReactMarkdown>
              </div>
            )}

            {/* Refactor Plan */}
            {parsedContent.refactorPlan && (
              <RefactorPlan plan={parsedContent.refactorPlan} />
            )}

            {/* Agent Outputs */}
            {parsedContent.agents.length > 0 && (
              <AgentPanel agents={parsedContent.agents} />
            )}

            {/* Tool Requests */}
            {parsedContent.toolRequests.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <h4 className="text-sm font-medium text-amber-400 mb-2">🔧 Tool Requests</h4>
                <ul className="space-y-2">
                  {parsedContent.toolRequests.map((req, i) => (
                    <li key={i} className="text-sm text-[#9ca3af]">
                      <strong className="text-white">{req.tool}:</strong> {req.input}
                      {req.purpose && <span className="block text-xs mt-1">Purpose: {req.purpose}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#404050]">
          <time 
            className="text-xs text-[#9ca3af]"
            dateTime={message.timestamp.toISOString()}
          >
            {formatTimestamp(message.timestamp)}
          </time>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-[#9ca3af] hover:text-white hover:bg-[#1a1a2e]"
              onClick={handleCopy}
              aria-label={copied ? 'Copied to clipboard' : 'Copy message'}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-[#10b981]" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
            {onRetry && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-[#9ca3af] hover:text-white hover:bg-[#1a1a2e]"
                onClick={onRetry}
                aria-label="Retry this message"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
})
