/**
 * Core type definitions for NextEleven Code
 * @module types
 */

// ============================================================================
// Chat Types
// ============================================================================

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  metadata?: MessageMetadata
}

export interface MessageMetadata {
  model?: string
  tokens?: number
  duration?: number
  error?: boolean
  mode?: 'default' | 'refactor' | 'orchestrate' | 'debug' | 'review' | 'agent'
}

export interface ChatState {
  messages: Message[]
  isLoading: boolean
  error: string | null
  conversationId?: string
}

// ============================================================================
// File System Types
// ============================================================================

export interface FileNode {
  name: string
  type: 'file' | 'folder' | 'directory'
  path: string
  children?: FileNode[]
  size?: number
  lastModified?: Date
  sha?: string
}

export interface FileContent {
  path: string
  content: string
  encoding: 'utf-8' | 'base64'
  sha?: string
}

// ============================================================================
// GitHub Types
// ============================================================================

export interface GitHubRepository {
  owner: string
  name: string
  fullName: string
  defaultBranch: string
  private: boolean
  url: string
}

export interface GitHubPushOptions {
  owner: string
  repo: string
  branch?: string
  files: GitHubFile[]
  message?: string
}

export interface GitHubFile {
  path: string
  content: string
  mode?: '100644' | '100755' | '040000' | '160000' | '120000'
}

export interface GitHubCommit {
  sha: string
  message: string
  url: string
  author?: {
    name: string
    email: string
    date: string
  }
}

export interface GitHubPushResult {
  success: boolean
  commit: GitHubCommit
  requestId?: string
}

// ============================================================================
// API Types
// ============================================================================

export interface ApiError {
  error: string
  message?: string
  details?: unknown
  requestId?: string
  retryable?: boolean
}

export interface ApiResponse<T> {
  data?: T
  error?: ApiError
  status: number
}

export interface RateLimitInfo {
  limit: number
  remaining: number
  reset: number
}

// ============================================================================
// Editor Types
// ============================================================================

export interface EditorState {
  filePath?: string
  content: string
  language: string
  isDirty: boolean
  cursorPosition?: {
    line: number
    column: number
  }
}

export type SupportedLanguage =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'java'
  | 'cpp'
  | 'c'
  | 'csharp'
  | 'go'
  | 'rust'
  | 'php'
  | 'ruby'
  | 'swift'
  | 'kotlin'
  | 'scala'
  | 'shell'
  | 'json'
  | 'yaml'
  | 'xml'
  | 'html'
  | 'css'
  | 'scss'
  | 'sass'
  | 'less'
  | 'markdown'
  | 'sql'
  | 'dockerfile'
  | 'vue'
  | 'svelte'
  | 'plaintext'

// ============================================================================
// User Types
// ============================================================================

export interface User {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
}

export interface Session {
  user: User
  expires: string
}

// ============================================================================
// UI Types
// ============================================================================

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  description?: string
  duration?: number
}

export interface ModalState {
  isOpen: boolean
  title?: string
  content?: React.ReactNode
}

// ============================================================================
// Keyboard Shortcut Types
// ============================================================================

export interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  handler: () => void
  description?: string
}

// ============================================================================
// Diff Types
// ============================================================================

export interface DiffLine {
  type: 'equal' | 'added' | 'removed' | 'modified'
  original: string
  modified: string
  lineNumber: number
}

export interface DiffResult {
  lines: DiffLine[]
  additions: number
  deletions: number
  changes: number
}

// ============================================================================
// API Types
// ============================================================================

export interface GrokMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface GrokStreamChunk {
  content?: string
  error?: string
  done?: boolean
}

export interface GrokModelInfo {
  id: string
  name: string
  maxTokens: number
  contextWindow: number
}

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type Nullable<T> = T | null

export type AsyncState<T> = {
  data: T | null
  loading: boolean
  error: Error | null
}
