/**
 * Step 3 Performance Benchmarks
 * Validates performance targets from master prompt:
 * - TimeWheelScheduler: ≤ 0.3ms tick with 0-1000 timers
 * - TokenBucketMap: ≤ 0.002ms approve() median across 10k approvals
 */

import { 
  TimeWheelScheduler, 
  createTimeWheelScheduler,
  TokenBucketMap,
  createTokenBucketMap
} from '../index';

interface BenchmarkResult {
  name: string;
  operations: number;
  totalTimeMs: number;
  avgTimeMs: number;
  medianTimeMs: number;
  p95TimeMs: number;
  maxTimeMs: number;
  opsPerSec: number;
  targetMet: boolean;
  target: number;
}

function measureOperations<T>(
  name: string,
  operations: number,
  operation: (i: number) => T,
  targetMs: number
): BenchmarkResult {
  const measurements: number[] = [];
  
  // Warm up
  for (let i = 0; i < Math.min(100, operations); i++) {
    operation(i);
  }
  
  // Measure
  const startTime = performance.now();
  
  for (let i = 0; i < operations; i++) {
    const opStart = performance.now();
    operation(i);
    measurements.push(performance.now() - opStart);
  }
  
  const totalTime = performance.now() - startTime;
  
  // Calculate statistics
  measurements.sort((a, b) => a - b);
  const avgTime = totalTime / operations;
  const medianTime = measurements[Math.floor(measurements.length / 2)];
  const p95Time = measurements[Math.floor(measurements.length * 0.95)];
  const maxTime = Math.max(...measurements);
  const opsPerSec = 1000 / avgTime;
  
  return {
    name,
    operations,
    totalTimeMs: totalTime,
    avgTimeMs: avgTime,
    medianTimeMs: medianTime,
    p95TimeMs: p95Time,
    maxTimeMs: maxTime,
    opsPerSec,
    targetMet: medianTime <= targetMs,
    target: targetMs
  };
}

function printBenchmarkResult(result: BenchmarkResult) {
  console.log(`\n📊 ${result.name}`);
  console.log(`   Operations: ${result.operations.toLocaleString()}`);
  console.log(`   Total time: ${result.totalTimeMs.toFixed(2)}ms`);
  console.log(`   Average: ${result.avgTimeMs.toFixed(6)}ms`);
  console.log(`   Median: ${result.medianTimeMs.toFixed(6)}ms`);
  console.log(`   P95: ${result.p95TimeMs.toFixed(6)}ms`);
  console.log(`   Max: ${result.maxTimeMs.toFixed(6)}ms`);
  console.log(`   Ops/sec: ${Math.round(result.opsPerSec).toLocaleString()}`);
  console.log(`   Target: ${result.target}ms`);
  console.log(`   Status: ${result.targetMet ? '✅ PASS' : '❌ FAIL'}`);
}

export function benchmarkTimeWheelScheduler() {
  console.log('\n🕐 TimeWheelScheduler Benchmarks');
  console.log('='.repeat(50));

  // Benchmark 1: Basic scheduling performance
  const scheduler1 = createTimeWheelScheduler({
    slots: 100,
    slotDurationMs: 10
  }) as TimeWheelScheduler;

  const schedulingResult = measureOperations(
    'TimeWheel Scheduling',
    10000,
    (i) => {
      scheduler1.schedule(`task-${i}`, (i % 100) * 10, () => {});
    },
    0.01 // Generous target for scheduling
  );
  
  printBenchmarkResult(schedulingResult);

  // Benchmark 2: Tick performance with varying loads
  const tickResults: BenchmarkResult[] = [];
  
  for (const timerCount of [0, 100, 500, 1000]) {
    const scheduler = createTimeWheelScheduler({
      slots: 20,
      slotDurationMs: 50
    }) as TimeWheelScheduler;
    
    // Schedule timers
    for (let i = 0; i < timerCount; i++) {
      scheduler.schedule(`timer-${i}`, (i % 10) * 50, () => {});
    }
    
    const result = measureOperations(
      `TimeWheel Tick (${timerCount} timers)`,
      1000,
      (i) => {
        scheduler.tick(1000 + i);
      },
      0.3 // AC3 target
    );
    
    tickResults.push(result);
    printBenchmarkResult(result);
  }

  // Benchmark 3: Cancel performance
  const scheduler3 = createTimeWheelScheduler({
    slots: 50,
    slotDurationMs: 100
  }) as TimeWheelScheduler;

  // Pre-populate
  for (let i = 0; i < 1000; i++) {
    scheduler3.schedule(`cancel-test-${i}`, (i % 10) * 100, () => {});
  }

  const cancelResult = measureOperations(
    'TimeWheel Cancellation',
    1000,
    (i) => {
      scheduler3.cancel(`cancel-test-${i}`);
    },
    0.01
  );
  
  printBenchmarkResult(cancelResult);

  return { schedulingResult, tickResults, cancelResult };
}

export function benchmarkTokenBucketMap() {
  console.log('\n🪣 TokenBucketMap Benchmarks');
  console.log('='.repeat(50));

  // Benchmark 1: Core approve() performance - AC4 target
  const rateLimiter1 = createTokenBucketMap({
    defaultConfig: {
      capacity: 1000,
      refillRatePerSec: 100,
      initialTokens: 1000
    },
    maxBuckets: 1000
  }) as TokenBucketMap;

  const approveResult = measureOperations(
    'TokenBucket Approve (Single User)',
    10000,
    (i) => {
      rateLimiter1.approve('user1', 1);
    },
    0.002 // AC4 target
  );
  
  printBenchmarkResult(approveResult);

  // Benchmark 2: Multi-user performance
  const rateLimiter2 = createTokenBucketMap({
    defaultConfig: {
      capacity: 10,
      refillRatePerSec: 5,
      initialTokens: 10
    },
    maxBuckets: 1000
  }) as TokenBucketMap;

  const users = Array.from({ length: 100 }, (_, i) => `user${i}`);
  
  const multiUserResult = measureOperations(
    'TokenBucket Approve (100 Users)',
    10000,
    (i) => {
      const user = users[i % users.length];
      rateLimiter2.approve(user, 1);
    },
    0.002 // Same target across user scales
  );
  
  printBenchmarkResult(multiUserResult);

  // Benchmark 3: Bucket creation performance
  const rateLimiter3 = createTokenBucketMap({
    defaultConfig: {
      capacity: 10,
      refillRatePerSec: 5,
      initialTokens: 10
    },
    maxBuckets: 10000
  }) as TokenBucketMap;

  const bucketCreationResult = measureOperations(
    'TokenBucket New User Creation',
    5000,
    (i) => {
      rateLimiter3.approve(`new-user-${i}`, 1);
    },
    0.005 // More generous for bucket creation
  );
  
  printBenchmarkResult(bucketCreationResult);

  // Benchmark 4: Snapshot performance
  const rateLimiter4 = createTokenBucketMap({
    defaultConfig: {
      capacity: 10,
      refillRatePerSec: 5
    }
  }) as TokenBucketMap;

  // Create many buckets
  for (let i = 0; i < 1000; i++) {
    rateLimiter4.approve(`snapshot-user-${i}`, 1);
  }

  const snapshotResult = measureOperations(
    'TokenBucket Snapshot (1000 buckets)',
    1000,
    () => {
      rateLimiter4.snapshot();
    },
    3.0 // AC10 target for metrics snapshot
  );
  
  printBenchmarkResult(snapshotResult);

  return { 
    approveResult, 
    multiUserResult, 
    bucketCreationResult,
    snapshotResult 
  };
}

export function benchmarkIntegration() {
  console.log('\n🔗 Integration Benchmarks');
  console.log('='.repeat(50));

  const scheduler = createTimeWheelScheduler({
    slots: 20,
    slotDurationMs: 50
  }) as TimeWheelScheduler;

  const rateLimiter = createTokenBucketMap({
    defaultConfig: {
      capacity: 100,
      refillRatePerSec: 50,
      initialTokens: 100
    }
  }) as TokenBucketMap;

  // Benchmark combined operations
  const combinedResult = measureOperations(
    'Combined Operations (Schedule + Rate Limit)',
    5000,
    (i) => {
      // Schedule a rate-limited task
      scheduler.schedule(`combined-${i}`, 50, () => {
        rateLimiter.approve(`user${i % 100}`, 1);
      });
      
      // Also do immediate rate check
      rateLimiter.approve(`direct-user-${i % 50}`, 1);
    },
    0.01 // Combined operations should still be fast
  );
  
  printBenchmarkResult(combinedResult);

  return { combinedResult };
}

export function runAllBenchmarks() {
  console.log('🚀 Advanced Data Structures - Step 3 Performance Benchmarks');
  console.log('='.repeat(70));
  console.log('Testing compliance with Master Prompt performance targets');

  const timeWheelResults = benchmarkTimeWheelScheduler();
  const tokenBucketResults = benchmarkTokenBucketMap();
  const integrationResults = benchmarkIntegration();

  // Summary
  console.log('\n📋 Performance Summary');
  console.log('='.repeat(50));

  const allResults = [
    timeWheelResults.schedulingResult,
    ...timeWheelResults.tickResults,
    timeWheelResults.cancelResult,
    tokenBucketResults.approveResult,
    tokenBucketResults.multiUserResult,
    tokenBucketResults.bucketCreationResult,
    tokenBucketResults.snapshotResult,
    integrationResults.combinedResult
  ];

  const passedTests = allResults.filter(r => r.targetMet).length;
  const totalTests = allResults.length;

  console.log(`Tests Passed: ${passedTests}/${totalTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (passedTests === totalTests) {
    console.log('🎉 All performance targets met!');
  } else {
    console.log('⚠️  Some performance targets not met. Review implementation.');
    
    const failedTests = allResults.filter(r => !r.targetMet);
    console.log('\nFailed tests:');
    failedTests.forEach(test => {
      console.log(`  - ${test.name}: ${test.medianTimeMs.toFixed(6)}ms > ${test.target}ms`);
    });
  }

  return {
    timeWheelResults,
    tokenBucketResults,
    integrationResults,
    summary: {
      passed: passedTests,
      total: totalTests,
      successRate: (passedTests / totalTests) * 100
    }
  };
}

// Run benchmarks if called directly
if (import.meta.url.endsWith(process.argv[1])) {
  runAllBenchmarks();
}
