/**
 * Project Context System
 * Reads and manages .grokcontext files to provide agents with project-specific context
 */

// ============================================================================
// Types
// ============================================================================

export interface ProjectContext {
  // Project basics
  name?: string
  description?: string
  version?: string
  
  // Tech stack
  stack?: {
    frontend?: string[]
    backend?: string[]
    database?: string[]
    infrastructure?: string[]
    languages?: string[]
    frameworks?: string[]
  }
  
  // Coding standards
  standards?: {
    codeStyle?: string
    naming?: string
    testing?: string
    documentation?: string
    gitFlow?: string
  }
  
  // Architecture
  architecture?: {
    pattern?: string // e.g., "MVC", "Clean Architecture", "Microservices"
    layers?: string[]
    components?: Record<string, string>
    decisions?: string[]
  }
  
  // Patterns to follow
  patterns?: {
    components?: string
    state?: string
    api?: string
    error?: string
    auth?: string
    custom?: Record<string, string>
  }
  
  // Files and paths
  paths?: {
    source?: string
    tests?: string
    docs?: string
    config?: string
    important?: string[]
  }
  
  // Agent instructions
  agents?: {
    preferred?: string[] // Preferred agents for this project
    instructions?: Record<string, string> // Per-agent instructions
    avoid?: string[] // Things to avoid
  }
  
  // Custom context
  custom?: Record<string, unknown>
}

// ============================================================================
// Default Template
// ============================================================================

export const DEFAULT_GROKCONTEXT_TEMPLATE = `# .grokcontext
# Project context file for AI agents
# This file helps agents understand your project better

# ============================================================================
# Project Information
# ============================================================================
name: "My Project"
description: "A brief description of your project"
version: "1.0.0"

# ============================================================================
# Tech Stack
# ============================================================================
stack:
  frontend:
    - React
    - Next.js 14
    - TypeScript
    - Tailwind CSS
  backend:
    - Node.js
    - Express
    # - Python
    # - FastAPI
  database:
    - PostgreSQL
    # - MongoDB
    # - Redis
  infrastructure:
    - Vercel
    # - AWS
    # - Docker
  languages:
    - TypeScript
    - JavaScript
    # - Python
  frameworks:
    - Next.js
    - React

# ============================================================================
# Coding Standards
# ============================================================================
standards:
  codeStyle: |
    - Use functional components with hooks
    - Prefer named exports over default exports
    - Use TypeScript strict mode
    - Max line length: 100 characters
  naming: |
    - Components: PascalCase (UserProfile.tsx)
    - Functions: camelCase (getUserProfile)
    - Constants: SCREAMING_SNAKE_CASE (MAX_RETRIES)
    - Files: kebab-case or PascalCase for components
  testing: |
    - Unit tests for all utility functions
    - Integration tests for API routes
    - E2E tests for critical user flows
    - Minimum 80% coverage on new code
  documentation: |
    - JSDoc comments for public functions
    - README for each major feature
    - ADRs for architecture decisions
  gitFlow: |
    - main: production-ready code
    - develop: integration branch
    - feature/*: new features
    - fix/*: bug fixes
    - Commit format: type(scope): description

# ============================================================================
# Architecture
# ============================================================================
architecture:
  pattern: "Feature-based with Clean Architecture principles"
  layers:
    - UI Components (src/components)
    - Business Logic (src/lib)
    - Data Access (src/services)
    - API Routes (src/app/api)
  decisions:
    - "Use server components by default, client only when needed"
    - "Colocate related files in feature folders"
    - "Prefer composition over inheritance"

# ============================================================================
# Patterns
# ============================================================================
patterns:
  components: |
    // Always use this pattern for components:
    interface Props {
      // Define all props with JSDoc comments
    }
    export function ComponentName({ prop1, prop2 }: Props) {
      // Implementation
    }
  state: |
    // Use React Query for server state
    // Use Zustand for client state
    // Avoid prop drilling - use context when needed
  api: |
    // All API routes should:
    // 1. Validate input with Zod
    // 2. Return consistent response shapes
    // 3. Handle errors gracefully
  error: |
    // Use custom error classes
    // Always include error codes
    // Log errors with context
  auth: |
    // Authentication patterns
    // Token-based authentication
    // API key validation

# ============================================================================
# Important Paths
# ============================================================================
paths:
  source: "src"
  tests: "tests"
  docs: "docs"
  config: "config"
  important:
    - "src/lib/agent-loop.ts"
    - "src/components/ChatPane.tsx"
    - "src/app/api/chat/route.ts"

# ============================================================================
# Agent Instructions
# ============================================================================
agents:
  preferred:
    - fullstack
    - mobile
    - testing
  instructions:
    security: "Pay special attention to API route security and token validation"
    testing: "Focus on integration tests for this project"
    codeReview: "Check for performance issues with large lists"
  avoid:
    - "Don't use class components"
    - "Avoid inline styles, use Tailwind"
    - "Don't install new dependencies without asking"

# ============================================================================
# Custom Context (add your own)
# ============================================================================
# custom:
#   businessRules: |
#     - Users can only see their own data
#     - Admins can see all data
#   externalApis:
#     - name: Stripe
#       docs: https://stripe.com/docs
#     - name: SendGrid
#       docs: https://docs.sendgrid.com
`

// ============================================================================
// Parser
// ============================================================================

export function parseGrokContext(content: string): ProjectContext {
  try {
    // Simple YAML-like parser (for basic cases)
    // In production, use a proper YAML parser
    const context: ProjectContext = {}
    const lines = content.split('\n')
    let currentSection: string | null = null
    let currentSubSection: string | null = null
    let currentValue: string[] = []
    let inMultiline = false
    
    for (const line of lines) {
      // Skip comments and empty lines
      if (line.trim().startsWith('#') || line.trim() === '') {
        continue
      }
      
      // Check for top-level section
      const sectionMatch = line.match(/^(\w+):$/)
      if (sectionMatch && !line.startsWith(' ')) {
        if (currentSection && currentSubSection && currentValue.length > 0) {
          setNestedValue(context as Record<string, unknown>, [currentSection, currentSubSection], currentValue.join('\n'))
        }
        currentSection = sectionMatch[1]
        currentSubSection = null
        currentValue = []
        inMultiline = false
        continue
      }
      
      // Check for sub-section or value
      const keyValueMatch = line.match(/^\s{2}(\w+):\s*(.*)$/)
      if (keyValueMatch) {
        if (currentSubSection && currentValue.length > 0) {
          setNestedValue(context as Record<string, unknown>, [currentSection!, currentSubSection], 
            currentValue.length === 1 ? currentValue[0] : currentValue)
        }
        currentSubSection = keyValueMatch[1]
        const value = keyValueMatch[2].trim()
        
        if (value === '|') {
          inMultiline = true
          currentValue = []
        } else if (value.startsWith('[') || value.startsWith('{')) {
          // Try to parse as JSON array/object
          try {
            currentValue = [JSON.parse(value)]
          } catch {
            currentValue = [value]
          }
          inMultiline = false
        } else if (value) {
          currentValue = [value.replace(/^["']|["']$/g, '')]
          inMultiline = false
        } else {
          currentValue = []
          inMultiline = false
        }
        continue
      }
      
      // Check for list item
      const listMatch = line.match(/^\s{4}-\s*(.*)$/)
      if (listMatch) {
        currentValue.push(listMatch[1].replace(/^["']|["']$/g, ''))
        continue
      }
      
      // Multiline content
      if (inMultiline && line.startsWith('    ')) {
        currentValue.push(line.slice(4))
      }
    }
    
    // Save last value
    if (currentSection && currentSubSection && currentValue.length > 0) {
      setNestedValue(context as Record<string, unknown>, [currentSection, currentSubSection], 
        currentValue.length === 1 ? currentValue[0] : currentValue)
    }
    
    return context
  } catch (error) {
    console.error('Failed to parse .grokcontext:', error)
    return {}
  }
}

function setNestedValue(obj: Record<string, unknown>, path: string[], value: unknown): void {
  let current = obj
  for (let i = 0; i < path.length - 1; i++) {
    if (!current[path[i]]) {
      current[path[i]] = {}
    }
    current = current[path[i]] as Record<string, unknown>
  }
  current[path[path.length - 1]] = value
}

// ============================================================================
// Context Formatter for Prompts
// ============================================================================

export function formatContextForPrompt(context: ProjectContext): string {
  const sections: string[] = []
  
  if (context.name || context.description) {
    sections.push(`## Project: ${context.name || 'Unknown'}
${context.description || ''}`)
  }
  
  if (context.stack) {
    const stackItems: string[] = []
    if (context.stack.frontend?.length) stackItems.push(`Frontend: ${context.stack.frontend.join(', ')}`)
    if (context.stack.backend?.length) stackItems.push(`Backend: ${context.stack.backend.join(', ')}`)
    if (context.stack.database?.length) stackItems.push(`Database: ${context.stack.database.join(', ')}`)
    if (context.stack.frameworks?.length) stackItems.push(`Frameworks: ${context.stack.frameworks.join(', ')}`)
    
    if (stackItems.length > 0) {
      sections.push(`## Tech Stack
${stackItems.join('\n')}`)
    }
  }
  
  if (context.standards) {
    const standardItems: string[] = []
    if (context.standards.codeStyle) standardItems.push(`Code Style:\n${context.standards.codeStyle}`)
    if (context.standards.naming) standardItems.push(`Naming:\n${context.standards.naming}`)
    if (context.standards.testing) standardItems.push(`Testing:\n${context.standards.testing}`)
    
    if (standardItems.length > 0) {
      sections.push(`## Coding Standards
${standardItems.join('\n\n')}`)
    }
  }
  
  if (context.architecture) {
    const archItems: string[] = []
    if (context.architecture.pattern) archItems.push(`Pattern: ${context.architecture.pattern}`)
    if (context.architecture.layers?.length) archItems.push(`Layers: ${context.architecture.layers.join(', ')}`)
    if (context.architecture.decisions?.length) {
      archItems.push(`Key Decisions:\n${context.architecture.decisions.map(d => `- ${d}`).join('\n')}`)
    }
    
    if (archItems.length > 0) {
      sections.push(`## Architecture
${archItems.join('\n')}`)
    }
  }
  
  if (context.patterns) {
    const patternItems: string[] = []
    Object.entries(context.patterns).forEach(([key, value]) => {
      if (value && key !== 'custom') {
        patternItems.push(`### ${key}\n${value}`)
      }
    })
    
    if (patternItems.length > 0) {
      sections.push(`## Patterns to Follow
${patternItems.join('\n\n')}`)
    }
  }
  
  if (context.agents?.avoid?.length) {
    sections.push(`## Things to Avoid
${context.agents.avoid.map(a => `- ${a}`).join('\n')}`)
  }
  
  return sections.join('\n\n---\n\n')
}

// ============================================================================
// Storage
// ============================================================================

const CONTEXT_STORAGE_KEY = 'nexteleven_projectContext'

export function saveProjectContext(context: ProjectContext): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(CONTEXT_STORAGE_KEY, JSON.stringify(context))
}

export function loadProjectContext(): ProjectContext | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(CONTEXT_STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

export function clearProjectContext(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CONTEXT_STORAGE_KEY)
}
