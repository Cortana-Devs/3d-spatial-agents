/**
 * EntityRegistry - Entity Management and Lifecycle System
 * Feature: F02-ENGINE
 * 
 * Manages entity registration, lookup, metadata storage, and lifecycle events.
 * Provides centralized entity management with audit trails and validation.
 */

import {
  EntityId,
  EntityDescriptor,
  Role,
  LogLevel,
  ENGINE_ERROR_CODES
} from './types';

/**
 * Entity lifecycle events
 */
export type EntityLifecycleEvent = 'created' | 'updated' | 'activated' | 'deactivated' | 'deleted';

/**
 * Entity state tracking
 */
export interface EntityState {
  status: 'active' | 'inactive' | 'deleted';
  lastUpdated: number;
  updateCount: number;
}

/**
 * Extended entity information with state and lifecycle tracking
 */
export interface ExtendedEntityDescriptor extends EntityDescriptor {
  state: EntityState;
  lifecycleHistory: Array<{
    event: EntityLifecycleEvent;
    timestamp: number;
    reason?: string;
  }>;
}

/**
 * Entity query filters
 */
export interface EntityQueryFilter {
  role?: Role;
  kind?: string;
  status?: EntityState['status'];
  createdAfter?: number;
  createdBefore?: number;
  lastUpdatedAfter?: number;
  metaContains?: Record<string, unknown>;
}

/**
 * Entity registration result
 */
export interface EntityRegistrationResult {
  success: boolean;
  entity?: ExtendedEntityDescriptor;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export class EntityRegistry {
  private entities: Map<EntityId, ExtendedEntityDescriptor> = new Map();
  private readonly logLevel: LogLevel;
  private registrationCount: number = 0;

  // Indexes for efficient querying
  private roleIndex: Map<Role, Set<EntityId>> = new Map();
  private kindIndex: Map<string, Set<EntityId>> = new Map();

  constructor(logLevel: LogLevel = 'info') {
    this.logLevel = logLevel;
    
    // Initialize indexes
    this.roleIndex.set('HUMAN', new Set());
    this.roleIndex.set('SIMULANT', new Set());
    this.roleIndex.set('SYSTEM', new Set());

    this.log('info', '[ENTITY][REGISTRY_INIT]');
  }

  /**
   * Register a new entity
   */
  public registerEntity(
    id: EntityId,
    role: Role,
    kind: string,
    meta?: Record<string, unknown>
  ): EntityRegistrationResult {
    // Check for duplicate ID
    if (this.entities.has(id)) {
      const error = {
        code: ENGINE_ERROR_CODES.ENTITY_DUPLICATE,
        message: `Entity with ID ${id} already exists`,
        details: { existingEntity: this.entities.get(id) }
      };
      
      this.log('error', `[ENTITY][REGISTER_FAILED][id=${id}][reason=duplicate]`);
      return { success: false, error };
    }

    const now = Date.now();
    const entity: ExtendedEntityDescriptor = {
      id,
      role,
      kind,
      createdAt: now,
      meta: meta ? { ...meta } : undefined,
      state: {
        status: 'active',
        lastUpdated: now,
        updateCount: 0
      },
      lifecycleHistory: [{
        event: 'created',
        timestamp: now
      }]
    };

    // Store entity
    this.entities.set(id, entity);
    this.registrationCount++;

    // Update indexes
    this.addToRoleIndex(role, id);
    this.addToKindIndex(kind, id);

    this.log('info', `[ENTITY][REGISTERED][id=${id}][role=${role}][kind=${kind}]`);

    return { success: true, entity };
  }

  /**
   * Get entity by ID
   */
  public getEntity(id: EntityId): ExtendedEntityDescriptor | undefined {
    const entity = this.entities.get(id);
    
    if (entity && entity.state.status === 'deleted') {
      return undefined; // Don't return deleted entities
    }
    
    return entity;
  }

  /**
   * Check if entity exists and is active
   */
  public hasEntity(id: EntityId): boolean {
    const entity = this.entities.get(id);
    return entity !== undefined && entity.state.status !== 'deleted';
  }

  /**
   * Update entity metadata
   */
  public updateEntityMeta(
    id: EntityId,
    patch: Record<string, unknown>
  ): EntityRegistrationResult {
    const entity = this.entities.get(id);
    
    if (!entity) {
      const error = {
        code: ENGINE_ERROR_CODES.ENTITY_NOT_FOUND,
        message: `Entity with ID ${id} not found`,
        details: { entityId: id }
      };
      
      this.log('error', `[ENTITY][UPDATE_FAILED][id=${id}][reason=not_found]`);
      return { success: false, error };
    }

    if (entity.state.status === 'deleted') {
      const error = {
        code: ENGINE_ERROR_CODES.ENTITY_NOT_FOUND,
        message: `Entity with ID ${id} is deleted`,
        details: { entityId: id, status: 'deleted' }
      };
      
      this.log('error', `[ENTITY][UPDATE_FAILED][id=${id}][reason=deleted]`);
      return { success: false, error };
    }

    const now = Date.now();
    
    // Update metadata
    entity.meta = entity.meta ? { ...entity.meta, ...patch } : { ...patch };
    entity.state.lastUpdated = now;
    entity.state.updateCount++;
    entity.lifecycleHistory.push({
      event: 'updated',
      timestamp: now
    });

    this.log('debug', `[ENTITY][UPDATED][id=${id}][updates=${entity.state.updateCount}]`);

    return { success: true, entity };
  }

  /**
   * Deactivate entity (soft delete)
   */
  public deactivateEntity(id: EntityId, reason?: string): EntityRegistrationResult {
    const entity = this.entities.get(id);
    
    if (!entity) {
      const error = {
        code: ENGINE_ERROR_CODES.ENTITY_NOT_FOUND,
        message: `Entity with ID ${id} not found`,
        details: { entityId: id }
      };
      
      return { success: false, error };
    }

    const now = Date.now();
    entity.state.status = 'inactive';
    entity.state.lastUpdated = now;
    entity.lifecycleHistory.push({
      event: 'deactivated',
      timestamp: now,
      reason
    });

    this.log('info', `[ENTITY][DEACTIVATED][id=${id}]${reason ? `[reason=${reason}]` : ''}`);

    return { success: true, entity };
  }

  /**
   * Reactivate entity
   */
  public activateEntity(id: EntityId, reason?: string): EntityRegistrationResult {
    const entity = this.entities.get(id);
    
    if (!entity) {
      const error = {
        code: ENGINE_ERROR_CODES.ENTITY_NOT_FOUND,
        message: `Entity with ID ${id} not found`,
        details: { entityId: id }
      };
      
      return { success: false, error };
    }

    if (entity.state.status === 'deleted') {
      const error = {
        code: ENGINE_ERROR_CODES.ENTITY_NOT_FOUND,
        message: `Cannot activate deleted entity ${id}`,
        details: { entityId: id, status: 'deleted' }
      };
      
      return { success: false, error };
    }

    const now = Date.now();
    entity.state.status = 'active';
    entity.state.lastUpdated = now;
    entity.lifecycleHistory.push({
      event: 'activated',
      timestamp: now,
      reason
    });

    this.log('info', `[ENTITY][ACTIVATED][id=${id}]${reason ? `[reason=${reason}]` : ''}`);

    return { success: true, entity };
  }

  /**
   * Delete entity (hard delete)
   */
  public deleteEntity(id: EntityId, reason?: string): boolean {
    const entity = this.entities.get(id);
    
    if (!entity) {
      this.log('warn', `[ENTITY][DELETE_FAILED][id=${id}][reason=not_found]`);
      return false;
    }

    const now = Date.now();
    entity.state.status = 'deleted';
    entity.state.lastUpdated = now;
    entity.lifecycleHistory.push({
      event: 'deleted',
      timestamp: now,
      reason
    });

    // Remove from indexes
    this.removeFromRoleIndex(entity.role, id);
    this.removeFromKindIndex(entity.kind, id);

    this.log('info', `[ENTITY][DELETED][id=${id}]${reason ? `[reason=${reason}]` : ''}`);

    return true;
  }

  /**
   * Query entities with filters
   */
  public queryEntities(filter?: EntityQueryFilter): ExtendedEntityDescriptor[] {
    let entities = Array.from(this.entities.values())
      .filter(entity => entity.state.status !== 'deleted');

    if (!filter) {
      return entities;
    }

    if (filter.role !== undefined) {
      entities = entities.filter(entity => entity.role === filter.role);
    }

    if (filter.kind !== undefined) {
      entities = entities.filter(entity => entity.kind === filter.kind);
    }

    if (filter.status !== undefined) {
      entities = entities.filter(entity => entity.state.status === filter.status);
    }

    if (filter.createdAfter !== undefined) {
      entities = entities.filter(entity => entity.createdAt >= filter.createdAfter!);
    }

    if (filter.createdBefore !== undefined) {
      entities = entities.filter(entity => entity.createdAt <= filter.createdBefore!);
    }

    if (filter.lastUpdatedAfter !== undefined) {
      entities = entities.filter(entity => entity.state.lastUpdated >= filter.lastUpdatedAfter!);
    }

    if (filter.metaContains !== undefined) {
      entities = entities.filter(entity => {
        if (!entity.meta) return false;
        
        for (const [key, value] of Object.entries(filter.metaContains!)) {
          if (entity.meta[key] !== value) {
            return false;
          }
        }
        return true;
      });
    }

    return entities;
  }

  /**
   * Get entities by role (using index for performance)
   */
  public getEntitiesByRole(role: Role): ExtendedEntityDescriptor[] {
    const entityIds = this.roleIndex.get(role) || new Set();
    return Array.from(entityIds)
      .map(id => this.entities.get(id))
      .filter((entity): entity is ExtendedEntityDescriptor => 
        entity !== undefined && entity.state.status !== 'deleted'
      );
  }

  /**
   * Get entities by kind (using index for performance)
   */
  public getEntitiesByKind(kind: string): ExtendedEntityDescriptor[] {
    const entityIds = this.kindIndex.get(kind) || new Set();
    return Array.from(entityIds)
      .map(id => this.entities.get(id))
      .filter((entity): entity is ExtendedEntityDescriptor => 
        entity !== undefined && entity.state.status !== 'deleted'
      );
  }

  /**
   * Get registry statistics
   */
  public getStatistics(): {
    totalEntities: number;
    activeEntities: number;
    inactiveEntities: number;
    deletedEntities: number;
    entitiesByRole: Record<Role, number>;
    entitiesByKind: Record<string, number>;
    totalRegistrations: number;
  } {
    const entities = Array.from(this.entities.values());
    
    const stats = {
      totalEntities: entities.length,
      activeEntities: 0,
      inactiveEntities: 0,
      deletedEntities: 0,
      entitiesByRole: { HUMAN: 0, SIMULANT: 0, SYSTEM: 0 } as Record<Role, number>,
      entitiesByKind: {} as Record<string, number>,
      totalRegistrations: this.registrationCount
    };

    for (const entity of entities) {
      // Count by status
      switch (entity.state.status) {
        case 'active':
          stats.activeEntities++;
          break;
        case 'inactive':
          stats.inactiveEntities++;
          break;
        case 'deleted':
          stats.deletedEntities++;
          break;
      }

      // Count by role (only non-deleted)
      if (entity.state.status !== 'deleted') {
        stats.entitiesByRole[entity.role]++;
      }

      // Count by kind (only non-deleted)
      if (entity.state.status !== 'deleted') {
        stats.entitiesByKind[entity.kind] = (stats.entitiesByKind[entity.kind] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * Get all entity IDs (excluding deleted)
   */
  public getAllEntityIds(): EntityId[] {
    return Array.from(this.entities.values())
      .filter(entity => entity.state.status !== 'deleted')
      .map(entity => entity.id);
  }

  /**
   * Clear all entities (for testing/reset)
   */
  public clear(): void {
    const entityCount = this.entities.size;
    this.entities.clear();
    this.roleIndex.clear();
    this.kindIndex.clear();
    
    // Reinitialize role index
    this.roleIndex.set('HUMAN', new Set());
    this.roleIndex.set('SIMULANT', new Set());
    this.roleIndex.set('SYSTEM', new Set());

    this.log('info', `[ENTITY][REGISTRY_CLEARED][entities=${entityCount}]`);
  }

  /**
   * Create a snapshot of the registry state
   */
  public createSnapshot(): {
    entities: ExtendedEntityDescriptor[];
    statistics: ReturnType<EntityRegistry['getStatistics']>;
    timestamp: number;
  } {
    return {
      entities: Array.from(this.entities.values()),
      statistics: this.getStatistics(),
      timestamp: Date.now()
    };
  }

  /**
   * Add entity to role index
   */
  private addToRoleIndex(role: Role, entityId: EntityId): void {
    let roleSet = this.roleIndex.get(role);
    if (!roleSet) {
      roleSet = new Set();
      this.roleIndex.set(role, roleSet);
    }
    roleSet.add(entityId);
  }

  /**
   * Remove entity from role index
   */
  private removeFromRoleIndex(role: Role, entityId: EntityId): void {
    const roleSet = this.roleIndex.get(role);
    if (roleSet) {
      roleSet.delete(entityId);
    }
  }

  /**
   * Add entity to kind index
   */
  private addToKindIndex(kind: string, entityId: EntityId): void {
    let kindSet = this.kindIndex.get(kind);
    if (!kindSet) {
      kindSet = new Set();
      this.kindIndex.set(kind, kindSet);
    }
    kindSet.add(entityId);
  }

  /**
   * Remove entity from kind index
   */
  private removeFromKindIndex(kind: string, entityId: EntityId): void {
    const kindSet = this.kindIndex.get(kind);
    if (kindSet) {
      kindSet.delete(entityId);
      
      // Clean up empty index entries
      if (kindSet.size === 0) {
        this.kindIndex.delete(kind);
      }
    }
  }

  /**
   * Internal logging method
   */
  private log(level: LogLevel, message: string): void {
    if (this.shouldLog(level)) {
      const logMethods = {
        silent: () => {},
        error: console.error,
        warn: console.warn,
        info: console.info,
        debug: console.debug
      };
      
      logMethods[level](message);
    }
  }

  /**
   * Check if message should be logged based on current log level
   */
  private shouldLog(messageLevel: LogLevel): boolean {
    const levels = ['silent', 'error', 'warn', 'info', 'debug'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(messageLevel);
    
    return currentLevelIndex >= messageLevelIndex;
  }
}

/**
 * Factory function to create EntityRegistry instance
 */
export function createEntityRegistry(logLevel?: LogLevel): EntityRegistry {
  return new EntityRegistry(logLevel);
}
