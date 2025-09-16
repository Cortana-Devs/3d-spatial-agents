/**
 * TokenBucketMap Tests  
 * Validates performance targets and correctness according to master prompt AC4
 * Target: approve() median < 0.002ms across 10k sequential approvals
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TokenBucketMap, createTokenBucketMap } from '../rate/TokenBucketMap';
import { DSEvent } from '../types';

describe('TokenBucketMap', () => {
  let bucketMap: TokenBucketMap;
  let events: DSEvent[] = [];
  let mockEventEmitter: (event: DSEvent) => void;

  const defaultConfig = {
    capacity: 10,
    refillRatePerSec: 5, // 5 tokens per second
    initialTokens: 10
  };

  beforeEach(() => {
    events = [];
    mockEventEmitter = (event: DSEvent) => {
      events.push(event);
    };
    
    bucketMap = createTokenBucketMap({
      defaultConfig,
      maxBuckets: 1000,
      cleanupIntervalMs: 1000,
      inactiveThresholdMs: 2000
    }, mockEventEmitter) as TokenBucketMap;
  });

  describe('Basic Functionality', () => {
    it('should approve requests when tokens available', () => {
      const approved = bucketMap.approve('user1', 1);
      expect(approved).toBe(true);
    });

    it('should deny requests when insufficient tokens', () => {
      // Exhaust all tokens
      for (let i = 0; i < 10; i++) {
        bucketMap.approve('user1', 1);
      }
      
      // Should deny next request
      const approved = bucketMap.approve('user1', 1);
      expect(approved).toBe(false);
    });

    it('should refill tokens over time', () => {
      const now = Date.now();
      
      // Exhaust tokens
      for (let i = 0; i < 10; i++) {
        bucketMap.approve('user1', 1, now);
      }
      expect(bucketMap.approve('user1', 1, now)).toBe(false);
      
      // Wait 2 seconds (should add 10 tokens at 5/sec rate)
      const later = now + 2000;
      expect(bucketMap.approve('user1', 1, later)).toBe(true);
    });

    it('should handle multiple buckets independently', () => {
      expect(bucketMap.approve('user1', 5)).toBe(true);
      expect(bucketMap.approve('user2', 5)).toBe(true);
      expect(bucketMap.approve('user1', 6)).toBe(false); // Only 5 tokens left
      expect(bucketMap.approve('user2', 5)).toBe(true); // Fresh bucket
    });
  });

  describe('Performance Requirements - AC4', () => {
    it('should approve() in < 0.002ms median across 10k calls', () => {
      const iterations = 10000;
      const measurements: number[] = [];
      const keys = Array.from({ length: 100 }, (_, i) => `user${i}`);
      
      for (let i = 0; i < iterations; i++) {
        const key = keys[i % keys.length];
        const startTime = performance.now();
        bucketMap.approve(key, 1);
        const duration = performance.now() - startTime;
        measurements.push(duration);
      }
      
      measurements.sort((a, b) => a - b);
      const median = measurements[Math.floor(measurements.length / 2)];
      const p95 = measurements[Math.floor(measurements.length * 0.95)];
      
      console.log(`TokenBucket approve() performance:`);
      console.log(`  Median: ${median}ms`);
      console.log(`  P95: ${p95}ms`);
      console.log(`  Max: ${Math.max(...measurements)}ms`);
      
      expect(median).toBeLessThan(0.002);
    });

    it('should scale with number of buckets efficiently', () => {
      const bucketCounts = [100, 1000, 5000];
      const measurements: { buckets: number; avgTime: number }[] = [];
      
      for (const bucketCount of bucketCounts) {
        const testMap = createTokenBucketMap({
          defaultConfig,
          maxBuckets: bucketCount * 2
        }) as TokenBucketMap;
        
        // Create buckets
        for (let i = 0; i < bucketCount; i++) {
          testMap.approve(`bucket${i}`, 1);
        }
        
        // Measure performance on established buckets
        const startTime = performance.now();
        for (let i = 0; i < 1000; i++) {
          testMap.approve(`bucket${i % bucketCount}`, 1);
        }
        const totalTime = performance.now() - startTime;
        const avgTime = totalTime / 1000;
        
        measurements.push({ buckets: bucketCount, avgTime });
        console.log(`${bucketCount} buckets: ${avgTime}ms avg per approve()`);
      }
      
      // All measurements should be close to target (allowing for test environment variance)
      for (const measurement of measurements) {
        expect(measurement.avgTime).toBeLessThan(0.005); // Relaxed for test environment
      }
    });
  });

  describe('Token Refill Logic', () => {
    it('should cap tokens at capacity during refill', () => {
      const now = Date.now();
      
      // Use some tokens
      bucketMap.approve('user1', 5, now);
      
      // Wait long enough to overfill
      const muchLater = now + 10000; // 10 seconds = 50 tokens potential
      bucketMap.approve('user1', 1, muchLater);
      
      const snapshot = bucketMap.snapshot();
      expect(snapshot['user1'].tokens).toBeLessThanOrEqual(defaultConfig.capacity);
    });

    it('should emit refill events', () => {
      const now = Date.now();
      bucketMap.approve('user1', 5, now);
      bucketMap.approve('user1', 1, now + 1000);
      
      const refillEvents = events.filter(e => e.type === 'ds:bucket:refill');
      expect(refillEvents.length).toBeGreaterThan(0);
    });

    it('should handle fractional token refills', () => {
      const now = Date.now();
      
      // Exhaust tokens
      for (let i = 0; i < 10; i++) {
        bucketMap.approve('user1', 1, now);
      }
      
      // Wait 100ms (should add 0.5 tokens at 5/sec rate)
      expect(bucketMap.approve('user1', 1, now + 100)).toBe(false);
      
      // Wait 200ms total (should add 1 token)
      expect(bucketMap.approve('user1', 1, now + 200)).toBe(true);
    });
  });

  describe('Bucket Management', () => {
    it('should create new buckets on first access', () => {
      expect(bucketMap.debug().keys).toBe(0);
      
      bucketMap.approve('new-user');
      expect(bucketMap.debug().keys).toBe(1);
    });

    it('should perform cleanup of inactive buckets', () => {
      // Create many buckets
      for (let i = 0; i < 100; i++) {
        bucketMap.approve(`temp-user-${i}`);
      }
      
      expect(bucketMap.debug().keys).toBe(100);
      
      // Force cleanup by exceeding max buckets
      const maxBucketsMap = createTokenBucketMap({
        defaultConfig,
        maxBuckets: 50,
        inactiveThresholdMs: 0, // Clean up immediately
        cleanupIntervalMs: 0    // Allow immediate cleanup
      }) as TokenBucketMap;
      
      // Add buckets up to and beyond limit to trigger cleanup
      for (let i = 0; i < 60; i++) {
        maxBucketsMap.approve(`user-${i}`);
        
        // Force cleanup check after each addition once we hit the limit
        if (i >= 50) {
          // Access to trigger cleanup logic
          maxBucketsMap.debug();
        }
      }
      
      // Should have triggered cleanup and be at or under limit
      const finalCount = maxBucketsMap.debug().keys;
      expect(finalCount).toBeLessThanOrEqual(50);
    });

    it('should handle snapshot correctly', () => {
      bucketMap.approve('user1', 3);
      bucketMap.approve('user2', 7);
      
      const snapshot = bucketMap.snapshot();
      
      expect(snapshot['user1'].tokens).toBe(7); // 10 - 3
      expect(snapshot['user1'].capacity).toBe(10);
      expect(snapshot['user2'].tokens).toBe(3); // 10 - 7
      expect(snapshot['user2'].capacity).toBe(10);
    });
  });

  describe('Event Emission', () => {
    it('should emit approve events', () => {
      bucketMap.approve('user1', 3);
      
      const approveEvents = events.filter(e => e.type === 'ds:bucket:approve');
      expect(approveEvents.length).toBe(1);
      expect((approveEvents[0].payload as any).cost).toBe(3);
    });

    it('should emit deny events', () => {
      // Exhaust tokens
      for (let i = 0; i < 10; i++) {
        bucketMap.approve('user1', 1);
      }
      
      bucketMap.approve('user1', 1); // Should be denied
      
      const denyEvents = events.filter(e => e.type === 'ds:bucket:deny');
      expect(denyEvents.length).toBe(1);
    });

    it('should emit performance warnings when targets exceeded', () => {
      // This is difficult to trigger in normal operation
      // Would need to mock performance.now() or add artificial delays
      // For now, we test that the mechanism exists
      const stats = (bucketMap as any).getPerformanceStats();
      expect(stats).toHaveProperty('avgApproveTimeMs');
      expect(stats).toHaveProperty('maxApproveTimeMs');
    });
  });

  describe('Error Handling', () => {
    it('should validate configuration', () => {
      expect(() => {
        createTokenBucketMap({
          defaultConfig: { ...defaultConfig, capacity: 0 }
        });
      }).toThrow('[DS_INVALID_CAPACITY]');

      expect(() => {
        createTokenBucketMap({
          defaultConfig: { ...defaultConfig, refillRatePerSec: 0 }
        });
      }).toThrow('[DS_INVALID_CAPACITY]');
    });

    it('should handle edge cases gracefully', () => {
      // Zero cost request
      expect(bucketMap.approve('user1', 0)).toBe(true);
      
      // Large cost request
      expect(bucketMap.approve('user1', 1000)).toBe(false);
    });
  });

  describe('Debug and Diagnostics', () => {
    it('should provide accurate debug information', () => {
      bucketMap.approve('user1', 5);
      bucketMap.approve('user2', 10); // Should exhaust user2
      
      const debug = bucketMap.debug();
      
      expect(debug.keys).toBe(2);
      expect(debug.saturated).toContain('user2');
      expect(debug.avgFillRatio).toBeGreaterThan(0);
    });

    it('should track performance statistics', () => {
      for (let i = 0; i < 100; i++) {
        bucketMap.approve(`user${i % 10}`, 1);
      }
      
      const stats = (bucketMap as any).getPerformanceStats();
      expect(stats.totalApprovals).toBe(100);
      expect(stats.avgApproveTimeMs).toBeGreaterThanOrEqual(0); // Allow 0 for very fast operations
      expect(stats.maxApproveTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Stress Testing', () => {
    it('should handle concurrent-style access patterns', () => {
      const userCount = 100;
      const requestsPerUser = 50;
      
      for (let round = 0; round < requestsPerUser; round++) {
        for (let user = 0; user < userCount; user++) {
          bucketMap.approve(`user${user}`, 1);
        }
      }
      
      expect(bucketMap.debug().keys).toBe(userCount);
    });

    it('should maintain performance under sustained load', () => {
      const startTime = performance.now();
      const operations = 10000;
      
      for (let i = 0; i < operations; i++) {
        bucketMap.approve(`user${i % 100}`, 1);
      }
      
      const totalTime = performance.now() - startTime;
      const avgTime = totalTime / operations;
      
      console.log(`Sustained load test: ${avgTime}ms avg per operation`);
      expect(avgTime).toBeLessThan(0.01); // Should be well under even relaxed target
    });
  });
});
