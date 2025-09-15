/**
 * Advanced Data Structures - Core Types
 * Feature ID: F03-ADVANCED-DATA-STRUCTURES
 * Version: 1.0.0
 * 
 * Foundational type definitions for high-performance data structures
 */

// API Version for interface compatibility tracking
export const DS_API_VERSION = '1.0.0' as const;

// Error taxonomy for data structures
export type DSErrorCode = 
  | 'DS_INVALID_CAPACITY'
  | 'DS_INDEX_OUT_OF_RANGE'
  | 'DS_CONTAINER_DUPLICATE_ID'
  | 'DS_CONTAINER_ID_NOT_FOUND'
  | 'DS_OVER_CAPACITY'
  | 'DS_VECTOR_DIM_MISMATCH'
  | 'DS_BUCKET_UNINITIALIZED'
  | 'DS_SCHED_DUPLICATE_ID'
  | 'DS_SCHED_NOT_FOUND'
  | 'DS_HASH_INPUT_INVALID'
  | 'DS_POOL_EXHAUSTED'
  | 'DS_BLOOM_CONFIG_INVALID'
  | 'DS_TIMEWHEEL_DRIFT'
  | 'DS_SPATIAL_INVALID_AABB'
  | 'DS_STRATEGY_UNSUPPORTED'
  | 'DS_INVARIANT_VIOLATION'
  | 'DS_DIFF_UNCOMPUTABLE';

// Data structures error class
export class DSError extends Error {
  constructor(
    public readonly code: DSErrorCode,
    message: string,
    public readonly context?: unknown
  ) {
    super(`[${code}] ${message}`);
    this.name = 'DSError';
  }
}

// Time wheel scheduler interfaces
export interface TimeWheelConfig {
  slots: number;
  slotDurationMs: number;
  maxDriftMs?: number;
  /**
   * Optional sampling rate for 'ds:scheduler:due' event emissions (0..1).
   * Defaults to 1.0 (emit all). Use to reduce observability overhead under load.
   */
  eventSampleRate?: number;
}

export interface TimeWheelScheduler {
  readonly apiVersion: typeof DS_API_VERSION;
  schedule(id: string, delayMs: number, cb: () => void): void;
  cancel(id: string): boolean;
  tick(nowMs: number): void;
  debug(): { scheduled: number; wheelTime: number; slots: number };
}

// Token bucket interfaces  
export interface TokenBucket {
  capacity: number;
  tokens: number;
  refillRatePerSec: number;
  lastRefillMs: number;
}

export interface TokenBucketMap {
  readonly apiVersion: typeof DS_API_VERSION;
  approve(key: string, cost?: number, nowMs?: number): boolean;
  snapshot(): Record<string, { tokens: number; capacity: number }>;
  refillAll(nowMs: number): void;
  debug(): { keys: number; avgFillRatio: number; saturated: string[] };
}

// Event taxonomy for observability
export type DSEventType = 
  | 'ds:ring:evict'
  | 'ds:priority:resize' 
  | 'ds:scheduler:due'
  | 'ds:bucket:refill'
  | 'ds:bucket:approve'
  | 'ds:bucket:deny'
  | 'ds:spatial:insert'
  | 'ds:spatial:update'
  | 'ds:spatial:remove'
  | 'ds:spatial:query'
  | 'ds:spatial:rebuild'
  | 'ds:spatial:collision'
  | 'ds:vector:add'
  | 'ds:vector:search'
  | 'ds:log:compressed'
  | 'ds:pool:expand'
  | 'ds:invariant:fail'
  | 'ds:diff:computed';

export interface DSEvent {
  type: DSEventType;
  timestamp: number;
  payload: unknown;
}

// Performance budget constants
export const DS_PERFORMANCE_TARGETS = {
  TOKEN_BUCKET_APPROVE_MS: 0.002,
  TIME_WHEEL_TICK_MS: 0.3,
  METRICS_SNAPSHOT_MS: 3.0
} as const;
