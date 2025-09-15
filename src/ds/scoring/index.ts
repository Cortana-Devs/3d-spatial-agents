/**
 * Scoring & Diff Engine Module - Main Export
 * Feature ID: F03-ADVANCED-DATA-STRUCTURES - Step 6
 * 
 * Production-ready scoring and change detection for real-world scenarios:
 * 
 * MEMORY SYSTEM INTEGRATION:
 * - Multi-criteria memory retrieval scoring
 * - Importance + recency + semantic + layer weights
 * - Pressure-aware score adjustments
 * 
 * BEHAVIOR SYSTEM INTEGRATION:
 * - AI action prioritization and selection
 * - Agent-type specific weight adjustments
 * - Goal-aligned decision making
 * 
 * WORLD STATE MANAGEMENT:
 * - Efficient change detection for AI perception
 * - Structural hashing for state validation
 * - Real-time collaboration conflict detection
 */

// Core types and interfaces
export * from './types';

// Weighted scoring system
export { 
  WeightedScorer, 
  createWeightedScorer, 
  ScoringPresets,
  quickScore 
} from './WeightedScorer';

// Diff and change detection engine
export { 
  DiffEngine, 
  createDiffEngine,
  hasChanges,
  extractChangesOnly,
  computeWorldStateHash
} from './DiffEngine';

// Re-export key types for convenience
export type {
  ScoringCriteria,
  WeightedScoreResult,
  ScoringRequest,
  DiffResult,
  StructuralHash,
  WorldStateDiff,
  MemoryRetrievalScoring,
  BehaviorActionScoring
} from './types';

// Performance targets and version info
export const SCORING_VERSION = '1.0.0';
export const SCORING_STEP_COMPLETED = 6;
