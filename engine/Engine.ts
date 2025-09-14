/**
 * Engine - Central Authority and Orchestration Layer
 * Feature: F02-ENGINE
 * 
 * The main Engine class that orchestrates all subsystems and provides
 * the unified interface for all interactions in the simulation.
 * 
 * Responsibilities:
 * - Request processing and routing
 * - Entity management and lifecycle
 * - Action scheduling and execution
 * - Event emission and handling
 * - Permission enforcement
 * - Metrics collection and introspection
 */

import {
  EngineConfig,
  EngineRequest,
  EngineResponse,
  EngineEvent,
  EngineSnapshot,
  EngineMetrics,
  EntityId,
  Role,
  EventListener,
  LogLevel,
  ScheduledActionInput,
  LLMAdapter,
  RateGovernor,
  ENGINE_ERROR_CODES
} from './types';

import { EventBus } from './EventBus';
import { PermissionMatrix } from './PermissionMatrix';
import { EntityRegistry } from './EntityRegistry';
import { ActionScheduler } from './ActionScheduler';
import { RequestRouter } from './RequestRouter';

/**
 * Engine initialization state
 */
type EngineState = 'uninitialized' | 'initializing' | 'running' | 'stopping' | 'stopped' | 'error';

/**
 * Tick execution result
 */
interface TickResult {
  tickId: number;
  durationMs: number;
  actionsExecuted: number;
  eventsEmitted: number;
  errors: number;
}

/**
 * Integration adapters for future extensions
 */
interface EngineAdapters {
  llm?: LLMAdapter;
  rateGovernor?: RateGovernor;
}

export class Engine {
  private readonly config: EngineConfig;
  private state: EngineState = 'uninitialized';
  private readonly eventBus: EventBus;
  private readonly permissionMatrix: PermissionMatrix;
  private readonly entityRegistry: EntityRegistry;
  private readonly actionScheduler: ActionScheduler;
  private readonly requestRouter: RequestRouter;
  private readonly adapters: EngineAdapters = {};

  // Tick management
  private tickId: number = 0;
  private tickTimer: NodeJS.Timeout | null = null;
  private lastTickTime: number = 0;

  // Metrics
  private metrics: EngineMetrics = {
    requestsTotal: 0,
    requestsFailed: 0,
    averageLatencyMs: 0,
    activeEntities: 0,
    scheduledActions: 0,
    lastTickDurationMs: 0,
    eventsEmitted: 0,
    actionsExecuted: 0
  };

  // Singleton instance management
  private static instance: Engine | null = null;

  constructor(config: EngineConfig) {
    // Allow multiple instances in testing mode (when tickIntervalMs is 0)
    if (Engine.instance && Engine.instance.state !== 'stopped' && config.tickIntervalMs !== 0) {
      throw new Error('Engine instance already exists. Use Engine.getInstance() or stop the existing instance first.');
    }

    this.config = { ...this.getDefaultConfig(), ...config };
    this.lastTickTime = Date.now(); // Initialize tick time
    
    // Initialize subsystems
    this.eventBus = new EventBus(this.config.maxEventDepth, this.config.logLevel);
    this.permissionMatrix = new PermissionMatrix(undefined, 1000, this.config.logLevel);
    this.entityRegistry = new EntityRegistry(this.config.logLevel);
    this.actionScheduler = new ActionScheduler(1000, this.config.logLevel);
    this.requestRouter = new RequestRouter(this.permissionMatrix, this.config.logLevel);

    // Register request handlers
    this.registerRequestHandlers();

    // Register action executors
    this.registerActionExecutors();

    // Only set singleton for production instances (non-zero tick interval)
    if (config.tickIntervalMs !== 0) {
      Engine.instance = this;
    }
  }

  /**
   * Initialize and start the engine
   */
  public async init(): Promise<void> {
    if (this.state !== 'uninitialized') {
      throw new Error(`Engine cannot be initialized from state: ${this.state}`);
    }

    this.state = 'initializing';
    this.log('info', `[ENGINE][INIT][id=${this.config.id}][state=initializing]`);

    try {
      // Emit initialization event
      this.emitEvent({
        eventId: this.eventBus.generateEventId(),
        timestamp: Date.now(),
        type: 'engine:init',
        payload: { engineId: this.config.id, config: this.config }
      });

      // Start tick timer if configured
      if (this.config.tickIntervalMs && this.config.tickIntervalMs > 0) {
        this.startTickLoop();
      }

      this.state = 'running';
      this.log('info', `[ENGINE][INIT_COMPLETE][id=${this.config.id}][tick_interval=${this.config.tickIntervalMs}ms]`);

    } catch (error) {
      this.state = 'error';
      this.log('error', `[ENGINE][INIT_FAILED][id=${this.config.id}][error=${error}]`);
      throw error;
    }
  }

  /**
   * Stop the engine and clean up resources
   */
  public async stop(): Promise<void> {
    if (this.state === 'stopped' || this.state === 'stopping') {
      return;
    }

    this.state = 'stopping';
    this.log('info', `[ENGINE][STOPPING][id=${this.config.id}]`);

    // Stop tick loop
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }

    // Clear subsystems
    this.actionScheduler.clear();
    this.requestRouter.clear();
    this.eventBus.reset();
    this.entityRegistry.clear();

    this.state = 'stopped';
    
    // Clear singleton reference only if this is the current instance
    if (Engine.instance === this) {
      Engine.instance = null;
    }
    
    this.log('info', `[ENGINE][STOPPED][id=${this.config.id}]`);
  }

  /**
   * Process a request through the engine
   */
  public async request(request: EngineRequest): Promise<EngineResponse> {
    if (this.state !== 'running') {
      return {
        requestId: request.id,
        ok: false,
        error: {
          code: ENGINE_ERROR_CODES.NOT_INITIALIZED,
          message: `Engine is not running (state: ${this.state})`,
          details: { engineState: this.state }
        },
        elapsedMs: 0
      };
    }

    // Emit request received event
    this.emitEvent({
      eventId: this.eventBus.generateEventId(),
      timestamp: Date.now(),
      type: 'engine:request:received',
      payload: { requestId: request.id, type: request.type, actorId: request.actorId }
    });

    // Process request through router
    const response = await this.requestRouter.processRequest(request);

    // Update metrics
    this.metrics.requestsTotal++;
    if (!response.ok) {
      this.metrics.requestsFailed++;
    }

    // Emit completion/failure events
    if (response.ok) {
      this.emitEvent({
        eventId: this.eventBus.generateEventId(),
        timestamp: Date.now(),
        type: 'engine:request:completed',
        payload: { requestId: request.id, elapsedMs: response.elapsedMs }
      });
    } else {
      this.emitEvent({
        eventId: this.eventBus.generateEventId(),
        timestamp: Date.now(),
        type: 'engine:request:failed',
        payload: { requestId: request.id, error: response.error! }
      });
    }

    return response;
  }

  /**
   * Register an entity in the system
   */
  public registerEntity(id: EntityId, role: Role, kind: string, meta?: Record<string, unknown>): boolean {
    const result = this.entityRegistry.registerEntity(id, role, kind, meta);
    
    if (result.success && result.entity) {
      this.emitEvent({
        eventId: this.eventBus.generateEventId(),
        timestamp: Date.now(),
        type: 'entity:registered',
        payload: { entity: result.entity }
      });
      
      this.updateActiveEntitiesCount();
      return true;
    }

    return false;
  }

  /**
   * Schedule an action for execution
   */
  public scheduleAction(input: ScheduledActionInput): string {
    const action = this.actionScheduler.scheduleAction(input);
    
    this.emitEvent({
      eventId: this.eventBus.generateEventId(),
      timestamp: Date.now(),
      type: 'scheduler:action:scheduled',
      payload: { action }
    });

    this.updateScheduledActionsCount();
    return action.id;
  }

  /**
   * Subscribe to events
   */
  public on<T extends EngineEvent>(eventType: T['type'], listener: EventListener<T>): () => void {
    return this.eventBus.on(eventType, listener);
  }

  /**
   * Unsubscribe from events
   */
  public off<T extends EngineEvent>(eventType: T['type'], listener: EventListener<T>): void {
    this.eventBus.off(eventType, listener);
  }

  /**
   * Execute a manual tick (useful for testing or external tick control)
   */
  public async tick(deltaMs?: number): Promise<TickResult> {
    const startTime = performance.now();
    const currentTickId = ++this.tickId;
    const actualDelta = deltaMs || (this.config.tickIntervalMs || 100);

    this.emitEvent({
      eventId: this.eventBus.generateEventId(),
      timestamp: Date.now(),
      type: 'engine:tick:start',
      payload: { tickId: currentTickId, deltaMs: actualDelta }
    });

    let actionsExecuted = 0;
    let errors = 0;

    let currentTime: number;
    try {
      // Process due actions with simulated time advance for manual ticks
      currentTime = this.lastTickTime + actualDelta;
      const dueActions = this.actionScheduler.processDueActions(currentTime);
      
      // Execute immediate actions
      const results = await this.actionScheduler.processImmediateActions();
      actionsExecuted = results.length;
      
      errors = results.filter(r => !r.success).length;

      // Emit action execution events
      for (const result of results) {
        if (result.success) {
          this.emitEvent({
            eventId: this.eventBus.generateEventId(),
            timestamp: Date.now(),
            type: 'scheduler:action:executed',
            payload: { actionId: result.actionId, result: result.result }
          });
        }
      }

    } catch (error) {
      errors++;
      this.log('error', `[ENGINE][TICK_ERROR][tick=${currentTickId}][error=${error}]`);
    }

    const durationMs = performance.now() - startTime;
    this.metrics.lastTickDurationMs = durationMs;
    this.metrics.actionsExecuted += actionsExecuted;

    const tickResult: TickResult = {
      tickId: currentTickId,
      durationMs,
      actionsExecuted,
      eventsEmitted: 0, // Would need to track this from eventBus
      errors
    };

    this.emitEvent({
      eventId: this.eventBus.generateEventId(),
      timestamp: Date.now(),
      type: 'engine:tick:end',
      payload: { tickId: currentTickId, durationMs }
    });

    this.lastTickTime = currentTime; // Update to the simulated time
    return tickResult;
  }

  /**
   * Get engine snapshot for debugging and introspection
   */
  public snapshot(): EngineSnapshot {
    const entityStats = this.entityRegistry.getStatistics();
    const schedulerStats = this.actionScheduler.getStatistics();
    const nextExecution = this.actionScheduler.getNextExecutionTime();

    return {
      engineId: this.config.id,
      configDigest: this.generateConfigDigest(),
      entityCount: entityStats.activeEntities,
      entities: this.entityRegistry.getAllEntityIds(),
      scheduled: {
        total: schedulerStats.pendingActions,
        nextRunInMs: nextExecution ? Math.max(0, nextExecution - Date.now()) : null
      },
      metrics: { ...this.metrics },
      version: '1.0.0', // Could be injected from package.json
      now: Date.now()
    };
  }

  /**
   * Get current engine metrics
   */
  public getMetrics(): EngineMetrics {
    return { ...this.metrics };
  }

  /**
   * Get engine state
   */
  public getState(): EngineState {
    return this.state;
  }

  /**
   * Get engine configuration
   */
  public getConfig(): EngineConfig {
    return { ...this.config };
  }

  /**
   * Attach LLM adapter (future extension)
   */
  public attachLLMAdapter(adapter: LLMAdapter): void {
    this.adapters.llm = adapter;
    this.log('info', `[ENGINE][LLM_ADAPTER_ATTACHED]`);
  }

  /**
   * Attach rate governor (future extension)
   */
  public attachRateGovernor(governor: RateGovernor): void {
    this.adapters.rateGovernor = governor;
    this.log('info', `[ENGINE][RATE_GOVERNOR_ATTACHED]`);
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): Engine | null {
    return Engine.instance;
  }

  /**
   * Get action scheduler (for testing purposes)
   */
  public getActionScheduler(): ActionScheduler {
    return this.actionScheduler;
  }

  /**
   * Register request handlers for all supported request types
   */
  private registerRequestHandlers(): void {
    this.requestRouter.registerHandler('entity.register', async (request) => {
      if (request.type === 'entity.register') {
        const { entityId, kind, meta } = request.payload;
        const success = this.registerEntity(entityId, request.role, kind, meta);
        return { success, entityId };
      }
      throw new Error('Invalid request type');
    });

    this.requestRouter.registerHandler('entity.updateMeta', async (request) => {
      if (request.type === 'entity.updateMeta') {
        const { target, patch } = request.payload;
        const result = this.entityRegistry.updateEntityMeta(target, patch);
        
        if (result.success && result.entity) {
          this.emitEvent({
            eventId: this.eventBus.generateEventId(),
            timestamp: Date.now(),
            type: 'entity:updated',
            payload: { entityId: target, patch }
          });
        }
        
        return result;
      }
      throw new Error('Invalid request type');
    });

    this.requestRouter.registerHandler('world.mutate', async (request) => {
      if (request.type === 'world.mutate') {
        const { operation, data } = request.payload;
        // Placeholder for world mutation logic
        return { operation, data, success: true };
      }
      throw new Error('Invalid request type');
    });

    this.requestRouter.registerHandler('scheduler.schedule', async (request) => {
      if (request.type === 'scheduler.schedule') {
        const { action } = request.payload;
        const actionId = this.scheduleAction(action);
        return { actionId, scheduled: true };
      }
      throw new Error('Invalid request type');
    });

    this.requestRouter.registerHandler('agent.cycle', async (request) => {
      if (request.type === 'agent.cycle') {
        const { agentId, contextHash } = request.payload;
        
        this.emitEvent({
          eventId: this.eventBus.generateEventId(),
          timestamp: Date.now(),
          type: 'agent:cycle:start',
          payload: { agentId, contextHash }
        });

        // Placeholder for agent cycle logic
        const result = { agentId, contextHash, processed: true };

        this.emitEvent({
          eventId: this.eventBus.generateEventId(),
          timestamp: Date.now(),
          type: 'agent:cycle:end',
          payload: { agentId, result }
        });

        return result;
      }
      throw new Error('Invalid request type');
    });

    this.requestRouter.registerHandler('engine.snapshot', async (request) => {
      if (request.type === 'engine.snapshot') {
        return this.snapshot();
      }
      throw new Error('Invalid request type');
    });

    this.requestRouter.registerHandler('strategy.switch', async (request) => {
      if (request.type === 'strategy.switch') {
        const { agentId, strategyId } = request.payload;
        
        this.emitEvent({
          eventId: this.eventBus.generateEventId(),
          timestamp: Date.now(),
          type: 'strategy:changed',
          payload: { agentId, newStrategy: strategyId }
        });

        return { agentId, strategyId, switched: true };
      }
      throw new Error('Invalid request type');
    });
  }

  /**
   * Register action executors for scheduled actions
   */
  private registerActionExecutors(): void {
    // Placeholder executors - would be expanded based on actual action types needed
    this.actionScheduler.registerExecutor('test.action', async (action) => {
      return { actionId: action.id, executed: true, payload: action.payload };
    });

    this.actionScheduler.registerExecutor('entity.cleanup', async (action) => {
      // Example: cleanup inactive entities
      return { cleanedEntities: 0 };
    });
  }

  /**
   * Start the tick loop
   */
  private startTickLoop(): void {
    if (this.tickTimer || !this.config.tickIntervalMs) {
      return;
    }

    this.tickTimer = setInterval(async () => {
      try {
        await this.tick();
      } catch (error) {
        this.log('error', `[ENGINE][TICK_LOOP_ERROR][error=${error}]`);
      }
    }, this.config.tickIntervalMs);

    this.log('info', `[ENGINE][TICK_LOOP_STARTED][interval=${this.config.tickIntervalMs}ms]`);
  }

  /**
   * Emit an event through the event bus
   */
  private emitEvent(event: EngineEvent): void {
    this.eventBus.emit(event);
    this.metrics.eventsEmitted++;
  }

  /**
   * Update active entities count in metrics
   */
  private updateActiveEntitiesCount(): void {
    const stats = this.entityRegistry.getStatistics();
    this.metrics.activeEntities = stats.activeEntities;
  }

  /**
   * Update scheduled actions count in metrics
   */
  private updateScheduledActionsCount(): void {
    const stats = this.actionScheduler.getStatistics();
    this.metrics.scheduledActions = stats.pendingActions;
  }

  /**
   * Generate configuration digest for snapshot
   */
  private generateConfigDigest(): string {
    const configStr = JSON.stringify(this.config);
    // Simple hash function (in production, use a proper hash function)
    let hash = 0;
    for (let i = 0; i < configStr.length; i++) {
      const char = configStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Get default engine configuration
   */
  private getDefaultConfig(): Partial<EngineConfig> {
    return {
      maxEventDepth: 32,
      logLevel: 'info',
      deterministicSeed: null,
      tickIntervalMs: 100
    };
  }

  /**
   * Internal logging method
   */
  private log(level: LogLevel, message: string): void {
    if (this.shouldLog(level)) {
      const logMethods = {
        silent: () => {},
        error: console.error,
        warn: console.warn,
        info: console.info,
        debug: console.debug
      };
      
      logMethods[level](message);
    }
  }

  /**
   * Check if message should be logged based on current log level
   */
  private shouldLog(messageLevel: LogLevel): boolean {
    const levels = ['silent', 'error', 'warn', 'info', 'debug'];
    const currentLevelIndex = levels.indexOf(this.config.logLevel || 'info');
    const messageLevelIndex = levels.indexOf(messageLevel);
    
    return currentLevelIndex >= messageLevelIndex;
  }
}

/**
 * Factory function to create and initialize Engine instance
 */
export async function createEngine(config: EngineConfig): Promise<Engine> {
  const engine = new Engine(config);
  await engine.init();
  return engine;
}

/**
 * Get active engine instance
 */
export function getActiveEngine(): Engine | null {
  return Engine.getInstance();
}
