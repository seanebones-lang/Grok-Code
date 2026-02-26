/**
 * Session Manager
 * Handles saving, loading, and managing chat sessions with localStorage persistence
 */

import type { Message } from '@/types'

// ============================================================================
// Types
// ============================================================================

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  agentId?: string
  agentName?: string
  createdAt: Date
  updatedAt: Date
  metadata?: {
    repository?: { owner: string; repo: string; branch: string }
    model?: string
    environment?: string
    filesContext?: string[]
  }
}

export interface SessionSummary {
  id: string
  title: string
  agentId?: string
  agentName?: string
  messageCount: number
  createdAt: Date
  updatedAt: Date
  preview: string
}

// ============================================================================
// Constants
// ============================================================================

const SESSIONS_KEY = 'nexteleven_sessions'
const CURRENT_SESSION_KEY = 'nexteleven_currentSession'
const MAX_SESSIONS = 50 // Keep last 50 sessions

// ============================================================================
// Helper Functions
// ============================================================================

function generateId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function generateTitle(messages: Message[], agentName?: string): string {
  // Use agent name if available
  if (agentName) {
    const firstUserMessage = messages.find(m => m.role === 'user')?.content
    if (firstUserMessage) {
      const preview = firstUserMessage.replace(/^\/agent\s+\w+\s*/i, '').slice(0, 40)
      return preview.length > 0 ? `${agentName}: ${preview}...` : agentName
    }
    return agentName
  }
  
  // Use first user message as title
  const firstUserMessage = messages.find(m => m.role === 'user')?.content
  if (firstUserMessage) {
    const cleaned = firstUserMessage.slice(0, 50)
    return cleaned.length < firstUserMessage.length ? `${cleaned}...` : cleaned
  }
  
  return 'New Chat'
}

function getPreview(messages: Message[]): string {
  const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant')?.content
  if (lastAssistantMessage) {
    const preview = lastAssistantMessage.slice(0, 100)
    return preview.length < lastAssistantMessage.length ? `${preview}...` : preview
  }
  return 'No messages yet'
}

// ============================================================================
// Session Manager Class
// ============================================================================

class SessionManager {
  private sessions: Map<string, ChatSession> = new Map()
  private currentSessionId: string | null = null

  constructor() {
    this.loadFromStorage()
  }

  // Load sessions from localStorage
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return
    
    try {
      const stored = localStorage.getItem(SESSIONS_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Array<[string, ChatSession]>
        this.sessions = new Map(
          parsed.map(([id, session]) => [
            id,
            {
              ...session,
              createdAt: new Date(session.createdAt),
              updatedAt: new Date(session.updatedAt),
              messages: session.messages.map(m => ({
                ...m,
                timestamp: new Date(m.timestamp),
              })),
            },
          ])
        )
      }

      const currentId = localStorage.getItem(CURRENT_SESSION_KEY)
      if (currentId && this.sessions.has(currentId)) {
        this.currentSessionId = currentId
      }
    } catch (error) {
      console.error('Failed to load sessions:', error)
    }
  }

  // Save sessions to localStorage
  private saveToStorage(): void {
    if (typeof window === 'undefined') return
    
    try {
      // Convert Map to array and limit to MAX_SESSIONS
      const sortedSessions = Array.from(this.sessions.entries())
        .sort((a, b) => b[1].updatedAt.getTime() - a[1].updatedAt.getTime())
        .slice(0, MAX_SESSIONS)
      
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sortedSessions))
      
      if (this.currentSessionId) {
        localStorage.setItem(CURRENT_SESSION_KEY, this.currentSessionId)
      }
    } catch (error) {
      console.error('Failed to save sessions:', error)
    }
  }

  // Create a new session
  createSession(options?: {
    agentId?: string
    agentName?: string
    metadata?: ChatSession['metadata']
  }): ChatSession {
    const now = new Date()
    const session: ChatSession = {
      id: generateId(),
      title: options?.agentName || 'New Chat',
      messages: [],
      agentId: options?.agentId,
      agentName: options?.agentName,
      createdAt: now,
      updatedAt: now,
      metadata: options?.metadata,
    }

    this.sessions.set(session.id, session)
    this.currentSessionId = session.id
    this.saveToStorage()
    
    return session
  }

  // Get current session or create new one
  getCurrentSession(): ChatSession {
    if (this.currentSessionId && this.sessions.has(this.currentSessionId)) {
      return this.sessions.get(this.currentSessionId)!
    }
    return this.createSession()
  }

  // Get session by ID
  getSession(id: string): ChatSession | undefined {
    return this.sessions.get(id)
  }

  // Update session messages
  updateMessages(sessionId: string, messages: Message[]): void {
    const session = this.sessions.get(sessionId)
    if (!session) return

    session.messages = messages
    session.updatedAt = new Date()
    session.title = generateTitle(messages, session.agentName)
    
    this.sessions.set(sessionId, session)
    this.saveToStorage()
  }

  // Add a message to session
  addMessage(sessionId: string, message: Message): void {
    const session = this.sessions.get(sessionId)
    if (!session) return

    session.messages.push(message)
    session.updatedAt = new Date()
    session.title = generateTitle(session.messages, session.agentName)
    
    this.sessions.set(sessionId, session)
    this.saveToStorage()
  }

  // Update last message (for streaming)
  updateLastMessage(sessionId: string, content: string): void {
    const session = this.sessions.get(sessionId)
    if (!session || session.messages.length === 0) return

    const lastMessage = session.messages[session.messages.length - 1]
    if (lastMessage.role === 'assistant') {
      lastMessage.content = content
      session.updatedAt = new Date()
      this.saveToStorage()
    }
  }

  // Switch to a session
  switchSession(sessionId: string): ChatSession | undefined {
    if (this.sessions.has(sessionId)) {
      this.currentSessionId = sessionId
      this.saveToStorage()
      return this.sessions.get(sessionId)
    }
    return undefined
  }

  // Delete a session
  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId)
    
    if (this.currentSessionId === sessionId) {
      // Switch to most recent session or create new
      const sessions = this.getAllSessions()
      this.currentSessionId = sessions.length > 0 ? sessions[0].id : null
    }
    
    this.saveToStorage()
  }

  // Clear all sessions
  clearAllSessions(): void {
    this.sessions.clear()
    this.currentSessionId = null
    this.saveToStorage()
  }

  // Get all sessions as summaries (for sidebar)
  getAllSessions(): SessionSummary[] {
    return Array.from(this.sessions.values())
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .map(session => ({
        id: session.id,
        title: session.title,
        agentId: session.agentId,
        agentName: session.agentName,
        messageCount: session.messages.length,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        preview: getPreview(session.messages),
      }))
  }

  // Get recent sessions (for quick access)
  getRecentSessions(limit: number = 10): SessionSummary[] {
    return this.getAllSessions().slice(0, limit)
  }

  // Search sessions
  searchSessions(query: string): SessionSummary[] {
    const lowerQuery = query.toLowerCase()
    return this.getAllSessions().filter(session => {
      return (
        session.title.toLowerCase().includes(lowerQuery) ||
        session.preview.toLowerCase().includes(lowerQuery) ||
        session.agentName?.toLowerCase().includes(lowerQuery)
      )
    })
  }

  // Get current session ID
  getCurrentSessionId(): string | null {
    return this.currentSessionId
  }

  // Export sessions (for backup)
  exportSessions(): string {
    return JSON.stringify(Array.from(this.sessions.entries()), null, 2)
  }

  // Import sessions (for restore)
  importSessions(data: string): boolean {
    try {
      const parsed = JSON.parse(data) as Array<[string, ChatSession]>
      parsed.forEach(([id, session]) => {
        this.sessions.set(id, {
          ...session,
          createdAt: new Date(session.createdAt),
          updatedAt: new Date(session.updatedAt),
          messages: session.messages.map(m => ({
            ...m,
            timestamp: new Date(m.timestamp),
          })),
        })
      })
      this.saveToStorage()
      return true
    } catch {
      return false
    }
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let sessionManagerInstance: SessionManager | null = null

export function getSessionManager(): SessionManager {
  if (!sessionManagerInstance) {
    sessionManagerInstance = new SessionManager()
  }
  return sessionManagerInstance
}

// Convenience functions
export const sessionManager = {
  create: (options?: Parameters<SessionManager['createSession']>[0]) => 
    getSessionManager().createSession(options),
  getCurrent: () => getSessionManager().getCurrentSession(),
  get: (id: string) => getSessionManager().getSession(id),
  updateMessages: (id: string, messages: Message[]) => 
    getSessionManager().updateMessages(id, messages),
  addMessage: (id: string, message: Message) => 
    getSessionManager().addMessage(id, message),
  updateLastMessage: (id: string, content: string) => 
    getSessionManager().updateLastMessage(id, content),
  switch: (id: string) => getSessionManager().switchSession(id),
  delete: (id: string) => getSessionManager().deleteSession(id),
  clear: () => getSessionManager().clearAllSessions(),
  getAll: () => getSessionManager().getAllSessions(),
  getRecent: (limit?: number) => getSessionManager().getRecentSessions(limit),
  search: (query: string) => getSessionManager().searchSessions(query),
  getCurrentId: () => getSessionManager().getCurrentSessionId(),
  export: () => getSessionManager().exportSessions(),
  import: (data: string) => getSessionManager().importSessions(data),
}
