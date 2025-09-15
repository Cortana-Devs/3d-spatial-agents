/**
 * WeightedScorer - Multi-Criteria Decision Making Engine
 * Feature ID: F03-ADVANCED-DATA-STRUCTURES - Step 6
 * 
 * REAL-WORLD APPLICATIONS:
 * - Memory retrieval: importance + recency + semantic + layer weights
 * - AI action prioritization: feasibility + urgency + impact + safety
 * - Resource allocation: cost + benefit + availability + priority
 * 
 * Provides deterministic, configurable scoring for complex decisions.
 */

import {
  ScoringCriteria,
  WeightedScoreResult,
  ScoringRequest,
  MemoryRecordScoring,
  BehaviorActionScoring,
  MemoryRetrievalScoring,
  ActionScoringData,
  ScoringError,
  ScoringEvent,
  DS_API_VERSION,
  SCORING_PERFORMANCE_TARGETS
} from './types';

export class WeightedScorer {
  public readonly apiVersion = DS_API_VERSION;
  
  private eventEmitter?: (event: ScoringEvent) => void;
  private scoringStats = {
    totalScoringOperations: 0,
    totalItemsScored: 0,
    totalComputeTime: 0,
    maxComputeTime: 0
  };

  constructor(eventEmitter?: (event: ScoringEvent) => void) {
    this.eventEmitter = eventEmitter;
  }

  /**
   * Score items using multiple weighted criteria
   * REAL USE: Memory retrieval, action prioritization, resource allocation
   */
  public score(request: ScoringRequest): WeightedScoreResult[] {
    const startTime = performance.now();

    // Validate input
    if (request.criteria.length === 0) {
      throw new ScoringError('DS_SCORING_CRITERIA_EMPTY', 'At least one scoring criterion required');
    }

    // Normalize weights to sum to 1.0
    const totalWeight = request.criteria.reduce((sum, c) => sum + Math.abs(c.weight), 0);
    if (totalWeight === 0) {
      throw new ScoringError('DS_SCORING_INVALID_WEIGHTS', 'All weights cannot be zero');
    }

    const normalizedCriteria = request.criteria.map(c => ({
      ...c,
      weight: c.weight / totalWeight
    }));

    // Score each item
    const results: WeightedScoreResult[] = [];

    for (const item of request.items) {
      const breakdown: WeightedScoreResult['breakdown'] = [];
      let totalScore = 0;

      // Apply each criterion
      for (const criterion of normalizedCriteria) {
        try {
          const rawScore = criterion.calculate(item.data, request.context);
          const contribution = rawScore * criterion.weight;
          
          breakdown.push({
            criterion: criterion.name,
            score: rawScore,
            weight: criterion.weight,
            contribution
          });

          totalScore += contribution;
        } catch (error) {
          console.warn(`Scoring error for criterion ${criterion.name}:`, error);
          // Continue with 0 contribution for this criterion
          breakdown.push({
            criterion: criterion.name,
            score: 0,
            weight: criterion.weight,
            contribution: 0
          });
        }
      }

      // Apply threshold filter
      if (!request.threshold || totalScore >= request.threshold) {
        results.push({
          itemId: item.id,
          totalScore,
          breakdown,
          item: item.data
        });
      }
    }

    // Sort by score (descending) with stable tie-breaking
    results.sort((a, b) => {
      if (a.totalScore !== b.totalScore) {
        return b.totalScore - a.totalScore;
      }
      // Stable tie-breaking by ID
      return request.stable ? a.itemId.localeCompare(b.itemId) : 0;
    });

    // Apply max results limit
    if (request.maxResults && results.length > request.maxResults) {
      results.length = request.maxResults;
    }

    // Update statistics
    const computeTime = performance.now() - startTime;
    this.scoringStats.totalScoringOperations++;
    this.scoringStats.totalItemsScored += request.items.length;
    this.scoringStats.totalComputeTime += computeTime;
    this.scoringStats.maxComputeTime = Math.max(this.scoringStats.maxComputeTime, computeTime);

    // Emit performance event
    this.eventEmitter?.({
      type: 'ds:diff:computed', // Reusing existing event type
      timestamp: Date.now(),
      payload: {
        operation: 'weighted_scoring',
        itemCount: request.items.length,
        computeTime,
        resultCount: results.length
      }
    });

    return results;
  }

  /**
   * REAL USE CASE: Memory retrieval scoring for AI agents
   * Combines importance, recency, semantic similarity, and layer weights
   */
  public scoreMemoryRecords(
    records: Array<{ id: string; record: MemoryRecordScoring }>,
    config: MemoryRetrievalScoring,
    queryVector?: number[]
  ): WeightedScoreResult[] {
    const criteria: ScoringCriteria[] = [
      {
        name: 'importance',
        weight: config.weights.importance,
        calculate: (item: any) => item.record.importance
      },
      {
        name: 'recency',
        weight: config.weights.recency,
        calculate: (item: any) => {
          const ageMs = Date.now() - (item.record.recencyScore * config.decayHalfLifeMs);
          return Math.exp(-ageMs / config.decayHalfLifeMs);
        }
      },
      {
        name: 'layer',
        weight: config.weights.layer,
        calculate: (item: any) => item.record.layerWeight
      }
    ];

    // Add semantic similarity if query vector provided
    if (queryVector && config.weights.semantic > 0) {
      criteria.push({
        name: 'semantic',
        weight: config.weights.semantic,
        calculate: (item: any) => item.record.semanticSimilarity
      });
    }

    // Add social relevance if configured
    if (config.weights.social > 0) {
      criteria.push({
        name: 'social',
        weight: config.weights.social,
        calculate: (item: any) => item.record.socialRelevance ?? 0
      });
    }

    // Add spatial proximity if configured
    if (config.weights.spatial > 0) {
      criteria.push({
        name: 'spatial',
        weight: config.weights.spatial,
        calculate: (item: any) => item.record.spatialProximity ?? 0
      });
    }

    return this.score({
      items: records.map(r => ({ id: r.id, data: r })),
      criteria,
      context: { purpose: config.purpose, pressure: config.pressureState },
      stable: true // Memory retrieval needs deterministic ordering
    });
  }

  /**
   * REAL USE CASE: AI action prioritization for behavior system
   * Scores potential actions for autonomous agents
   */
  public scoreActions(
    actions: Array<{ id: string; action: ActionScoringData }>,
    config: BehaviorActionScoring
  ): WeightedScoreResult[] {
    const criteria: ScoringCriteria[] = [
      {
        name: 'feasibility',
        weight: config.weights.feasibility,
        calculate: (item: any) => item.action.feasibility
      },
      {
        name: 'urgency',
        weight: config.weights.urgency,
        calculate: (item: any) => item.action.urgency
      },
      {
        name: 'impact',
        weight: config.weights.impact,
        calculate: (item: any) => item.action.impact
      },
      {
        name: 'cost',
        weight: config.weights.cost,
        calculate: (item: any) => 1.0 - item.action.cost // Invert cost (lower is better)
      },
      {
        name: 'safety',
        weight: config.weights.safety,
        calculate: (item: any) => item.action.safety
      },
      {
        name: 'alignment',
        weight: config.weights.alignment,
        calculate: (item: any) => item.action.alignment
      }
    ];

    // Adjust weights based on agent type
    const adjustedCriteria = this.adjustWeightsForAgentType(criteria, config.agentType);

    return this.score({
      items: actions.map(a => ({ id: a.id, data: a })),
      criteria: adjustedCriteria,
      context: { 
        agentType: config.agentType, 
        goal: config.currentGoal,
        energy: config.energyLevel,
        danger: config.environmentDanger
      },
      stable: true
    });
  }

  /**
   * REAL USE CASE: Resource allocation scoring
   * For managing computational resources, memory, etc.
   */
  public scoreResources(
    resources: Array<{ id: string; resource: { 
      availability: number; 
      cost: number; 
      priority: number; 
      utilization: number;
    }}>,
    context: { 
      budgetPressure: number; 
      performanceTarget: number;
      reliabilityRequirement: number;
    }
  ): WeightedScoreResult[] {
    const criteria: ScoringCriteria[] = [
      {
        name: 'availability',
        weight: 0.3,
        calculate: (item: any) => item.resource.availability
      },
      {
        name: 'cost_efficiency', 
        weight: 0.25,
        calculate: (item: any) => 1.0 - (item.resource.cost * context.budgetPressure)
      },
      {
        name: 'priority',
        weight: 0.25,
        calculate: (item: any) => item.resource.priority
      },
      {
        name: 'utilization_optimal',
        weight: 0.2,
        calculate: (item: any) => 1.0 - Math.abs(item.resource.utilization - context.performanceTarget)
      }
    ];

    return this.score({
      items: resources.map(r => ({ id: r.id, data: r })),
      criteria,
      context,
      stable: true
    });
  }

  /**
   * Get performance statistics
   */
  public getPerformanceStats(): {
    totalOperations: number;
    avgItemsPerOperation: number;
    avgComputeTimeMs: number;
    maxComputeTimeMs: number;
    throughputOpsPerSec: number;
  } {
    const avgItems = this.scoringStats.totalScoringOperations > 0
      ? this.scoringStats.totalItemsScored / this.scoringStats.totalScoringOperations
      : 0;
    
    const avgTime = this.scoringStats.totalScoringOperations > 0
      ? this.scoringStats.totalComputeTime / this.scoringStats.totalScoringOperations
      : 0;

    const throughput = avgTime > 0 ? 1000 / avgTime : 0;

    return {
      totalOperations: this.scoringStats.totalScoringOperations,
      avgItemsPerOperation: avgItems,
      avgComputeTimeMs: avgTime,
      maxComputeTimeMs: this.scoringStats.maxComputeTime,
      throughputOpsPerSec: throughput
    };
  }

  /**
   * Clear statistics (for testing)
   */
  public clearStats(): void {
    this.scoringStats = {
      totalScoringOperations: 0,
      totalItemsScored: 0,
      totalComputeTime: 0,
      maxComputeTime: 0
    };
  }

  // Private helpers for REAL agent behavior

  private adjustWeightsForAgentType(
    criteria: ScoringCriteria[], 
    agentType: BehaviorActionScoring['agentType']
  ): ScoringCriteria[] {
    return criteria.map(c => {
      let adjustedWeight = c.weight;

      switch (agentType) {
        case 'explorer':
          if (c.name === 'impact') adjustedWeight *= 1.2;
          if (c.name === 'safety') adjustedWeight *= 0.8;
          break;
        case 'builder':
          if (c.name === 'feasibility') adjustedWeight *= 1.3;
          if (c.name === 'cost') adjustedWeight *= 1.1;
          break;
        case 'social':
          if (c.name === 'alignment') adjustedWeight *= 1.4;
          if (c.name === 'impact') adjustedWeight *= 1.1;
          break;
        case 'guard':
          if (c.name === 'safety') adjustedWeight *= 1.5;
          if (c.name === 'urgency') adjustedWeight *= 1.2;
          break;
      }

      return { ...c, weight: adjustedWeight };
    });
  }
}

/**
 * REAL-WORLD SCORING PRESETS for common scenarios
 */
export const ScoringPresets = {
  /**
   * Memory retrieval for casual conversation
   */
  memoryRetrievalDialog: (): MemoryRetrievalScoring => ({
    purpose: 'dialog',
    pressureState: 'normal',
    weights: {
      importance: 0.3,
      recency: 0.35,
      semantic: 0.25,
      layer: 0.05,
      social: 0.04,
      spatial: 0.01
    },
    decayHalfLifeMs: 3600000 // 1 hour
  }),

  /**
   * Memory retrieval for complex reasoning
   */
  memoryRetrievalReasoning: (): MemoryRetrievalScoring => ({
    purpose: 'reasoning',
    pressureState: 'normal',
    weights: {
      importance: 0.4,
      recency: 0.2,
      semantic: 0.3,
      layer: 0.06,
      social: 0.02,
      spatial: 0.02
    },
    decayHalfLifeMs: 7200000 // 2 hours
  }),

  /**
   * Memory retrieval under rate pressure
   */
  memoryRetrievalThrottled: (): MemoryRetrievalScoring => ({
    purpose: 'summary',
    pressureState: 'throttle',
    weights: {
      importance: 0.6,  // Emphasize importance under pressure
      recency: 0.25,
      semantic: 0.1,
      layer: 0.03,
      social: 0.01,
      spatial: 0.01
    },
    decayHalfLifeMs: 1800000 // 30 minutes (shorter for pressure)
  }),

  /**
   * Explorer agent action scoring
   */
  actionScoringExplorer: (): BehaviorActionScoring => ({
    agentType: 'explorer',
    currentGoal: 'exploration',
    energyLevel: 0.8,
    socialContext: [],
    environmentDanger: 0.2,
    weights: {
      feasibility: 0.2,
      urgency: 0.15,
      impact: 0.25,    // High impact for exploration
      cost: 0.15,
      safety: 0.1,     // Lower safety weight for explorers
      alignment: 0.15
    }
  }),

  /**
   * Builder agent action scoring
   */
  actionScoringBuilder: (): BehaviorActionScoring => ({
    agentType: 'builder',
    currentGoal: 'construction',
    energyLevel: 0.7,
    socialContext: [],
    environmentDanger: 0.1,
    weights: {
      feasibility: 0.3,  // High feasibility for builders
      urgency: 0.1,
      impact: 0.2,
      cost: 0.2,        // Cost-conscious
      safety: 0.1,
      alignment: 0.1
    }
  }),

  /**
   * Guard agent action scoring
   */
  actionScoringGuard: (): BehaviorActionScoring => ({
    agentType: 'guard',
    currentGoal: 'security',
    energyLevel: 0.9,
    socialContext: [],
    environmentDanger: 0.5,
    weights: {
      feasibility: 0.2,
      urgency: 0.25,   // High urgency for guards
      impact: 0.15,
      cost: 0.1,
      safety: 0.25,    // High safety priority
      alignment: 0.05
    }
  })
};

/**
 * Factory function for creating WeightedScorer instances
 */
export function createWeightedScorer(eventEmitter?: (event: ScoringEvent) => void): WeightedScorer {
  return new WeightedScorer(eventEmitter);
}

/**
 * UTILITY: Quick scoring for simple scenarios
 */
export function quickScore<T>(
  items: Array<{ id: string; data: T }>,
  scoreFn: (item: T) => number,
  maxResults?: number
): Array<{ id: string; score: number; item: T }> {
  const results = items.map(item => ({
    id: item.id,
    score: scoreFn(item.data),
    item: item.data
  }));

  results.sort((a, b) => b.score - a.score);
  
  if (maxResults && results.length > maxResults) {
    results.length = maxResults;
  }

  return results;
}
