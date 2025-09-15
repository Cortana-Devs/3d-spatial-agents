# 🚀 FEATURES SEQUENCE PLAN (NEXT 5 MAJOR DELIVERABLES)

Artifact Type: Strategic Prompt & Engineering Execution Blueprint  
Goal Horizon: Enable living simulant avatars (female + existing male) driven by Gemini 2.5 Flash (and easily extendable to Gemini 2.5 Pro & future GPT-5), mediated by a centralized Engine enforcing capability routing, rate limits, world interactions, and permission governance.

---

## HIGH-LEVEL ROADMAP OVERVIEW

Parallel Work Lanes (so teams / threads can proceed simultaneously):
- Lane A (Assets & Presentation): Feature 1
- Lane B (Core Architecture): Features 2-3
- Lane C (Observability & World Simulation): Features 4-6
- Lane D (Cognition & Memory): Feature 7
- Lane E (LLM Integration & Governance): Features 8-9
- Lane F (Behavior Orchestration): Feature 10

Critical Path Dependencies:
1 ➜ (Assets exist for testing) feeds all subsequent features
2 ➜ Blocks all other features (central authority)
3 ➜ Provides primitives for 4,7,9 (data structures)
4 ➜ Enables early feedback for 5-10 (observability)
5 ➜ Enables 6,7 (world simulation foundation)
6 ➜ Feeds 7,10 (collision events for memory & behavior)
7 ➜ Enables 8,10 (memory context for LLM & behavior)
8 ➜ Enables 9,10 (LLM calls need rate governance & behavior orchestration)

Run Strategy:
- Start Feature 2 skeleton first (Day 0) while Feature 1 asset wiring proceeds (Day 0–1)
- Begin Feature 3 data structures as soon as Engine events exist (Day 1)
- Feature 4 UI starts when Engine events flow (Day 1-2)
- Features 5-6 physics/collision start when data structures ready (Day 2)
- Feature 7 memory begins when collision events available (Day 3)
- Feature 8 Gemini integration starts when memory context ready (Day 3-4)
- Feature 9 rate governor integrates with LLM calls (Day 4)
- Feature 10 behavior orchestrator synthesizes all systems (Day 5)

---

## FEATURE LIST (Sequenced)

1. Integrate Female Model & Animation Set + UI Placement Toggle
2. Implement Central Engine (Authority Core) & Mediation Protocol
3. Advanced Data Structures & Algorithmic Optimization Layer
4. Advanced UI / UX Enhancements & Interactive Control Layer
5. Real‑Time Physics & Collision Integration Layer
6. Collision System (Advanced Contact, Sensors & Predictive Avoidance)
7. Memory System (Multi-Layer Cognitive Architecture)
8. Gemini 2.5 Flash Integration (env-based, dual active AI avatars)
9. Adaptive Rate / Quota & Awareness Layer (LLM Budget Governor)
10. Multi-LLM Agent Runtime & Behavior Orchestrator (Future GPT-5 Ready)

---

## SHARED PROMPT DESIGN PRINCIPLES

When crafting internal development or AI assistant prompts:
- Always specify: Context → Objective → Constraints → Output Contract → Acceptance Tests
- Use deterministic wording for code tasks (avoid vague "optimize" unless metrics defined)
- Include structured interface definitions before generating logic
- Request dry-run test scenario generation before final implementation
- Enforce explicit logging points for observability-critical subsystems

Prompt Template Skeleton (reuse across below):
"""
Context:
<precise subsystem & current state>

Objective:
<one sentence measurable outcome>

Constraints:
- List 3–7 hard constraints (performance, style, dependency bounds, thread safety, etc.)

Interfaces / Contracts (if known):
<types, env vars, expected external events>

Output:
Describe exactly what to produce (e.g. "Return a TypeScript file defining...")

Validation:
List quick test cases or conditions of success.

Non-goals:
Explicitly exclude out-of-scope areas.
"""

---

## FEATURE 1: Female Model Integration & Menu Placement

Objectives:
- Load `/public/models/c-girl.glb`
- Load female idle/dance/talk animations under `/public/animations/female` (currently empty -> copy relevant subset from existing female prefixed sources)
- Add left menu model selector (Male / Female) with persistent selection (e.g. `localStorage` or store slice)
- Wire animation state graph (Idle ➜ Talk ➜ Walk ➜ Dance) with blend

Dependencies:
- None (standalone)

Acceptance Criteria:
- Toggling avatar updates live instance without page reload
- No broken animation retargeting (no T-Pose flicker)
- 60 FPS baseline in scene with both avatars inactive (profiling placeholder)

Key Implementation Prompts:

Prompt: Asset Normalization
"""
Context: We have a primary female model c-girl.glb and existing animation glb files (F_*).
Objective: Generate a plan to extract only necessary female animations and register them in a lightweight animation library map.
Constraints:
- Do not bloat initial bundle (lazy load)
- Provide TypeScript mapping { name: string; path: string; category: 'idle'|'talk'|'emote' }
Output: TypeScript snippet + lazy loader function signature.
Validation: Map includes idle + at least one talk + one dance.
"""

Prompt: UI Selector
"""
Context: Need to add left side menu selector for avatar (male/female).
Objective: Provide a React component spec + store slice changes.
Constraints:
- Persist selection
- Fire event 'avatar:changed'
Output: TSX component skeleton + store modification patch draft.
Validation: Simulated usage snippet.
"""

---

## FEATURE 2: Central Engine (Authority & Mediation Layer)

Concept:
The Engine is the sole orchestrator. Humans issue requests via UI -> Engine. Simulant Agents never call external APIs directly. World changes only via Engine-issued mutations/events.

Core Modules:
- Request Router (human → command → validated → dispatch)
- Permission Matrix (role → capabilities)
- Entity Registry (avatars, agents, systems)
- Event Bus (internal typed pub/sub)
- Action Scheduler (deferred / tick-based execution)
- World State Facade (query-only outside Engine)

Interfaces (initial):
```
Engine.init(config)
Engine.registerEntity(entityDescriptor)
Engine.request(input: EngineRequest): Promise<EngineResponse>
Engine.emitInternal(event)
Engine.on(eventType, handler)
Engine.tick(deltaMs)
```

Acceptance Criteria:
- All world modifications pass through `Engine.request` or Engine scheduled actions
- Simulant code receives no direct network/LLM client handles
- Deterministic test: mock two agents issuing world interaction -> serialized event log validated

Key Implementation Prompts:

Prompt: Engine Skeleton
"""
Context: Need foundational Engine class with registry, event bus, request validation stub.
Objective: Produce TypeScript implementation with interfaces and placeholder logic, no external LLM yet.
Constraints:
- Pure TypeScript, no side-effects at import
- Strong typing with discriminated unions for EngineRequest
Output: Single Engine.ts module containing class + type definitions + minimal tests (inline or exported function)
Validation: Example usage snippet compiling.
"""

Prompt: Permission Matrix
"""
Context: Roles: HUMAN, SIMULANT, SYSTEM. Need capability gating.
Objective: Provide design + enum + function checkPermission(role, action).
Constraints: O(1) permission lookup; extendable.
Output: Type definitions + implementation.
Validation: Table of 5 example checks.
"""

Prompt: Event Bus
"""
Context: Need strongly typed event channel for internal modules.
Objective: Define generic EventBus<TEvents> with subscribe, unsubscribe, emit.
Constraints: No external libs; memory-safe cleanup.
Output: Implementation + sample event map.
Validation: Unit test pseudocode verifying order + unsub.
"""

---

## FEATURE 3: Gemini 2.5 Flash Integration (Dual Active Agent Control)

Purpose:
Connect to Gemini API via 2025 integration method (assume REST or official SDK; adopt pluggable Adapter pattern). Provide two live AI agents controlling male & female avatars.

Planned ENV Variables:
- GEMINI_API_KEY
- GEMINI_MODEL_FLASH=gemini-2.5-flash
- GEMINI_MODEL_PRO=gemini-2.5-pro
- GEMINI_MAX_TOKENS=...
- GEMINI_RATE_PER_MINUTE=...
- GEMINI_PARALLEL_REQUESTS=...
- GEMINI_TEMPERATURE=...
- GEMINI_SYSTEM_PERSONA_DIR=./ai/personas

Adapter Pattern:
```
interface LLMAdapter {
  name: string
  models(): string[]
  complete(input: LLMRequest): Promise<LLMResponse>
  stream?(input: LLMRequest): AsyncIterable<LLMChunk>
  usage(): LLMUsageSnapshot
}
```

Add LLMManager orchestrating:
- Model selection
- Rate governance (delegates to Feature 4 later)
- Usage tracking (tokens, calls)

Agent Boot Sequence:
1. Engine registers agent entity (male/female)
2. Agent runtime requests persona + memory snapshot
3. On tick: perception -> reasoning (LLM) -> action plan -> Engine.request mutations

Acceptance Criteria:
- Two agents respond within rate limits to prompt: "Describe your surroundings."
- Logging includes model name, tokens used, decision transforms
- Fail gracefully if model quota exceeded (Engine emits 'llm:backoff')

Key Prompts:

Prompt: LLM Adapter Generation
"""
Context: Need Gemini 2.5 Flash adapter with env-based config.
Objective: Implement LLMAdapter for gemini flash with complete() only (non-stream first pass).
Constraints:
- Validate API key presence
- Reusable HTTP client function
- Include structured error types
Output: TypeScript file design with adapter + example invocation.
Validation: Mock test stub demonstrating response shape.
"""

Prompt: Dual Agent Activation
"""
Context: We have Engine & LLMAdapter; need to bind two agents to avatar entities.
Objective: Provide AgentController spec with lifecycle: boot -> perceive -> decide -> act.
Constraints:
- Pluggable BehaviorStrategy
- Asynchronous step boundaries for future streaming
Output: Type + skeleton implementation + Engine wiring example.
Validation: Pseudocode tick loop using both agents.
"""

Prompt: Persona & Memory
"""
Context: Each agent loads persona + episodic memory file.
Objective: Filesystem layout + loader function returning { persona, memory }.
Constraints: Non-blocking startup (lazy load), fallback defaults.
Output: Directory schema + loader stub.
Validation: Example persona YAML structure.
"""

---

## FEATURE 4: Adaptive Rate / Quota & Awareness Layer

Goals:
- Centralized rate limit aware of plan constraints (free-tier assumptions)
- Soft + hard ceilings (calls/minute, tokens/minute)
- Backoff strategy (exponential or token bucket drain)
- Engine-level "awareness" events broadcast to agents so they self-throttle or consolidate reasoning

Mechanics:
- TokenBucket or LeakyBucket per model + global
- LLMManager consults RateGovernor before call
- Emits: 'llm:throttle', 'llm:resumed', 'llm:quota_exhausted'

Env Extensibility:
- GEMINI_BURST_CALLS
- GEMINI_REFILL_RATE
- GEMINI_MAX_DAILY_TOKENS

Acceptance Criteria:
- Simulated stress test (invoke 2x allowed rate) triggers throttle event
- Agents adapt (next decision cycle is deferred or merged)
- Metrics snapshot function returns JSON summary

Key Prompts:

Prompt: Rate Governor
"""
Context: Need rate governance supporting tokens + request counts.
Objective: Implement RateGovernor with methods: approveRequest(meta), recordUsage(result), snapshot()
Constraints: Time-based refill; monotonic clock; no external dependency.
Output: TypeScript module + example simulation.
Validation: Sequence of approvals leading to rejection then recovery after time advance.
"""

Prompt: Engine Awareness Propagation
"""
Context: When throttling occurs, agents must adapt.
Objective: Provide event handling pattern translating governor events into agent behavior modifications.
Constraints: Avoid direct agent mutation from governor; route via Engine events.
Output: Code pattern + example event map.
Validation: Pseudocode state transition (ACTIVE -> BACKOFF -> ACTIVE).
"""

---

## FEATURE 5: Multi-LLM Agent Runtime & Behavior Orchestrator (Future GPT-5 Ready)

Purpose:
Abstract multi-provider, multi-model reasoning. Provide pluggable reasoning strategies (chain-of-thought compression, tool selection, memory summarization). Prepare for GPT-5 inclusion.

Layers:
- Model Abstraction (existing LLMAdapter)
- Strategy Layer (ReasoningStrategy): e.g. FastFlashStrategy (Gemini Flash), DeepDeliberationStrategy (Gemini Pro), FutureGpt5Strategy
- Task Graph (micro-goals inside agent tick)
- Perception Cache + Diffing
- Action Planner producing ordered Engine requests

Interfaces:
```
interface ReasoningStrategy {
  id: string
  supports(model: string): boolean
  plan(context: AgentContext): Promise<AgentPlan>
}
```

Acceptance Criteria:
- Swap strategies at runtime (Engine.request({type:'agent:updateStrategy'}))
- Provide introspection API: agent.debug().lastPlan
- Behavior reproducibility toggled via AGENT_DETERMINISTIC_SEED

Key Prompts:

Prompt: Strategy Interface & FastFlashStrategy
"""
Context: Need baseline reasoning strategy using minimal tokens for fast loop.
Objective: Implement ReasoningStrategy + basic FastFlashStrategy using concise prompt style.
Constraints: Must accept AgentPerception { worldStateHash, nearbyEntities, lastActions }.
Output: Type + implementation skeleton.
Validation: Sample call producing AgentPlan with <=3 actions.
"""

Prompt: Strategy Switching
"""
Context: Need runtime switching of agent strategies via Engine request.
Objective: Provide code for strategy registry + update flow.
Constraints: Validate compatibility and emit 'agent:strategyChanged'.
Output: Patch showing registry + Engine integration snippet.
Validation: Pseudocode for switching Flash -> Pro.
"""

Prompt: Future GPT-5 Placeholder
"""
Context: We want forward compatibility.
Objective: Provide placeholder adapter + feature flag gating.
Constraints: Does not execute network calls; returns NotImplemented error.
Output: Module skeleton + instructions for activation.
Validation: Attempt to select GPT-5 yields controlled error event.
"""

---

## CROSS-FEATURE TEST / OBSERVABILITY PLAN

Metrics & Logs:
- /debug/engine (JSON snapshot): entities, pending actions, rate stats
- LLM usage log lines: [LLM][model=gemini-2.5-flash][tokens=123 in/456 out][agent=female-1]
- Rate events: [RATE][THROTTLE][remaining=0][window=60s]
- Strategy changes: [AGENT][STRATEGY_CHANGE][agent=female-1][from=fast][to=deliberate]

Testing Phases:
1. Deterministic Sim Tick Simulation (no LLM actual calls; stub responses)
2. Single Agent Real Call Smoke Test (Flash)
3. Dual Agent Interaction (Flash/Flash)
4. Strategy Swap Under Load
5. Induced Rate Exhaustion & Recovery

---

## ENV & CONFIG SUMMARY (INITIAL .env SUGGESTIONS)

GEMINI_API_KEY=YOUR_KEY
GEMINI_MODEL_FLASH=gemini-2.5-flash
GEMINI_MODEL_PRO=gemini-2.5-pro
GEMINI_TEMPERATURE=0.7
GEMINI_MAX_TOKENS=1024
GEMINI_RATE_PER_MINUTE=30
GEMINI_BURST_CALLS=10
GEMINI_REFILL_RATE=0.5
GEMINI_MAX_DAILY_TOKENS=25000
AGENT_DECISION_INTERVAL_MS=2500
AGENT_DETERMINISTIC_SEED=disabled
ENGINE_TICK_INTERVAL_MS=100
PERSONA_DIR=./ai/personas

---

## INCREMENTAL INTEGRATION ORDER (WITH PARALLELIZATION)

Day 0:
- (B) Engine skeleton stub + event bus
- (A) Female model asset import & menu placeholder

Day 1:
- (A) Animation retarget & selection persistence
- (B) Permission Matrix + request API stable
- (C) Gemini Adapter stub + env loaded

Day 2:
- (C) First real Gemini call for one agent
- (D) RateGovernor scaffolding (simulation only)
- (E) ReasoningStrategy interface

Day 3:
- (C) Second agent activated
- (D) Real rate tracking + backoff events
- (E) FastFlashStrategy functional

Day 4:
- (E) Strategy switching + introspection
- (D) Token + request snapshot endpoint
- (General) Observability & stress script

---

## RISK & MITIGATION

| Risk | Impact | Mitigation |
|------|--------|------------|
| Animation retarget mismatch | Visual immersion loss | Use consistent skeleton naming & verify rest pose pre-binding |
| Rate limit misconfiguration | API failures | Dry-run simulate bucket exhaustion daily in CI |
| Memory/perception bloat | Latency | Implement hashing/diff early |
| LLM latency causing agent stall | Dead ticks | Insert timeouts + fallback minimal action |
| Future model API shape changes | Rework | Strict adapter boundary + versioned interface |

---

## DONE DEFINITION (GLOBAL)

A feature is “done” when:
- Code merged with minimal tests (logic + snapshot)
- Observability hooks emit structured logs
- Env variables documented
- No direct LLM calls from agent logic (only via Engine->LLMManager->Adapter)
- README or docs section updated for new public API surfaces

---

## QUICK REFERENCE: MASTER PROMPT FOR ANY NEW SUBTASK

"""
Context: <system/component & current revision>
Objective: <concise output goal with measurable acceptance>
Constraints:
- Architecture principles: single responsibility, typed boundaries, no hidden globals
- Performance constraints (if any)
- Security/permission rules
Required Interfaces:
<list or 'derive from existing'>
Output:
<exact artifact(s) required>
Validation:
- <at least 3 bullet acceptance tests>
Non-goals:
- <explicit exclusions>
"""

---

## NEXT ACTIONS (IMMEDIATE)

1. Implement Feature 2 Engine skeleton (priority unlocker)
2. Implement Feature 1 model & animations (visual validation)
3. Add Gemini adapter stub + env loader (foundation for Feature 3)
4. Draft RateGovernor simulation (dry-run)
5. Draft ReasoningStrategy interface + trivial plan

Once above 5 land, proceed iteratively with the remaining prompts.

---

Prepared for: High-fidelity multi-agent world evolution with future multi-LLM adaptability.  
Authoring Mode: Expert Systems & Runtime Engineering Alignment Document.

End of Plan.