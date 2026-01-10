/**
 * Agent Memory System
 * Stores decisions, preferences, and learnings across sessions
 * Agents can recall past context to provide better assistance
 */

// ============================================================================
// Types
// ============================================================================

export interface MemoryEntry {
  id: string
  type: MemoryType
  content: string
  context?: string
  tags: string[]
  agentId?: string
  createdAt: Date
  accessCount: number
  lastAccessed: Date
  importance: 'low' | 'medium' | 'high' | 'critical'
}

export type MemoryType = 
  | 'decision'      // Architecture/design decisions
  | 'preference'    // User preferences
  | 'pattern'       // Code patterns used
  | 'issue'         // Past issues and solutions
  | 'context'       // Project context
  | 'learning'      // Things learned about the codebase

// ============================================================================
// Constants
// ============================================================================

const MEMORY_STORAGE_KEY = 'nexteleven_agentMemory'
const MAX_MEMORIES = 100 // Keep most important/recent

// ============================================================================
// Helper Functions
// ============================================================================

function generateId(): string {
  return `mem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

// ============================================================================
// Storage Functions
// ============================================================================

export function loadMemories(): MemoryEntry[] {
  if (typeof window === 'undefined') return []
  
  try {
    const stored = localStorage.getItem(MEMORY_STORAGE_KEY)
    if (!stored) return []
    
    const parsed = JSON.parse(stored)
    return parsed.map((m: MemoryEntry) => ({
      ...m,
      createdAt: new Date(m.createdAt),
      lastAccessed: new Date(m.lastAccessed),
    }))
  } catch {
    return []
  }
}

export function saveMemories(memories: MemoryEntry[]): void {
  if (typeof window === 'undefined') return
  
  // Sort by importance and recency, keep top MAX_MEMORIES
  const sorted = memories
    .sort((a, b) => {
      // Critical always first
      const importanceOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      const impDiff = importanceOrder[b.importance] - importanceOrder[a.importance]
      if (impDiff !== 0) return impDiff
      
      // Then by access count
      const accessDiff = b.accessCount - a.accessCount
      if (accessDiff !== 0) return accessDiff
      
      // Then by recency
      return b.lastAccessed.getTime() - a.lastAccessed.getTime()
    })
    .slice(0, MAX_MEMORIES)
  
  localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(sorted))
}

// ============================================================================
// CRUD Operations
// ============================================================================

export function addMemory(memory: Omit<MemoryEntry, 'id' | 'createdAt' | 'accessCount' | 'lastAccessed'>): MemoryEntry {
  const memories = loadMemories()
  const now = new Date()
  
  const newMemory: MemoryEntry = {
    ...memory,
    id: generateId(),
    createdAt: now,
    accessCount: 0,
    lastAccessed: now,
  }
  
  memories.push(newMemory)
  saveMemories(memories)
  
  return newMemory
}

export function updateMemory(id: string, updates: Partial<Omit<MemoryEntry, 'id' | 'createdAt'>>): MemoryEntry | null {
  const memories = loadMemories()
  const index = memories.findIndex(m => m.id === id)
  
  if (index === -1) return null
  
  memories[index] = {
    ...memories[index],
    ...updates,
    lastAccessed: new Date(),
  }
  
  saveMemories(memories)
  return memories[index]
}

export function deleteMemory(id: string): boolean {
  const memories = loadMemories()
  const filtered = memories.filter(m => m.id !== id)
  
  if (filtered.length === memories.length) return false
  
  saveMemories(filtered)
  return true
}

export function accessMemory(id: string): MemoryEntry | null {
  const memories = loadMemories()
  const memory = memories.find(m => m.id === id)
  
  if (memory) {
    memory.accessCount++
    memory.lastAccessed = new Date()
    saveMemories(memories)
  }
  
  return memory || null
}

// ============================================================================
// Query Functions
// ============================================================================

export function getMemoriesByType(type: MemoryType): MemoryEntry[] {
  return loadMemories().filter(m => m.type === type)
}

export function getMemoriesByAgent(agentId: string): MemoryEntry[] {
  return loadMemories().filter(m => m.agentId === agentId)
}

export function getMemoriesByTags(tags: string[]): MemoryEntry[] {
  return loadMemories().filter(m => 
    tags.some(tag => m.tags.includes(tag.toLowerCase()))
  )
}

export function searchMemories(query: string): MemoryEntry[] {
  const lowerQuery = query.toLowerCase()
  return loadMemories().filter(m => {
    return (
      m.content.toLowerCase().includes(lowerQuery) ||
      m.context?.toLowerCase().includes(lowerQuery) ||
      m.tags.some(t => t.includes(lowerQuery))
    )
  })
}

export function getRelevantMemories(context: string, limit: number = 5): MemoryEntry[] {
  const words = context.toLowerCase().split(/\s+/).filter(w => w.length > 3)
  const memories = loadMemories()
  
  // Score each memory by relevance
  const scored = memories.map(memory => {
    let score = 0
    const memoryText = `${memory.content} ${memory.context || ''} ${memory.tags.join(' ')}`.toLowerCase()
    
    words.forEach(word => {
      if (memoryText.includes(word)) score++
    })
    
    // Boost by importance
    const importanceBoost = { critical: 10, high: 5, medium: 2, low: 0 }
    score += importanceBoost[memory.importance]
    
    // Boost by recency (last 7 days)
    const daysSinceAccess = (Date.now() - memory.lastAccessed.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceAccess < 7) score += 3
    
    return { memory, score }
  })
  
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => {
      // Mark as accessed
      accessMemory(s.memory.id)
      return s.memory
    })
}

export function getCriticalMemories(): MemoryEntry[] {
  return loadMemories().filter(m => m.importance === 'critical')
}

// ============================================================================
// Format for Agent Prompts
// ============================================================================

export function formatMemoriesForPrompt(memories: MemoryEntry[]): string {
  if (memories.length === 0) return ''
  
  const sections: string[] = [
    '## 🧠 Agent Memory (Past Context)',
    '',
  ]
  
  // Group by type
  const byType: Record<MemoryType, MemoryEntry[]> = {
    decision: [],
    preference: [],
    pattern: [],
    issue: [],
    context: [],
    learning: [],
  }
  
  memories.forEach(m => {
    byType[m.type].push(m)
  })
  
  const typeLabels: Record<MemoryType, string> = {
    decision: '📐 Decisions',
    preference: '⚙️ Preferences',
    pattern: '🔄 Patterns',
    issue: '🐛 Past Issues',
    context: '📋 Context',
    learning: '💡 Learnings',
  }
  
  Object.entries(byType).forEach(([type, mems]) => {
    if (mems.length === 0) return
    
    sections.push(`### ${typeLabels[type as MemoryType]}`)
    mems.forEach(m => {
      const importanceIcon = m.importance === 'critical' ? '🔴' : 
                            m.importance === 'high' ? '🟠' : ''
      sections.push(`- ${importanceIcon}${m.content}`)
      if (m.context) {
        sections.push(`  _Context: ${m.context}_`)
      }
    })
    sections.push('')
  })
  
  return sections.join('\n')
}

// ============================================================================
// Quick Memory Functions (for common use cases)
// ============================================================================

export function rememberDecision(decision: string, context?: string, importance: MemoryEntry['importance'] = 'medium'): MemoryEntry {
  return addMemory({
    type: 'decision',
    content: decision,
    context,
    tags: extractTags(decision),
    importance,
  })
}

export function rememberPreference(preference: string, context?: string): MemoryEntry {
  return addMemory({
    type: 'preference',
    content: preference,
    context,
    tags: extractTags(preference),
    importance: 'high',
  })
}

export function rememberPattern(pattern: string, context?: string): MemoryEntry {
  return addMemory({
    type: 'pattern',
    content: pattern,
    context,
    tags: extractTags(pattern),
    importance: 'medium',
  })
}

export function rememberIssue(issue: string, solution: string): MemoryEntry {
  return addMemory({
    type: 'issue',
    content: issue,
    context: `Solution: ${solution}`,
    tags: extractTags(`${issue} ${solution}`),
    importance: 'high',
  })
}

export function rememberLearning(learning: string, context?: string): MemoryEntry {
  return addMemory({
    type: 'learning',
    content: learning,
    context,
    tags: extractTags(learning),
    importance: 'medium',
  })
}

// Extract relevant tags from text
function extractTags(text: string): string[] {
  const techTerms = [
    'react', 'next', 'typescript', 'javascript', 'node', 'api', 'database',
    'auth', 'security', 'performance', 'testing', 'mobile', 'ui', 'ux',
    'prisma', 'postgres', 'mongodb', 'redis', 'docker', 'aws', 'vercel',
    'tailwind', 'css', 'component', 'hook', 'state', 'redux', 'zustand',
    'graphql', 'rest', 'websocket', 'oauth', 'jwt', 'stripe', 'payment'
  ]
  
  const lowerText = text.toLowerCase()
  return techTerms.filter(term => lowerText.includes(term))
}

// ============================================================================
// Export Utilities
// ============================================================================

export const agentMemory = {
  load: loadMemories,
  save: saveMemories,
  add: addMemory,
  update: updateMemory,
  delete: deleteMemory,
  access: accessMemory,
  getByType: getMemoriesByType,
  getByAgent: getMemoriesByAgent,
  getByTags: getMemoriesByTags,
  search: searchMemories,
  getRelevant: getRelevantMemories,
  getCritical: getCriticalMemories,
  formatForPrompt: formatMemoriesForPrompt,
  remember: {
    decision: rememberDecision,
    preference: rememberPreference,
    pattern: rememberPattern,
    issue: rememberIssue,
    learning: rememberLearning,
  },
}
