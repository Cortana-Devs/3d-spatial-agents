/**
 * PermissionMatrix - Role-Based Access Control System
 * Feature: F02-ENGINE
 * 
 * Handles authorization and capability validation for engine requests.
 * Provides role-capability mapping with audit trail support.
 */

import {
  Role,
  Capability,
  PermissionMatrix as PermissionMatrixType,
  EntityId,
  LogLevel,
  ENGINE_ERROR_CODES
} from './types';

/**
 * Default permission matrix based on the master prompt specifications
 */
const DEFAULT_PERMISSION_MATRIX: PermissionMatrixType = {
  HUMAN: new Set([
    'WORLD_READ',
    'WORLD_MUTATE',
    'ENGINE_INTROSPECT',
    'SCHEDULE_ACTION',
    'ENTITY_REGISTER'
  ]),
  SIMULANT: new Set([
    'WORLD_READ',
    'AGENT_DECIDE',
    'SCHEDULE_ACTION',
    'WORLD_MUTATE', // Note: scoped mutation will be enforced by request validation
    'LLM_REQUEST'
  ]),
  SYSTEM: new Set([
    'WORLD_READ',
    'WORLD_MUTATE',
    'ENTITY_REGISTER',
    'ENTITY_CONTROL',
    'SCHEDULE_ACTION',
    'AGENT_DECIDE',
    'LLM_REQUEST',
    'RATE_STATS_READ',
    'ENGINE_INTROSPECT',
    'STRATEGY_SWITCH',
    'DEBUG_DUMP'
  ])
};

/**
 * Permission check result with audit information
 */
export interface PermissionCheckResult {
  allowed: boolean;
  role: Role;
  capability: Capability;
  reason?: string;
  timestamp: number;
  actorId: EntityId;
}

/**
 * Permission audit entry for logging and debugging
 */
export interface PermissionAuditEntry {
  timestamp: number;
  actorId: EntityId;
  role: Role;
  capability: Capability;
  allowed: boolean;
  reason?: string;
  requestId?: string;
}

export class PermissionMatrix {
  private matrix: PermissionMatrixType;
  private auditLog: PermissionAuditEntry[] = [];
  private readonly maxAuditEntries: number;
  private readonly logLevel: LogLevel;

  constructor(
    customMatrix?: Partial<PermissionMatrixType>,
    maxAuditEntries: number = 1000,
    logLevel: LogLevel = 'info'
  ) {
    // Deep clone the default matrix and merge with custom permissions
    this.matrix = {
      HUMAN: new Set(DEFAULT_PERMISSION_MATRIX.HUMAN),
      SIMULANT: new Set(DEFAULT_PERMISSION_MATRIX.SIMULANT),
      SYSTEM: new Set(DEFAULT_PERMISSION_MATRIX.SYSTEM)
    };

    if (customMatrix) {
      this.mergePermissions(customMatrix);
    }

    this.maxAuditEntries = maxAuditEntries;
    this.logLevel = logLevel;

    this.log('info', `[PERM][INIT][audit_limit=${maxAuditEntries}]`);
  }

  /**
   * Check if a role has a specific capability
   */
  public checkPermission(
    actorId: EntityId,
    role: Role,
    capability: Capability,
    requestId?: string
  ): PermissionCheckResult {
    const timestamp = Date.now();
    const roleCapabilities = this.matrix[role];
    const allowed = roleCapabilities?.has(capability) ?? false;

    const result: PermissionCheckResult = {
      allowed,
      role,
      capability,
      timestamp,
      actorId,
      reason: allowed ? undefined : `Role ${role} lacks capability ${capability}`
    };

    // Add to audit log
    this.addAuditEntry({
      timestamp,
      actorId,
      role,
      capability,
      allowed,
      reason: result.reason,
      requestId
    });

    // Log the permission check
    const status = allowed ? 'ALLOW' : 'DENY';
    this.log(
      allowed ? 'debug' : 'warn',
      `[PERM][${status}][actor=${actorId}][role=${role}][capability=${capability}]${requestId ? `[req=${requestId}]` : ''}`
    );

    return result;
  }

  /**
   * Check multiple capabilities at once
   */
  public checkMultiplePermissions(
    actorId: EntityId,
    role: Role,
    capabilities: Capability[],
    requestId?: string
  ): PermissionCheckResult[] {
    return capabilities.map(capability => 
      this.checkPermission(actorId, role, capability, requestId)
    );
  }

  /**
   * Check if role has ALL specified capabilities
   */
  public hasAllCapabilities(
    actorId: EntityId,
    role: Role,
    capabilities: Capability[],
    requestId?: string
  ): boolean {
    const results = this.checkMultiplePermissions(actorId, role, capabilities, requestId);
    return results.every(result => result.allowed);
  }

  /**
   * Check if role has ANY of the specified capabilities
   */
  public hasAnyCapability(
    actorId: EntityId,
    role: Role,
    capabilities: Capability[],
    requestId?: string
  ): boolean {
    const results = this.checkMultiplePermissions(actorId, role, capabilities, requestId);
    return results.some(result => result.allowed);
  }

  /**
   * Get all capabilities for a role
   */
  public getRoleCapabilities(role: Role): Set<Capability> {
    return new Set(this.matrix[role]);
  }

  /**
   * Grant a capability to a role
   */
  public grantCapability(role: Role, capability: Capability): void {
    this.matrix[role].add(capability);
    this.log('info', `[PERM][GRANT][role=${role}][capability=${capability}]`);
  }

  /**
   * Revoke a capability from a role
   */
  public revokeCapability(role: Role, capability: Capability): void {
    this.matrix[role].delete(capability);
    this.log('info', `[PERM][REVOKE][role=${role}][capability=${capability}]`);
  }

  /**
   * Get recent permission denials for debugging
   */
  public getRecentDenials(count: number = 10): PermissionAuditEntry[] {
    return this.auditLog
      .filter(entry => !entry.allowed)
      .slice(-count)
      .reverse();
  }

  /**
   * Get audit history for a specific actor
   */
  public getActorAuditHistory(actorId: EntityId, count: number = 50): PermissionAuditEntry[] {
    return this.auditLog
      .filter(entry => entry.actorId === actorId)
      .slice(-count)
      .reverse();
  }

  /**
   * Get permission statistics
   */
  public getPermissionStats(): {
    totalChecks: number;
    denials: number;
    approvals: number;
    denialRate: number;
    topDeniedCapabilities: Array<{ capability: Capability; count: number }>;
    activityByRole: Record<Role, number>;
  } {
    const totalChecks = this.auditLog.length;
    const denials = this.auditLog.filter(entry => !entry.allowed).length;
    const approvals = totalChecks - denials;
    const denialRate = totalChecks > 0 ? denials / totalChecks : 0;

    // Count denied capabilities
    const deniedCapabilities = new Map<Capability, number>();
    const roleActivity = { HUMAN: 0, SIMULANT: 0, SYSTEM: 0 } as Record<Role, number>;

    for (const entry of this.auditLog) {
      roleActivity[entry.role]++;
      
      if (!entry.allowed) {
        deniedCapabilities.set(
          entry.capability,
          (deniedCapabilities.get(entry.capability) || 0) + 1
        );
      }
    }

    const topDeniedCapabilities = Array.from(deniedCapabilities.entries())
      .map(([capability, count]) => ({ capability, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalChecks,
      denials,
      approvals,
      denialRate,
      topDeniedCapabilities,
      activityByRole: roleActivity
    };
  }

  /**
   * Create a security report with recent denials and statistics
   */
  public generateSecurityReport(): {
    summary: ReturnType<PermissionMatrix['getPermissionStats']>;
    recentDenials: PermissionAuditEntry[];
    permissionMatrix: Record<Role, Capability[]>;
    recommendedActions: string[];
  } {
    const summary = this.getPermissionStats();
    const recentDenials = this.getRecentDenials(20);
    
    const permissionMatrix: Record<Role, Capability[]> = {
      HUMAN: Array.from(this.matrix.HUMAN),
      SIMULANT: Array.from(this.matrix.SIMULANT),
      SYSTEM: Array.from(this.matrix.SYSTEM)
    };

    const recommendedActions: string[] = [];
    
    // Generate recommendations based on patterns
    if (summary.denialRate > 0.1) {
      recommendedActions.push(`High denial rate (${(summary.denialRate * 100).toFixed(1)}%) - review permission matrix`);
    }

    if (summary.topDeniedCapabilities.length > 0) {
      const topDenied = summary.topDeniedCapabilities[0];
      recommendedActions.push(`Most denied capability: ${topDenied.capability} (${topDenied.count} times) - consider role adjustments`);
    }

    return {
      summary,
      recentDenials,
      permissionMatrix,
      recommendedActions
    };
  }

  /**
   * Reset permission matrix to defaults
   */
  public resetToDefaults(): void {
    this.matrix = {
      HUMAN: new Set(DEFAULT_PERMISSION_MATRIX.HUMAN),
      SIMULANT: new Set(DEFAULT_PERMISSION_MATRIX.SIMULANT),
      SYSTEM: new Set(DEFAULT_PERMISSION_MATRIX.SYSTEM)
    };
    this.log('info', '[PERM][RESET_DEFAULTS]');
  }

  /**
   * Clear audit log
   */
  public clearAuditLog(): void {
    const entriesCleared = this.auditLog.length;
    this.auditLog = [];
    this.log('info', `[PERM][AUDIT_CLEAR][entries=${entriesCleared}]`);
  }

  /**
   * Merge custom permissions into the matrix
   */
  private mergePermissions(customMatrix: Partial<PermissionMatrixType>): void {
    for (const [role, capabilities] of Object.entries(customMatrix)) {
      if (capabilities && this.matrix[role as Role]) {
        for (const capability of capabilities) {
          this.matrix[role as Role].add(capability);
        }
      }
    }
  }

  /**
   * Add entry to audit log with rotation
   */
  private addAuditEntry(entry: PermissionAuditEntry): void {
    this.auditLog.push(entry);
    
    // Rotate audit log if it exceeds max size
    if (this.auditLog.length > this.maxAuditEntries) {
      this.auditLog = this.auditLog.slice(-this.maxAuditEntries);
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
 * Factory function to create PermissionMatrix instance
 */
export function createPermissionMatrix(
  customMatrix?: Partial<PermissionMatrixType>,
  maxAuditEntries?: number,
  logLevel?: LogLevel
): PermissionMatrix {
  return new PermissionMatrix(customMatrix, maxAuditEntries, logLevel);
}
