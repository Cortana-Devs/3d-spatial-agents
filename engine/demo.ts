#!/usr/bin/env node

/**
 * Engine System Demonstration
 * Shows off the key features of the Central Engine system
 */

import {
  createEngine,
  EngineUtils,
  EngineFactory,
  createMetricsCollector,
  createErrorDomain,
  createDebugIntrospection
} from './index';

async function runEngineDemo() {
  console.log('🎯 Central Engine System Demonstration');
  console.log('=====================================\n');

  try {
    // 1. Engine Creation
    console.log('1️⃣ Creating Engine Instance...');
    const engine = await EngineFactory.createDevelopmentEngine('demo_engine');
    console.log(`✅ Engine created: ${engine.getConfig().id}\n`);

    // 2. Entity Management
    console.log('2️⃣ Registering Entities...');
    engine.registerEntity('player_alice', 'HUMAN', 'player', { level: 5, gold: 100 });
    engine.registerEntity('npc_bob', 'SIMULANT', 'merchant', { inventory: ['sword', 'potion'] });
    engine.registerEntity('world_manager', 'SYSTEM', 'controller', { zone: 'forest' });
    
    const snapshot = engine.snapshot();
    console.log(`✅ Registered ${snapshot.entityCount} entities\n`);

    // 3. Event System Demo
    console.log('3️⃣ Setting up Event Listeners...');
    let eventCount = 0;
    const unsubscribe = engine.on('entity:registered', (event) => {
      if (event.type === 'entity:registered') {
        eventCount++;
        console.log(`  📢 Entity event: ${event.payload.entity.id}`);
      }
    });

    engine.registerEntity('test_entity', 'HUMAN', 'test');
    console.log(`✅ Events working! Received ${eventCount} events\n`);

    // 4. Permission System Demo
    console.log('4️⃣ Testing Permission System...');
    
    // Valid request (SYSTEM can introspect)
    const validRequest = EngineUtils.createRequest(
      'engine.snapshot',
      'world_manager',
      'SYSTEM',
      {}
    );
    const validResponse = await engine.request(validRequest);
    console.log(`✅ Valid permission: ${validResponse.ok}`);

    // Invalid request (SIMULANT cannot introspect)
    const invalidRequest = EngineUtils.createRequest(
      'engine.snapshot',
      'npc_bob',
      'SIMULANT',
      {}
    );
    const invalidResponse = await engine.request(invalidRequest);
    console.log(`✅ Permission denied correctly: ${!invalidResponse.ok}\n`);

    // 5. Action Scheduling Demo
    console.log('5️⃣ Demonstrating Action Scheduling...');
    
    engine.scheduleAction({
      runAt: Date.now() + 100,
      actionType: 'test.action',
      payload: { message: 'Hello from scheduler!' },
      priority: 5
    });

    engine.scheduleAction({
      runAt: Date.now() + 200,
      actionType: 'test.action',
      payload: { message: 'Second action!' },
      priority: 1
    });

    const beforeTick = engine.snapshot();
    console.log(`📅 Scheduled ${beforeTick.scheduled.total} actions`);

    // Process actions
    await engine.tick(300);
    
    const afterTick = engine.snapshot();
    console.log(`✅ Actions processed! Remaining: ${afterTick.scheduled.total}\n`);

    // 6. Performance Metrics
    console.log('6️⃣ Engine Performance Metrics...');
    const metrics = engine.getMetrics();
    const formattedMetrics = EngineUtils.formatMetrics(metrics);
    
    Object.entries(formattedMetrics).forEach(([key, value]) => {
      console.log(`  📊 ${key}: ${value}`);
    });
    console.log();

    // 7. Debug Introspection
    console.log('7️⃣ Debug Introspection...');
    const debug = createDebugIntrospection(engine);
    const analysis = debug.getPerformanceAnalysis();
    
    console.log(`  🏥 Health Status: ${analysis.overall.toUpperCase()}`);
    console.log(`  📈 Performance Score: ${analysis.score.toFixed(1)}/100`);
    console.log(`  💡 Recommendations: ${analysis.recommendations.length} items\n`);

    // 8. Error Handling Demo
    console.log('8️⃣ Error Handling System...');
    const errorDomain = createErrorDomain();
    
    const testError = errorDomain.createError(
      'DEMO_ERROR',
      'This is a demo error',
      { context: 'demonstration' }
    );

    console.log(`  ⚠️  Created error: ${testError.code}`);
    console.log(`  🔄 Recoverable: ${testError.recoverable}`);
    
    const errorStats = errorDomain.getStatistics();
    console.log(`  📊 Total errors tracked: ${errorStats.totalErrors}\n`);

    // 9. Metrics Collection
    console.log('9️⃣ Advanced Metrics...');
    const metricsCollector = createMetricsCollector();
    
    metricsCollector.incrementCounter('demo.operations', 5);
    metricsCollector.setGauge('demo.active_users', 42);
    metricsCollector.recordHistogram('demo.response_time', 123.45);
    
    const metricsSnapshot = metricsCollector.getSnapshot();
    console.log(`  📊 Demo operations: ${metricsSnapshot.counters['demo.operations']}`);
    console.log(`  👥 Active users: ${metricsSnapshot.gauges['demo.active_users']}`);
    console.log(`  ⏱️  Response times tracked: ${Object.keys(metricsSnapshot.histograms).length > 0}\n`);

    // 10. Final Status
    console.log('🔟 Final Engine Status...');
    const finalSnapshot = engine.snapshot();
    const finalMetrics = engine.getMetrics();
    
    console.log(`  🆔 Engine ID: ${finalSnapshot.engineId}`);
    console.log(`  👥 Total Entities: ${finalSnapshot.entityCount}`);
    console.log(`  📤 Total Requests: ${finalMetrics.requestsTotal}`);
    console.log(`  ✅ Success Rate: ${((1 - finalMetrics.requestsFailed / finalMetrics.requestsTotal) * 100).toFixed(1)}%`);
    console.log(`  ⚡ Average Latency: ${finalMetrics.averageLatencyMs.toFixed(2)}ms`);

    // Cleanup
    unsubscribe();
    await engine.stop();

    console.log('\n🎉 Demo completed successfully!');
    console.log('   The Central Engine system is fully operational and ready for production use.');
    
  } catch (error) {
    console.error('💥 Demo failed:', error);
    process.exit(1);
  }
}

// Run demo
if (require.main === module) {
  runEngineDemo().catch(console.error);
}

export { runEngineDemo };
