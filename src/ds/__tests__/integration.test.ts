/**
 * Data Structures Integration Tests
 * Tests combinations of TimeWheelScheduler and TokenBucketMap
 * Validates they work together as designed in the master prompt
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  TimeWheelScheduler, 
  createTimeWheelScheduler,
  TokenBucketMap,
  createTokenBucketMap,
  createDSEventEmitter,
  DSEvent
} from '../index';

describe('Data Structures Integration', () => {
  let scheduler: TimeWheelScheduler;
  let rateLimiter: TokenBucketMap;
  let events: DSEvent[] = [];
  let eventEmitter: (event: DSEvent) => void;

  beforeEach(() => {
    events = [];
    eventEmitter = createDSEventEmitter();
    (eventEmitter as any).subscribe((event: DSEvent) => {
      events.push(event);
    });

    scheduler = createTimeWheelScheduler({
      slots: 10,
      slotDurationMs: 100
    }, eventEmitter) as TimeWheelScheduler;

    rateLimiter = createTokenBucketMap({
      defaultConfig: {
        capacity: 5,
        refillRatePerSec: 2,
        initialTokens: 5
      }
    }, eventEmitter) as TokenBucketMap;
  });

  describe('Rate-Limited Scheduling', () => {
    it('should coordinate rate limiting with scheduled execution', (done) => {
      const results: string[] = [];
      
      // Create a rate-limited task executor
      const executeRateLimitedTask = (userId: string, taskId: string) => {
        if (rateLimiter.approve(userId)) {
          results.push(`executed:${taskId}`);
        } else {
          results.push(`rate-limited:${taskId}`);
          // Reschedule after some delay
          scheduler.schedule(`retry-${taskId}`, 500, () => {
            executeRateLimitedTask(userId, `retry-${taskId}`);
          });
        }
      };

      // Schedule multiple tasks for same user
      scheduler.schedule('task1', 50, () => executeRateLimitedTask('user1', 'task1'));
      scheduler.schedule('task2', 75, () => executeRateLimitedTask('user1', 'task2'));
      scheduler.schedule('task3', 100, () => executeRateLimitedTask('user1', 'task3'));
      scheduler.schedule('task4', 125, () => executeRateLimitedTask('user1', 'task4'));
      scheduler.schedule('task5', 150, () => executeRateLimitedTask('user1', 'task5'));
      scheduler.schedule('task6', 175, () => executeRateLimitedTask('user1', 'task6'));

      // Execute initial batch
      scheduler.tick(200);
      
      // Some should execute, others should be rate-limited
      const executed = results.filter(r => r.startsWith('executed:')).length;
      const rateLimited = results.filter(r => r.startsWith('rate-limited:')).length;
      
      expect(executed).toBe(5); // Initial token capacity
      expect(rateLimited).toBe(1); // Last task should be rate-limited
      
      // Execute retry tasks after delay
      setTimeout(() => {
        scheduler.tick(800);
        
        // Retry tasks should now execute (tokens refilled)
        const finalExecuted = results.filter(r => r.startsWith('executed:')).length;
        expect(finalExecuted).toBeGreaterThan(5);
        done();
      }, 100);
    });
  });

  describe('Event Coordination', () => {
    it('should emit coordinated events from both structures', () => {
      let callbackExecuted = false;
      
      scheduler.schedule('test-task', 100, () => {
        rateLimiter.approve('test-user', 1);
        callbackExecuted = true;
      });
      
      scheduler.tick(150);
      
      expect(callbackExecuted).toBe(true);
      
      // Should have events from both scheduler and rate limiter
      const schedulerEvents = events.filter(e => e.type === 'ds:scheduler:due');
      const bucketEvents = events.filter(e => e.type === 'ds:bucket:approve');
      
      expect(schedulerEvents.length).toBe(1);
      expect(bucketEvents.length).toBe(1);
    });

    it('should handle event emission failures gracefully', () => {
      // Create an event emitter that throws
      const throwingEmitter = () => {
        throw new Error('Event emission failed');
      };

      const faultyScheduler = createTimeWheelScheduler({
        slots: 5,
        slotDurationMs: 100
      }, throwingEmitter);

      // Should not crash when events fail to emit
      expect(() => {
        faultyScheduler.schedule('test', 100, () => {});
        faultyScheduler.tick(150);
      }).not.toThrow();
    });
  });

  describe('Performance Under Load', () => {
    it('should maintain performance when used together', () => {
      const operations = 1000;
      const startTime = performance.now();
      
      // Simulate mixed workload
      for (let i = 0; i < operations; i++) {
        // Schedule tasks
        scheduler.schedule(`task-${i}`, (i % 10) * 50, () => {
          rateLimiter.approve(`user-${i % 100}`, 1);
        });
        
        // Also do direct rate limit checks
        rateLimiter.approve(`direct-user-${i % 50}`, 1);
      }
      
      // Execute all scheduled tasks
      scheduler.tick(1000);
      
      const totalTime = performance.now() - startTime;
      const avgTime = totalTime / (operations * 2); // 2 operations per iteration
      
      console.log(`Combined operations: ${avgTime}ms avg per operation`);
      
      // Should still be very fast
      expect(avgTime).toBeLessThan(0.01);
    });
  });

  describe('Memory Management', () => {
    it('should clean up resources properly', () => {
      // Create many resources
      for (let i = 0; i < 100; i++) {
        scheduler.schedule(`temp-${i}`, 50, () => {});
        rateLimiter.approve(`temp-user-${i}`, 1);
      }
      
      // Cancel half the scheduled tasks
      for (let i = 0; i < 50; i++) {
        scheduler.cancel(`temp-${i}`);
      }
      
      // Execute remaining tasks
      scheduler.tick(100);
      
      // Verify cleanup
      expect(scheduler.debug().scheduled).toBe(0);
      expect(rateLimiter.debug().keys).toBe(100);
    });
  });

  describe('Error Resilience', () => {
    it('should isolate errors between components', () => {
      // Schedule a task that will cause rate limiter error
      scheduler.schedule('error-task', 100, () => {
        // Try to access non-existent test method
        try {
          (rateLimiter as any)._nonExistentMethod();
        } catch (error) {
          // Error in callback shouldn't crash scheduler
        }
      });
      
      // Should complete without throwing
      expect(() => scheduler.tick(150)).not.toThrow();
      
      // Scheduler should still work for other tasks
      let normalTaskExecuted = false;
      scheduler.schedule('normal-task', 100, () => {
        normalTaskExecuted = true;
      });
      
      scheduler.tick(250);
      expect(normalTaskExecuted).toBe(true);
    });
  });

  describe('Determinism Verification', () => {
    it('should produce consistent results across runs', () => {
      const runExperiment = () => {
        const testScheduler = createTimeWheelScheduler({
          slots: 5,
          slotDurationMs: 100
        });
        
        const testRateLimiter = createTokenBucketMap({
          defaultConfig: {
            capacity: 3,
            refillRatePerSec: 1,
            initialTokens: 3
          }
        });
        
        const results: string[] = [];
        const tasks = ['A', 'B', 'C', 'D', 'E'];
        
        // Schedule tasks in specific order
        tasks.forEach((task, i) => {
          testScheduler.schedule(task, (i + 1) * 50, () => {
            if (testRateLimiter.approve('user')) {
              results.push(`approved:${task}`);
            } else {
              results.push(`denied:${task}`);
            }
          });
        });
        
        testScheduler.tick(1000);
        return results.join(',');
      };
      
      // Run multiple times
      const run1 = runExperiment();
      const run2 = runExperiment();
      const run3 = runExperiment();
      
      // Results should be identical (deterministic)
      expect(run1).toBe(run2);
      expect(run2).toBe(run3);
    });
  });
});
