```Descendants/🚧 ✅ DEVELOPMENT-PLAN ✅ 🚧/PROMPTS/🧠 NEXT-FEATURES/02-ENGINE/MASTER_PROMPT.md#L1-360
# MASTER PROMPT: CENTRAL ENGINE (AUTHORITY & MEDIATION LAYER)
Version: 1.0  
Feature ID: F02-ENGINE  
Authoring Mode: Core Systems / Orchestration / Governance Architecture  
Primary Goal: Implement a single authoritative Engine that mediates ALL interactions (human → request → validation → execution), governs simulant agents, routes world mutations, enforces permissions, emits structured events, and provides deterministic, inspectable simulation ticks. Future-ready for LLM-mediated reasoning & adaptive rate governance.

------------------------------------------------------------
SECTION 1: ULTRA-COMPRESSED CONTEXT SNAPSHOT
------------------------------------------------------------
WORLD_TYPE=3D_INTERACTIVE_SIM  
CURRENT_STATE=No unified engine; ad-hoc logic risk  
REQUIRED_PILLARS=Orchestration | Permission | Events | Scheduling | Determinism | Observability  
AGENTS=Human clients + Simulant entities (LLM-driven later)  
NON-GOAL=Rendering / asset specifics (handled elsewhere)  
FUTURE_HOOKS=LLMManager, RateGovernor, Behavior Strategies  

------------------------------------------------------------
SECTION 2: CORE OBJECTIVES
------------------------------------------------------------
O1: Provide Engine singleton (or controlled instance) with strict API surface.  
O2: Centralize entity registration (avatars, agents, systems).  
O3: Enforce permission gating via capability matrix per role.  
O4: Provide typed EventBus for internal pub/sub.  
O5: Route all mutating actions through `Engine.request`.  
O6: Implement tick loop (time-stepped) with deterministic order (FIFO per priority).  
O7: Provide scheduling: immediate vs delayed vs recurring actions.  
O8: Expose snapshot/debug introspection (for UI or /debug endpoint).  
O9: Base integration seam for later LLM adapter invocation (abstraction only now).  
O10: Structured logging & metrics enumerations (stats on requests, latency).  
O11: Robust error domain & recovery paths (graceful degrade).  
O12: Zero direct outbound network usage by agents (must call Engine).  

------------------------------------------------------------
SECTION 3: ACCEPTANCE CRITERIA
------------------------------------------------------------
AC1: All mutations require `Engine.request(...)` returning standardized response object.  
AC2: Permission failures return typed error preserving audit trail.  
AC3: EventBus handles subscribe/emit/unsubscribe with type safety.  
AC4: Deterministic action execution ordering under identical tick seeds.  
AC5: Engine snapshot returns: entities[], pendingActions[], metrics, version.  
AC6: Supports scheduling delayed action + cancellation.  
AC7: Entity registration rejects duplicate IDs.  
AC8: No cyclic event recursion without guard depth (maxDepth configurable).  
AC9: Logging lines for each request: [ENGINE][REQ][id][actor][action][status].  
AC10: Unit simulation harness replays deterministic scenario with same results.  

------------------------------------------------------------
SECTION 4: CONSTRAINTS
------------------------------------------------------------
C1: Pure TypeScript; no runtime side-effects at import.  
C2: No framework coupling (React UI interacts through adapters).  
C3: Strong typing (discriminated unions for requests & events).  
C4: Engine must NOT depend on LLM SDK directly (adapter interface injection).  
C5: No global `any`; no untyped event payloads.  
C6: Designed for future concurrency but currently single-threaded tick loop.  
C7: Soft real-time target: tick execution budget < 10ms average (baseline scenario).  

------------------------------------------------------------
SECTION 5: ARCHITECTURE MODULES
------------------------------------------------------------
1. Engine Core (orchestrator facade)  
2. Request Router (validation → dispatch pipeline)  
3. Permission Matrix (role/capability mapping)  
4. Entity Registry (metadata store, lookup, lifecycle)  
5. Event Bus (typed, synchronous dispatch; queue shield optional)  
6. Action Scheduler (immediate, delayed, recurring tasks)  
7. World State Facade (query-only outside mutators)  
8. Metrics & Logging Collector (counters, histograms placeholders)  
9. Error Domain (typed errors: PermissionError, ValidationError, EngineStateError, RateLimitError)  
10. Debug Snapshot / Introspection API  
11. Integration Hook Layer (LLMAdapter placeholder, RateGovernor placeholder)  

------------------------------------------------------------
SECTION 6: DOMAIN TYPES (INITIAL PROPOSAL)
------------------------------------------------------------
type EngineId = string  
type EntityId = string  
type Role = 'HUMAN' | 'SIMULANT' | 'SYSTEM'  
type Capability =
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
  | 'DEBUG_DUMP'  

interface EngineConfig {
  id: EngineId
  maxEventDepth?: number
  logLevel?: 'silent'|'error'|'warn'|'info'|'debug'
  deterministicSeed?: string | null
  tickIntervalMs?: number
}

interface EngineRequestBase {
  id: string
  actorId: EntityId
  role: Role
  type: string
  timestamp: number
  payload: unknown
}

type EngineRequest =
  | { type: 'entity.register'; actorId: EntityId; role: Role; id: EntityId; kind: string; meta?: Record<string,unknown>; timestamp: number }
  | { type: 'entity.updateMeta'; actorId: EntityId; role: Role; target: EntityId; patch: Record<string,unknown>; timestamp: number }
  | { type: 'world.mutate'; actorId: EntityId; role: Role; operation: string; data: unknown; timestamp: number }
  | { type: 'scheduler.schedule'; actorId: EntityId; role: Role; action: ScheduledActionInput; timestamp: number }
  | { type: 'agent.cycle'; actorId: EntityId; role: Role; agentId: EntityId; contextHash: string; timestamp: number }
  | { type: 'engine.snapshot'; actorId: EntityId; role: Role; timestamp: number }
  | { type: 'strategy.switch'; actorId: EntityId; role: Role; agentId: EntityId; strategyId: string; timestamp: number }

interface EngineResponse {
  requestId: string
  ok: boolean
  error?: EngineError
  result?: unknown
  elapsedMs: number
}

interface EngineError {
  code: string
  message: string
  details?: unknown
}

interface EntityDescriptor {
  id: EntityId
  role: Role
  kind: string
  createdAt: number
  meta?: Record<string,unknown>
}

interface ScheduledActionInput {
  id?: string
  runAt: number
  repeatEveryMs?: number
  actionType: string
  payload?: unknown
  priority?: number
}

interface ScheduledAction extends ScheduledActionInput {
  id: string
  createdAt: number
  cancelled?: boolean
  runs: number
}

interface EngineMetrics {
  requestsTotal: number
  requestsFailed: number
  averageLatencyMs: number
  activeEntities: number
  scheduledActions: number
  lastTickDurationMs: number
}

------------------------------------------------------------
SECTION 7: EVENT TAXONOMY (INITIAL)
------------------------------------------------------------
Events (internal):
- engine:init
- engine:tick:start
- engine:tick:end
- engine:request:received
- engine:request:completed
- engine:request:failed
- entity:registered
- entity:updated
- scheduler:action:scheduled
- scheduler:action:executed
- scheduler:action:cancelled
- agent:cycle:start
- agent:cycle:end
- strategy:changed
- llm:request:queued (future)
- llm:backoff (future)
- rate:throttle (future)
- error:raised

All events carry { eventId, timestamp, ...payload }.

------------------------------------------------------------
SECTION 8: PERMISSION MODEL OUTLINE
------------------------------------------------------------
Matrix pattern:
Role → Set<Capability>
Example Seed:
HUMAN: WORLD_READ | WORLD_MUTATE | ENGINE_INTROSPECT
SIMULANT: WORLD_READ | AGENT_DECIDE | SCHEDULE_ACTION | WORLD_MUTATE (scoped)
SYSTEM: (all capabilities)

Permission Function:
checkPermission(role, capability) -> boolean  
Enhance with optional capability conditions (e.g. worldMutate scope guard in future).

------------------------------------------------------------
SECTION 9: REQUEST PROCESSING PIPELINE
------------------------------------------------------------
1. Intake: allocate requestId, timestamp normalization.  
2. Permission Gate: role/capability mapping.  
3. Validation: request-type schema (per discriminated union).  
4. Execution Dispatch: specialized executor table.  
5. Result Packaging: unify { ok, result, error }.  
6. Metrics Update: latency, error counters.  
7. Event Emission: request lifecycle events.  

Determinism Considerations:
- Sort scheduled actions by (runAt ASC, priority DESC, id ASC).  
- Provide optional deterministicSeed controlling pseudo-random choices via injected PRNG.  

------------------------------------------------------------
SECTION 10: SCHEDULER BEHAVIOR
------------------------------------------------------------
Queues:
- Immediate queue (executed within same tick)
- Timed queue (min-heap or sorted array by runAt)
- Recurring actions re-enqueued after execution if repeatEveryMs defined
Cancellations: mark cancelled flag; lazy pruning.
Time Source: monotonic (Engine internal clock). Option to accept external deltaMs (test harness).

------------------------------------------------------------
SECTION 11: SNAPSHOT & INTROSPECTION
------------------------------------------------------------
snapshot(): {
  engineId,
  configDigest,
  entityCount,
  entities: EntityId[],
  scheduled: { total, nextRunInMs },
  metrics,
  version,
  now
}
Optionally redacted for roles lacking ENGINE_INTROSPECT.

------------------------------------------------------------
SECTION 12: LOGGING FORMAT (CANON)
------------------------------------------------------------
[ENGINE][INIT][id=core][tickInterval=100]
[ENGINE][REQ][id=R123][actor=human-1][type=world.mutate][status=OK][latency=4ms]
[ENGINE][SCHED][scheduled=A567][runAt=...][repeat=...]
[ENGINE][TICK][start=ts][delta=100ms]
[ENGINE][TICK][end=ts][duration=2.1ms]
[PERM][DENY][request=R456][role=SIMULANT][capability=ENTITY_REGISTER]
[ERROR][ENGINE][code=VALIDATION_FAILED][req=R789]

------------------------------------------------------------
SECTION 13: ENV / CONFIG KEYS (INITIAL SUGGESTIONS)
------------------------------------------------------------
ENGINE_TICK_INTERVAL_MS=100
ENGINE_MAX_EVENT_DEPTH=32
ENGINE_LOG_LEVEL=info
ENGINE_DETERMINISTIC_SEED=disabled
ENGINE_SNAPSHOT_REDACT=1|0

------------------------------------------------------------
SECTION 14: SUB-PROMPT GENERATION INDEX
------------------------------------------------------------
Create subordinate prompt folders & prompt files:

1-engine-skeleton/
   PROMPT_ENGINE_SKELETON.md
2-permission-matrix/
   PROMPT_PERMISSION_MATRIX.md
3-event-bus/
   PROMPT_EVENT_BUS.md
4-request-routing/
   PROMPT_REQUEST_ROUTING.md
5-entity-registry/
   PROMPT_ENTITY_REGISTRY.md
6-action-scheduler/
   PROMPT_ACTION_SCHEDULER.md
7-world-state-facade/
   PROMPT_WORLD_STATE_FACADE.md
8-logging-observability/
   PROMPT_LOGGING_OBSERVABILITY.md
9-test-harness-simulation/
   PROMPT_TEST_HARNESS_SIM.md
10-error-domain/
   PROMPT_ERROR_DOMAIN.md
11-debug-introspection/
   PROMPT_DEBUG_INTROSPECTION.md
12-integration-hooks/
   PROMPT_INTEGRATION_HOOKS.md

(If future expansion needed: rate-governor-integration, llm-adapter-binding—but reserved to Feature 3/4.)

------------------------------------------------------------
SECTION 15: SUB-PROMPT TEMPLATE (REUSABLE)
------------------------------------------------------------
"""
Feature: F02-ENGINE
Sub-Task: <NAME>
Context:
Engine central authority required for all interactions; current sub-component not implemented.

Objective:
<One concise measurable outcome>

Constraints:
- Strong typing (no any)
- Deterministic where applicable
- No external side-effects at module load
- Clear separation between interface & implementation
- Logging via standardized tag set

Inputs / References:
- Core types from engine domain
- Needs capability mapping (where relevant)
- Schedules must respect priority ordering

Output:
<List exact files & exported symbols>

Validation:
- <3–6 bullet acceptance tests referencing deterministic outcomes, error cases, or performance>

Non-goals:
- Direct LLM invocation
- UI binding logic
- Rate limit algorithms (handled later)
"""

------------------------------------------------------------
SECTION 16: SAMPLE SUB-PROMPT (ENGINE SKELETON)
------------------------------------------------------------
"""
Feature: F02-ENGINE
Sub-Task: Engine Skeleton
Context:
Need base Engine class with config init, event bus injection, request pipeline stub, scheduling tick integration placeholder.

Objective:
Deliver Engine class with init(config), registerEntity, request, on, off, emitInternal, tick methods plus internal metrics & snapshot.

Constraints:
- Single instantiation guard OR explicit factory
- No external network calls
- Provide typed events generic
- Provide internal private method _executeRequest

Output:
File: src/engine/Engine.ts
Exports:
- Engine (class)
- createEngine(config: EngineConfig): Engine
- EngineEvents (interface)
- EngineRequest / EngineResponse types (if not already centralized)
- getActiveEngine(): Engine (optional helper)

Validation:
- createEngine returns instance with id from config
- registerEntity then snapshot shows new entity
- request(world.mutate) with insufficient permission returns { ok:false, error.code='PERMISSION_DENIED' }
- tick processes scheduled action due
Non-goals:
- Real LLM adapter integration
- RateGovernor logic
"""

------------------------------------------------------------
SECTION 17: RISK REGISTER (CONDENSED)
------------------------------------------------------------
R1: Event recursion overflow -> depth guard (maxEventDepth).  
R2: Request starvation under high rate -> priority queue or fairness policy (future).  
R3: Time drift in scheduling -> monotonic source; delta injection test harness.  
R4: Unbounded memory in event listeners -> unsubscribe patterns + weak referencing not required yet but monitor.  
R5: Permission misconfig -> central capability map + unit test matrix.  

------------------------------------------------------------
SECTION 18: TEST STRATEGY (OVERVIEW)
------------------------------------------------------------
Level 1: Pure unit (permission, scheduler sorting, event bus ordering).  
Level 2: Integration simulation (register entities, schedule actions, run N ticks).  
Level 3: Determinism replay (record event sequence with seed; rerun & compare hash).  
Level 4: Fault injection (invalid request types, cyclic events attempt, permission denial).  

Snapshot Hashing:
Compute JSON stable stringify of { entities, scheduledIds, metrics.requestsTotal } → hash to validate determinism.

------------------------------------------------------------
SECTION 19: METRICS & OBSERVABILITY
------------------------------------------------------------
Counters: requestsTotal, requestsFailed, actionsExecuted, eventsEmitted.  
Gauges: activeEntities, scheduledPending, lastTickDurationMs.  
Derived: failureRate = requestsFailed / requestsTotal.  
Expose metrics() access from Engine for monitoring overlay / debug UI.

------------------------------------------------------------
SECTION 20: ERROR DOMAIN (CODES)
------------------------------------------------------------
ENGINE_PERMISSION_DENIED  
ENGINE_VALIDATION_FAILED  
ENGINE_ENTITY_NOT_FOUND  
ENGINE_ENTITY_DUPLICATE  
ENGINE_SCHEDULER_CONFLICT  
ENGINE_NOT_INITIALIZED
ENGINE_INTERNAL_ERROR  
ENGINE_UNSUPPORTED_REQUEST  
ENGINE_EVENT_OVERFLOW  

Each error includes code, message, context details.

------------------------------------------------------------
SECTION 21: EXECUTION ORDER (MICRO-STEPS)
------------------------------------------------------------
S1: Define core type declarations file.  
S2: Implement EventBus generic.  
S3: Implement Permission Matrix.  
S4: Implement Engine skeleton (init, registerEntity, request stub).  
S5: Add Scheduler + tick integration.  
S6: Add snapshot & metrics tracking.  
S7: Implement validation layer per request type.  
S8: Add error domain.  
S9: Write simulation harness tests.  
S10: Integrate logging + finalize acceptance checks.  

------------------------------------------------------------
SECTION 22: QUALITY GATES
------------------------------------------------------------
QG1: Type check passes strict.  
QG2: All exported public methods documented with TSDoc.  
QG3: Deterministic replay test passes.  
QG4: No circular imports in engine subsystem.  
QG5: 0 critical eslint rule violations.  

------------------------------------------------------------
SECTION 23: SUB-PROMPT GENERATION INSTRUCTIONS (META)
------------------------------------------------------------
1. Use Section 15 template.  
2. Generate one prompt per subfolder defined in Section 14.  
3. Each includes explicit file paths & exports.  
4. Provide validation bullets referencing outcomes not implementation steps.  
5. Keep each subordinate prompt ≤ 230 lines.  
6. Produce an INDEX.md summarizing all sub-prompts.  

Validation After Generation:
- COUNT(sub-prompts)=12
- All contain "Feature: F02-ENGINE"
- Each has Objective, Constraints, Validation, Non-goals
- INDEX lists all file outputs

------------------------------------------------------------
SECTION 24: EXECUTION TRIGGER PHRASE
------------------------------------------------------------
"GENERATE_F02_SUB_PROMPTS_v1"

------------------------------------------------------------
SECTION 25: FUTURE EXTENSION HOOKS (PRE-ALLOCATED)
------------------------------------------------------------
LLMAdapter Hook: Engine.registerLLMAdapter(adapter) (placeholder)  
RateGovernor Hook: Engine.attachRateGovernor(governor)  
Strategy Switch Path: handled via request type 'strategy.switch' later  
Audit Trail: Append structured record per request to ring buffer (future)  

------------------------------------------------------------
SECTION 26: FINAL MASTER OBJECTIVE (CONDENSED)
------------------------------------------------------------
DELIVER a deterministic, permission-enforced, event-driven Engine that centralizes requests, schedules actions, manages entities, emits structured events, provides introspection & metrics, and prepares clean integration seams for LLM, rate governance, and behavior orchestration.

END OF MASTER PROMPT
