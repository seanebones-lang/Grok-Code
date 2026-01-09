/**
 * Chat component types
 */

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface ChatProps {
  onCodeBlockClick?: (code: string, language?: string) => void
}
