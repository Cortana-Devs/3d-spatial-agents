/**
 * Central Engine Core Types
 * Feature: F02-ENGINE
 * Version: 1.0
 * 
 * Defines all core types, interfaces, and discriminated unions for the Engine system.
 * Provides strong typing for requests, responses, events, and domain entities.
 */

// Base identifiers
export type EngineId = string;
export type EntityId = string;
export type RequestId = string;
export type EventId = string;

// Role and capability system
export type Role = 'HUMAN' | 'SIMULANT' | 'SYSTEM';

export type Capability = 
  | 'WORLD_READ'
  | 'WORLD_MUTATE'
  | 'ENTITY_REGISTER'
  | 'ENTITY_CONTROL'
  | 'SCHEDULE_ACTION'
  | 'AGENT_DECIDE'
  | 'LLM_REQUEST'
  | 'RATE_STATS_READ'
  | 'ENGINE_INTROSPECT'
  | 'STRATEGY_SWITCH'
  | 'DEBUG_DUMP';

// Engine configuration
export interface EngineConfig {
  id: EngineId;
  maxEventDepth?: number;
  logLevel?: 'silent' | 'error' | 'warn' | 'info' | 'debug';
  deterministicSeed?: string | null;
  tickIntervalMs?: number;
}

// Base request structure
export interface EngineRequestBase {
  id: RequestId;
  actorId: EntityId;
  role: Role;
  type: string;
  timestamp: number;
}

// Discriminated union of all request types
export type EngineRequest = 
  | EntityRegisterRequest
  | EntityUpdateMetaRequest
  | WorldMutateRequest
  | SchedulerScheduleRequest
  | AgentCycleRequest
  | EngineSnapshotRequest
  | StrategySwitchRequest;

export interface EntityRegisterRequest extends EngineRequestBase {
  type: 'entity.register';
  payload: {
    entityId: EntityId;
    kind: string;
    meta?: Record<string, unknown>;
  };
}

export interface EntityUpdateMetaRequest extends EngineRequestBase {
  type: 'entity.updateMeta';
  payload: {
    target: EntityId;
    patch: Record<string, unknown>;
  };
}

export interface WorldMutateRequest extends EngineRequestBase {
  type: 'world.mutate';
  payload: {
    operation: string;
    data: unknown;
  };
}

export interface SchedulerScheduleRequest extends EngineRequestBase {
  type: 'scheduler.schedule';
  payload: {
    action: ScheduledActionInput;
  };
}

export interface AgentCycleRequest extends EngineRequestBase {
  type: 'agent.cycle';
  payload: {
    agentId: EntityId;
    contextHash: string;
  };
}

export interface EngineSnapshotRequest extends EngineRequestBase {
  type: 'engine.snapshot';
  payload: {};
}

export interface StrategySwitchRequest extends EngineRequestBase {
  type: 'strategy.switch';
  payload: {
    agentId: EntityId;
    strategyId: string;
  };
}

// Response types
export interface EngineResponse<T = unknown> {
  requestId: RequestId;
  ok: boolean;
  error?: EngineError;
  result?: T;
  elapsedMs: number;
}

export interface EngineError {
  code: string;
  message: string;
  details?: unknown;
}

// Error codes
export const ENGINE_ERROR_CODES = {
  PERMISSION_DENIED: 'ENGINE_PERMISSION_DENIED',
  VALIDATION_FAILED: 'ENGINE_VALIDATION_FAILED',
  ENTITY_NOT_FOUND: 'ENGINE_ENTITY_NOT_FOUND',
  ENTITY_DUPLICATE: 'ENGINE_ENTITY_DUPLICATE',
  SCHEDULER_CONFLICT: 'ENGINE_SCHEDULER_CONFLICT',
  NOT_INITIALIZED: 'ENGINE_NOT_INITIALIZED',
  INTERNAL_ERROR: 'ENGINE_INTERNAL_ERROR',
  UNSUPPORTED_REQUEST: 'ENGINE_UNSUPPORTED_REQUEST',
  EVENT_OVERFLOW: 'ENGINE_EVENT_OVERFLOW',
} as const;

// Entity management
export interface EntityDescriptor {
  id: EntityId;
  role: Role;
  kind: string;
  createdAt: number;
  meta?: Record<string, unknown>;
}

// Scheduling system
export interface ScheduledActionInput {
  id?: string;
  runAt: number;
  repeatEveryMs?: number;
  actionType: string;
  payload?: unknown;
  priority?: number;
}

export interface ScheduledAction extends Required<Omit<ScheduledActionInput, 'id'>> {
  id: string;
  createdAt: number;
  cancelled?: boolean;
  runs: number;
}

// Event system
export interface EngineEventBase {
  eventId: EventId;
  timestamp: number;
  type: string;
}

export type EngineEvent = 
  | EngineInitEvent
  | EngineTickStartEvent
  | EngineTickEndEvent
  | EngineRequestReceivedEvent
  | EngineRequestCompletedEvent
  | EngineRequestFailedEvent
  | EntityRegisteredEvent
  | EntityUpdatedEvent
  | SchedulerActionScheduledEvent
  | SchedulerActionExecutedEvent
  | SchedulerActionCancelledEvent
  | AgentCycleStartEvent
  | AgentCycleEndEvent
  | StrategyChangedEvent
  | ErrorRaisedEvent;

export interface EngineInitEvent extends EngineEventBase {
  type: 'engine:init';
  payload: { engineId: EngineId; config: EngineConfig };
}

export interface EngineTickStartEvent extends EngineEventBase {
  type: 'engine:tick:start';
  payload: { tickId: number; deltaMs: number };
}

export interface EngineTickEndEvent extends EngineEventBase {
  type: 'engine:tick:end';
  payload: { tickId: number; durationMs: number };
}

export interface EngineRequestReceivedEvent extends EngineEventBase {
  type: 'engine:request:received';
  payload: { requestId: RequestId; type: string; actorId: EntityId };
}

export interface EngineRequestCompletedEvent extends EngineEventBase {
  type: 'engine:request:completed';
  payload: { requestId: RequestId; elapsedMs: number };
}

export interface EngineRequestFailedEvent extends EngineEventBase {
  type: 'engine:request:failed';
  payload: { requestId: RequestId; error: EngineError };
}

export interface EntityRegisteredEvent extends EngineEventBase {
  type: 'entity:registered';
  payload: { entity: EntityDescriptor };
}

export interface EntityUpdatedEvent extends EngineEventBase {
  type: 'entity:updated';
  payload: { entityId: EntityId; patch: Record<string, unknown> };
}

export interface SchedulerActionScheduledEvent extends EngineEventBase {
  type: 'scheduler:action:scheduled';
  payload: { action: ScheduledAction };
}

export interface SchedulerActionExecutedEvent extends EngineEventBase {
  type: 'scheduler:action:executed';
  payload: { actionId: string; result: unknown };
}

export interface SchedulerActionCancelledEvent extends EngineEventBase {
  type: 'scheduler:action:cancelled';
  payload: { actionId: string };
}

export interface AgentCycleStartEvent extends EngineEventBase {
  type: 'agent:cycle:start';
  payload: { agentId: EntityId; contextHash: string };
}

export interface AgentCycleEndEvent extends EngineEventBase {
  type: 'agent:cycle:end';
  payload: { agentId: EntityId; result: unknown };
}

export interface StrategyChangedEvent extends EngineEventBase {
  type: 'strategy:changed';
  payload: { agentId: EntityId; oldStrategy?: string; newStrategy: string };
}

export interface ErrorRaisedEvent extends EngineEventBase {
  type: 'error:raised';
  payload: { error: EngineError; context?: unknown };
}

// Metrics and observability
export interface EngineMetrics {
  requestsTotal: number;
  requestsFailed: number;
  averageLatencyMs: number;
  activeEntities: number;
  scheduledActions: number;
  lastTickDurationMs: number;
  eventsEmitted: number;
  actionsExecuted: number;
}

// Engine snapshot for debugging
export interface EngineSnapshot {
  engineId: EngineId;
  configDigest: string;
  entityCount: number;
  entities: EntityId[];
  scheduled: {
    total: number;
    nextRunInMs: number | null;
  };
  metrics: EngineMetrics;
  version: string;
  now: number;
}

// Permission matrix types
export type PermissionMatrix = Record<Role, Set<Capability>>;

// Event listener types
export type EventListener<T extends EngineEvent = EngineEvent> = (event: T) => void;
export type EventListenerMap = Map<string, Set<EventListener>>;

// Logging levels
export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';

// Integration hooks (for future LLM and rate governor)
export interface LLMAdapter {
  // Placeholder for future LLM integration
  isReady(): boolean;
}

export interface RateGovernor {
  // Placeholder for future rate limiting
  canProceed(actorId: EntityId): boolean;
}
