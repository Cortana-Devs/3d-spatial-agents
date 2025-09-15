/**
 * Central Engine System - Main Export Index
 * Feature: F02-ENGINE
 * Version: 1.0
 * 
 * Centralized export of all engine components and utilities.
 * Provides the main API surface for the Engine system.
 */

// Core Engine
export { Engine, createEngine, getActiveEngine } from './Engine';

// Core Types and Interfaces
export * from './types';

// Event System
export { EventBus, createEventBus } from './EventBus';

// Permission System
export { PermissionMatrix, createPermissionMatrix } from './PermissionMatrix';
export type { PermissionCheckResult, PermissionAuditEntry } from './PermissionMatrix';

// Entity Management
export { EntityRegistry, createEntityRegistry } from './EntityRegistry';
export type { 
  EntityLifecycleEvent,
  EntityState,
  ExtendedEntityDescriptor,
  EntityQueryFilter,
  EntityRegistrationResult 
} from './EntityRegistry';

// Action Scheduling
export { ActionScheduler, createActionScheduler } from './ActionScheduler';
export type { ActionExecutionResult, ActionExecutor } from './ActionScheduler';

// Request Processing
export { RequestRouter, createRequestRouter } from './RequestRouter';
export type { 
  RequestHandler,
  RequestValidationResult,
  RequestProcessingResult 
} from './RequestRouter';

// Error Handling
export { ErrorDomain, createErrorDomain } from './ErrorDomain';

// Metrics Collection
export { MetricsCollector, createMetricsCollector } from './MetricsCollector';

// Debug Introspection
export { DebugIntrospection, createDebugIntrospection } from './DebugIntrospection';

// Test Harness
export { TestHarness, createTestHarness, runQuickTest } from './TestHarness';
export type {
  ErrorSeverity,
  ErrorCategory,
  RecoveryStrategy,
  EnhancedEngineError,
  ErrorRecoveryResult,
  ErrorStatistics,
  ErrorPattern
} from './ErrorDomain';

// Utility Functions
export const EngineUtils = {
  /**
   * Generate a unique request ID
   */
  generateRequestId: (): string => {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Generate a unique entity ID
   */
  generateEntityId: (prefix?: string): string => {
    const base = `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return prefix ? `${prefix}_${base}` : base;
  },

  /**
   * Generate a unique event ID
   */
  generateEventId: (): string => {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Validate engine configuration
   */
  validateConfig: (config: Partial<import('./types').EngineConfig>): boolean => {
    if (!config.id || typeof config.id !== 'string') {
      throw new Error('Engine ID is required and must be a string');
    }

    if (config.maxEventDepth !== undefined && (config.maxEventDepth < 1 || config.maxEventDepth > 1000)) {
      throw new Error('maxEventDepth must be between 1 and 1000');
    }

    if (config.tickIntervalMs !== undefined && config.tickIntervalMs < 1) {
      throw new Error('tickIntervalMs must be positive');
    }

    const validLogLevels = ['silent', 'error', 'warn', 'info', 'debug'];
    if (config.logLevel && !validLogLevels.includes(config.logLevel)) {
      throw new Error(`logLevel must be one of: ${validLogLevels.join(', ')}`);
    }

    return true;
  },

  /**
   * Create a standardized request object
   */
  createRequest: <T extends import('./types').EngineRequest>(
    type: T['type'],
    actorId: string,
    role: import('./types').Role,
    payload: T['payload'],
    requestId?: string
  ): T => {
    return {
      id: requestId || EngineUtils.generateRequestId(),
      actorId,
      role,
      type,
      payload,
      timestamp: Date.now()
    } as T;
  },

  /**
   * Check if an error is recoverable
   */
  isRecoverableError: (error: import('./ErrorDomain').EnhancedEngineError): boolean => {
    return error.recoverable && !!error.suggestedRecovery && error.suggestedRecovery.length > 0;
  },

  /**
   * Get error severity rank (higher number = more severe)
   */
  getErrorSeverityRank: (severity: import('./ErrorDomain').ErrorSeverity): number => {
    const ranks = { low: 1, medium: 2, high: 3, critical: 4 };
    return ranks[severity];
  },

  /**
   * Format engine metrics for display
   */
  formatMetrics: (metrics: import('./types').EngineMetrics): Record<string, string> => {
    return {
      'Total Requests': metrics.requestsTotal.toLocaleString(),
      'Failed Requests': metrics.requestsFailed.toLocaleString(),
      'Success Rate': `${((1 - (metrics.requestsFailed / metrics.requestsTotal)) * 100).toFixed(1)}%`,
      'Average Latency': `${metrics.averageLatencyMs.toFixed(2)}ms`,
      'Active Entities': metrics.activeEntities.toLocaleString(),
      'Scheduled Actions': metrics.scheduledActions.toLocaleString(),
      'Last Tick Duration': `${metrics.lastTickDurationMs.toFixed(2)}ms`,
      'Events Emitted': metrics.eventsEmitted.toLocaleString(),
      'Actions Executed': metrics.actionsExecuted.toLocaleString()
    };
  }
};

// Re-export commonly used constants
export { ENGINE_ERROR_CODES } from './types';

/**
 * Engine System Information
 */
export const EngineInfo = {
  version: '1.0.0',
  feature: 'F02-ENGINE',
  description: 'Central Engine (Authority & Mediation Layer)',
  author: 'Engine System',
  capabilities: [
    'Request Processing & Routing',
    'Entity Management & Lifecycle',
    'Action Scheduling & Execution',
    'Event-driven Architecture',
    'Permission-based Access Control',
    'Metrics Collection & Monitoring',
    'Error Handling & Recovery',
    'Debug Introspection',
    'Deterministic Simulation'
  ] as const,
  
  /**
   * Get system requirements
   */
  getSystemRequirements: () => ({
    node: '>=16.0.0',
    typescript: '>=4.5.0',
    memory: '>=128MB',
    dependencies: {
      required: [],
      optional: []
    }
  }),

  /**
   * Get feature compatibility matrix
   */
  getCompatibilityMatrix: () => ({
    'React Integration': 'supported',
    'Vue Integration': 'supported',
    'Node.js Backend': 'supported',
    'Browser Environment': 'supported',
    'Web Workers': 'supported',
    'Service Workers': 'supported'
  })
};

/**
 * Quick start factory for common engine configurations
 */
export const EngineFactory = {
  /**
   * Create a development engine with debug logging
   */
  createDevelopmentEngine: async (id: string) => {
    const { createEngine: engineFactory } = await import('./Engine');
    return engineFactory({
      id: `dev_${id}`,
      logLevel: 'debug',
      tickIntervalMs: 100,
      maxEventDepth: 64
    });
  },

  /**
   * Create a production engine with optimized settings
   */
  createProductionEngine: async (id: string) => {
    const { createEngine: engineFactory } = await import('./Engine');
    return engineFactory({
      id: `prod_${id}`,
      logLevel: 'warn',
      tickIntervalMs: 50,
      maxEventDepth: 32
    });
  },

  /**
   * Create a test engine with deterministic settings
   */
  createTestEngine: async (id: string, seed?: string) => {
    const { createEngine: engineFactory } = await import('./Engine');
    return engineFactory({
      id: `test_${id}`,
      logLevel: 'silent',
      tickIntervalMs: 0, // No automatic ticking in tests
      maxEventDepth: 16,
      deterministicSeed: seed || 'test_seed'
    });
  },

  /**
   * Create a high-performance engine for production workloads
   */
  createHighPerformanceEngine: async (id: string) => {
    const { createEngine: engineFactory } = await import('./Engine');
    return engineFactory({
      id: `hp_${id}`,
      logLevel: 'error',
      tickIntervalMs: 16, // ~60 FPS
      maxEventDepth: 16
    });
  }
};

/**
 * Development utilities for debugging and monitoring
 */
export const EngineDevUtils = {
  /**
   * Create a monitoring dashboard for an engine instance
   */
  createMonitoringSnapshot: (engine: any) => {
    const snapshot = engine.snapshot();
    const metrics = engine.getMetrics();
    const state = engine.getState();
    const config = engine.getConfig();

    return {
      timestamp: Date.now(),
      engine: {
        id: config.id,
        state,
        uptime: Date.now() - (snapshot.now - (snapshot.now % 1000)), // Rough uptime calculation
      },
      performance: {
        ...metrics,
        formattedMetrics: EngineUtils.formatMetrics(metrics)
      },
      resources: {
        entities: snapshot.entityCount,
        scheduledActions: snapshot.scheduled.total,
        nextActionIn: snapshot.scheduled.nextRunInMs
      },
      health: {
        errorRate: metrics.requestsFailed / Math.max(metrics.requestsTotal, 1),
        averageLatency: metrics.averageLatencyMs,
        isHealthy: metrics.averageLatencyMs < 100 && (metrics.requestsFailed / Math.max(metrics.requestsTotal, 1)) < 0.1
      }
    };
  },

  /**
   * Validate engine health
   */
  validateEngineHealth: (engine: any): { healthy: boolean; issues: string[] } => {
    const metrics = engine.getMetrics();
    const state = engine.getState();
    const issues: string[] = [];

    if (state !== 'running') {
      issues.push(`Engine is not running (state: ${state})`);
    }

    if (metrics.averageLatencyMs > 100) {
      issues.push(`High average latency: ${metrics.averageLatencyMs.toFixed(2)}ms`);
    }

    const errorRate = metrics.requestsFailed / Math.max(metrics.requestsTotal, 1);
    if (errorRate > 0.1) {
      issues.push(`High error rate: ${(errorRate * 100).toFixed(1)}%`);
    }

    if (metrics.lastTickDurationMs > 50) {
      issues.push(`Slow tick execution: ${metrics.lastTickDurationMs.toFixed(2)}ms`);
    }

    return {
      healthy: issues.length === 0,
      issues
    };
  }
};

// Default export: Main Engine class
export { Engine as default } from './Engine';
