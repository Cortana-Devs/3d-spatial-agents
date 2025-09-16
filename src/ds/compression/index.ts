/**
 * Compression & Bloom Filter Module - Main Export
 * Feature ID: F03-ADVANCED-DATA-STRUCTURES - Step 7
 * 
 * Production-ready compression and membership testing for real-world scenarios:
 * 
 * EVENT LOG COMPRESSION:
 * - Massive GPU telemetry compression (your system generates tons)
 * - Performance monitoring stream optimization
 * - Debug log compression for efficient storage
 * - Delta encoding + tag dictionaries + RLE
 * 
 * BLOOM FILTER DEDUPLICATION:
 * - Replace expensive Set.has() in spatial queries
 * - Event deduplication in UI monitoring
 * - "Seen before" checks in block placement
 * - Memory-efficient duplicate detection
 */

// Core types and interfaces
export * from './types';

// Event log compression system
export { 
  EventLogCompressor,
  EventStreamAggregator,
  createEventLogCompressor,
  createEventStreamAggregator
} from './EventLogCompressor';

// Multi-level bloom filter system
export { 
  MultiLevelBloomFilter,
  FastDeduplicator,
  createMultiLevelBloomFilter,
  createFastDeduplicator,
  BloomFilterPresets,
  calculateBloomFilterParams,
  estimateFalsePositiveRate
} from './MultiLevelBloomFilter';

// Re-export key types for convenience
export type {
  CompressibleEvent,
  CompressionConfig,
  CompressedEventLog,
  DecompressionResult,
  BloomFilterConfig,
  MultiLevelBloomConfig,
  BloomFilterStats,
  MultiLevelBloomStats,
  GPUTelemetryEvent,
  BlockOperationEvent,
  AgentBehaviorEvent,
  PerformanceMetricEvent
} from './types';

// Performance targets and version info
export const COMPRESSION_VERSION = '1.0.0';
export const COMPRESSION_STEP_COMPLETED = 7;
