/**
 * Step 3 Usage Examples - TimeWheelScheduler & TokenBucketMap
 * Demonstrates practical usage patterns for the implemented data structures
 */

import {
  createTimeWheelScheduler,
  createTokenBucketMap,
  createDSEventEmitter,
  TimeWheelScheduler,
  TokenBucketMap,
  DSEvent
} from '../index';

// Example 1: Game Event Scheduling System
export function createGameEventScheduler() {
  console.log('\n🎮 Example 1: Game Event Scheduling');
  
  const eventEmitter = createDSEventEmitter();
  
  // Subscribe to events for debugging
  (eventEmitter as any).subscribe((event: DSEvent) => {
    if (event.type === 'ds:scheduler:due') {
      const payload = event.payload as any;
      console.log(`⏰ Scheduled event executed: ${payload.id} (${payload.latencyMs.toFixed(2)}ms)`);
    }
  });

  const scheduler = createTimeWheelScheduler({
    slots: 60,         // 60 slots
    slotDurationMs: 1000, // 1 second per slot = 1 minute total wheel
    maxDriftMs: 100    // Allow 100ms drift
  }, eventEmitter);

  // Schedule various game events
  scheduler.schedule('spawn-enemies', 5000, () => {
    console.log('🧌 Spawning enemies...');
  });

  scheduler.schedule('save-game', 30000, () => {
    console.log('💾 Auto-saving game...');
  });

  scheduler.schedule('weather-change', 15000, () => {
    console.log('🌧️ Weather changing...');
  });

  // Simulate game loop
  let gameTime = 0;
  const gameLoop = setInterval(() => {
    gameTime += 1000;
    scheduler.tick(Date.now());
    
    if (gameTime >= 35000) {
      clearInterval(gameLoop);
      console.log('Game simulation ended');
    }
  }, 1000);

  return scheduler;
}

// Example 2: API Rate Limiting System
export function createAPIRateLimiter() {
  console.log('\n🌐 Example 2: API Rate Limiting');

  const eventEmitter = createDSEventEmitter();
  
  // Monitor rate limiting events
  (eventEmitter as any).subscribe((event: DSEvent) => {
    if (event.type === 'ds:bucket:deny') {
      const payload = event.payload as any;
      console.log(`🚫 Rate limited: ${payload.key} (requested ${payload.cost}, had ${payload.availableTokens})`);
    } else if (event.type === 'ds:bucket:approve') {
      const payload = event.payload as any;
      console.log(`✅ Request approved: ${payload.key} (${payload.remainingTokens} tokens left)`);
    }
  });

  const rateLimiter = createTokenBucketMap({
    defaultConfig: {
      capacity: 100,        // 100 requests
      refillRatePerSec: 10, // 10 requests per second refill
      initialTokens: 50     // Start with 50 tokens
    },
    maxBuckets: 10000,
    cleanupIntervalMs: 300000,   // 5 minutes
    inactiveThresholdMs: 600000  // 10 minutes
  }, eventEmitter);

  // Simulate API requests from different users
  const users = ['alice', 'bob', 'charlie', 'diana'];
  
  const makeAPIRequest = (user: string, endpoint: string, cost: number = 1) => {
    const approved = rateLimiter.approve(user, cost);
    console.log(`📡 ${user} -> ${endpoint}: ${approved ? 'SUCCESS' : 'RATE_LIMITED'}`);
    return approved;
  };

  // Simulate burst of requests
  console.log('Simulating API request burst...');
  for (let i = 0; i < 20; i++) {
    const user = users[i % users.length];
    const endpoint = i % 3 === 0 ? 'expensive-operation' : 'normal-operation';
    const cost = endpoint === 'expensive-operation' ? 5 : 1;
    
    makeAPIRequest(user, endpoint, cost);
  }

  return rateLimiter;
}

// Example 3: Combined Task Scheduling with Rate Limiting
export function createTaskProcessingSystem() {
  console.log('\n⚡ Example 3: Task Processing with Rate Limiting');

  const eventEmitter = createDSEventEmitter();
  let taskResults: Array<{ taskId: string; userId: string; result: string }> = [];

  const scheduler = createTimeWheelScheduler({
    slots: 20,
    slotDurationMs: 100 // 2 second total wheel
  }, eventEmitter);

  const rateLimiter = createTokenBucketMap({
    defaultConfig: {
      capacity: 5,
      refillRatePerSec: 2,
      initialTokens: 5
    }
  }, eventEmitter);

  interface Task {
    id: string;
    userId: string;
    priority: 'high' | 'normal' | 'low';
    processingCost: number;
  }

  const processTask = (task: Task): void => {
    // Check rate limit for user
    if (!rateLimiter.approve(task.userId, task.processingCost)) {
      // Rate limited - reschedule for later
      const delay = task.priority === 'high' ? 500 : 1000;
      scheduler.schedule(`retry-${task.id}`, delay, () => {
        console.log(`🔄 Retrying rate-limited task: ${task.id}`);
        processTask(task);
      });
      
      taskResults.push({
        taskId: task.id,
        userId: task.userId,
        result: 'RATE_LIMITED_RETRY_SCHEDULED'
      });
      return;
    }

    // Process the task
    console.log(`⚙️ Processing task ${task.id} for ${task.userId} (cost: ${task.processingCost})`);
    taskResults.push({
      taskId: task.id,
      userId: task.userId,
      result: 'PROCESSED'
    });
  };

  const scheduleTask = (task: Task, delayMs: number = 0): void => {
    scheduler.schedule(task.id, delayMs, () => processTask(task));
  };

  // Schedule various tasks
  const tasks: Task[] = [
    { id: 'task1', userId: 'user1', priority: 'high', processingCost: 2 },
    { id: 'task2', userId: 'user1', priority: 'normal', processingCost: 1 },
    { id: 'task3', userId: 'user2', priority: 'high', processingCost: 3 },
    { id: 'task4', userId: 'user1', priority: 'low', processingCost: 1 },
    { id: 'task5', userId: 'user2', priority: 'normal', processingCost: 2 },
    { id: 'task6', userId: 'user1', priority: 'high', processingCost: 2 },
  ];

  tasks.forEach((task, index) => {
    const delay = index * 200; // Spread tasks over time
    scheduleTask(task, delay);
  });

  // Execute all scheduled tasks
  setTimeout(() => {
    scheduler.tick(2000);
    
    console.log('\n📊 Task Processing Results:');
    taskResults.forEach(result => {
      console.log(`  ${result.taskId} (${result.userId}): ${result.result}`);
    });

    // Show final state
    console.log('\n📈 System State:');
    console.log('Scheduler:', scheduler.debug());
    console.log('Rate Limiter:', rateLimiter.debug());
  }, 100);

  return { scheduler, rateLimiter, getResults: () => taskResults };
}

// Example 4: Performance Monitoring
export function createPerformanceMonitor() {
  console.log('\n📊 Example 4: Performance Monitoring');

  const eventEmitter = createDSEventEmitter();
  const performanceMetrics = {
    schedulerEvents: 0,
    rateLimitApprovals: 0,
    rateLimitDenials: 0,
    avgSchedulerLatency: 0,
    maxSchedulerLatency: 0
  };

  let schedulerLatencies: number[] = [];

  (eventEmitter as any).subscribe((event: DSEvent) => {
    switch (event.type) {
      case 'ds:scheduler:due':
        performanceMetrics.schedulerEvents++;
        const latency = (event.payload as any).latencyMs;
        schedulerLatencies.push(latency);
        performanceMetrics.avgSchedulerLatency = 
          schedulerLatencies.reduce((a, b) => a + b) / schedulerLatencies.length;
        performanceMetrics.maxSchedulerLatency = Math.max(
          performanceMetrics.maxSchedulerLatency, 
          latency
        );
        break;
        
      case 'ds:bucket:approve':
        performanceMetrics.rateLimitApprovals++;
        break;
        
      case 'ds:bucket:deny':
        performanceMetrics.rateLimitDenials++;
        break;
    }
  });

  const scheduler = createTimeWheelScheduler({
    slots: 10,
    slotDurationMs: 50
  }, eventEmitter);

  const rateLimiter = createTokenBucketMap({
    defaultConfig: {
      capacity: 10,
      refillRatePerSec: 5
    }
  }, eventEmitter);

  // Generate load
  for (let i = 0; i < 50; i++) {
    scheduler.schedule(`perf-task-${i}`, i * 10, () => {
      // Simulate work
      const start = performance.now();
      while (performance.now() - start < 0.1) { /* busy wait */ }
      
      rateLimiter.approve(`user${i % 5}`, 1);
    });
  }

  scheduler.tick(1000);

  console.log('Performance Metrics:');
  console.log(`  Scheduler events: ${performanceMetrics.schedulerEvents}`);
  console.log(`  Rate limit approvals: ${performanceMetrics.rateLimitApprovals}`);
  console.log(`  Rate limit denials: ${performanceMetrics.rateLimitDenials}`);
  console.log(`  Avg scheduler latency: ${performanceMetrics.avgSchedulerLatency.toFixed(4)}ms`);
  console.log(`  Max scheduler latency: ${performanceMetrics.maxSchedulerLatency.toFixed(4)}ms`);

  return performanceMetrics;
}

// Run all examples
export function runAllExamples() {
  console.log('🚀 Advanced Data Structures - Step 3 Usage Examples');
  console.log('='.repeat(60));

  createGameEventScheduler();
  setTimeout(() => {
    createAPIRateLimiter();
    setTimeout(() => {
      createTaskProcessingSystem();
      setTimeout(() => {
        createPerformanceMonitor();
      }, 2500);
    }, 1000);
  }, 1000);
}

// Run examples if called directly
if (import.meta.url.endsWith(process.argv[1])) {
  runAllExamples();
}
