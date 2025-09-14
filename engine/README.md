# Central Engine System (F02-ENGINE)

**Version:** 1.0  
**Feature ID:** F02-ENGINE  
**Type:** Authority & Mediation Layer  

The Central Engine is a comprehensive orchestration system that provides unified authority over all interactions in the 3D simulation environment. It implements a permission-enforced, event-driven architecture with deterministic behavior and comprehensive observability.

## 🎯 Core Objectives

- **Centralized Authority**: Single point of control for all system interactions
- **Permission Enforcement**: Role-based access control with capability mapping
- **Event-Driven Architecture**: Type-safe pub/sub system for internal communication
- **Deterministic Behavior**: Reproducible simulation with controlled randomness
- **Comprehensive Observability**: Metrics, logging, and debug introspection
- **Future-Ready Integration**: Prepared for LLM and rate governor integration

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Central Engine                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Request Router  │  │ Permission     │  │ Event Bus    │ │
│  │ • Validation    │  │ Matrix         │  │ • Type-safe  │ │
│  │ • Dispatch      │  │ • Role/Cap     │  │ • Async      │ │
│  │ • Response      │  │ • Audit        │  │ • Overflow   │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Entity Registry │  │ Action         │  │ Error Domain │ │
│  │ • Lifecycle     │  │ Scheduler      │  │ • Recovery   │ │
│  │ • Metadata      │  │ • Priority     │  │ • Patterns   │ │
│  │ • Indexing      │  │ • Recurring    │  │ • Circuit    │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Metrics        │  │ Debug          │  │ Integration  │ │
│  │ Collector      │  │ Introspection  │  │ Hooks        │ │
│  │ • Prometheus   │  │ • Performance  │  │ • LLM Ready  │ │
│  │ • Structured   │  │ • Health       │  │ • Rate Gov   │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Basic Usage

```typescript
import { createEngine, EngineUtils } from './engine';

// Create a development engine
const engine = await createEngine({
  id: 'my_simulation',
  logLevel: 'info',
  tickIntervalMs: 100
});

// Register entities
engine.registerEntity('player_1', 'HUMAN', 'player', { name: 'Alice' });
engine.registerEntity('npc_1', 'SIMULANT', 'agent', { ai_type: 'basic' });

// Subscribe to events
engine.on('entity:registered', (event) => {
  console.log('New entity:', event.payload.entity.id);
});

// Make requests
const request = EngineUtils.createRequest(
  'world.mutate',
  'player_1',
  'HUMAN',
  { operation: 'move', data: { x: 10, y: 20 } }
);

const response = await engine.request(request);
console.log('Request result:', response.ok);

// Schedule actions
engine.scheduleAction({
  runAt: Date.now() + 5000,
  actionType: 'npc.think',
  payload: { context: 'exploration' }
});

// Get engine status
const snapshot = engine.snapshot();
console.log('Engine state:', snapshot);
```

### Factory Methods

```typescript
import { EngineFactory } from './engine';

// Development environment
const devEngine = await EngineFactory.createDevelopmentEngine('dev_sim');

// Production environment
const prodEngine = await EngineFactory.createProductionEngine('prod_sim');

// Testing environment
const testEngine = await EngineFactory.createTestEngine('test_sim', 'deterministic_seed');

// High-performance environment
const hpEngine = await EngineFactory.createHighPerformanceEngine('hp_sim');
```

## 📋 API Reference

### Core Classes

#### `Engine`
Main orchestration class that provides the central authority interface.

**Methods:**
- `request(request: EngineRequest): Promise<EngineResponse>` - Process a request
- `registerEntity(id, role, kind, meta?): boolean` - Register an entity
- `scheduleAction(input: ScheduledActionInput): string` - Schedule an action
- `on(eventType, listener): () => void` - Subscribe to events
- `tick(deltaMs?): Promise<TickResult>` - Manual tick execution
- `snapshot(): EngineSnapshot` - Get engine state snapshot
- `getMetrics(): EngineMetrics` - Get performance metrics
- `stop(): Promise<void>` - Stop the engine

#### `PermissionMatrix`
Role-based access control system.

**Methods:**
- `checkPermission(actorId, role, capability): PermissionCheckResult`
- `checkMultiplePermissions(actorId, role, capabilities): PermissionCheckResult[]`
- `grantCapability(role, capability): void`
- `revokeCapability(role, capability): void`
- `getPermissionStats(): object`

#### `EntityRegistry`
Entity management and lifecycle tracking.

**Methods:**
- `registerEntity(id, role, kind, meta?): EntityRegistrationResult`
- `getEntity(id): ExtendedEntityDescriptor | undefined`
- `updateEntityMeta(id, patch): EntityRegistrationResult`
- `queryEntities(filter?): ExtendedEntityDescriptor[]`
- `getEntitiesByRole(role): ExtendedEntityDescriptor[]`

#### `ActionScheduler`
Task scheduling with priority and recurrence support.

**Methods:**
- `scheduleAction(input: ScheduledActionInput): ScheduledAction`
- `cancelAction(actionId): boolean`
- `registerExecutor(actionType, executor): void`
- `processImmediateActions(): Promise<ActionExecutionResult[]>`
- `getStatistics(): object`

### Request Types

All requests follow the discriminated union pattern:

```typescript
type EngineRequest = 
  | EntityRegisterRequest
  | EntityUpdateMetaRequest
  | WorldMutateRequest
  | SchedulerScheduleRequest
  | AgentCycleRequest
  | EngineSnapshotRequest
  | StrategySwitchRequest;
```

#### Entity Registration
```typescript
const request: EntityRegisterRequest = {
  id: 'req_123',
  actorId: 'system',
  role: 'SYSTEM',
  type: 'entity.register',
  timestamp: Date.now(),
  payload: {
    entityId: 'new_entity',
    kind: 'player',
    meta: { level: 1 }
  }
};
```

#### World Mutation
```typescript
const request: WorldMutateRequest = {
  id: 'req_124',
  actorId: 'player_1',
  role: 'HUMAN',
  type: 'world.mutate',
  timestamp: Date.now(),
  payload: {
    operation: 'place_block',
    data: { position: [10, 5, 20], blockType: 'stone' }
  }
};
```

### Permission System

#### Roles
- **HUMAN**: Human players with world interaction capabilities
- **SIMULANT**: AI agents with decision-making capabilities
- **SYSTEM**: System processes with full access

#### Capabilities
- `WORLD_READ` - Read world state
- `WORLD_MUTATE` - Modify world state
- `ENTITY_REGISTER` - Register new entities
- `ENTITY_CONTROL` - Control entity properties
- `SCHEDULE_ACTION` - Schedule actions
- `AGENT_DECIDE` - Make agent decisions
- `LLM_REQUEST` - Make LLM requests
- `ENGINE_INTROSPECT` - Access engine internals
- `STRATEGY_SWITCH` - Switch agent strategies
- `DEBUG_DUMP` - Access debug information

#### Default Permission Matrix
```typescript
HUMAN: ['WORLD_READ', 'WORLD_MUTATE', 'ENGINE_INTROSPECT', 'SCHEDULE_ACTION', 'ENTITY_REGISTER']
SIMULANT: ['WORLD_READ', 'AGENT_DECIDE', 'SCHEDULE_ACTION', 'WORLD_MUTATE', 'LLM_REQUEST']
SYSTEM: [ALL_CAPABILITIES]
```

## 🔍 Monitoring & Debugging

### Metrics Collection

```typescript
import { createMetricsCollector } from './engine';

const metrics = createMetricsCollector();

// Record custom metrics
metrics.incrementCounter('custom.operations', 1);
metrics.setGauge('active.connections', 42);
metrics.recordHistogram('request.latency', 125.5);

// Start performance timer
const timerId = metrics.startTimer('database', 'query', { table: 'users' });
// ... perform operation
metrics.stopTimer(timerId);

// Get metrics snapshot
const snapshot = metrics.getSnapshot();
console.log('Metrics:', snapshot);

// Export to Prometheus format
const prometheus = metrics.exportPrometheus();
```

### Debug Introspection

```typescript
import { createDebugIntrospection } from './engine';

const debug = createDebugIntrospection(engine);

// Get comprehensive debug snapshot
const debugSnapshot = debug.getDebugSnapshot();
console.log('Debug info:', debugSnapshot);

// Get real-time monitoring
const monitoring = debug.getRealTimeMonitoring();
console.log('Real-time:', monitoring);

// Get performance analysis
const analysis = debug.getPerformanceAnalysis();
console.log('Performance:', analysis);

// Generate report
const report = debug.generatePerformanceReport();
console.log(report);
```

### Error Handling

```typescript
import { createErrorDomain } from './engine';

const errorDomain = createErrorDomain();

// Create enhanced error
const error = errorDomain.createError(
  'CUSTOM_ERROR',
  'Something went wrong',
  { details: 'Additional context' },
  { severity: 'high', category: 'system' }
);

// Attempt recovery
const recovery = await errorDomain.attemptRecovery(error, async () => {
  // Retry logic
});

// Get error statistics
const stats = errorDomain.getStatistics();
console.log('Error stats:', stats);
```

## 🧪 Testing

### Built-in Test Harness

```typescript
import { createTestHarness, runQuickTest } from './engine';

// Run quick smoke tests
const passed = await runQuickTest();
console.log('Tests passed:', passed);

// Create custom test harness
const harness = createTestHarness();

// Register custom scenario
harness.registerScenario({
  id: 'my_test',
  name: 'My Custom Test',
  description: 'Tests my specific functionality',
  setup: [],
  actions: [
    {
      type: 'request',
      description: 'Test operation',
      data: { /* request data */ }
    }
  ],
  assertions: [
    {
      type: 'custom',
      description: 'Validate result',
      validator: (engine) => {
        // Custom validation logic
        return true;
      }
    }
  ]
});

// Run all scenarios
const results = await harness.runAllScenarios();
const report = harness.generateReport(results);
console.log(report);
```

### Test Utilities

```typescript
import { EngineFactory } from './engine';

// Create deterministic test engine
const testEngine = await EngineFactory.createTestEngine('test', 'seed123');

// Manual tick control
await testEngine.tick(100); // Process 100ms worth of actions

// Predictable results
const snapshot1 = testEngine.snapshot();
await testEngine.stop();

// Recreate with same seed
const testEngine2 = await EngineFactory.createTestEngine('test', 'seed123');
await testEngine2.tick(100);
const snapshot2 = testEngine2.snapshot();

// Snapshots should be identical
console.log('Deterministic:', JSON.stringify(snapshot1) === JSON.stringify(snapshot2));
```

## 📊 Performance Considerations

### Recommended Configurations

#### Development
- `tickIntervalMs: 100` (10 FPS)
- `logLevel: 'debug'`
- `maxEventDepth: 64`

#### Production
- `tickIntervalMs: 16` (60 FPS)
- `logLevel: 'warn'`
- `maxEventDepth: 32`

#### High-Performance
- `tickIntervalMs: 8` (120 FPS)
- `logLevel: 'error'`
- `maxEventDepth: 16`

### Optimization Tips

1. **Batch Operations**: Group multiple related requests together
2. **Event Filtering**: Only subscribe to necessary events
3. **Tick Budget**: Keep tick duration under 10ms average
4. **Memory Management**: Regular cleanup of completed actions
5. **Permission Caching**: Cache permission results for hot paths

## 🔌 Integration Hooks

### Future LLM Integration

```typescript
// LLM adapter interface (placeholder)
const llmAdapter: LLMAdapter = {
  isReady: () => true,
  // Future: processRequest, streamResponse, etc.
};

engine.attachLLMAdapter(llmAdapter);
```

### Future Rate Governor

```typescript
// Rate governor interface (placeholder)
const rateGovernor: RateGovernor = {
  canProceed: (actorId) => true,
  // Future: getRateLimit, updateLimits, etc.
};

engine.attachRateGovernor(rateGovernor);
```

## 📝 Logging Format

The engine uses structured logging with the following format:

```
2023-12-07T10:30:45.123Z [INFO ] [ENGINE      ] Engine initialized [id=sim_1][tick_interval=100ms]
2023-12-07T10:30:45.124Z [DEBUG] [ENTITY      ] Entity registered [id=player_1][role=HUMAN][kind=player]
2023-12-07T10:30:45.125Z [INFO ] [REQUEST     ] Request processed [id=req_123][type=entity.register][status=OK][latency=2.1ms]
2023-12-07T10:30:45.126Z [WARN ] [PERMISSION  ] Permission denied [actor=simulant_1][role=SIMULANT][capability=ENGINE_INTROSPECT]
```

## 🐛 Troubleshooting

### Common Issues

**High Latency**
- Check tick duration with `engine.getMetrics().lastTickDurationMs`
- Reduce work per tick or optimize action executors
- Consider async processing for heavy operations

**Permission Denied Errors**
- Verify role-capability mapping in permission matrix
- Check actor ID and role in requests
- Review audit log with `permissionMatrix.getRecentDenials()`

**Memory Growth**
- Monitor entity count with `engine.snapshot().entityCount`
- Check scheduled actions with `engine.getMetrics().scheduledActions`
- Clean up completed/cancelled actions periodically

**Event Overflow**
- Reduce `maxEventDepth` in config
- Check for circular event dependencies
- Review event listener implementations

### Debug Commands

```typescript
// Get comprehensive health check
const health = EngineDevUtils.validateEngineHealth(engine);
console.log('Health:', health);

// Get monitoring snapshot
const monitoring = EngineDevUtils.createMonitoringSnapshot(engine);
console.log('Monitoring:', monitoring);

// Format metrics for display
const formatted = EngineUtils.formatMetrics(engine.getMetrics());
console.table(formatted);
```

## 📚 Examples

See `example.ts` for comprehensive usage examples including:
- Basic engine operations
- Permission system usage
- Event handling patterns
- Performance monitoring
- Testing framework usage

## 🤝 Contributing

When extending the engine system:

1. **Maintain Type Safety**: Use discriminated unions for new request types
2. **Follow Logging Standards**: Use structured logging with proper categories
3. **Add Metrics**: Instrument new components with counters and timers
4. **Write Tests**: Include test scenarios for new functionality
5. **Update Documentation**: Keep README and code comments current

## 📄 License

This engine system is part of the Descendants project. See project root for license information.

---

**Built for the future. Ready today.**
