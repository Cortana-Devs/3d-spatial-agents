/**
 * DebugIntrospection - Comprehensive Debugging and Monitoring API
 * Feature: F02-ENGINE
 * 
 * Provides deep introspection capabilities for debugging, monitoring,
 * and performance analysis of the Engine system.
 */

import { Engine } from './Engine';
import { MetricsCollector, MetricsSnapshot } from './MetricsCollector';
import { ErrorDomain, ErrorStatistics } from './ErrorDomain';
import { 
  EngineSnapshot, 
  EngineMetrics, 
  LogLevel,
  EntityId,
  Role,
  EngineEvent
} from './types';

/**
 * Comprehensive debug information
 */
export interface DebugSnapshot {
  timestamp: number;
  engine: {
    id: string;
    state: string;
    config: any;
    uptime: number;
    version: string;
  };
  performance: {
    metrics: EngineMetrics;
    detailedMetrics: MetricsSnapshot;
    healthScore: number;
    bottlenecks: DebugBottleneck[];
  };
  entities: {
    total: number;
    byRole: Record<Role, number>;
    byKind: Record<string, number>;
    recent: any[];
  };
  events: {
    totalEmitted: number;
    recentEvents: EngineEvent[];
    eventTypeDistribution: Record<string, number>;
  };
  errors: {
    statistics: ErrorStatistics;
    criticalErrors: any[];
    errorPatterns: any[];
  };
  resources: {
    memory: {
      engine: number;
      subsystems: Record<string, number>;
    };
    scheduling: {
      pendingActions: number;
      nextExecution: number | null;
      queueDistribution: Record<string, number>;
    };
  };
  network: {
    requests: {
      total: number;
      successful: number;
      failed: number;
      averageLatency: number;
    };
    permissions: {
      totalChecks: number;
      denialRate: number;
      frequentDenials: any[];
    };
  };
}

/**
 * Performance bottleneck identification
 */
export interface DebugBottleneck {
  type: 'latency' | 'throughput' | 'memory' | 'error_rate';
  severity: 'low' | 'medium' | 'high' | 'critical';
  component: string;
  description: string;
  metrics: Record<string, number>;
  suggestions: string[];
  impact: number; // 0-100 score
}

/**
 * Real-time monitoring data
 */
export interface RealTimeMonitoring {
  timestamp: number;
  activeOperations: {
    requests: number;
    timers: number;
    scheduledActions: number;
  };
  performanceMetrics: {
    requestsPerSecond: number;
    averageLatency: number;
    errorRate: number;
    memoryUsage: number;
  };
  healthIndicators: {
    overall: 'healthy' | 'warning' | 'critical' | 'degraded';
    subsystems: Record<string, 'healthy' | 'warning' | 'critical'>;
  };
}

/**
 * Debug query interface for targeted introspection
 */
export interface DebugQuery {
  timeRange?: { start: number; end: number };
  components?: string[];
  metricTypes?: string[];
  entityFilters?: { role?: Role; kind?: string; ids?: EntityId[] };
  eventFilters?: { types?: string[]; actorIds?: EntityId[] };
  errorFilters?: { severity?: string[]; codes?: string[] };
  includeStack?: boolean;
  maxResults?: number;
}

export class DebugIntrospection {
  private engine: Engine;
  private metricsCollector?: MetricsCollector;
  private errorDomain?: ErrorDomain;
  private startTime: number;
  private monitoringHistory: RealTimeMonitoring[] = [];
  private readonly maxHistorySize: number;

  constructor(
    engine: Engine,
    metricsCollector?: MetricsCollector,
    errorDomain?: ErrorDomain,
    maxHistorySize: number = 1000
  ) {
    this.engine = engine;
    this.metricsCollector = metricsCollector;
    this.errorDomain = errorDomain;
    this.startTime = Date.now();
    this.maxHistorySize = maxHistorySize;

    // Start real-time monitoring
    this.startRealTimeMonitoring();
  }

  /**
   * Get comprehensive debug snapshot
   */
  public getDebugSnapshot(query?: DebugQuery): DebugSnapshot {
    const engineSnapshot = this.engine.snapshot();
    const engineMetrics = this.engine.getMetrics();
    const config = this.engine.getConfig();
    const state = this.engine.getState();

    const snapshot: DebugSnapshot = {
      timestamp: Date.now(),
      engine: {
        id: engineSnapshot.engineId,
        state,
        config,
        uptime: Date.now() - this.startTime,
        version: engineSnapshot.version
      },
      performance: {
        metrics: engineMetrics,
        detailedMetrics: this.metricsCollector?.getSnapshot() || {} as MetricsSnapshot,
        healthScore: this.calculateHealthScore(engineMetrics),
        bottlenecks: this.identifyBottlenecks(engineMetrics)
      },
      entities: {
        total: engineSnapshot.entityCount,
        byRole: { HUMAN: 0, SIMULANT: 0, SYSTEM: 0 }, // Would need to query entity registry
        byKind: {},
        recent: []
      },
      events: {
        totalEmitted: engineMetrics.eventsEmitted,
        recentEvents: [],
        eventTypeDistribution: {}
      },
      errors: {
        statistics: this.errorDomain?.getStatistics() || {} as ErrorStatistics,
        criticalErrors: this.errorDomain?.getRecentErrorsBySeverity('critical', 10) || [],
        errorPatterns: []
      },
      resources: {
        memory: {
          engine: this.estimateEngineMemoryUsage(),
          subsystems: this.getSubsystemMemoryEstimates()
        },
        scheduling: {
          pendingActions: engineSnapshot.scheduled.total,
          nextExecution: engineSnapshot.scheduled.nextRunInMs,
          queueDistribution: {}
        }
      },
      network: {
        requests: {
          total: engineMetrics.requestsTotal,
          successful: engineMetrics.requestsTotal - engineMetrics.requestsFailed,
          failed: engineMetrics.requestsFailed,
          averageLatency: engineMetrics.averageLatencyMs
        },
        permissions: {
          totalChecks: 0,
          denialRate: 0,
          frequentDenials: []
        }
      }
    };

    return this.applyQueryFilters(snapshot, query);
  }

  /**
   * Get real-time monitoring data
   */
  public getRealTimeMonitoring(): RealTimeMonitoring {
    const metrics = this.engine.getMetrics();
    const now = Date.now();
    
    // Calculate rate metrics from recent history
    const recentHistory = this.monitoringHistory.filter(h => now - h.timestamp < 60000); // Last minute
    const requestsPerSecond = recentHistory.length > 0 
      ? recentHistory.reduce((sum, h) => sum + h.activeOperations.requests, 0) / (recentHistory.length / 60)
      : 0;

    const monitoring: RealTimeMonitoring = {
      timestamp: now,
      activeOperations: {
        requests: 0, // Would need to track active requests
        timers: 0,   // Would need to track active timers
        scheduledActions: metrics.scheduledActions
      },
      performanceMetrics: {
        requestsPerSecond,
        averageLatency: metrics.averageLatencyMs,
        errorRate: metrics.requestsTotal > 0 ? metrics.requestsFailed / metrics.requestsTotal : 0,
        memoryUsage: this.estimateEngineMemoryUsage()
      },
      healthIndicators: {
        overall: this.getOverallHealth(metrics),
        subsystems: this.getSubsystemHealth()
      }
    };

    // Add to history with rotation
    this.monitoringHistory.push(monitoring);
    if (this.monitoringHistory.length > this.maxHistorySize) {
      this.monitoringHistory = this.monitoringHistory.slice(-this.maxHistorySize);
    }

    return monitoring;
  }

  /**
   * Get performance analysis with recommendations
   */
  public getPerformanceAnalysis(): {
    overall: 'excellent' | 'good' | 'poor' | 'critical';
    score: number;
    analysis: {
      latency: { score: number; status: string; recommendation?: string };
      throughput: { score: number; status: string; recommendation?: string };
      errorRate: { score: number; status: string; recommendation?: string };
      resourceUsage: { score: number; status: string; recommendation?: string };
    };
    trends: {
      latencyTrend: 'improving' | 'stable' | 'degrading';
      throughputTrend: 'improving' | 'stable' | 'degrading';
      errorTrend: 'improving' | 'stable' | 'degrading';
    };
    recommendations: string[];
  } {
    const metrics = this.engine.getMetrics();
    const detailedMetrics = this.metricsCollector?.getSnapshot();

    // Calculate individual scores (0-100)
    const latencyScore = Math.max(0, 100 - (metrics.averageLatencyMs * 2)); // Penalty increases with latency
    const throughputScore = Math.min(100, metrics.requestsTotal / 10); // Based on request volume
    const errorRateScore = Math.max(0, 100 - (metrics.requestsFailed / Math.max(metrics.requestsTotal, 1) * 1000));
    const resourceScore = Math.max(0, 100 - (this.estimateEngineMemoryUsage() / 1000000)); // MB penalty

    const overallScore = (latencyScore + throughputScore + errorRateScore + resourceScore) / 4;

    const analysis = {
      latency: {
        score: latencyScore,
        status: latencyScore > 80 ? 'excellent' : latencyScore > 60 ? 'good' : latencyScore > 40 ? 'poor' : 'critical',
        recommendation: latencyScore < 60 ? 'Consider optimizing request processing pipeline' : undefined
      },
      throughput: {
        score: throughputScore,
        status: throughputScore > 80 ? 'excellent' : throughputScore > 60 ? 'good' : throughputScore > 40 ? 'poor' : 'critical',
        recommendation: throughputScore < 60 ? 'Consider parallel processing or request batching' : undefined
      },
      errorRate: {
        score: errorRateScore,
        status: errorRateScore > 95 ? 'excellent' : errorRateScore > 90 ? 'good' : errorRateScore > 80 ? 'poor' : 'critical',
        recommendation: errorRateScore < 90 ? 'Investigate and fix recurring errors' : undefined
      },
      resourceUsage: {
        score: resourceScore,
        status: resourceScore > 80 ? 'excellent' : resourceScore > 60 ? 'good' : resourceScore > 40 ? 'poor' : 'critical',
        recommendation: resourceScore < 60 ? 'Consider memory optimization and cleanup strategies' : undefined
      }
    };

    const recommendations: string[] = [];
    Object.values(analysis).forEach(metric => {
      if (metric.recommendation) {
        recommendations.push(metric.recommendation);
      }
    });

    return {
      overall: overallScore > 80 ? 'excellent' : overallScore > 60 ? 'good' : overallScore > 40 ? 'poor' : 'critical',
      score: overallScore,
      analysis,
      trends: this.calculateTrends(),
      recommendations
    };
  }

  /**
   * Generate performance report
   */
  public generatePerformanceReport(): string {
    const analysis = this.getPerformanceAnalysis();
    const snapshot = this.getDebugSnapshot();
    
    const report = [
      '# Engine Performance Report',
      `Generated: ${new Date().toISOString()}`,
      `Engine ID: ${snapshot.engine.id}`,
      `Uptime: ${(snapshot.engine.uptime / 1000 / 60).toFixed(1)} minutes`,
      '',
      `## Overall Health: ${analysis.overall.toUpperCase()} (${analysis.score.toFixed(1)}/100)`,
      '',
      '## Key Metrics',
      `- Total Requests: ${snapshot.network.requests.total.toLocaleString()}`,
      `- Success Rate: ${((1 - snapshot.network.requests.failed / Math.max(snapshot.network.requests.total, 1)) * 100).toFixed(1)}%`,
      `- Average Latency: ${snapshot.network.requests.averageLatency.toFixed(2)}ms`,
      `- Active Entities: ${snapshot.entities.total}`,
      `- Scheduled Actions: ${snapshot.resources.scheduling.pendingActions}`,
      '',
      '## Performance Analysis',
      `- Latency: ${analysis.analysis.latency.status} (${analysis.analysis.latency.score.toFixed(1)}/100)`,
      `- Throughput: ${analysis.analysis.throughput.status} (${analysis.analysis.throughput.score.toFixed(1)}/100)`,
      `- Error Rate: ${analysis.analysis.errorRate.status} (${analysis.analysis.errorRate.score.toFixed(1)}/100)`,
      `- Resource Usage: ${analysis.analysis.resourceUsage.status} (${analysis.analysis.resourceUsage.score.toFixed(1)}/100)`,
      '',
      '## Recommendations',
      ...analysis.recommendations.map(rec => `- ${rec}`),
      '',
      '## Error Summary',
      `- Total Errors: ${snapshot.errors.statistics.totalErrors || 0}`,
      `- Critical Errors: ${snapshot.errors.criticalErrors.length}`,
      `- Denial Rate: ${((snapshot.errors.statistics.denialRate || 0) * 100).toFixed(1)}%`,
      '',
      '## Resource Usage',
      `- Engine Memory: ${(snapshot.resources.memory.engine / 1024 / 1024).toFixed(2)} MB`,
      `- Next Action: ${snapshot.resources.scheduling.nextExecution ? `${snapshot.resources.scheduling.nextExecution}ms` : 'None scheduled'}`,
    ].join('\n');

    return report;
  }

  /**
   * Start real-time monitoring
   */
  private startRealTimeMonitoring(): void {
    setInterval(() => {
      this.getRealTimeMonitoring();
    }, 5000); // Every 5 seconds
  }

  /**
   * Calculate health score from metrics
   */
  private calculateHealthScore(metrics: EngineMetrics): number {
    const latencyScore = Math.max(0, 100 - metrics.averageLatencyMs);
    const errorScore = metrics.requestsTotal > 0 
      ? Math.max(0, 100 - (metrics.requestsFailed / metrics.requestsTotal * 100))
      : 100;
    const performanceScore = Math.max(0, 100 - metrics.lastTickDurationMs);

    return (latencyScore + errorScore + performanceScore) / 3;
  }

  /**
   * Identify performance bottlenecks
   */
  private identifyBottlenecks(metrics: EngineMetrics): DebugBottleneck[] {
    const bottlenecks: DebugBottleneck[] = [];

    // High latency bottleneck
    if (metrics.averageLatencyMs > 100) {
      bottlenecks.push({
        type: 'latency',
        severity: metrics.averageLatencyMs > 1000 ? 'critical' : metrics.averageLatencyMs > 500 ? 'high' : 'medium',
        component: 'request_processing',
        description: `High average request latency: ${metrics.averageLatencyMs.toFixed(2)}ms`,
        metrics: { averageLatency: metrics.averageLatencyMs },
        suggestions: [
          'Optimize request validation logic',
          'Consider request batching',
          'Review permission checking performance'
        ],
        impact: Math.min(100, metrics.averageLatencyMs / 10)
      });
    }

    // High error rate bottleneck
    const errorRate = metrics.requestsTotal > 0 ? metrics.requestsFailed / metrics.requestsTotal : 0;
    if (errorRate > 0.05) { // 5% error rate threshold
      bottlenecks.push({
        type: 'error_rate',
        severity: errorRate > 0.2 ? 'critical' : errorRate > 0.1 ? 'high' : 'medium',
        component: 'error_handling',
        description: `High error rate: ${(errorRate * 100).toFixed(1)}%`,
        metrics: { errorRate: errorRate * 100 },
        suggestions: [
          'Investigate most frequent error types',
          'Improve input validation',
          'Add better error recovery mechanisms'
        ],
        impact: errorRate * 100
      });
    }

    // Slow tick performance
    if (metrics.lastTickDurationMs > 50) {
      bottlenecks.push({
        type: 'throughput',
        severity: metrics.lastTickDurationMs > 200 ? 'critical' : metrics.lastTickDurationMs > 100 ? 'high' : 'medium',
        component: 'tick_processing',
        description: `Slow tick execution: ${metrics.lastTickDurationMs.toFixed(2)}ms`,
        metrics: { tickDuration: metrics.lastTickDurationMs },
        suggestions: [
          'Optimize action scheduling',
          'Reduce tick interval or work per tick',
          'Consider async processing for heavy operations'
        ],
        impact: Math.min(100, metrics.lastTickDurationMs / 2)
      });
    }

    return bottlenecks.sort((a, b) => b.impact - a.impact);
  }

  /**
   * Calculate performance trends
   */
  private calculateTrends(): {
    latencyTrend: 'improving' | 'stable' | 'degrading';
    throughputTrend: 'improving' | 'stable' | 'degrading';
    errorTrend: 'improving' | 'stable' | 'degrading';
  } {
    // Simplified trend calculation - would need historical data for accurate trends
    return {
      latencyTrend: 'stable',
      throughputTrend: 'stable',
      errorTrend: 'stable'
    };
  }

  /**
   * Get overall health status
   */
  private getOverallHealth(metrics: EngineMetrics): 'healthy' | 'warning' | 'critical' | 'degraded' {
    const healthScore = this.calculateHealthScore(metrics);
    
    if (healthScore > 80) return 'healthy';
    if (healthScore > 60) return 'warning';
    if (healthScore > 40) return 'degraded';
    return 'critical';
  }

  /**
   * Get subsystem health indicators
   */
  private getSubsystemHealth(): Record<string, 'healthy' | 'warning' | 'critical'> {
    const metrics = this.engine.getMetrics();
    
    return {
      requests: metrics.averageLatencyMs < 100 ? 'healthy' : metrics.averageLatencyMs < 500 ? 'warning' : 'critical',
      entities: metrics.activeEntities < 10000 ? 'healthy' : 'warning',
      scheduler: metrics.scheduledActions < 1000 ? 'healthy' : 'warning',
      events: metrics.eventsEmitted > 0 ? 'healthy' : 'warning'
    };
  }

  /**
   * Estimate engine memory usage
   */
  private estimateEngineMemoryUsage(): number {
    // Simplified memory estimation - would need more sophisticated measurement
    const metrics = this.engine.getMetrics();
    return (metrics.activeEntities * 1000) + (metrics.scheduledActions * 500) + 50000; // Base overhead
  }

  /**
   * Get memory estimates for subsystems
   */
  private getSubsystemMemoryEstimates(): Record<string, number> {
    const metrics = this.engine.getMetrics();
    
    return {
      entities: metrics.activeEntities * 1000,
      scheduler: metrics.scheduledActions * 500,
      events: 10000, // Event bus overhead
      permissions: 5000, // Permission matrix
      router: 15000, // Request router
      metrics: 20000 // Metrics collector
    };
  }

  /**
   * Apply query filters to debug snapshot
   */
  private applyQueryFilters(snapshot: DebugSnapshot, query?: DebugQuery): DebugSnapshot {
    if (!query) return snapshot;

    // Apply time range filters
    if (query.timeRange) {
      // Filter time-based data
    }

    // Apply component filters
    if (query.components) {
      // Filter by specific components
    }

    // Apply max results limit
    if (query.maxResults) {
      // Limit results
    }

    return snapshot;
  }
}

/**
 * Factory function to create DebugIntrospection instance
 */
export function createDebugIntrospection(
  engine: Engine,
  metricsCollector?: MetricsCollector,
  errorDomain?: ErrorDomain,
  maxHistorySize?: number
): DebugIntrospection {
  return new DebugIntrospection(engine, metricsCollector, errorDomain, maxHistorySize);
}
