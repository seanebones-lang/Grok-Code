/**
 * Code Snippets Library
 * Save, organize, and reuse code patterns
 */

// ============================================================================
// Types
// ============================================================================

export interface CodeSnippet {
  id: string
  name: string
  description: string
  language: string
  code: string
  tags: string[]
  category: SnippetCategory
  createdAt: Date
  updatedAt: Date
  usageCount: number
  isFavorite: boolean
}

export type SnippetCategory = 
  | 'component'
  | 'hook'
  | 'utility'
  | 'api'
  | 'database'
  | 'auth'
  | 'testing'
  | 'styling'
  | 'config'
  | 'other'

// ============================================================================
// Constants
// ============================================================================

const SNIPPETS_STORAGE_KEY = 'nexteleven_snippets'

export const SNIPPET_CATEGORIES: { id: SnippetCategory; name: string; emoji: string }[] = [
  { id: 'component', name: 'Components', emoji: '🧩' },
  { id: 'hook', name: 'Hooks', emoji: '🪝' },
  { id: 'utility', name: 'Utilities', emoji: '🔧' },
  { id: 'api', name: 'API', emoji: '🔌' },
  { id: 'database', name: 'Database', emoji: '🗄️' },
  { id: 'auth', name: 'Auth', emoji: '🔐' },
  { id: 'testing', name: 'Testing', emoji: '🧪' },
  { id: 'styling', name: 'Styling', emoji: '🎨' },
  { id: 'config', name: 'Config', emoji: '⚙️' },
  { id: 'other', name: 'Other', emoji: '📁' },
]

// ============================================================================
// Default Snippets (Starter Pack)
// ============================================================================

const DEFAULT_SNIPPETS: Omit<CodeSnippet, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>[] = [
  {
    name: 'React Component',
    description: 'Basic React functional component with TypeScript',
    language: 'typescript',
    code: `interface Props {
  // Define props here
}

export function ComponentName({ }: Props) {
  return (
    <div>
      {/* Component content */}
    </div>
  )
}`,
    tags: ['react', 'component', 'typescript'],
    category: 'component',
    isFavorite: false,
  },
  {
    name: 'useState Hook',
    description: 'React useState with TypeScript',
    language: 'typescript',
    code: `const [value, setValue] = useState<string>('')`,
    tags: ['react', 'hook', 'state'],
    category: 'hook',
    isFavorite: false,
  },
  {
    name: 'useEffect with Cleanup',
    description: 'useEffect with cleanup function',
    language: 'typescript',
    code: `useEffect(() => {
  // Effect logic here
  
  return () => {
    // Cleanup logic here
  }
}, [dependencies])`,
    tags: ['react', 'hook', 'effect'],
    category: 'hook',
    isFavorite: false,
  },
  {
    name: 'Custom Hook',
    description: 'Custom React hook template',
    language: 'typescript',
    code: `import { useState, useEffect, useCallback } from 'react'

export function useCustomHook(initialValue: string) {
  const [value, setValue] = useState(initialValue)
  
  const updateValue = useCallback((newValue: string) => {
    setValue(newValue)
  }, [])
  
  return { value, updateValue }
}`,
    tags: ['react', 'hook', 'custom'],
    category: 'hook',
    isFavorite: false,
  },
  {
    name: 'API Route Handler',
    description: 'Next.js API route with error handling',
    language: 'typescript',
    code: `import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    // Your logic here
    
    return NextResponse.json({ data: 'success' })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Your logic here
    
    return NextResponse.json({ data: 'created' }, { status: 201 })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}`,
    tags: ['nextjs', 'api', 'route'],
    category: 'api',
    isFavorite: false,
  },
  {
    name: 'Fetch with Error Handling',
    description: 'Async fetch with proper error handling',
    language: 'typescript',
    code: `async function fetchData<T>(url: string): Promise<T> {
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error(\`HTTP error! status: \${response.status}\`)
  }
  
  return response.json()
}`,
    tags: ['fetch', 'async', 'utility'],
    category: 'utility',
    isFavorite: false,
  },
  {
    name: 'Debounce Function',
    description: 'Debounce utility function',
    language: 'typescript',
    code: `function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), wait)
  }
}`,
    tags: ['debounce', 'utility', 'performance'],
    category: 'utility',
    isFavorite: false,
  },
  {
    name: 'Tailwind Button',
    description: 'Styled button with Tailwind CSS',
    language: 'typescript',
    code: `<button
  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  onClick={() => {}}
  disabled={false}
>
  Button Text
</button>`,
    tags: ['tailwind', 'button', 'styling'],
    category: 'styling',
    isFavorite: false,
  },
  {
    name: 'Zod Schema',
    description: 'Zod validation schema',
    language: 'typescript',
    code: `import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  age: z.number().min(0).max(120).optional(),
})

type SchemaType = z.infer<typeof schema>`,
    tags: ['zod', 'validation', 'schema'],
    category: 'utility',
    isFavorite: false,
  },
  {
    name: 'Try-Catch Wrapper',
    description: 'Utility to wrap async functions with error handling',
    language: 'typescript',
    code: `type Result<T> = { data: T; error: null } | { data: null; error: Error }

async function tryCatch<T>(
  promise: Promise<T>
): Promise<Result<T>> {
  try {
    const data = await promise
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}`,
    tags: ['error', 'async', 'utility'],
    category: 'utility',
    isFavorite: false,
  },
]

// ============================================================================
// Storage Functions
// ============================================================================

function generateId(): string {
  return `snippet_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export function loadSnippets(): CodeSnippet[] {
  if (typeof window === 'undefined') return []
  
  try {
    const stored = localStorage.getItem(SNIPPETS_STORAGE_KEY)
    if (!stored) {
      // Initialize with default snippets
      const defaults = DEFAULT_SNIPPETS.map(s => ({
        ...s,
        id: generateId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0,
      }))
      saveSnippets(defaults)
      return defaults
    }
    
    const parsed = JSON.parse(stored)
    return parsed.map((s: CodeSnippet) => ({
      ...s,
      createdAt: new Date(s.createdAt),
      updatedAt: new Date(s.updatedAt),
    }))
  } catch {
    return []
  }
}

export function saveSnippets(snippets: CodeSnippet[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(SNIPPETS_STORAGE_KEY, JSON.stringify(snippets))
}

// ============================================================================
// CRUD Operations
// ============================================================================

export function createSnippet(snippet: Omit<CodeSnippet, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>): CodeSnippet {
  const snippets = loadSnippets()
  const now = new Date()
  
  const newSnippet: CodeSnippet = {
    ...snippet,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
    usageCount: 0,
  }
  
  snippets.push(newSnippet)
  saveSnippets(snippets)
  
  return newSnippet
}

export function updateSnippet(id: string, updates: Partial<Omit<CodeSnippet, 'id' | 'createdAt'>>): CodeSnippet | null {
  const snippets = loadSnippets()
  const index = snippets.findIndex(s => s.id === id)
  
  if (index === -1) return null
  
  snippets[index] = {
    ...snippets[index],
    ...updates,
    updatedAt: new Date(),
  }
  
  saveSnippets(snippets)
  return snippets[index]
}

export function deleteSnippet(id: string): boolean {
  const snippets = loadSnippets()
  const filtered = snippets.filter(s => s.id !== id)
  
  if (filtered.length === snippets.length) return false
  
  saveSnippets(filtered)
  return true
}

export function incrementUsage(id: string): void {
  const snippets = loadSnippets()
  const snippet = snippets.find(s => s.id === id)
  
  if (snippet) {
    snippet.usageCount++
    saveSnippets(snippets)
  }
}

export function toggleFavorite(id: string): boolean {
  const snippets = loadSnippets()
  const snippet = snippets.find(s => s.id === id)
  
  if (snippet) {
    snippet.isFavorite = !snippet.isFavorite
    saveSnippets(snippets)
    return snippet.isFavorite
  }
  
  return false
}

// ============================================================================
// Query Functions
// ============================================================================

export function getSnippetById(id: string): CodeSnippet | undefined {
  return loadSnippets().find(s => s.id === id)
}

export function getSnippetsByCategory(category: SnippetCategory): CodeSnippet[] {
  return loadSnippets().filter(s => s.category === category)
}

export function getFavoriteSnippets(): CodeSnippet[] {
  return loadSnippets().filter(s => s.isFavorite)
}

export function getRecentSnippets(limit: number = 5): CodeSnippet[] {
  return loadSnippets()
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, limit)
}

export function getMostUsedSnippets(limit: number = 5): CodeSnippet[] {
  return loadSnippets()
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, limit)
}

export function searchSnippets(query: string): CodeSnippet[] {
  const lowerQuery = query.toLowerCase()
  return loadSnippets().filter(s => {
    return (
      s.name.toLowerCase().includes(lowerQuery) ||
      s.description.toLowerCase().includes(lowerQuery) ||
      s.tags.some(t => t.toLowerCase().includes(lowerQuery)) ||
      s.code.toLowerCase().includes(lowerQuery)
    )
  })
}

// ============================================================================
// Export Utilities
// ============================================================================

export const snippetsLibrary = {
  load: loadSnippets,
  save: saveSnippets,
  create: createSnippet,
  update: updateSnippet,
  delete: deleteSnippet,
  get: getSnippetById,
  getByCategory: getSnippetsByCategory,
  getFavorites: getFavoriteSnippets,
  getRecent: getRecentSnippets,
  getMostUsed: getMostUsedSnippets,
  search: searchSnippets,
  incrementUsage,
  toggleFavorite,
  categories: SNIPPET_CATEGORIES,
}
