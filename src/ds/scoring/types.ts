/**
 * Weighted Scoring & Diff Engine Types
 * Feature ID: F03-ADVANCED-DATA-STRUCTURES - Step 6
 * 
 * REAL-WORLD USE CASES:
 * - Memory retrieval scoring (importance + recency + semantic + layer weights)
 * - AI behavior action prioritization
 * - World state change detection for agent perception
 * - Real-time collaboration conflict detection
 */

import { DSError, DSErrorCode, DSEvent, DS_API_VERSION } from '../types';

// Re-export for scoring modules
export { DS_API_VERSION };

// Core scoring interfaces for REAL decision making
export interface ScoringCriteria {
  name: string;
  weight: number;
  calculate: (item: unknown, context?: unknown) => number;
}

export interface WeightedScoreResult {
  itemId: string;
  totalScore: number;
  breakdown: Array<{
    criterion: string;
    score: number;
    weight: number;
    contribution: number;
  }>;
  item: unknown;
}

export interface ScoringRequest {
  items: Array<{ id: string; data: unknown }>;
  criteria: ScoringCriteria[];
  context?: unknown;
  maxResults?: number;
  threshold?: number;
  stable?: boolean; // For deterministic tie-breaking
}

// REAL MEMORY SYSTEM scoring criteria
export interface MemoryRecordScoring {
  importance: number;      // 0..1 user/agent flagged
  recencyScore: number;    // exp(-Δt / halfLife)
  semanticSimilarity: number; // cosine(vector, query)
  layerWeight: number;     // episodic vs semantic vs procedural
  socialRelevance?: number; // if interacting with specific agent
  spatialProximity?: number; // distance-based relevance
}

// REAL BEHAVIOR SYSTEM action scoring  
export interface ActionScoring {
  feasibility: number;     // Can this action be executed?
  urgency: number;        // How time-sensitive is this?
  impact: number;         // Expected outcome value
  cost: number;           // Resource/energy cost
  safety: number;         // Risk assessment
  alignment: number;      // Matches agent's current goals
}

// Export alias for consistency
export type ActionScoringData = ActionScoring;

// Diff engine for REAL change detection
export interface DiffResult<T = unknown> {
  hasChanges: boolean;
  added: T[];
  removed: T[];
  modified: Array<{
    before: T;
    after: T;
    changes: string[]; // Which fields changed
  }>;
  unchanged: T[];
  summary: {
    totalChanges: number;
    addedCount: number;
    removedCount: number;
    modifiedCount: number;
  };
}

export interface StructuralHash {
  hash: string;          // SHA-256 hash of canonical structure
  algorithm: 'rolling' | 'sha256' | 'combined';
  computed: number;      // Timestamp
  itemCount: number;     // For validation
  byteSize: number;      // Estimated size
}

// REAL WORLD STATE change detection for AI agents
export interface WorldStateDiff {
  agentId: string;
  tick: number;
  previousHash: string;
  currentHash: string;
  blockChanges: {
    added: Array<{ position: { x: number; y: number; z: number }; type: string }>;
    removed: Array<{ position: { x: number; y: number; z: number }; type: string }>;
    modified: Array<{ 
      position: { x: number; y: number; z: number }; 
      oldType: string; 
      newType: string 
    }>;
  };
  simulantChanges: {
    added: string[];     // New simulant IDs
    removed: string[];   // Removed simulant IDs
    moved: Array<{ id: string; oldPos: { x: number; y: number; z: number }; newPos: { x: number; y: number; z: number } }>;
  };
  significance: number;  // 0..1 how important are these changes
}

// Scoring configurations for REAL scenarios
export interface MemoryRetrievalScoring {
  purpose: 'reasoning' | 'dialog' | 'navigation' | 'summary';
  pressureState: 'normal' | 'soft' | 'throttle' | 'exhausted';
  weights: {
    importance: number;
    recency: number;
    semantic: number;
    layer: number;
    social: number;
    spatial: number;
  };
  decayHalfLifeMs: number;
  maxAge?: number;
}

export interface BehaviorActionScoring {
  agentType: 'explorer' | 'builder' | 'social' | 'guard';
  currentGoal: string;
  energyLevel: number;
  socialContext: Array<{ agentId: string; relationship: number }>;
  environmentDanger: number;
  weights: {
    feasibility: number;
    urgency: number;
    impact: number;
    cost: number;
    safety: number;
    alignment: number;
  };
}

// Performance targets for REAL-WORLD usage
export const SCORING_PERFORMANCE_TARGETS = {
  MEMORY_RETRIEVAL_SCORING_MS: 5.0,    // Score 2k memory records
  ACTION_PRIORITIZATION_MS: 2.0,        // Score 50 potential actions
  WORLD_DIFF_COMPUTATION_MS: 10.0,      // Diff 10k world objects
  STRUCTURAL_HASH_MS: 15.0              // Hash complex world state
} as const;

// Error codes for scoring system
export type ScoringErrorCode = 
  | 'DS_SCORING_INVALID_WEIGHTS'
  | 'DS_SCORING_CRITERIA_EMPTY'
  | 'DS_SCORING_DIMENSION_MISMATCH'
  | 'DS_SCORING_INVALID_THRESHOLD'
  | 'DS_DIFF_INVALID_INPUT'
  | 'DS_DIFF_HASH_MISMATCH'
  | 'DS_DIGEST_COMPUTATION_FAILED';

export class ScoringError extends DSError {
  constructor(code: ScoringErrorCode, message: string, context?: unknown) {
    super(code as DSErrorCode, message, context);
    this.name = 'ScoringError';
  }
}

// Event types for observability
export type ScoringEventType = Extract<
  import('../types').DSEventType,
  'ds:diff:computed'
>;

export interface ScoringEvent extends DSEvent {
  type: ScoringEventType;
  payload: {
    operation: string;
    itemCount?: number;
    computeTime?: number;
    hasChanges?: boolean;
    [key: string]: unknown;
  };
}
