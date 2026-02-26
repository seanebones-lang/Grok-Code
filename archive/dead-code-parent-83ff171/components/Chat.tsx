'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { Message, ChatProps } from './types'
import { cn } from '@/lib/utils'

export function Chat({ onCodeBlockClick }: ChatProps = {}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [input])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I received your message: "${userMessage.content}"\n\nHere's a code example:\n\n\`\`\`typescript\nconst example = "Hello, World!"\nconsole.log(example)\n\`\`\``,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiMessage])
      setIsLoading(false)
    }, 1000)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleCodeBlockClick = (code: string, language?: string) => {
    if (onCodeBlockClick) {
      onCodeBlockClick(code, language)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <div className="text-[#9ca3af]">
                <p className="text-lg mb-2">Start a conversation</p>
                <p className="text-sm">Ask Eleven anything about code</p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-4',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold">
                    E
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[85%] rounded-lg px-4 py-3',
                    message.role === 'user'
                      ? 'bg-white text-black'
                      : 'bg-primary text-white'
                  )}
                >
                  {message.role === 'assistant' ? (
                    <div className="prose prose-invert max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code: ({ className, children, ...props }: { className?: string; children: React.ReactNode; [key: string]: unknown }) => {
                            const inline = !className?.startsWith('language-')
                            const match = /language-(\w+)/.exec(className || '')
                            const language = match ? match[1] : ''
                            const codeString = String(children).replace(/\n$/, '')

                            if (!inline) {
                              return (
                                <div className="relative">
                                  <pre
                                    className={cn(
                                      'bg-[#1a1a1a] text-white p-4 rounded-lg overflow-x-auto cursor-pointer',
                                      'hover:bg-[#1a1a1a]/80 transition-colors',
                                      'border border-[#1a1a1a] hover:border-primary/50'
                                    )}
                                    onClick={() => handleCodeBlockClick(codeString, language)}
                                  >
                                    <code className={className}>{children}</code>
                                  </pre>
                                  {language && (
                                    <div className="absolute top-2 right-2 text-xs text-[#9ca3af] bg-[#0a0a0a] px-2 py-1 rounded">
                                      {language}
                                    </div>
                                  )}
                                </div>
                              )
                            }
                            return (
                              <code
                                className={cn(
                                  'bg-[#1a1a1a] text-primary px-1.5 py-0.5 rounded text-sm',
                                  className
                                )}
                                {...props}
                              >
                                {children}
                              </code>
                            )
                          },
                          pre: ({ children }) => <>{children}</>,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white flex items-center justify-center text-black text-sm font-semibold">
                    U
                  </div>
                )}
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex gap-4 justify-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold">
                E
              </div>
              <div className="bg-primary text-white rounded-lg px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-[#1a1a1a] bg-[#0a0a0a] px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-3 items-end">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Eleven anything..."
              className="min-h-[60px] max-h-[200px] resize-none bg-[#1a1a1a] border-[#1a1a1a] text-white placeholder:text-[#9ca3af] focus:border-primary"
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="bg-primary hover:bg-primary/90 text-white h-[60px] px-6 flex-shrink-0"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
