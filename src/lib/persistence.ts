/**
 * Persistence Layer for Learning Systems
 *
 * Provides durable storage for RAG documents, knowledge graph entities,
 * ML learning patterns, agent precision metrics, and agent memory.
 *
 * Storage backends:
 * 1. File-based JSON (default) — stores in .grok-data/ directory
 * 2. SQLite via better-sqlite3 (if available) — future enhancement
 * 3. Prisma/PostgreSQL (if DATABASE_URL is set) — future enhancement
 *
 * All learning systems (RAG, KG, ML, Precision, Memory) use this layer
 * to survive server restarts.
 */

import * as fs from 'fs'
import * as path from 'path'

// ============================================================================
// Types
// ============================================================================

export interface PersistenceConfig {
  /** Directory for file-based storage */
  dataDir: string
  /** Auto-save interval in ms (0 = disabled) */
  autoSaveInterval: number
  /** Max items per collection before pruning */
  maxItemsPerCollection: number
}

export interface StoredCollection<T> {
  name: string
  version: number
  updatedAt: string
  items: T[]
}

// ============================================================================
// Default Config
// ============================================================================

const DEFAULT_CONFIG: PersistenceConfig = {
  dataDir: path.join(process.cwd(), '.grok-data'),
  autoSaveInterval: 60_000, // 1 minute
  maxItemsPerCollection: 10_000,
}

// ============================================================================
// Persistence Manager
// ============================================================================

export class PersistenceManager {
  private config: PersistenceConfig
  private dirty = new Set<string>()
  private cache = new Map<string, StoredCollection<unknown>>()
  private autoSaveTimer: ReturnType<typeof setInterval> | null = null

  constructor(config: Partial<PersistenceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.ensureDataDir()

    if (this.config.autoSaveInterval > 0) {
      this.autoSaveTimer = setInterval(() => this.flushDirty(), this.config.autoSaveInterval)
      // Don't prevent process exit
      if (this.autoSaveTimer.unref) this.autoSaveTimer.unref()
    }
  }

  private ensureDataDir(): void {
    try {
      fs.mkdirSync(this.config.dataDir, { recursive: true })
    } catch {
      // ignore
    }
  }

  private filePath(collection: string): string {
    return path.join(this.config.dataDir, `${collection}.json`)
  }

  /**
   * Load a collection from disk (or return cached version)
   */
  load<T>(collection: string): T[] {
    // Check in-memory cache first
    const cached = this.cache.get(collection)
    if (cached) return cached.items as T[]

    const fp = this.filePath(collection)
    try {
      if (fs.existsSync(fp)) {
        const raw = fs.readFileSync(fp, 'utf-8')
        const stored = JSON.parse(raw) as StoredCollection<T>
        this.cache.set(collection, stored as StoredCollection<unknown>)
        return stored.items
      }
    } catch (error) {
      console.warn(`[Persistence] Failed to load ${collection}:`, error)
    }
    return []
  }

  /**
   * Save a collection to disk
   */
  save<T>(collection: string, items: T[]): void {
    // Prune if over limit
    const pruned = items.length > this.config.maxItemsPerCollection
      ? items.slice(-this.config.maxItemsPerCollection)
      : items

    const stored: StoredCollection<T> = {
      name: collection,
      version: 1,
      updatedAt: new Date().toISOString(),
      items: pruned,
    }

    this.cache.set(collection, stored as StoredCollection<unknown>)
    this.dirty.add(collection)
  }

  /**
   * Append items to a collection (load + merge + save)
   */
  append<T extends { id: string }>(collection: string, newItems: T[]): void {
    const existing = this.load<T>(collection)
    const existingIds = new Set(existing.map(item => item.id))
    const merged = [...existing]

    for (const item of newItems) {
      if (existingIds.has(item.id)) {
        // Update existing
        const idx = merged.findIndex(e => e.id === item.id)
        if (idx !== -1) merged[idx] = item
      } else {
        merged.push(item)
      }
    }

    this.save(collection, merged)
  }

  /**
   * Remove items from a collection by ID
   */
  remove<T extends { id: string }>(collection: string, ids: string[]): void {
    const existing = this.load<T>(collection)
    const idSet = new Set(ids)
    this.save(collection, existing.filter(item => !idSet.has(item.id)))
  }

  /**
   * Flush all dirty collections to disk
   */
  flushDirty(): void {
    for (const collection of this.dirty) {
      const stored = this.cache.get(collection)
      if (stored) {
        try {
          this.ensureDataDir()
          const fp = this.filePath(collection)
          fs.writeFileSync(fp, JSON.stringify(stored, null, 2), 'utf-8')
        } catch (error) {
          console.warn(`[Persistence] Failed to write ${collection}:`, error)
        }
      }
    }
    this.dirty.clear()
  }

  /**
   * Force flush and cleanup
   */
  shutdown(): void {
    this.flushDirty()
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer)
      this.autoSaveTimer = null
    }
  }

  /**
   * Clear all data for a collection
   */
  clear(collection: string): void {
    this.cache.delete(collection)
    this.dirty.delete(collection)
    try {
      const fp = this.filePath(collection)
      if (fs.existsSync(fp)) fs.unlinkSync(fp)
    } catch {
      // ignore
    }
  }

  /**
   * List all stored collections
   */
  listCollections(): string[] {
    try {
      return fs.readdirSync(this.config.dataDir)
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''))
    } catch {
      return []
    }
  }
}

// ============================================================================
// Collection Names
// ============================================================================

export const COLLECTIONS = {
  RAG_DOCUMENTS: 'rag-documents',
  KNOWLEDGE_ENTITIES: 'kg-entities',
  KNOWLEDGE_RELATIONSHIPS: 'kg-relationships',
  ML_INTERACTIONS: 'ml-interactions',
  ML_PATTERNS: 'ml-patterns',
  ML_AGENT_PERFORMANCE: 'ml-agent-performance',
  PRECISION_METRICS: 'precision-metrics',
  PRECISION_ENHANCEMENTS: 'precision-enhancements',
  AGENT_MEMORY: 'agent-memory',
} as const

// ============================================================================
// Singleton Instance
// ============================================================================

export const persistence = new PersistenceManager()

// Flush on process exit
if (typeof process !== 'undefined') {
  const flushAndExit = () => {
    persistence.flushDirty()
  }
  process.on('beforeExit', flushAndExit)
  process.on('SIGINT', () => { flushAndExit(); process.exit(0) })
  process.on('SIGTERM', () => { flushAndExit(); process.exit(0) })
}
