/**
 * Event Compression & Bloom Filter Types
 * Feature ID: F03-ADVANCED-DATA-STRUCTURES - Step 7
 * 
 * REAL-WORLD USE CASES:
 * - Compress massive GPU/performance telemetry logs for storage
 * - Bloom filters for "seen before" checks in spatial queries
 * - Event deduplication in UI monitoring streams
 * - Memory-efficient debugging data collection
 */

import { DSError, DSErrorCode, DSEvent, DS_API_VERSION } from '../types';

// Re-export for compression modules
export { DS_API_VERSION };

// Event log compression for REAL telemetry data
export interface CompressibleEvent {
  id?: string;
  timestamp: number;
  tag: string;           // e.g. 'GPU', 'PERF', 'BLOCK', 'AGENT'
  level: 'info' | 'warn' | 'error' | 'debug';
  payload: Record<string, unknown>;
  text?: string;
}

export interface CompressionConfig {
  enableDeltaCompression: boolean;    // Compress timestamps as deltas
  enableTagDictionary: boolean;       // Map frequent tags to indices
  enablePayloadCompression: boolean;  // Compress common payload patterns
  enableRunLengthEncoding: boolean;   // RLE for repeated events
  maxDictionarySize: number;          // Limit tag dictionary growth
  minCompressionRatio: number;        // Only compress if ratio achieved
}

export interface CompressedEventLog {
  version: string;
  compressionAlgorithm: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  eventCount: number;
  timeRange: { start: number; end: number };
  tagDictionary?: string[];           // Index -> tag mapping
  compressedData: string;             // Base64 encoded compressed data
  metadata: {
    deltasUsed: boolean;
    dictionaryUsed: boolean;
    rleUsed: boolean;
    compressionTime: number;
  };
}

export interface DecompressionResult {
  events: CompressibleEvent[];
  decompressionTime: number;
  originalSize: number;
  integrity: boolean;                 // Verification passed
}

// Bloom filter for REAL deduplication scenarios
export interface BloomFilterConfig {
  expectedItems: number;              // Expected number of items to insert
  falsePositiveRate: number;          // Target false positive rate (e.g., 0.01 = 1%)
  hashFunctions?: number;             // Number of hash functions (auto-calculated if not provided)
  bitArraySize?: number;              // Size of bit array (auto-calculated if not provided)
}

export interface MultiLevelBloomConfig {
  levels: BloomFilterConfig[];        // Configuration for each level
  autoPromote: boolean;               // Automatically promote items to higher levels
  promotionThreshold: number;         // How many hits before promotion
  maxMemoryBytes: number;             // Memory budget for all levels
}

export interface BloomFilterStats {
  itemCount: number;
  bitArraySize: number;
  hashFunctions: number;
  falsePositiveRate: number;
  memoryUsage: number;
  insertions: number;
  queries: number;
  falsePositives: number;             // Estimated
}

export interface MultiLevelBloomStats {
  totalLevels: number;
  totalItems: number;
  totalMemoryUsage: number;
  levelStats: BloomFilterStats[];
  promotions: number;
  overallFalsePositiveRate: number;
}

// REAL-WORLD event types for your system
export interface GPUTelemetryEvent extends CompressibleEvent {
  tag: 'GPU';
  payload: {
    totalBlocks: number;
    visibleBlocks: number;
    culledBlocks: number;
    drawCalls: number;
    frameTime: number;
    memoryUsage: number;
    cameraPosition: { x: number; y: number; z: number };
  };
}

export interface BlockOperationEvent extends CompressibleEvent {
  tag: 'BLOCK';
  payload: {
    operation: 'place' | 'remove' | 'update';
    position: { x: number; y: number; z: number };
    blockType: string;
    userId: string;
    success: boolean;
  };
}

export interface AgentBehaviorEvent extends CompressibleEvent {
  tag: 'AGENT';
  payload: {
    agentId: string;
    action: string;
    position: { x: number; y: number; z: number };
    energy: number;
    goal: string;
    duration: number;
  };
}

export interface PerformanceMetricEvent extends CompressibleEvent {
  tag: 'PERF';
  payload: {
    frameRate: number;
    frameTime: number;
    memoryUsage: number;
    cpuUsage: number;
    activeModules: number;
    renderDistance: number;
  };
}

// Error codes for compression system
export type CompressionErrorCode = 
  | 'DS_COMPRESSION_INVALID_CONFIG'
  | 'DS_COMPRESSION_FAILED'
  | 'DS_COMPRESSION_RATIO_TOO_LOW'
  | 'DS_DECOMPRESSION_FAILED'
  | 'DS_BLOOM_CAPACITY_EXCEEDED'
  | 'DS_BLOOM_INVALID_RATE'
  | 'DS_BLOOM_MEMORY_EXCEEDED';

export class CompressionError extends DSError {
  constructor(code: CompressionErrorCode, message: string, context?: unknown) {
    super(code as DSErrorCode, message, context);
    this.name = 'CompressionError';
  }
}

// Event types for observability
export type CompressionEventType = Extract<
  import('../types').DSEventType,
  'ds:log:compressed'
>;

export interface CompressionEvent extends DSEvent {
  type: CompressionEventType;
  payload: {
    operation: string;
    originalBytes: number;
    compressedBytes: number;
    compressionRatio: number;
    compressionTime: number;
    eventCount?: number;
    [key: string]: unknown;
  };
}

// Performance targets for REAL-WORLD usage
export const COMPRESSION_PERFORMANCE_TARGETS = {
  EVENT_COMPRESSION_MS: 50.0,         // Compress 1000 events
  DECOMPRESSION_MS: 25.0,             // Decompress 1000 events
  BLOOM_INSERT_MS: 0.001,             // Single bloom filter insert
  BLOOM_QUERY_MS: 0.001,              // Single bloom filter query
  MIN_COMPRESSION_RATIO: 0.55,        // At least 55% compression
  MAX_BLOOM_FALSE_POSITIVE: 0.01      // 1% false positive rate
} as const;
