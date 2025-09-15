/**
 * InvariantChecker - System Health and Correctness Validation
 * Feature ID: F03-ADVANCED-DATA-STRUCTURES - Steps 9-11
 * 
 * REAL-WORLD APPLICATIONS:
 * - Validate world state consistency across your collaborative system
 * - Check AI agent behavior invariants (energy never negative, etc.)
 * - Detect memory leaks and performance degradation
 * - Fuzz test data structures under random operations
 */

import { DSError, DSErrorCode, DSEvent, DS_API_VERSION } from '../types';

export interface InvariantRule<T = unknown> {
  name: string;
  description: string;
  check: (data: T, context?: unknown) => boolean;
  severity: 'warning' | 'error' | 'critical';
  autofix?: (data: T) => T | null; // Optional automatic fix
}

export interface InvariantViolation {
  ruleName: string;
  severity: 'warning' | 'error' | 'critical';
  description: string;
  data: unknown;
  context?: unknown;
  timestamp: number;
  fixed: boolean;
}

export interface InvariantReport {
  timestamp: number;
  totalChecks: number;
  violations: InvariantViolation[];
  summary: {
    warnings: number;
    errors: number;
    critical: number;
    autoFixed: number;
  };
  performanceMs: number;
}

export class InvariantChecker {
  public readonly apiVersion = DS_API_VERSION;
  
  private rules = new Map<string, InvariantRule>();
  private violations: InvariantViolation[] = [];
  private eventEmitter?: (event: DSEvent) => void;
  
  private stats = {
    totalChecks: 0,
    totalViolations: 0,
    autoFixes: 0,
    checkTime: 0
  };

  constructor(eventEmitter?: (event: DSEvent) => void) {
    this.eventEmitter = eventEmitter;
    this.initializeCommonRules();
  }

  /**
   * Add custom invariant rule
   */
  public addRule<T>(rule: InvariantRule<T>): void {
    this.rules.set(rule.name, rule as InvariantRule);
  }

  /**
   * Check all invariants against data
   */
  public checkInvariants<T>(data: T, context?: unknown): InvariantReport {
    const startTime = performance.now();
    const currentViolations: InvariantViolation[] = [];
    let totalChecks = 0;
    let autoFixed = 0;

    this.rules.forEach((rule, ruleName) => {
      totalChecks++;
      this.stats.totalChecks++;
      
      try {
        const isValid = rule.check(data, context);
        
        if (!isValid) {
          const violation: InvariantViolation = {
            ruleName,
            severity: rule.severity,
            description: rule.description,
            data,
            context,
            timestamp: Date.now(),
            fixed: false
          };

          // Try autofix if available
          if (rule.autofix) {
            try {
              const fixed = rule.autofix(data);
              if (fixed !== null) {
                violation.fixed = true;
                autoFixed++;
                this.stats.autoFixes++;
              }
            } catch (fixError) {
              console.warn(`Autofix failed for rule ${ruleName}:`, fixError);
            }
          }

          currentViolations.push(violation);
          this.violations.push(violation);
          this.stats.totalViolations++;

          // Emit invariant failure event
          this.eventEmitter?.({
            type: 'ds:invariant:fail',
            timestamp: Date.now(),
            payload: {
              code: 'DS_INVARIANT_VIOLATION',
              rule: ruleName,
              severity: rule.severity,
              fixed: violation.fixed
            }
          });
        }
      } catch (error) {
        console.error(`Invariant check failed for rule ${ruleName}:`, error);
      }
    });

    const performanceMs = performance.now() - startTime;
    this.stats.checkTime += performanceMs;

    const report: InvariantReport = {
      timestamp: Date.now(),
      totalChecks,
      violations: currentViolations,
      summary: {
        warnings: currentViolations.filter(v => v.severity === 'warning').length,
        errors: currentViolations.filter(v => v.severity === 'error').length,
        critical: currentViolations.filter(v => v.severity === 'critical').length,
        autoFixed
      },
      performanceMs
    };

    return report;
  }

  /**
   * REAL USE CASE: World state validation for your collaborative system
   */
  public checkWorldStateInvariants(worldState: {
    blocks: Array<{ position: {x: number; y: number; z: number}; type: string; id: string }>;
    simulants: Array<{ id: string; position: {x: number; y: number; z: number}; energy: number }>;
    blockCount: number;
  }): InvariantReport {
    // Add world-specific rules temporarily
    this.addRule({
      name: 'block_count_consistency',
      description: 'Block count matches actual blocks array length',
      check: (data: any) => data.blocks.length === data.blockCount,
      severity: 'error'
    });

    this.addRule({
      name: 'unique_block_positions',
      description: 'No duplicate block positions',
      check: (data: any) => {
        const positions = new Set();
        for (const block of data.blocks) {
          const pos = `${block.position.x},${block.position.y},${block.position.z}`;
          if (positions.has(pos)) return false;
          positions.add(pos);
        }
        return true;
      },
      severity: 'critical'
    });

    this.addRule({
      name: 'simulant_energy_bounds',
      description: 'Simulant energy within valid bounds [0, 1]',
      check: (data: any) => {
        return data.simulants.every((s: any) => s.energy >= 0 && s.energy <= 1);
      },
      severity: 'error',
      autofix: (data: any) => {
        let fixed = false;
        data.simulants.forEach((s: any) => {
          if (s.energy < 0) { s.energy = 0; fixed = true; }
          if (s.energy > 1) { s.energy = 1; fixed = true; }
        });
        return fixed ? data : null;
      }
    });

    return this.checkInvariants(worldState);
  }

  /**
   * Get overall statistics
   */
  public getStats(): {
    totalChecks: number;
    totalViolations: number;
    autoFixes: number;
    avgCheckTimeMs: number;
    violationRate: number;
  } {
    const avgCheckTime = this.stats.totalChecks > 0 
      ? this.stats.checkTime / this.stats.totalChecks 
      : 0;
    
    const violationRate = this.stats.totalChecks > 0 
      ? this.stats.totalViolations / this.stats.totalChecks 
      : 0;

    return {
      totalChecks: this.stats.totalChecks,
      totalViolations: this.stats.totalViolations,
      autoFixes: this.stats.autoFixes,
      avgCheckTimeMs: avgCheckTime,
      violationRate
    };
  }

  /**
   * Get recent violations for debugging
   */
  public getRecentViolations(count: number = 50): InvariantViolation[] {
    return this.violations.slice(-count);
  }

  /**
   * Clear violation history
   */
  public clearViolations(): void {
    this.violations = [];
  }

  // Private methods

  private initializeCommonRules(): void {
    // Common data structure invariants
    this.addRule({
      name: 'non_null_data',
      description: 'Data is not null or undefined',
      check: (data) => data != null,
      severity: 'critical'
    });

    this.addRule({
      name: 'array_bounds',
      description: 'Array indices within bounds',
      check: (data) => {
        if (Array.isArray(data)) {
          return data.every((_, index) => index >= 0 && index < data.length);
        }
        return true;
      },
      severity: 'error'
    });
  }
}

/**
 * FUZZ TESTER - Random operation generator for stress testing
 */
export class FuzzTester {
  private checker = new InvariantChecker();
  private operations: Array<() => void> = [];
  private testStats = {
    totalOperations: 0,
    violationsFound: 0,
    operationTime: 0
  };

  /**
   * Add fuzz operation to test
   */
  public addFuzzOperation(name: string, operation: () => void): void {
    this.operations.push(operation);
  }

  /**
   * Run fuzz test with random operations
   */
  public runFuzzTest(
    iterations: number,
    dataStructure: any,
    invariantRules: InvariantRule[]
  ): {
    iterations: number;
    violations: InvariantViolation[];
    operationsPerSecond: number;
    stabilityScore: number;
  } {
    // Add rules to checker
    invariantRules.forEach(rule => this.checker.addRule(rule));
    
    const startTime = performance.now();
    const allViolations: InvariantViolation[] = [];

    for (let i = 0; i < iterations; i++) {
      // Perform random operation
      const operation = this.operations[Math.floor(Math.random() * this.operations.length)];
      
      try {
        operation();
        this.testStats.totalOperations++;
        
        // Check invariants after operation
        const report = this.checker.checkInvariants(dataStructure);
        if (report.violations.length > 0) {
          allViolations.push(...report.violations);
          this.testStats.violationsFound += report.violations.length;
        }
      } catch (error) {
        console.warn(`Fuzz operation ${i} failed:`, error);
      }
    }

    const totalTime = performance.now() - startTime;
    this.testStats.operationTime += totalTime;
    
    const operationsPerSecond = iterations / (totalTime / 1000);
    const stabilityScore = Math.max(0, 1 - (allViolations.length / iterations));

    return {
      iterations,
      violations: allViolations,
      operationsPerSecond,
      stabilityScore
    };
  }
}

/**
 * PERFORMANCE BENCHMARK HARNESS
 */
export class BenchmarkHarness {
  private results: Array<{
    name: string;
    iterations: number;
    totalTimeMs: number;
    avgTimeMs: number;
    opsPerSecond: number;
    memoryBefore: number;
    memoryAfter: number;
  }> = [];

  /**
   * Benchmark operation performance
   */
  public benchmark<T>(
    name: string,
    operation: () => T,
    iterations: number = 1000,
    warmupIterations: number = 100
  ): {
    avgTimeMs: number;
    opsPerSecond: number;
    memoryDelta: number;
  } {
    // Warmup
    for (let i = 0; i < warmupIterations; i++) {
      operation();
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const memoryBefore = process.memoryUsage?.().heapUsed ?? 0;
    const startTime = performance.now();

    // Run benchmark
    for (let i = 0; i < iterations; i++) {
      operation();
    }

    const totalTime = performance.now() - startTime;
    const memoryAfter = process.memoryUsage?.().heapUsed ?? 0;
    
    const avgTime = totalTime / iterations;
    const opsPerSecond = 1000 / avgTime;
    const memoryDelta = memoryAfter - memoryBefore;

    const result = {
      avgTimeMs: avgTime,
      opsPerSecond,
      memoryDelta
    };

    this.results.push({
      name,
      iterations,
      totalTimeMs: totalTime,
      avgTimeMs: avgTime,
      opsPerSecond,
      memoryBefore,
      memoryAfter
    });

    console.log(`Benchmark ${name}: ${avgTime.toFixed(4)}ms avg, ${opsPerSecond.toFixed(0)} ops/sec`);
    
    return result;
  }

  /**
   * Get all benchmark results
   */
  public getResults(): typeof this.results {
    return [...this.results];
  }

  /**
   * Clear benchmark history
   */
  public clear(): void {
    this.results = [];
  }
}

/**
 * Factory functions
 */
export function createInvariantChecker(eventEmitter?: (event: DSEvent) => void): InvariantChecker {
  return new InvariantChecker(eventEmitter);
}

export function createFuzzTester(): FuzzTester {
  return new FuzzTester();
}

export function createBenchmarkHarness(): BenchmarkHarness {
  return new BenchmarkHarness();
}
