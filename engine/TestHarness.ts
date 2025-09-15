/**
 * TestHarness - Deterministic Testing and Simulation Framework
 * Feature: F02-ENGINE
 * 
 * Provides testing utilities for deterministic engine behavior validation,
 * scenario simulation, and regression testing.
 */

import { Engine, createEngine } from './Engine';
import { EngineUtils } from './index';
import {
  EngineConfig,
  EngineRequest,
  EngineResponse,
  Role,
  EntityId,
  ScheduledActionInput
} from './types';

/**
 * Test scenario definition
 */
export interface TestScenario {
  id: string;
  name: string;
  description: string;
  setup: TestScenarioStep[];
  actions: TestScenarioStep[];
  assertions: TestAssertion[];
  cleanup?: TestScenarioStep[];
}

/**
 * Test scenario step
 */
export interface TestScenarioStep {
  type: 'request' | 'tick' | 'wait' | 'setup' | 'verify';
  description: string;
  data?: any;
  expectedResult?: any;
  timeout?: number;
}

/**
 * Test assertion for validating engine state
 */
export interface TestAssertion {
  type: 'snapshot' | 'metrics' | 'entity' | 'custom';
  description: string;
  validator: (engine: Engine) => boolean | Promise<boolean>;
  errorMessage?: string;
}

/**
 * Test execution result
 */
export interface TestResult {
  scenario: string;
  success: boolean;
  duration: number;
  steps: {
    step: TestScenarioStep;
    success: boolean;
    duration: number;
    error?: string;
    result?: any;
  }[];
  assertions: {
    assertion: TestAssertion;
    success: boolean;
    error?: string;
  }[];
  snapshot?: any;
}

/**
 * Deterministic test environment
 */
export class TestHarness {
  private scenarios: Map<string, TestScenario> = new Map();
  private results: TestResult[] = [];

  /**
   * Register a test scenario
   */
  public registerScenario(scenario: TestScenario): void {
    this.scenarios.set(scenario.id, scenario);
  }

  /**
   * Run a specific test scenario
   */
  public async runScenario(scenarioId: string, config?: Partial<EngineConfig>): Promise<TestResult> {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) {
      throw new Error(`Test scenario '${scenarioId}' not found`);
    }

    const startTime = performance.now();
    const result: TestResult = {
      scenario: scenarioId,
      success: false,
      duration: 0,
      steps: [],
      assertions: []
    };

    // Create test engine with deterministic configuration
    const testConfig: EngineConfig = {
      id: `test_${scenarioId}_${Date.now()}`,
      logLevel: 'silent',
      tickIntervalMs: 0, // Manual tick control
      deterministicSeed: `test_${scenarioId}`,
      maxEventDepth: 16,
      ...config
    };

    const engine = await createEngine(testConfig);

    try {
      // Execute setup steps
      for (const step of scenario.setup) {
        const stepResult = await this.executeStep(engine, step);
        result.steps.push(stepResult);
        if (!stepResult.success) {
          throw new Error(`Setup step failed: ${stepResult.error}`);
        }
      }

      // Execute action steps
      for (const step of scenario.actions) {
        const stepResult = await this.executeStep(engine, step);
        result.steps.push(stepResult);
        if (!stepResult.success) {
          throw new Error(`Action step failed: ${stepResult.error}`);
        }
      }

      // Execute assertions
      for (const assertion of scenario.assertions) {
        const assertionResult = await this.executeAssertion(engine, assertion);
        result.assertions.push(assertionResult);
        if (!assertionResult.success) {
          throw new Error(`Assertion failed: ${assertionResult.error}`);
        }
      }

      // Cleanup
      if (scenario.cleanup) {
        for (const step of scenario.cleanup) {
          await this.executeStep(engine, step);
        }
      }

      result.success = true;
      result.snapshot = engine.snapshot();

    } catch (error) {
      result.success = false;
      console.error(`Test scenario '${scenarioId}' failed:`, error);
    } finally {
      await engine.stop();
      result.duration = performance.now() - startTime;
      this.results.push(result);
    }

    return result;
  }

  /**
   * Run all registered scenarios
   */
  public async runAllScenarios(config?: Partial<EngineConfig>): Promise<TestResult[]> {
    const results: TestResult[] = [];
    
    for (const scenarioId of this.scenarios.keys()) {
      const result = await this.runScenario(scenarioId, config);
      results.push(result);
    }

    return results;
  }

  /**
   * Generate test report
   */
  public generateReport(results?: TestResult[]): string {
    const testResults = results || this.results;
    const totalTests = testResults.length;
    const passedTests = testResults.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;

    const report = [
      '# Engine Test Report',
      `Generated: ${new Date().toISOString()}`,
      '',
      `## Summary`,
      `- Total Tests: ${totalTests}`,
      `- Passed: ${passedTests}`,
      `- Failed: ${failedTests}`,
      `- Success Rate: ${totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0}%`,
      '',
      '## Test Results',
      ''
    ];

    for (const result of testResults) {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      report.push(`### ${status} ${result.scenario}`);
      report.push(`Duration: ${result.duration.toFixed(2)}ms`);
      
      if (!result.success) {
        const failedSteps = result.steps.filter(s => !s.success);
        const failedAssertions = result.assertions.filter(a => !a.success);
        
        if (failedSteps.length > 0) {
          report.push('Failed Steps:');
          failedSteps.forEach(step => {
            report.push(`- ${step.step.description}: ${step.error}`);
          });
        }
        
        if (failedAssertions.length > 0) {
          report.push('Failed Assertions:');
          failedAssertions.forEach(assertion => {
            report.push(`- ${assertion.assertion.description}: ${assertion.error}`);
          });
        }
      }
      
      report.push('');
    }

    return report.join('\n');
  }

  /**
   * Create a basic smoke test scenario
   */
  public static createSmokeTestScenario(): TestScenario {
    return {
      id: 'smoke_test',
      name: 'Basic Smoke Test',
      description: 'Tests basic engine functionality',
      setup: [
        {
          type: 'setup',
          description: 'Initialize engine',
          data: {}
        }
      ],
      actions: [
        {
          type: 'request',
          description: 'Register a test entity',
          data: {
            type: 'entity.register',
            payload: {
              entityId: 'test_entity_1',
              kind: 'test_actor'
            }
          }
        },
        {
          type: 'request',
          description: 'Schedule a test action',
          data: {
            type: 'scheduler.schedule',
            payload: {
              action: {
                runAt: Date.now() + 100,
                actionType: 'test.action',
                payload: { test: true }
              }
            }
          }
        },
        {
          type: 'tick',
          description: 'Process scheduled actions',
          data: { deltaMs: 200 }
        },
        {
          type: 'request',
          description: 'Get engine snapshot',
          data: {
            type: 'engine.snapshot',
            payload: {}
          }
        }
      ],
      assertions: [
        {
          type: 'snapshot',
          description: 'Engine should have entities and processed actions',
          validator: (engine) => {
            const snapshot = engine.snapshot();
            return snapshot.entityCount > 0;
          },
          errorMessage: 'Engine should have registered entities'
        },
        {
          type: 'metrics',
          description: 'Engine should have processed requests',
          validator: (engine) => {
            const metrics = engine.getMetrics();
            return metrics.requestsTotal > 0;
          },
          errorMessage: 'Engine should have processed requests'
        }
      ]
    };
  }

  /**
   * Create a permission testing scenario
   */
  public static createPermissionTestScenario(): TestScenario {
    return {
      id: 'permission_test',
      name: 'Permission System Test',
      description: 'Tests permission validation and denial',
      setup: [],
      actions: [
        {
          type: 'request',
          description: 'SIMULANT tries to register entity (should succeed)',
          data: {
            type: 'entity.register',
            role: 'SIMULANT' as Role,
            payload: {
              entityId: 'simulant_entity',
              kind: 'agent'
            }
          }
        },
        {
          type: 'request',
          description: 'SIMULANT tries engine introspection (should fail)',
          data: {
            type: 'engine.snapshot',
            role: 'SIMULANT' as Role,
            payload: {}
          },
          expectedResult: { ok: false }
        }
      ],
      assertions: [
        {
          type: 'metrics',
          description: 'Should have both successful and failed requests',
          validator: (engine) => {
            const metrics = engine.getMetrics();
            return metrics.requestsTotal >= 2 && metrics.requestsFailed >= 1;
          },
          errorMessage: 'Permission system should have blocked unauthorized requests'
        }
      ]
    };
  }

  /**
   * Execute a single test step
   */
  private async executeStep(engine: Engine, step: TestScenarioStep): Promise<{
    step: TestScenarioStep;
    success: boolean;
    duration: number;
    error?: string;
    result?: any;
  }> {
    const startTime = performance.now();
    
    try {
      let result: any = null;

      switch (step.type) {
        case 'request':
          const request: EngineRequest = {
            id: EngineUtils.generateRequestId(),
            actorId: 'test_actor',
            role: step.data.role || 'SYSTEM',
            timestamp: Date.now(),
            ...step.data
          };
          result = await engine.request(request);
          
          // Check expected result if provided
          if (step.expectedResult && step.expectedResult.ok !== undefined) {
            if (result.ok !== step.expectedResult.ok) {
              throw new Error(`Expected ok=${step.expectedResult.ok}, got ok=${result.ok}`);
            }
          }
          break;

        case 'tick':
          result = await engine.tick(step.data?.deltaMs);
          break;

        case 'wait':
          await new Promise(resolve => setTimeout(resolve, step.data?.ms || 100));
          result = { waited: step.data?.ms || 100 };
          break;

        case 'setup':
        case 'verify':
          result = { completed: true };
          break;

        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      return {
        step,
        success: true,
        duration: performance.now() - startTime,
        result
      };

    } catch (error) {
      return {
        step,
        success: false,
        duration: performance.now() - startTime,
        error: String(error)
      };
    }
  }

  /**
   * Execute a test assertion
   */
  private async executeAssertion(engine: Engine, assertion: TestAssertion): Promise<{
    assertion: TestAssertion;
    success: boolean;
    error?: string;
  }> {
    try {
      const result = await assertion.validator(engine);
      
      return {
        assertion,
        success: result,
        error: result ? undefined : (assertion.errorMessage || 'Assertion failed')
      };

    } catch (error) {
      return {
        assertion,
        success: false,
        error: String(error)
      };
    }
  }

  /**
   * Clear test results
   */
  public clearResults(): void {
    this.results = [];
  }

  /**
   * Get all test results
   */
  public getResults(): TestResult[] {
    return [...this.results];
  }
}

/**
 * Factory function to create TestHarness with default scenarios
 */
export function createTestHarness(): TestHarness {
  const harness = new TestHarness();
  
  // Register default scenarios
  harness.registerScenario(TestHarness.createSmokeTestScenario());
  harness.registerScenario(TestHarness.createPermissionTestScenario());
  
  return harness;
}

/**
 * Quick test runner for development
 */
export async function runQuickTest(): Promise<boolean> {
  console.log('🧪 Running Engine Quick Test...');
  
  const harness = createTestHarness();
  const results = await harness.runAllScenarios();
  
  const allPassed = results.every(r => r.success);
  const report = harness.generateReport(results);
  
  console.log(report);
  console.log(allPassed ? '✅ All tests passed!' : '❌ Some tests failed!');
  
  return allPassed;
}
