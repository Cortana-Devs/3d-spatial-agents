/**
 * Engine System Usage Example
 * Feature: F02-ENGINE
 * 
 * Demonstrates basic usage patterns and integration examples
 * for the Central Engine system.
 */

import { 
  createEngine, 
  EngineUtils, 
  EngineFactory,
  createTestHarness,
  runQuickTest
} from './index';

/**
 * Basic Engine Usage Example
 */
async function basicEngineExample() {
  console.log('🚀 Starting Basic Engine Example...');

  // Create a development engine
  const engine = await EngineFactory.createDevelopmentEngine('example_engine');

  // Register some test entities
  console.log('📝 Registering entities...');
  engine.registerEntity('human_1', 'HUMAN', 'player', { name: 'Alice', level: 1 });
  engine.registerEntity('simulant_1', 'SIMULANT', 'npc', { name: 'Bot_1', ai_type: 'basic' });
  engine.registerEntity('system_1', 'SYSTEM', 'manager', { role: 'world_manager' });

  // Subscribe to events
  console.log('👂 Setting up event listeners...');
  const unsubscribe = engine.on('entity:registered', (event) => {
    console.log(`✅ Entity registered: ${event.payload.entity.id} (${event.payload.entity.kind})`);
  });

  // Schedule some actions
  console.log('⏰ Scheduling actions...');
  const actionId = engine.scheduleAction({
    runAt: Date.now() + 1000,
    actionType: 'test.action',
    payload: { message: 'Hello from scheduled action!' },
    priority: 1
  });

  // Make some requests
  console.log('📤 Making requests...');
  
  // Request 1: Update entity metadata
  const updateRequest = EngineUtils.createRequest(
    'entity.updateMeta',
    'human_1',
    'HUMAN',
    {
      target: 'human_1',
      patch: { level: 2, experience: 100 }
    }
  );

  const updateResponse = await engine.request(updateRequest);
  console.log('📬 Update response:', updateResponse.ok ? 'Success' : 'Failed');

  // Request 2: Get engine snapshot
  const snapshotRequest = EngineUtils.createRequest(
    'engine.snapshot',
    'system_1',
    'SYSTEM',
    {}
  );

  const snapshotResponse = await engine.request(snapshotRequest);
  if (snapshotResponse.ok) {
    console.log('📸 Engine snapshot obtained:', {
      entities: snapshotResponse.result.entityCount,
      scheduled: snapshotResponse.result.scheduled.total
    });
  }

  // Manual tick to process scheduled actions
  console.log('⚡ Processing tick...');
  await engine.tick(1500); // Process actions due in the next 1.5 seconds

  // Get metrics
  console.log('📊 Engine metrics:');
  const metrics = engine.getMetrics();
  const formattedMetrics = EngineUtils.formatMetrics(metrics);
  Object.entries(formattedMetrics).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });

  // Cleanup
  unsubscribe();
  await engine.stop();
  console.log('✅ Basic example completed!');
}

/**
 * Permission System Example
 */
async function permissionExample() {
  console.log('🔐 Starting Permission System Example...');

  const engine = await EngineFactory.createTestEngine('permission_test');

  // Try to make a request as SIMULANT that should fail
  const unauthorizedRequest = EngineUtils.createRequest(
    'engine.snapshot',
    'simulant_1',
    'SIMULANT', // Simulants don't have ENGINE_INTROSPECT capability
    {}
  );

  const response = await engine.request(unauthorizedRequest);
  console.log('🚫 Unauthorized request result:', response.ok ? 'Unexpected success' : 'Correctly denied');
  
  if (!response.ok && response.error) {
    console.log(`   Error: ${response.error.message}`);
  }

  await engine.stop();
  console.log('✅ Permission example completed!');
}

/**
 * Event System Example
 */
async function eventSystemExample() {
  console.log('🎪 Starting Event System Example...');

  const engine = await EngineFactory.createDevelopmentEngine('event_test');

  // Set up multiple event listeners
  const eventCounts = {
    requests: 0,
    entities: 0,
    actions: 0,
    ticks: 0
  };

  engine.on('engine:request:received', () => eventCounts.requests++);
  engine.on('entity:registered', () => eventCounts.entities++);
  engine.on('scheduler:action:scheduled', () => eventCounts.actions++);
  engine.on('engine:tick:end', () => eventCounts.ticks++);

  // Generate some activity
  for (let i = 1; i <= 3; i++) {
    engine.registerEntity(`entity_${i}`, 'HUMAN', 'test_entity');
    
    engine.scheduleAction({
      runAt: Date.now() + (i * 100),
      actionType: 'test.action',
      payload: { iteration: i }
    });
  }

  // Process some ticks
  for (let i = 0; i < 3; i++) {
    await engine.tick(150);
  }

  console.log('📈 Event counts:', eventCounts);

  await engine.stop();
  console.log('✅ Event system example completed!');
}

/**
 * Performance Monitoring Example
 */
async function performanceMonitoringExample() {
  console.log('📊 Starting Performance Monitoring Example...');

  const engine = await EngineFactory.createHighPerformanceEngine('perf_test');

  // Simulate some load
  const startTime = Date.now();
  const numRequests = 100;

  console.log(`⚡ Simulating ${numRequests} requests...`);

  for (let i = 0; i < numRequests; i++) {
    const request = EngineUtils.createRequest(
      'entity.register',
      'system',
      'SYSTEM',
      {
        entityId: `load_test_entity_${i}`,
        kind: 'load_test'
      }
    );

    await engine.request(request);

    // Schedule some actions
    if (i % 10 === 0) {
      engine.scheduleAction({
        runAt: Date.now() + Math.random() * 1000,
        actionType: 'test.action',
        payload: { batch: Math.floor(i / 10) }
      });
    }
  }

  const loadTime = Date.now() - startTime;
  console.log(`⏱️  Load simulation completed in ${loadTime}ms`);

  // Get final metrics
  const metrics = engine.getMetrics();
  console.log('📊 Final performance metrics:');
  console.log(`   Requests/second: ${(metrics.requestsTotal / (loadTime / 1000)).toFixed(2)}`);
  console.log(`   Average latency: ${metrics.averageLatencyMs.toFixed(2)}ms`);
  console.log(`   Success rate: ${((1 - metrics.requestsFailed / metrics.requestsTotal) * 100).toFixed(1)}%`);

  await engine.stop();
  console.log('✅ Performance monitoring example completed!');
}

/**
 * Testing Framework Example
 */
async function testingFrameworkExample() {
  console.log('🧪 Starting Testing Framework Example...');

  // Run the built-in quick test
  const testPassed = await runQuickTest();
  
  if (testPassed) {
    console.log('✅ All built-in tests passed!');
  } else {
    console.log('❌ Some tests failed - check the output above');
  }

  // Create custom test harness
  const harness = createTestHarness();
  
  // Register a custom test scenario
  harness.registerScenario({
    id: 'custom_test',
    name: 'Custom Integration Test',
    description: 'Tests custom workflow',
    setup: [],
    actions: [
      {
        type: 'request',
        description: 'Register custom entity',
        data: {
          type: 'entity.register',
          payload: {
            entityId: 'custom_entity',
            kind: 'custom'
          }
        }
      }
    ],
    assertions: [
      {
        type: 'snapshot',
        description: 'Should have custom entity',
        validator: (engine) => {
          const snapshot = engine.snapshot();
          return snapshot.entities.includes('custom_entity');
        }
      }
    ]
  });

  console.log('🔬 Running custom test scenario...');
  const customResult = await harness.runScenario('custom_test');
  console.log(`Custom test: ${customResult.success ? 'PASSED' : 'FAILED'}`);

  console.log('✅ Testing framework example completed!');
}

/**
 * Main example runner
 */
async function runAllExamples() {
  console.log('🎯 Running All Engine Examples\n');

  try {
    await basicEngineExample();
    console.log('');
    
    await permissionExample();
    console.log('');
    
    await eventSystemExample();
    console.log('');
    
    await performanceMonitoringExample();
    console.log('');
    
    await testingFrameworkExample();
    console.log('');

    console.log('🎉 All examples completed successfully!');
  } catch (error) {
    console.error('❌ Example failed:', error);
  }
}

// Export for use in other modules
export {
  basicEngineExample,
  permissionExample,
  eventSystemExample,
  performanceMonitoringExample,
  testingFrameworkExample,
  runAllExamples
};

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}
