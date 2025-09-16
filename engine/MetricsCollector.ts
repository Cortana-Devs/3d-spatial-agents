/**
 * MetricsCollector - Comprehensive Metrics and Observability System
 * Feature: F02-ENGINE
 * 
 * Provides detailed metrics collection, structured logging, and observability
 * features for monitoring engine performance and behavior.
 */

import { LogLevel, EngineMetrics } from './types';

/**
 * Metric types for different kinds of measurements
 */
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'timer';

/**
 * Structured log entry
 */
export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  category: string;
  message: string;
  metadata?: Record<string, unknown>;
  correlationId?: string;
  duration?: number;
}

/**
 * Performance timer for measuring operation durations
 */
export interface PerformanceTimer {
  id: string;
  startTime: number;
  category: string;
  operation: string;
  metadata?: Record<string, unknown>;
}

/**
 * Metric value with timestamp
 */
export interface MetricValue {
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

/**
 * Histogram bucket for latency measurements
 */
export interface HistogramBucket {
  upperBound: number;
  count: number;
}

/**
 * Histogram data structure
 */
export interface HistogramData {
  buckets: HistogramBucket[];
  sum: number;
  count: number;
  min: number;
  max: number;
}

/**
 * Comprehensive metrics snapshot
 */
export interface MetricsSnapshot {
  timestamp: number;
  counters: Record<string, number>;
  gauges: Record<string, number>;
  histograms: Record<string, HistogramData>;
  timers: Record<string, {
    count: number;
    totalDuration: number;
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
  }>;
  systemMetrics: {
    memoryUsage?: {
      rss: number;
      heapUsed: number;
      heapTotal: number;
      external: number;
    };
    cpuUsage?: {
      user: number;
      system: number;
    };
  };
}

export class MetricsCollector {
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, HistogramData> = new Map();
  private timers: Map<string, PerformanceTimer> = new Map();
  private timerHistory: Map<string, number[]> = new Map();
  private logHistory: LogEntry[] = [];
  private readonly maxLogHistory: number;
  private readonly maxTimerHistory: number;
  private readonly logLevel: LogLevel;

  // Default histogram buckets for latency measurements (in milliseconds)
  private readonly defaultHistogramBuckets = [0.1, 0.5, 1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

  constructor(
    maxLogHistory: number = 10000,
    maxTimerHistory: number = 1000,
    logLevel: LogLevel = 'info'
  ) {
    this.maxLogHistory = maxLogHistory;
    this.maxTimerHistory = maxTimerHistory;
    this.logLevel = logLevel;
    this.initializeSystemMetrics();
  }

  /**
   * Increment a counter metric
   */
  public incrementCounter(name: string, value: number = 1, tags?: Record<string, string>): void {
    const key = this.getMetricKey(name, tags);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
    
    this.log('debug', 'METRICS', `Counter incremented: ${key} +${value} (total: ${current + value})`);
  }

  /**
   * Set a gauge metric value
   */
  public setGauge(name: string, value: number, tags?: Record<string, string>): void {
    const key = this.getMetricKey(name, tags);
    this.gauges.set(key, value);
    
    this.log('debug', 'METRICS', `Gauge set: ${key} = ${value}`);
  }

  /**
   * Record a value in a histogram
   */
  public recordHistogram(name: string, value: number, tags?: Record<string, string>): void {
    const key = this.getMetricKey(name, tags);
    let histogram = this.histograms.get(key);
    
    if (!histogram) {
      histogram = this.createHistogram();
      this.histograms.set(key, histogram);
    }

    // Update histogram data
    histogram.count++;
    histogram.sum += value;
    histogram.min = Math.min(histogram.min, value);
    histogram.max = Math.max(histogram.max, value);

    // Update buckets
    for (const bucket of histogram.buckets) {
      if (value <= bucket.upperBound) {
        bucket.count++;
      }
    }

    this.log('debug', 'METRICS', `Histogram recorded: ${key} = ${value}`);
  }

  /**
   * Start a performance timer
   */
  public startTimer(
    category: string,
    operation: string,
    metadata?: Record<string, unknown>,
    correlationId?: string
  ): string {
    const timerId = `${category}.${operation}.${Date.now()}.${Math.random().toString(36).substr(2, 9)}`;
    
    const timer: PerformanceTimer = {
      id: timerId,
      startTime: performance.now(),
      category,
      operation,
      metadata
    };

    this.timers.set(timerId, timer);

    this.log('debug', 'TIMER', `Timer started: ${category}.${operation}`, {
      timerId,
      correlationId,
      ...metadata
    });

    return timerId;
  }

  /**
   * Stop a performance timer and record the duration
   */
  public stopTimer(timerId: string): number | null {
    const timer = this.timers.get(timerId);
    if (!timer) {
      this.log('warn', 'TIMER', `Timer not found: ${timerId}`);
      return null;
    }

    const duration = performance.now() - timer.startTime;
    this.timers.delete(timerId);

    // Record in histogram
    this.recordHistogram(`timer.${timer.category}.${timer.operation}`, duration);

    // Add to timer history
    const historyKey = `${timer.category}.${timer.operation}`;
    let history = this.timerHistory.get(historyKey);
    if (!history) {
      history = [];
      this.timerHistory.set(historyKey, history);
    }

    history.push(duration);
    if (history.length > this.maxTimerHistory) {
      history.splice(0, history.length - this.maxTimerHistory);
    }

    this.log('debug', 'TIMER', `Timer stopped: ${timer.category}.${timer.operation}`, {
      timerId,
      duration: `${duration.toFixed(2)}ms`,
      ...timer.metadata
    });

    return duration;
  }

  /**
   * Record a structured log entry
   */
  public log(
    level: LogLevel,
    category: string,
    message: string,
    metadata?: Record<string, unknown>,
    correlationId?: string,
    duration?: number
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: Date.now(),
      level,
      category,
      message,
      metadata,
      correlationId,
      duration
    };

    // Add to history with rotation
    this.logHistory.push(logEntry);
    if (this.logHistory.length > this.maxLogHistory) {
      this.logHistory = this.logHistory.slice(-this.maxLogHistory);
    }

    // Console output with structured format
    const logLine = this.formatLogEntry(logEntry);
    const logMethod = this.getConsoleMethod(level);
    logMethod(logLine);

    // Increment log level counters
    this.incrementCounter(`logs.${level}`);
  }

  /**
   * Get current metrics snapshot
   */
  public getSnapshot(): MetricsSnapshot {
    const snapshot: MetricsSnapshot = {
      timestamp: Date.now(),
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: Object.fromEntries(this.histograms),
      timers: {},
      systemMetrics: this.getSystemMetrics()
    };

    // Calculate timer statistics
    for (const [key, history] of this.timerHistory) {
      if (history.length > 0) {
        const sorted = [...history].sort((a, b) => a - b);
        snapshot.timers[key] = {
          count: history.length,
          totalDuration: history.reduce((sum, val) => sum + val, 0),
          averageDuration: history.reduce((sum, val) => sum + val, 0) / history.length,
          minDuration: sorted[0],
          maxDuration: sorted[sorted.length - 1]
        };
      }
    }

    return snapshot;
  }

  /**
   * Get recent log entries
   */
  public getRecentLogs(count?: number, level?: LogLevel, category?: string): LogEntry[] {
    let logs = this.logHistory;

    // Filter by level if specified
    if (level) {
      logs = logs.filter(log => log.level === level);
    }

    // Filter by category if specified
    if (category) {
      logs = logs.filter(log => log.category === category);
    }

    // Return most recent entries
    const result = logs.slice(count ? -count : -100);
    return result.reverse(); // Most recent first
  }

  /**
   * Get performance summary for a specific category/operation
   */
  public getPerformanceSummary(category?: string, operation?: string): {
    totalOperations: number;
    averageLatency: number;
    medianLatency: number;
    p95Latency: number;
    p99Latency: number;
    minLatency: number;
    maxLatency: number;
  } | null {
    let key: string;
    if (category && operation) {
      key = `${category}.${operation}`;
    } else if (category) {
      // Find all operations in category
      const categoryKeys = Array.from(this.timerHistory.keys()).filter(k => k.startsWith(category));
      if (categoryKeys.length === 0) return null;
      // Combine all operations in category
      const allValues: number[] = [];
      for (const k of categoryKeys) {
        allValues.push(...(this.timerHistory.get(k) || []));
      }
      return this.calculateLatencyStats(allValues);
    } else {
      return null;
    }

    const history = this.timerHistory.get(key);
    if (!history || history.length === 0) {
      return null;
    }

    return this.calculateLatencyStats(history);
  }

  /**
   * Clear all metrics (useful for testing)
   */
  public clear(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.timers.clear();
    this.timerHistory.clear();
    this.logHistory = [];
    
    this.log('info', 'METRICS', 'All metrics cleared');
  }

  /**
   * Export metrics in Prometheus format
   */
  public exportPrometheus(): string {
    const lines: string[] = [];
    const timestamp = Date.now();

    // Export counters
    for (const [name, value] of this.counters) {
      lines.push(`# TYPE ${name} counter`);
      lines.push(`${name} ${value} ${timestamp}`);
    }

    // Export gauges
    for (const [name, value] of this.gauges) {
      lines.push(`# TYPE ${name} gauge`);
      lines.push(`${name} ${value} ${timestamp}`);
    }

    // Export histograms
    for (const [name, histogram] of this.histograms) {
      lines.push(`# TYPE ${name} histogram`);
      for (const bucket of histogram.buckets) {
        lines.push(`${name}_bucket{le="${bucket.upperBound}"} ${bucket.count} ${timestamp}`);
      }
      lines.push(`${name}_bucket{le="+Inf"} ${histogram.count} ${timestamp}`);
      lines.push(`${name}_sum ${histogram.sum} ${timestamp}`);
      lines.push(`${name}_count ${histogram.count} ${timestamp}`);
    }

    return lines.join('\n');
  }

  /**
   * Create metric key with tags
   */
  private getMetricKey(name: string, tags?: Record<string, string>): string {
    if (!tags || Object.keys(tags).length === 0) {
      return name;
    }

    const tagStr = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b)) // Sort for consistency
      .map(([key, value]) => `${key}="${value}"`)
      .join(',');

    return `${name}{${tagStr}}`;
  }

  /**
   * Create a new histogram with default buckets
   */
  private createHistogram(): HistogramData {
    return {
      buckets: this.defaultHistogramBuckets.map(upperBound => ({ upperBound, count: 0 })),
      sum: 0,
      count: 0,
      min: Infinity,
      max: -Infinity
    };
  }

  /**
   * Calculate latency statistics from an array of values
   */
  private calculateLatencyStats(values: number[]): {
    totalOperations: number;
    averageLatency: number;
    medianLatency: number;
    p95Latency: number;
    p99Latency: number;
    minLatency: number;
    maxLatency: number;
  } {
    if (values.length === 0) {
      return {
        totalOperations: 0,
        averageLatency: 0,
        medianLatency: 0,
        p95Latency: 0,
        p99Latency: 0,
        minLatency: 0,
        maxLatency: 0
      };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((acc, val) => acc + val, 0);

    return {
      totalOperations: values.length,
      averageLatency: sum / values.length,
      medianLatency: this.percentile(sorted, 0.5),
      p95Latency: this.percentile(sorted, 0.95),
      p99Latency: this.percentile(sorted, 0.99),
      minLatency: sorted[0],
      maxLatency: sorted[sorted.length - 1]
    };
  }

  /**
   * Calculate percentile from sorted array
   */
  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Get system metrics (Node.js specific)
   */
  private getSystemMetrics(): MetricsSnapshot['systemMetrics'] {
    try {
      if (typeof process !== 'undefined' && typeof process.memoryUsage === 'function') {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage ? process.cpuUsage() : undefined;
        
        return {
          memoryUsage: {
            rss: memUsage.rss,
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            external: memUsage.external
          },
          cpuUsage: cpuUsage ? {
            user: cpuUsage.user,
            system: cpuUsage.system
          } : undefined
        };
      }
    } catch (error) {
      // Silently fail in browser environments
    }

    return {};
  }

  /**
   * Initialize system metrics collection
   */
  private initializeSystemMetrics(): void {
    // Set up periodic system metrics collection if in Node.js environment
    if (typeof process !== 'undefined' && typeof process.memoryUsage === 'function') {
      setInterval(() => {
        const sysMetrics = this.getSystemMetrics();
        if (sysMetrics.memoryUsage) {
          this.setGauge('system.memory.rss', sysMetrics.memoryUsage.rss);
          this.setGauge('system.memory.heap_used', sysMetrics.memoryUsage.heapUsed);
          this.setGauge('system.memory.heap_total', sysMetrics.memoryUsage.heapTotal);
        }
      }, 10000); // Every 10 seconds
    }
  }

  /**
   * Format log entry for console output
   */
  private formatLogEntry(entry: LogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const category = entry.category.padEnd(12);
    
    let formatted = `${timestamp} [${level}] [${category}] ${entry.message}`;
    
    if (entry.correlationId) {
      formatted += ` [correlation=${entry.correlationId}]`;
    }
    
    if (entry.duration !== undefined) {
      formatted += ` [duration=${entry.duration.toFixed(2)}ms]`;
    }
    
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      const metadataStr = JSON.stringify(entry.metadata);
      formatted += ` [metadata=${metadataStr}]`;
    }
    
    return formatted;
  }

  /**
   * Get appropriate console method for log level
   */
  private getConsoleMethod(level: LogLevel): (...args: any[]) => void {
    switch (level) {
      case 'error': return console.error;
      case 'warn': return console.warn;
      case 'info': return console.info;
      case 'debug': return console.debug;
      case 'silent': return () => {};
      default: return console.log;
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
 * Factory function to create MetricsCollector instance
 */
export function createMetricsCollector(
  maxLogHistory?: number,
  maxTimerHistory?: number,
  logLevel?: LogLevel
): MetricsCollector {
  return new MetricsCollector(maxLogHistory, maxTimerHistory, logLevel);
}
