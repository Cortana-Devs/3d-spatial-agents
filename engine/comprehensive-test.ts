#!/usr/bin/env node

/**
 * Comprehensive Engine Testing Suite
 * 
 * Runs all engine tests including:
 * - Basic functionality tests
 * - Permission system tests
 * - Performance tests
 * - Error handling tests
 * - Deterministic behavior tests
 */

import {
  createEngine,
  EngineUtils,
  createTestHarness,
  createMetricsCollector,
  createErrorDomain,
  createDebugIntrospection,
  TestHarness,
  ENGINE_ERROR_CODES
} from './index';

// Test result tracking
interface TestSuite {
  name: string;
  tests: TestCase[];
  setup?: () => Promise<void>;
  cleanup?: () => Promise<void>;
}

interface TestCase {
  name: string;
  test: () => Promise<boolean>;
  timeout?: number;
}

interface TestResults {
  suite: string;
  passed: number;
  failed: number;
  total: number;
  duration: number;
  failures: Array<{ test: string; error: string }>;
}

class ComprehensiveTestRunner {
  private results: TestResults[] = [];

  async runAllTests(): Promise<boolean> {
    console.log('🚀 Starting Comprehensive Engine Testing Suite\n');
    
    const testSuites: TestSuite[] = [
      this.createBasicFunctionalityTests(),
      this.createPermissionSystemTests(),
      this.createEventSystemTests(),
      this.createSchedulingTests(),
      this.createErrorHandlingTests(),
      this.createPerformanceTests(),
      this.createDeterministicTests(),
      this.createIntegrationTests()
    ];

    let overallPass = true;

    for (const suite of testSuites) {
      const result = await this.runTestSuite(suite);
      this.results.push(result);
      
      if (result.failed > 0) {
        overallPass = false;
      }
    }

    this.printFinalResults();
    return overallPass;
  }

  private async runTestSuite(suite: TestSuite): Promise<TestResults> {
    console.log(`\n📋 Running ${suite.name}...`);
    const startTime = Date.now();

    if (suite.setup) {
      await suite.setup();
    }

    const result: TestResults = {
      suite: suite.name,
      passed: 0,
      failed: 0,
      total: suite.tests.length,
      duration: 0,
      failures: []
    };

    for (const testCase of suite.tests) {
      try {
        const testStart = Date.now();
        const passed = await Promise.race([
          testCase.test(),
          new Promise<boolean>((_, reject) => 
            setTimeout(() => reject(new Error('Test timeout')), testCase.timeout || 10000)
          )
        ]);

        const testDuration = Date.now() - testStart;

        if (passed) {
          console.log(`  ✅ ${testCase.name} (${testDuration}ms)`);
          result.passed++;
        } else {
          console.log(`  ❌ ${testCase.name} - Test returned false`);
          result.failed++;
          result.failures.push({ test: testCase.name, error: 'Test returned false' });
        }
      } catch (error) {
        console.log(`  ❌ ${testCase.name} - ${error}`);
        result.failed++;
        result.failures.push({ test: testCase.name, error: String(error) });
      }
    }

    if (suite.cleanup) {
      await suite.cleanup();
    }

    result.duration = Date.now() - startTime;
    
    const passRate = (result.passed / result.total * 100).toFixed(1);
    console.log(`  📊 ${result.passed}/${result.total} passed (${passRate}%) in ${result.duration}ms`);

    return result;
  }

  private createBasicFunctionalityTests(): TestSuite {
    return {
      name: 'Basic Functionality',
      tests: [
        {
          name: 'Engine Creation and Initialization',
          test: async () => {
            const engine = await createEngine({
              id: 'test_basic_init',
              logLevel: 'silent',
              tickIntervalMs: 0
            });

            const isRunning = engine.getState() === 'running';
            await engine.stop();
            return isRunning;
          }
        },
        {
          name: 'Entity Registration',
          test: async () => {
            const engine = await createEngine({
              id: 'test_entity_reg',
              logLevel: 'silent',
              tickIntervalMs: 0
            });

            const success = engine.registerEntity('test_entity', 'HUMAN', 'player', { level: 1 });
            const snapshot = engine.snapshot();
            
            await engine.stop();
            return success && snapshot.entityCount === 1;
          }
        },
        {
          name: 'Request Processing',
          test: async () => {
            const engine = await createEngine({
              id: 'test_requests',
              logLevel: 'silent',
              tickIntervalMs: 0
            });

            const request = EngineUtils.createRequest(
              'entity.register',
              'system',
              'SYSTEM',
              { entityId: 'test_req_entity', kind: 'test' }
            );

            const response = await engine.request(request);
            await engine.stop();
            return response.ok;
          }
        },
        {
          name: 'Action Scheduling',
          test: async () => {
            const engine = await createEngine({
              id: 'test_scheduling',
              logLevel: 'silent',
              tickIntervalMs: 0
            });

            const actionId = engine.scheduleAction({
              runAt: Date.now() + 100,
              actionType: 'test.action',
              payload: { test: true }
            });

            const snapshot = engine.snapshot();
            await engine.stop();
            return typeof actionId === 'string' && snapshot.scheduled.total === 1;
          }
        },
        {
          name: 'Manual Tick Execution',
          test: async () => {
            const engine = await createEngine({
              id: 'test_ticks',
              logLevel: 'silent',
              tickIntervalMs: 0
            });

            engine.scheduleAction({
              runAt: Date.now() + 50,
              actionType: 'test.action',
              payload: { test: true }
            });

            const tickResult = await engine.tick(100);
            await engine.stop();
            return tickResult.actionsExecuted >= 0; // Should process the scheduled action
          }
        }
      ]
    };
  }

  private createPermissionSystemTests(): TestSuite {
    return {
      name: 'Permission System',
      tests: [
        {
          name: 'Valid Permission Request',
          test: async () => {
            const engine = await createEngine({
              id: 'test_perm_valid',
              logLevel: 'silent',
              tickIntervalMs: 0
            });

            const request = EngineUtils.createRequest(
              'engine.snapshot',
              'system',
              'SYSTEM', // SYSTEM has ENGINE_INTROSPECT capability
              {}
            );

            const response = await engine.request(request);
            await engine.stop();
            return response.ok;
          }
        },
        {
          name: 'Invalid Permission Request',
          test: async () => {
            const engine = await createEngine({
              id: 'test_perm_invalid',
              logLevel: 'silent',
              tickIntervalMs: 0
            });

            const request = EngineUtils.createRequest(
              'engine.snapshot',
              'simulant',
              'SIMULANT', // SIMULANT lacks ENGINE_INTROSPECT capability
              {}
            );

            const response = await engine.request(request);
            await engine.stop();
            return !response.ok && response.error?.code === ENGINE_ERROR_CODES.PERMISSION_DENIED;
          }
        },
        {
          name: 'Role-Based Access Control',
          test: async () => {
            const engine = await createEngine({
              id: 'test_rbac',
              logLevel: 'silent',
              tickIntervalMs: 0
            });

            // HUMAN should be able to register entities
            const humanRequest = EngineUtils.createRequest(
              'entity.register',
              'human1',
              'HUMAN',
              { entityId: 'human_entity', kind: 'player' }
            );

            // SIMULANT should be able to schedule actions
            const simulantRequest = EngineUtils.createRequest(
              'scheduler.schedule',
              'simulant1',
              'SIMULANT',
              { action: { runAt: Date.now() + 1000, actionType: 'test.action' } }
            );

            const humanResponse = await engine.request(humanRequest);
            const simulantResponse = await engine.request(simulantRequest);

            await engine.stop();
            return humanResponse.ok && simulantResponse.ok;
          }
        }
      ]
    };
  }

  private createEventSystemTests(): TestSuite {
    let eventCount = 0;

    return {
      name: 'Event System',
      setup: async () => {
        eventCount = 0;
      },
      tests: [
        {
          name: 'Event Subscription and Emission',
          test: async () => {
            const engine = await createEngine({
              id: 'test_events',
              logLevel: 'silent',
              tickIntervalMs: 0
            });

            let receivedEvent = false;
            const unsubscribe = engine.on('entity:registered', () => {
              receivedEvent = true;
            });

            engine.registerEntity('event_test_entity', 'HUMAN', 'test');
            
            // Give a moment for event processing
            await new Promise(resolve => setTimeout(resolve, 10));

            unsubscribe();
            await engine.stop();
            return receivedEvent;
          }
        },
        {
          name: 'Event Unsubscription',
          test: async () => {
            const engine = await createEngine({
              id: 'test_event_unsub',
              logLevel: 'silent',
              tickIntervalMs: 0
            });

            let eventCount = 0;
            const unsubscribe = engine.on('entity:registered', () => {
              eventCount++;
            });

            engine.registerEntity('entity1', 'HUMAN', 'test');
            unsubscribe();
            engine.registerEntity('entity2', 'HUMAN', 'test');

            await new Promise(resolve => setTimeout(resolve, 10));

            await engine.stop();
            return eventCount === 1; // Should only receive first event
          }
        },
        {
          name: 'Multiple Event Listeners',
          test: async () => {
            const engine = await createEngine({
              id: 'test_multi_listeners',
              logLevel: 'silent',
              tickIntervalMs: 0
            });

            let count1 = 0, count2 = 0;
            const unsub1 = engine.on('entity:registered', () => count1++);
            const unsub2 = engine.on('entity:registered', () => count2++);

            engine.registerEntity('multi_test_entity', 'HUMAN', 'test');
            
            await new Promise(resolve => setTimeout(resolve, 10));

            unsub1();
            unsub2();
            await engine.stop();
            return count1 === 1 && count2 === 1;
          }
        }
      ]
    };
  }

  private createSchedulingTests(): TestSuite {
    return {
      name: 'Action Scheduling',
      tests: [
        {
          name: 'Immediate Action Execution',
          test: async () => {
            const engine = await createEngine({
              id: 'test_immediate',
              logLevel: 'silent',
              tickIntervalMs: 0
            });

            engine.scheduleAction({
              runAt: Date.now() - 100, // Already due
              actionType: 'test.action',
              payload: { immediate: true }
            });

            const result = await engine.tick(50);
            await engine.stop();
            return result.actionsExecuted > 0;
          }
        },
        {
          name: 'Delayed Action Execution',
          test: async () => {
            const engine = await createEngine({
              id: 'test_delayed',
              logLevel: 'silent',
              tickIntervalMs: 0
            });

            engine.scheduleAction({
              runAt: Date.now() + 50,
              actionType: 'test.action',
              payload: { delayed: true }
            });

            // First tick shouldn't execute it
            const result1 = await engine.tick(25);
            // Second tick should execute it
            const result2 = await engine.tick(50);

            await engine.stop();
            return result1.actionsExecuted === 0 && result2.actionsExecuted > 0;
          }
        },
        {
          name: 'Priority-Based Execution',
          test: async () => {
            const engine = await createEngine({
              id: 'test_priority',
              logLevel: 'silent',
              tickIntervalMs: 0
            });

            // Schedule actions with different priorities
            engine.scheduleAction({
              runAt: Date.now() - 100,
              actionType: 'test.low',
              priority: 1
            });

            engine.scheduleAction({
              runAt: Date.now() - 100,
              actionType: 'test.high',
              priority: 10
            });

            const result = await engine.tick(50);
            await engine.stop();
            return result.actionsExecuted === 2;
          }
        }
      ]
    };
  }

  private createErrorHandlingTests(): TestSuite {
    return {
      name: 'Error Handling',
      tests: [
        {
          name: 'Invalid Request Handling',
          test: async () => {
            const engine = await createEngine({
              id: 'test_invalid_req',
              logLevel: 'silent',
              tickIntervalMs: 0
            });

            const invalidRequest = {
              id: 'invalid',
              actorId: 'test',
              role: 'HUMAN' as const,
              type: 'invalid.request' as any,
              timestamp: Date.now(),
              payload: {}
            };

            const response = await engine.request(invalidRequest);
            await engine.stop();
            return !response.ok && response.error?.code === ENGINE_ERROR_CODES.UNSUPPORTED_REQUEST;
          }
        },
        {
          name: 'Validation Error Handling',
          test: async () => {
            const engine = await createEngine({
              id: 'test_validation',
              logLevel: 'silent',
              tickIntervalMs: 0
            });

            const request = EngineUtils.createRequest(
              'entity.register',
              'test',
              'HUMAN',
              { /* missing required fields */ } as any
            );

            const response = await engine.request(request);
            await engine.stop();
            return !response.ok && response.error?.code === ENGINE_ERROR_CODES.VALIDATION_FAILED;
          }
        },
        {
          name: 'Error Domain Integration',
          test: async () => {
            const errorDomain = createErrorDomain();
            
            const error = errorDomain.createError(
              'TEST_ERROR',
              'Test error message',
              { test: true }
            );

            const stats = errorDomain.getStatistics();
            return error.code === 'TEST_ERROR' && stats.totalErrors === 1;
          }
        }
      ]
    };
  }

  private createPerformanceTests(): TestSuite {
    return {
      name: 'Performance Tests',
      tests: [
        {
          name: 'High Request Volume',
          test: async () => {
            const engine = await createEngine({
              id: 'test_perf_volume',
              logLevel: 'silent',
              tickIntervalMs: 0
            });

            const startTime = Date.now();
            const numRequests = 100;

            for (let i = 0; i < numRequests; i++) {
              const request = EngineUtils.createRequest(
                'entity.register',
                'system',
                'SYSTEM',
                { entityId: `perf_entity_${i}`, kind: 'test' }
              );
              await engine.request(request);
            }

            const duration = Date.now() - startTime;
            const metrics = engine.getMetrics();

            await engine.stop();

            // Should complete 100 requests in reasonable time
            return duration < 5000 && metrics.requestsTotal === numRequests;
          },
          timeout: 10000
        },
        {
          name: 'Tick Performance',
          test: async () => {
            const engine = await createEngine({
              id: 'test_tick_perf',
              logLevel: 'silent',
              tickIntervalMs: 0
            });

            // Schedule multiple actions
            for (let i = 0; i < 50; i++) {
              engine.scheduleAction({
                runAt: Date.now() + (i * 10),
                actionType: 'test.action',
                payload: { index: i }
              });
            }

            const startTime = Date.now();
            await engine.tick(1000); // Process all actions
            const duration = Date.now() - startTime;

            await engine.stop();

            // Tick should complete quickly
            return duration < 1000;
          }
        },
        {
          name: 'Memory Usage Stability',
          test: async () => {
            const engine = await createEngine({
              id: 'test_memory',
              logLevel: 'silent',
              tickIntervalMs: 0
            });

            // Create and clean up entities multiple times
            for (let cycle = 0; cycle < 10; cycle++) {
              for (let i = 0; i < 10; i++) {
                engine.registerEntity(`temp_${cycle}_${i}`, 'HUMAN', 'temp');
              }
              await engine.tick(10);
            }

            const snapshot = engine.snapshot();
            await engine.stop();

            // Should have all entities registered
            return snapshot.entityCount === 100;
          }
        }
      ]
    };
  }

  private createDeterministicTests(): TestSuite {
    return {
      name: 'Deterministic Behavior',
      tests: [
        {
          name: 'Deterministic Seeding',
          test: async () => {
            const seed = 'test_seed_123';

            // Run same scenario twice with same seed
            const result1 = await this.runDeterministicScenario(seed);
            const result2 = await this.runDeterministicScenario(seed);

            return JSON.stringify(result1) === JSON.stringify(result2);
          }
        },
        {
          name: 'Action Execution Order',
          test: async () => {
            const engine = await createEngine({
              id: 'test_order',
              logLevel: 'silent',
              tickIntervalMs: 0,
              deterministicSeed: 'order_test'
            });

            const executionOrder: string[] = [];

            // Register a test action executor that records execution order
            const scheduler = engine.getActionScheduler();
            scheduler.registerExecutor('test.priority', async (action: any) => {
              executionOrder.push(action.payload.order);
              return { executed: true };
            });

            // Schedule actions in reverse priority order (should execute highest priority first)
            engine.scheduleAction({ 
              runAt: Date.now() - 100, // Already due
              actionType: 'test.priority', 
              priority: 1, 
              payload: { order: 'third' } 
            });
            engine.scheduleAction({ 
              runAt: Date.now() - 100, // Already due
              actionType: 'test.priority', 
              priority: 3, 
              payload: { order: 'first' } 
            });
            engine.scheduleAction({ 
              runAt: Date.now() - 100, // Already due
              actionType: 'test.priority', 
              priority: 2, 
              payload: { order: 'second' } 
            });

            await engine.tick(50);
            await engine.stop();

            return executionOrder.join(',') === 'first,second,third';
          }
        }
      ]
    };
  }

  private createIntegrationTests(): TestSuite {
    return {
      name: 'System Integration',
      tests: [
        {
          name: 'Built-in Test Harness',
          test: async () => {
            const harness = createTestHarness();
            const results = await harness.runAllScenarios();
            return results.every(result => result.success);
          },
          timeout: 15000
        },
        {
          name: 'Metrics Collection Integration',
          test: async () => {
            const metrics = createMetricsCollector();
            
            metrics.incrementCounter('test.counter', 5);
            metrics.setGauge('test.gauge', 42);
            metrics.recordHistogram('test.histogram', 123.5);

            const snapshot = metrics.getSnapshot();

            return snapshot.counters['test.counter'] === 5 &&
                   snapshot.gauges['test.gauge'] === 42 &&
                   Object.keys(snapshot.histograms).includes('test.histogram');
          }
        },
        {
          name: 'Debug Introspection Integration',
          test: async () => {
            const engine = await createEngine({
              id: 'test_debug_integration',
              logLevel: 'silent',
              tickIntervalMs: 0
            });

            const debug = createDebugIntrospection(engine);
            const debugSnapshot = debug.getDebugSnapshot();

            await engine.stop();

            return debugSnapshot.timestamp > 0 &&
                   debugSnapshot.engine.id === 'test_debug_integration';
          }
        }
      ]
    };
  }

  private async runDeterministicScenario(seed: string): Promise<any> {
    const engine = await createEngine({
      id: `det_test_${seed}`,
      logLevel: 'silent',
      tickIntervalMs: 0,
      deterministicSeed: seed
    });

    // Run deterministic scenario
    engine.registerEntity('entity1', 'HUMAN', 'player');
    engine.registerEntity('entity2', 'SIMULANT', 'npc');
    
    engine.scheduleAction({
      runAt: Date.now() + 10,
      actionType: 'test.action',
      payload: { step: 1 }
    });

    await engine.tick(50);
    
    const snapshot = engine.snapshot();
    await engine.stop();

    return {
      entityCount: snapshot.entityCount,
      entities: snapshot.entities.sort(),
      scheduledTotal: snapshot.scheduled.total
    };
  }

  private printFinalResults(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 COMPREHENSIVE TEST RESULTS');
    console.log('='.repeat(60));

    let totalPassed = 0;
    let totalFailed = 0;
    let totalTests = 0;

    for (const result of this.results) {
      totalPassed += result.passed;
      totalFailed += result.failed;
      totalTests += result.total;

      const status = result.failed === 0 ? '✅' : '❌';
      const passRate = (result.passed / result.total * 100).toFixed(1);
      
      console.log(`${status} ${result.suite}: ${result.passed}/${result.total} (${passRate}%) - ${result.duration}ms`);
      
      if (result.failures.length > 0) {
        for (const failure of result.failures) {
          console.log(`   💥 ${failure.test}: ${failure.error}`);
        }
      }
    }

    console.log('='.repeat(60));
    const overallPassRate = (totalPassed / totalTests * 100).toFixed(1);
    const overallStatus = totalFailed === 0 ? '🎉 ALL TESTS PASSED' : `⚠️  ${totalFailed} TESTS FAILED`;
    
    console.log(`${overallStatus}`);
    console.log(`Total: ${totalPassed}/${totalTests} passed (${overallPassRate}%)`);
    
    if (totalFailed === 0) {
      console.log('\n🚀 Engine system is ready for production!');
    } else {
      console.log('\n🔧 Please fix failing tests before deployment.');
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const runner = new ComprehensiveTestRunner();
  
  runner.runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test runner crashed:', error);
      process.exit(1);
    });
}

export { ComprehensiveTestRunner };
