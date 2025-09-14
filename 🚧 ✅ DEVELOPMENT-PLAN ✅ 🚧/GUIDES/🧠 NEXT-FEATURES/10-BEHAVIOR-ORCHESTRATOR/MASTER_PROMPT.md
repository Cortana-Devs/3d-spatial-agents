```Descendants/🚧 ✅ DEVELOPMENT-PLAN ✅ 🚧/PROMPTS/🧠 NEXT-FEATURES/10-BEHAVIOR-ORCHESTRATOR/MASTER_PROMPT.md#L1-420
# MASTER PROMPT: MULTI-LLM BEHAVIOR ORCHESTRATOR & AGENT STRATEGY RUNTIME
Version: 1.0  
Feature ID: F10-BEHAVIOR-ORCHESTRATOR
Authoring Mode: Advanced Autonomous Systems / Multi-LLM Reasoning Architecture  
Primary Goal: Deliver a pluggable Behavior Orchestrator enabling autonomous simulant agents (male + female + future additions) to perceive the world, select a reasoning strategy (Flash vs Pro vs future GPT‑5), plan multi-step actions, adapt to resource/rate constraints, integrate with memory, and emit structured world mutations—ALL mediated through the central Engine (F02), utilizing data structures (F03), UI feedback (F04), physics/collision systems (F05-F06), memory context (F07), LLM layer (F08), and governed by Rate Governor (F09).

------------------------------------------------------------
SECTION 1: ULTRA-COMPRESSED CONTEXT SNAPSHOT
------------------------------------------------------------
WORLD=3D immersive sim with physics + collision detection  
ENGINE=Authoritative request/event hub  
DATA STRUCTURES=High-performance primitives for scoring, queuing, spatial queries  
UI LAYER=Observability and debugging interface  
PHYSICS/COLLISION=World reality layer with spatial queries  
MEMORY SYSTEM=Multi-layer episodic/semantic context  
LLM LAYER=Gemini 2.5 Flash (fast), Gemini 2.5 Pro (deep), GPT‑5 placeholder future  
RATE GOVERNOR=Adaptive throttling + quota awareness  
THIS FEATURE=High-level agent cognition + behavior loop abstraction  
NON-GOAL=Rendering, low-level animation, raw LLM API binding (already implemented)

------------------------------------------------------------
SECTION 2: CORE OBJECTIVES
------------------------------------------------------------
O1: Define Agent Runtime lifecycle: perceive → reason → plan → act → reflect.  
O2: Provide Behavior Orchestrator coordinating strategy selection, memory use, and action emission.  
O3: Implement Strategy Registry with hot-swappable ReasoningStrategy modules (FastFlashStrategy, DeepDeliberationStrategy, future GPT5Strategy).  
O4: Introduce Planning Pipeline with intermediate representation (IR) for actions (structured JSON).  
O5: Support adaptive shortening / compression when rate pressure or token constraints detected (integration with F04 events).  
O6: Persist short-term episodic memory entries post-action execution + optional summarization hook.  
O7: Provide deterministic debug mode using seed (AGENT_DETERMINISTIC_SEED) for reproducible plans.  
O8: Implement perception diffing (cached last world snapshot → produce delta object for LLM prompt efficiency).  
O9: Provide introspection surfaces: agent.debug(), lastPlan, lastPerceptionHash, reasoningTrace.  
O10: Implement validation & schema guard for plan outputs (reject malformed LLM responses).  
O11: Support optional tool invocation model (e.g., "search_entity", "navigate_to") as structured tool slots (future extension scaffold).  
O12: Emit structured events at each phase with timing metrics & optional traces.  

------------------------------------------------------------
SECTION 3: ACCEPTANCE CRITERIA
------------------------------------------------------------
AC1: Agent tick produces plan with ≤ N actions (configurable) or fallback minimal action under pressure.  
AC2: Strategy switching via Engine request (strategy.switch) updates active strategy w/out restart.  
AC3: Perception diff reduces prompt payload size by at least 30% vs full world baseline (on unchanged frames).  
AC4: Plan schema validator rejects invalid output & triggers safe fallback (idle / observe).  
AC5: Rate throttle event causes next cycle to either defer or compress (fewer actions / smaller prompt).  
AC6: Introspection endpoint (agent.debug()) returns { strategyId, lastPlanId, lastLatencyMs, lastError? }.  
AC7: Memory write occurs only after successful action execution (not on failed plan).  
AC8: Deterministic seed test reproduces identical plan hash across ≥3 runs.  
AC9: Logging includes [AGENT][CYCLE][start|end][durationMs] and [AGENT][PLAN][actions=n].  
AC10: GPT‑5 strategy selection (if feature flag enabled) yields NOT_IMPLEMENTED until adapter present—without crash.  

------------------------------------------------------------
SECTION 4: CONSTRAINTS
------------------------------------------------------------
C1: No direct LLM calls—must route via LLMManager + Engine mediated agent.cycle.  
C2: No hard-coded model names inside strategies (use injection).  
C3: Pure functional transformation for perception → prompt-building, enabling test harness.  
C4: Fallback logic must never produce an empty action set; at minimum "idle_observe" or "scan_environment".  
C5: Plans MUST be side-effect free until Engine requests are issued for each action step.  
C6: All plan outputs validated before execution (schema versioned).  
C7: Minimal blocking operations; heavy transforms must remain under ~5ms per plan on baseline hardware.  

------------------------------------------------------------
SECTION 5: ARCHITECTURAL LAYERS
------------------------------------------------------------
1. Perception Layer  
   - Collects world snapshot subset (entities near agent, environment status, time, last actions).  
   - Computes perceptionHash + diff (structured).  
2. Strategy Layer  
   - Strategy registry; strategies implement plan(context) -> AgentPlan.  
   - Chooses model (fast vs deep) + instruct mode (short vs expanded).  
3. Planning Pipeline  
   - Builds reasoning input object → converts to final LLM prompt (delegates to F03 builder utilities).  
   - Parses LLM response -> IR (AgentPlan).  
4. Validation & Safety  
   - Schema validation, action whitelist, tool constraint checks.  
5. Execution Layer  
   - Iterates IR actions; for each create Engine.request(...) calls (world.mutate / scheduler.schedule).  
6. Reflection Layer  
   - Updates episodic memory, summarization queue, adaptive stats.  
7. Introspection & Telemetry  
   - Snapshots metrics, traces, last errors.  
8. Adaptation Layer  
   - Responds to rate:throttle, rate:resume, llm:backoff events.  

------------------------------------------------------------
SECTION 6: KEY INTERFACES
------------------------------------------------------------
interface AgentPerception {
  agentId: string
  tick: number
  worldStateHash: string
  diff?: WorldDiff
  nearbyEntities: EntityDescriptor[]
  timeOfDay: string
  lastActions: AgentExecutedAction[]
  environmentalSignals: Record<string, unknown>
  memorySummary?: string
  episodicRecent?: string[]
}

interface WorldDiff {
  added: string[]
  removed: string[]
  changed: string[]
}

interface AgentPlan {
  id: string
  agentId: string
  createdAt: number
  strategyId: string
  actions: PlannedAction[]
  meta: {
    reasoningTraceHash: string
    promptHash: string
    tokenEstimate?: number
    compressed?: boolean
  }
  version: string
}

interface PlannedAction {
  id: string
  type: string             // e.g. 'move', 'gesture', 'speak', 'inspect', 'idle'
  params: Record<string, any>
  priority?: number
  preconditions?: string[]
  expectedOutcome?: string
}

interface AgentExecutedAction {
  id: string
  type: string
  success: boolean
  startedAt: number
  finishedAt: number
  errorCode?: string
}

interface ReasoningStrategy {
  id: string
  supports(model: string): boolean
  plan(input: StrategyInput): Promise<AgentPlan>
  mode(): 'fast' | 'deliberate'
}

interface StrategyInput {
  perception: AgentPerception
  persona: PersonaData
  memory: MemorySnapshot
  constraints: StrategyConstraints
  rateContext: RateContext
}

interface StrategyConstraints {
  maxActions: number
  allowLongForm: boolean
  compressionLevel: number
}

interface RateContext {
  pressure: 'normal' | 'soft' | 'throttle' | 'exhausted'
  adaptiveScale: number
}

------------------------------------------------------------
SECTION 7: PLAN VALIDATION SCHEMA (ABBREVIATED)
------------------------------------------------------------
Plan version: "agent-plan/v1"
Required:
- id (uuid)
- agentId == runtime agent
- actions length >=1
For each action:
- type in ALLOWED_ACTION_TYPES (config list)
- params object (shallow)
- No unknown top-level keys
Hashing:
- planHash = hash(JSON.stringify({strategyId, actions, version})) (stable sorter)
Reject plan if:
- Empty actions
- Duplicate action IDs
- Contains disallowed action type
- planHash previously executed this tick (dedupe guard)

------------------------------------------------------------
SECTION 8: STRATEGY TYPES (INITIAL)
------------------------------------------------------------
1. FastFlashStrategy  
   - Minimal reasoning tokens, short imperative style.
2. DeepDeliberationStrategy  
   - Uses Pro model, multi-step internal chain (structured sections).
3. ConstraintRecoveryStrategy (fallback)  
   - Emits minimal observation action when under heavy throttle.
4. Future GPT5Strategy (placeholder)  
   - NOT_IMPLEMENTED until feature flag.

------------------------------------------------------------
SECTION 9: ADAPTIVE BEHAVIOR RULES
------------------------------------------------------------
IF rateContext.pressure == 'throttle':
  - reduce maxActions to 1–2
  - set compressionLevel high
  - disable long-form reasoning
IF 'soft':
  - reduce maxActions by 30%
  - prefer fast strategy unless explicitly locked
IF 'exhausted':
  - plan returns a passive/observe/backoff action only
Resume resets scaling gradually (lerp over N cycles) to avoid oscillation.

------------------------------------------------------------
SECTION 10: EVENTS (EMITTED)
------------------------------------------------------------
agent:perception { agentId, tick, diffSizes }
agent:strategy:select { agentId, strategyId, reason }
agent:plan:generated { agentId, planId, actionCount, compressed }
agent:plan:rejected { agentId, reason, errorCode }
agent:action:dispatch { agentId, actionId, type }
agent:action:result { agentId, actionId, success, durationMs }
agent:memory:write { agentId, episodicCount }
agent:adaptation:mode { agentId, pressure, scale }
agent:debug:trace { agentId, traceHash }
strategy:changed { agentId, from, to }

------------------------------------------------------------
SECTION 11: METRICS
------------------------------------------------------------
Per agent:
- cyclesTotal
- cyclesFailed
- avgPlanLatencyMs
- avgActionLatencyMs
- lastPressureState
- compressionUsageRate
- strategyMix: { strategyId: count }
Global aggregator merges per agent.
Introspection: orchestrator.snapshotAgents() returns array of summarized states.

------------------------------------------------------------
SECTION 12: RISK & MITIGATION
------------------------------------------------------------
R1: Plan explosion (too many actions) -> enforce maxActions constraint.  
R2: Non-determinism in debug runs -> seeded PRNG injection for random choices.  
R3: Model mismatch (strategy chooses unsupported model) -> validate supports() before plan.  
R4: Rate loops (constant throttle oscillation) -> hysteresis + scaling smoothing.  
R5: Memory inflation -> cap episodic entries; schedule summarization (future).  
R6: Malformed LLM output -> strict schema validator + fallback strategy.  
R7: High latency Pro calls stall agent -> set per-plan maxTime; fallback to fast strategy next cycle.  

------------------------------------------------------------
SECTION 13: SUB-PROMPT GENERATION INDEX
------------------------------------------------------------
Create subordinate prompt directories & prompt files:

1-perception-layer/
  PROMPT_PERCEPTION_LAYER.md
2-perception-diffing/
  PROMPT_PERCEPTION_DIFFING.md
3-strategy-registry/
  PROMPT_STRATEGY_REGISTRY.md
4-fast-flash-strategy/
  PROMPT_FAST_FLASH_STRATEGY.md
5-deep-deliberation-strategy/
  PROMPT_DEEP_DELIBERATION_STRATEGY.md
6-fallback-constraint-strategy/
  PROMPT_FALLBACK_CONSTRAINT_STRATEGY.md
7-planning-pipeline/
  PROMPT_PLANNING_PIPELINE.md
8-plan-validator/
  PROMPT_PLAN_VALIDATOR.md
9-execution-dispatch/
  PROMPT_EXECUTION_DISPATCH.md
10-memory-integration/
  PROMPT_MEMORY_INTEGRATION.md
11-adaptation-layer/
  PROMPT_ADAPTATION_LAYER.md
12-introspection-debug/
  PROMPT_INTROSPECTION_DEBUG.md
13-metrics-collector/
  PROMPT_METRICS_COLLECTOR.md
14-strategy-switching/
  PROMPT_STRATEGY_SWITCHING.md
15-future-gpt5-strategy-placeholder/
  PROMPT_GPT5_STRATEGY_PLACEHOLDER.md
16-test-harness/
  PROMPT_TEST_HARNESS.md
17-error-handling-safety/
  PROMPT_ERROR_HANDLING_SAFETY.md
18-action-schema-library/
  PROMPT_ACTION_SCHEMA_LIBRARY.md
19-deterministic-mode/
  PROMPT_DETERMINISTIC_MODE.md
20-logging-tracing/
  PROMPT_LOGGING_TRACING.md
21-end-to-end-agent-cycle-test/
  PROMPT_END_TO_END_AGENT_CYCLE_TEST.md
22-behavior-llm-rate-integration-test/
  PROMPT_BEHAVIOR_LLM_RATE_INTEGRATION_TEST.md

------------------------------------------------------------
SECTION 14: SUB-PROMPT TEMPLATE
------------------------------------------------------------
"""
Feature: F10-BEHAVIOR-ORCHESTRATOR
Sub-Task: <NAME>
Context:
Behavior Orchestrator requires modular layers to support multi-LLM adaptive autonomous agents.

Objective:
<One measurable, outcome-oriented statement>

Constraints:
- Strong TypeScript typing
- No direct LLM calls (use injected interfaces)
- Deterministic where claimed
- Fallback safety path present
- Schema-driven validation

Inputs / References:
- Engine (request API)
- LLMManager (indirect via agent.cycle)
- Rate events (pressure states)
- Memory APIs

Output:
<Exact file paths & exported symbols>

Validation:
- <3–7 bullet behavior validations>
- At least one error or fallback scenario
- Determinism claim (if applicable)

Non-goals:
- UI rendering
- Raw HTTP calls
- Long-term persistence
"""

------------------------------------------------------------
SECTION 15: SAMPLE SUB-PROMPT (PLANNING PIPELINE)
------------------------------------------------------------
"""
Feature: F10-BEHAVIOR-ORCHESTRATOR
Sub-Task: Planning Pipeline
Context:
Need pipeline converting perception+memory+persona to LLM prompt + parse LLM JSON output -> AgentPlan IR with validation.

Objective:
Implement planPipeline.generate(perception, persona, memory, strategyCtx) returning { plan, diagnostics } with hashing & compression awareness.

Constraints:
- Deterministic prompt hashing
- Accept compressionLevel to reduce context
- Validate JSON parse error -> fallback plan
- No direct LLM: pipeline only builds / parses

Output:
File: src/behavior/planning/pipeline.ts
Exports:
- generatePlanInput()
- parsePlanResponse()
- buildPromptSections()
- computePromptHash()
- applyCompression()
- PlanDiagnostics interface

Validation:
- Same input -> identical promptHash
- parsePlanResponse invalid JSON -> returns fallback plan (1 idle action)
- actions > maxActions trimmed with diagnostic flag
- compressionLevel high reduces tokens estimate
Non-goals:
- Strategy selection
- Memory mutation
"""

------------------------------------------------------------
SECTION 16: DETERMINISTIC MODE
------------------------------------------------------------
If AGENT_DETERMINISTIC_SEED != 'disabled':
- Use seeded RNG (xoroshiro or mulberry32) injected into strategies
- All randomized selection (e.g., picking among idle variations) passes through rngFromSeed.next()
- Seed influences only non-critical variation (never plan validity)

------------------------------------------------------------
SECTION 17: ACTION TYPE LIBRARY (INITIAL)
------------------------------------------------------------
ALLOWED_ACTION_TYPES =
  - 'move_to' (params: { target: { x,y,z }, speed? })
  - 'look_at' (params: { targetId | coords })
  - 'speak' (params: { text, style? })
  - 'gesture' (params: { kind })
  - 'inspect' (params: { targetId })
  - 'emote' (params: { kind })
  - 'idle_observe' (params: { durationMs? })
  - 'approach_entity' (params: { targetId, radius })
  - 'plan_followup' (params: { hint })
Disallowed => reject during validation.

------------------------------------------------------------
SECTION 18: ERROR TAXONOMY (ADDITIVE FOR FEATURE)
------------------------------------------------------------
AGENT_STRATEGY_UNSUPPORTED  
AGENT_PLAN_INVALID_SCHEMA  
AGENT_PLAN_EMPTY  
AGENT_PLAN_PARSE_ERROR  
AGENT_ACTION_TYPE_DISALLOWED  
AGENT_RATE_PRESSURE_ABORT  
AGENT_MEMORY_WRITE_FAILED  
AGENT_STRATEGY_SWITCH_FAILED  
AGENT_DETERMINISTIC_CONFLICT  

------------------------------------------------------------
SECTION 19: TEST STRATEGY
------------------------------------------------------------
Unit:
- StrategyRegistry: register/unregister, duplicate guard.
- PlanValidator: rejects malformed action, duplicates.
- PerceptionDiff: stable diff output for unchanged snapshot.

Integration:
- Full cycle (perception -> plan -> dispatch) with mocked LLM response.
- Rate throttle simulation -> compression adaptation.

Determinism:
- Same seed -> identical planId & planHash.
- Different seed -> variant in chosen idle action but same structural validity.

Failure:
- Inject malformed LLM JSON -> fallback action executed.
- Force unsupported strategy -> error event + fallback to fast strategy.

Performance:
- 100 consecutive cycles < target average latency (e.g., <30ms per cycle baseline with mocked LLM).

------------------------------------------------------------
SECTION 20: METRICS & OBSERVABILITY FORMAT
------------------------------------------------------------
Logging Tags:
[AGENT][CYCLE][START]  
[AGENT][CYCLE][END]  
[AGENT][PLAN][GENERATED]  
[AGENT][PLAN][FALLBACK]  
[AGENT][ACTION][DISPATCH]  
[AGENT][ACTION][RESULT]  
[AGENT][ADAPT][PRESSURE]  
[AGENT][STRATEGY][SWITCH]  
[AGENT][DEBUG][TRACE]

Trace Fields:
traceId, planId, strategyId, promptHash, perceptionHash, actionCount, compressed, latencyMs.

------------------------------------------------------------
SECTION 21: EXECUTION ORDER (MICRO-STEPS)
------------------------------------------------------------
S1: Define types & constants (actions, interfaces).  
S2: Implement StrategyRegistry.  
S3: Implement FastFlashStrategy.  
S4: Perception collector + diff util.  
S5: Planning pipeline (input builder + parser).  
S6: Plan validator + hashing.  
S7: Execution dispatcher (Engine request wrappers).  
S8: Adaptation layer (rate event handlers).  
S9: Introspection + metrics aggregator.  
S10: DeepDeliberationStrategy implementation.  
S11: FallbackConstraintStrategy.  
S12: Deterministic RNG integration.  
S13: GPT5Strategy placeholder.  
S14: Comprehensive test harness & scenario suite.  

------------------------------------------------------------
SECTION 22: QUALITY GATES
------------------------------------------------------------
QG1: All exported symbols documented.  
QG2: Validator covers 100% branches for rejection paths.  
QG3: No usage of any in public types.  
QG4: Fallback logic invoked in ≥1 negative test.  
QG5: Deterministic mode test passes (hash stable).  
QG6: Strategy switching test demonstrates state continuity (memory preserved).  
QG7: Code free of direct LLM or network calls.  

------------------------------------------------------------
SECTION 23: SUB-PROMPT GENERATION INSTRUCTIONS (META)
------------------------------------------------------------
1. Use Section 14 template for each sub-prompt.  
2. Generate 22 sub-prompts (Section 13 + 2 integration tests).  
3. Each includes explicit file paths & exports.  
4. Each includes at least one negative/error validation bullet.
5. Include 2 integration test sub-prompts for cross-feature validation.
5. Keep each subordinate prompt ≤ 230 lines.  
6. Produce INDEX.md summarizing artifacts after generation.  

Validation After Generation:
- COUNT=22 (20 core + 2 integration)
- All contain "Feature: F10-BEHAVIOR-ORCHESTRATOR"
- Each has Objective, Constraints, Validation, Non-goals
- Integration tests validate end-to-end agent cycles
- INDEX enumerates each planned file & key exports

------------------------------------------------------------
SECTION 24: FUTURE EXTENSION HOOKS
------------------------------------------------------------
+ Tool Invocation Layer (external search, knowledge retrieval)  
+ Multi-agent coordination (shared plan negotiation)  
+ Emotion / mood state influencing strategy selection  
+ Long-term memory summarization scheduler  
+ On-device fine-tuned micro-policy model (fast safety filter)  
+ Plan optimization pass (goal reordering / concurrency proposals)  

------------------------------------------------------------
SECTION 25: EXECUTION TRIGGER PHRASE
------------------------------------------------------------
"GENERATE_F10_SUB_PROMPTS_v1"

------------------------------------------------------------
SECTION 26: FINAL MASTER OBJECTIVE (CONDENSED)
------------------------------------------------------------
DELIVER a modular Behavior Orchestrator enabling adaptive, strategy-driven autonomous agents with deterministic perception processing, robust planning & validation, action dispatch via Engine, memory integration, rate-aware adaptation, introspection, and future extensibility (multi-LLM & GPT‑5) — all while maintaining strict architectural boundaries and performance budgets.

END OF MASTER PROMPT
