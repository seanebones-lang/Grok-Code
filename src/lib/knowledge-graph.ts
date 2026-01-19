/**
 * Enterprise Knowledge Graph System
 * MIT Professor-Level Implementation
 * 
 * Features:
 * - Entity-relationship mapping
 * - Semantic connections between concepts
 * - Agent knowledge relationships
 * - Codebase structure mapping
 * - Learning from interactions
 * 
 * Last Updated: January 14, 2026
 */

// ============================================================================
// Types
// ============================================================================

export interface Entity {
  id: string
  type: EntityType
  name: string
  description?: string
  properties: Record<string, unknown>
  metadata: EntityMetadata
  createdAt: Date
  updatedAt: Date
  confidence: number // 0-1, how confident we are about this entity
}

export type EntityType =
  | 'concept'
  | 'code_component'
  | 'agent'
  | 'pattern'
  | 'decision'
  | 'user_preference'
  | 'problem'
  | 'solution'
  | 'technology'
  | 'file'
  | 'function'
  | 'class'
  | 'api_endpoint'

export interface EntityMetadata {
  source: 'interaction' | 'codebase' | 'documentation' | 'agent_analysis'
  agentId?: string
  sessionId?: string
  tags: string[]
  importance: 'low' | 'medium' | 'high' | 'critical'
  relatedEntities?: string[]
}

export interface Relationship {
  id: string
  from: string // Entity ID
  to: string // Entity ID
  type: RelationshipType
  strength: number // 0-1, how strong the relationship is
  description?: string
  metadata: RelationshipMetadata
  createdAt: Date
  updatedAt: Date
}

export type RelationshipType =
  | 'uses'
  | 'depends_on'
  | 'implements'
  | 'extends'
  | 'calls'
  | 'references'
  | 'similar_to'
  | 'opposite_of'
  | 'part_of'
  | 'contains'
  | 'learned_from'
  | 'improves'
  | 'replaces'
  | 'related_to'

export interface RelationshipMetadata {
  source: 'codebase' | 'interaction' | 'agent_analysis' | 'ml_inference'
  confidence: number
  evidence?: string[]
  agentId?: string
}

export interface GraphQuery {
  entityId?: string
  entityType?: EntityType
  relationshipType?: RelationshipType
  minStrength?: number
  maxDepth?: number
  filters?: {
    tags?: string[]
    importance?: EntityMetadata['importance'][]
  }
}

export interface GraphResult {
  entities: Entity[]
  relationships: Relationship[]
  paths: Entity[][] // Paths between entities
  insights: string[]
}

// ============================================================================
// Knowledge Graph
// ============================================================================

/**
 * Enterprise Knowledge Graph
 * Maintains semantic relationships between entities
 */
export class KnowledgeGraph {
  private entities: Map<string, Entity> = new Map()
  private relationships: Map<string, Relationship> = new Map()
  private entityIndex: Map<EntityType, Set<string>> = new Map()
  private relationshipIndex: Map<string, Set<string>> = new Map() // entityId -> relationship IDs

  /**
   * Add entity to graph
   */
  addEntity(entity: Entity): void {
    this.entities.set(entity.id, entity)

    // Index by type
    if (!this.entityIndex.has(entity.type)) {
      this.entityIndex.set(entity.type, new Set())
    }
    this.entityIndex.get(entity.type)!.add(entity.id)
  }

  /**
   * Get entity by ID
   */
  getEntity(id: string): Entity | undefined {
    return this.entities.get(id)
  }

  /**
   * Find entities by query
   */
  findEntities(query: GraphQuery): Entity[] {
    let results = Array.from(this.entities.values())

    // Filter by type
    if (query.entityType) {
      const typeIds = this.entityIndex.get(query.entityType) || new Set()
      results = results.filter(e => typeIds.has(e.id))
    }

    // Filter by ID
    if (query.entityId) {
      results = results.filter(e => e.id === query.entityId)
    }

    // Apply filters
    if (query.filters) {
      if (query.filters.tags && query.filters.tags.length > 0) {
        results = results.filter(e =>
          query.filters!.tags!.some(tag => e.metadata.tags.includes(tag))
        )
      }

      if (query.filters.importance && query.filters.importance.length > 0) {
        results = results.filter(e =>
          query.filters!.importance!.includes(e.metadata.importance)
        )
      }
    }

    return results
  }

  /**
   * Add relationship
   */
  addRelationship(relationship: Relationship): void {
    // Validate entities exist
    if (!this.entities.has(relationship.from) || !this.entities.has(relationship.to)) {
      throw new Error('Both entities must exist before creating relationship')
    }

    this.relationships.set(relationship.id, relationship)

    // Index relationships by entity
    if (!this.relationshipIndex.has(relationship.from)) {
      this.relationshipIndex.set(relationship.from, new Set())
    }
    this.relationshipIndex.get(relationship.from)!.add(relationship.id)

    if (!this.relationshipIndex.has(relationship.to)) {
      this.relationshipIndex.set(relationship.to, new Set())
    }
    this.relationshipIndex.get(relationship.to)!.add(relationship.id)
  }

  /**
   * Get relationships for entity
   */
  getRelationships(entityId: string, type?: RelationshipType): Relationship[] {
    const relationshipIds = this.relationshipIndex.get(entityId) || new Set()
    const rels = Array.from(relationshipIds)
      .map(id => this.relationships.get(id)!)
      .filter(rel => rel.from === entityId || rel.to === entityId)

    if (type) {
      return rels.filter(rel => rel.type === type)
    }

    return rels
  }

  /**
   * Find path between two entities
   */
  findPath(fromId: string, toId: string, maxDepth = 5): Entity[] | null {
    if (fromId === toId) {
      const entity = this.entities.get(fromId)
      return entity ? [entity] : null
    }

    // BFS to find shortest path
    const queue: Array<{ entityId: string; path: string[] }> = [{ entityId: fromId, path: [fromId] }]
    const visited = new Set<string>()

    while (queue.length > 0) {
      const { entityId, path } = queue.shift()!

      if (visited.has(entityId)) continue
      visited.add(entityId)

      if (path.length > maxDepth) continue

      if (entityId === toId) {
        return path.map(id => this.entities.get(id)!).filter(Boolean)
      }

      // Get neighbors
      const relationships = this.getRelationships(entityId)
      for (const rel of relationships) {
        const neighborId = rel.from === entityId ? rel.to : rel.from
        if (!visited.has(neighborId)) {
          queue.push({ entityId: neighborId, path: [...path, neighborId] })
        }
      }
    }

    return null
  }

  /**
   * Query graph
   */
  query(query: GraphQuery): GraphResult {
    const entities = this.findEntities(query)
    const relationships: Relationship[] = []

    // Get relationships for found entities
    entities.forEach(entity => {
      const entityRels = this.getRelationships(entity.id, query.relationshipType)
      relationships.push(...entityRels)
    })

    // Find paths if entityId specified
    const paths: Entity[][] = []
    if (query.entityId && query.maxDepth) {
      entities.forEach(entity => {
        if (entity.id !== query.entityId) {
          const path = this.findPath(query.entityId!, entity.id, query.maxDepth)
          if (path) paths.push(path)
        }
      })
    }

    // Generate insights
    const insights = this.generateInsights(entities, relationships)

    return {
      entities,
      relationships: Array.from(new Set(relationships.map(r => r.id))).map(id => this.relationships.get(id)!),
      paths,
      insights,
    }
  }

  /**
   * Generate insights from graph data
   */
  private generateInsights(entities: Entity[], relationships: Relationship[]): string[] {
    const insights: string[] = []

    // Find highly connected entities
    const connectionCounts = new Map<string, number>()
    relationships.forEach(rel => {
      connectionCounts.set(rel.from, (connectionCounts.get(rel.from) || 0) + 1)
      connectionCounts.set(rel.to, (connectionCounts.get(rel.to) || 0) + 1)
    })

    const topConnected = Array.from(connectionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    if (topConnected.length > 0) {
      insights.push(`Highly connected entities: ${topConnected.map(([id]) => {
        const entity = this.entities.get(id)
        return entity?.name || id
      }).join(', ')}`)
    }

    // Find patterns
    const relationshipTypes = new Map<RelationshipType, number>()
    relationships.forEach(rel => {
      relationshipTypes.set(rel.type, (relationshipTypes.get(rel.type) || 0) + 1)
    })

    const commonRelations = Array.from(relationshipTypes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)

    if (commonRelations.length > 0) {
      insights.push(`Common relationship types: ${commonRelations.map(([type]) => type).join(', ')}`)
    }

    return insights
  }

  /**
   * Learn from interaction
   * Automatically extracts entities and relationships
   */
  learnFromInteraction(data: {
    userQuery: string
    agentResponse: string
    agentId?: string
    sessionId?: string
    success: boolean
  }): { entities: Entity[]; relationships: Relationship[] } {
    const entities: Entity[] = []
    const relationships: Relationship[] = []

    // Extract entities from interaction
    const queryEntity: Entity = {
      id: `query_${Date.now()}`,
      type: 'concept',
      name: data.userQuery.substring(0, 50),
      description: data.userQuery,
      properties: { fullQuery: data.userQuery },
      metadata: {
        source: 'interaction',
        agentId: data.agentId,
        sessionId: data.sessionId,
        tags: this.extractTags(data.userQuery),
        importance: data.success ? 'high' : 'medium',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      confidence: data.success ? 0.9 : 0.6,
    }
    entities.push(queryEntity)

    // Extract agent entity if not exists
    if (data.agentId) {
      let agentEntity = this.entities.get(data.agentId)
      if (!agentEntity) {
        agentEntity = {
          id: data.agentId,
          type: 'agent',
          name: data.agentId,
          description: `Agent: ${data.agentId}`,
          properties: {},
          metadata: {
            source: 'interaction',
            tags: ['agent'],
            importance: 'high',
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          confidence: 1.0,
        }
        entities.push(agentEntity)
      } else {
        // Update agent entity
        agentEntity.updatedAt = new Date()
        agentEntity.confidence = Math.min(1.0, agentEntity.confidence + 0.01)
      }
    }

    // Create relationship between query and agent
    if (data.agentId) {
      const relationship: Relationship = {
        id: `rel_${Date.now()}`,
        from: queryEntity.id,
        to: data.agentId,
        type: 'learned_from',
        strength: data.success ? 0.9 : 0.5,
        description: `Agent ${data.agentId} handled query`,
        metadata: {
          source: 'interaction',
          confidence: data.success ? 0.9 : 0.6,
          evidence: [data.userQuery, data.agentResponse],
          agentId: data.agentId,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      relationships.push(relationship)
    }

    // Add entities and relationships to graph
    entities.forEach(e => this.addEntity(e))
    relationships.forEach(r => {
      try {
        this.addRelationship(r)
      } catch (error) {
        // Entity might not exist yet, skip
        console.warn('[KnowledgeGraph] Failed to add relationship:', error)
      }
    })

    return { entities, relationships }
  }

  /**
   * Extract tags from text
   */
  private extractTags(text: string): string[] {
    const techTerms = [
      'react', 'next', 'typescript', 'javascript', 'api', 'database',
      'security', 'performance', 'testing', 'authentication', 'authorization',
      'component', 'hook', 'state', 'graphql', 'rest', 'websocket',
    ]

    const lowerText = text.toLowerCase()
    return techTerms.filter(term => lowerText.includes(term))
  }

  /**
   * Get all entities
   */
  getAllEntities(): Entity[] {
    return Array.from(this.entities.values())
  }

  /**
   * Get all relationships
   */
  getAllRelationships(): Relationship[] {
    return Array.from(this.relationships.values())
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const knowledgeGraph = new KnowledgeGraph()
