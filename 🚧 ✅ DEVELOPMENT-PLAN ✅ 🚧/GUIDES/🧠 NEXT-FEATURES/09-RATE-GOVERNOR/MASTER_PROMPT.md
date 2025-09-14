# MASTER PROMPT: ADAPTIVE RATE / QUOTA & AWARENESS LAYER
Version: 1.0  
Feature ID: F09-RATE-GOVERNOR
Authoring Mode: Systems Governance / Runtime Control / Resource Arbitration  
Primary Goal: Implement a centralized, pluggable Rate Governor that enforces request and token budgets across LLM models (Gemini 2.5 Flash/Pro now; future GPT‑5), emits awareness events for agents, supports adaptive throttling, and provides introspection + configurable environment-based quotas without hard-coding numeric policy into business logic.

------------------------------------------------------------
SECTION 1: ULTRA-COMPRESSED CONTEXT SNAPSHOT
------------------------------------------------------------
SYSTEM=Central Engine mediated simulation with multi-avatar AI agents  
CURRENT_FEATURES=F01 Avatars, F02 Engine Core, F03 Data Structures, F04 UI Layer, F05 Physics, F06 Collision, F07 Memory, F08 Gemini Integration  
THIS_FEATURE=Sits between LLMManager and outbound adapter calls  
SCOPE=Rate limiting, quota tracking, awareness propagation, metrics surfaces  
NON_GOALS=Prompt building, LLM semantics, strategy reasoning, memory summarization  
INTEGRATION_POINTS=Engine events, LLMManager.complete(), Agent runtime adaptation

------------------------------------------------------------
SECTION 2: CORE OBJECTIVES
------------------------------------------------------------
O1: Provide RateGovernor component controlling call count & token budgets (per model + global).  
O2: Support configurable burst + refill via token bucket / leaky bucket hybrid.  
O3: Distinguish soft vs hard limits: soft -> degrade/deferral; hard -> denial + event.  
O4: Emit structured events: rate:throttle, rate:resume, llm:backoff, llm:quota_exhausted.  
O5: Agents adapt behavior (slower cycle, merge decisions, shorten reasoning) via event awareness.  
O6: Provide introspection snapshot (JSON) with rolling window statistics.  
O7: Allow dynamic runtime override (admin request) to adjust budgets.  
O8: Persist ephemeral rolling stats optionally (in-memory first, interface for storage extension).  
O9: Guarantee thread-safe style atomicity (single-thread JS assumption; still avoid interleaving hazards).  
O10: Deliver test harness simulating request load, verifying throttle and recovery pathways.  

------------------------------------------------------------
SECTION 3: ACCEPTANCE CRITERIA
------------------------------------------------------------
AC1: Exceeding per-minute call limit emits rate:throttle once and suppresses duplicates until recovery.  
AC2: Recovery (bucket refill) triggers rate:resume within ≤ 1 tick of availability.  
AC3: Hard daily token cap returns denial with error code RATE_HARD_LIMIT and event llm:quota_exhausted.  
AC4: Snapshot API returns structure: { models: { [model]: { callsRemaining, tokensRemaining, state }}, global: {...}, recentEvents[], configDigest }.  
AC5: Governor integration ensures LLMManager refuses unauthorized requests without hitting adapter.  
AC6: Adaptive agent interval logic (if provided throttle event) reduces cycle frequency by at least 2× until resume.  
AC7: Burst parameter allows at least 'burst' consecutive approvals if bucket full.  
AC8: Tests cover: normal flow, burst exhaustion, token exhaustion, resume, soft->hard escalation.  
AC9: All public APIs strictly typed, no any, no magic string scattering.  
AC10: Logging lines exist for state transitions and rejections.  

------------------------------------------------------------
SECTION 4: CONSTRAINTS
------------------------------------------------------------
C1: No direct dependency on specific LLM provider logic—model names treated as opaque keys.  
C2: Zero mutation of external objects passed in (functional style for approval results).  
C3: No persistence to disk (extensible interface for future store).  
C4: Configuration must be environment-driven + override-capable at runtime through Engine request.  
C5: Minimal overhead: approval path average < 0.01 ms (baseline).
C6: Deterministic bucket math—no reliance on Date.now jitter beyond monotonic usage.  
C7: No exponential unbounded memory (bounded event ring buffer).  

------------------------------------------------------------
SECTION 5: ENV / CONFIG KEYS (INITIAL SPEC)
------------------------------------------------------------
LLM_GLOBAL_MAX_CALLS_PER_MINUTE=<int> (global cap across models)  
LLM_GLOBAL_BURST=<int>  
LLM_RATE_AWARE_AGENT_ADAPT=1|0  
RATE_GOVERNOR_EVENT_BUFFER=250 (ring buffer size)  
RATE_GOVERNOR_LOG_LEVEL=info|debug  
RATE_GOVERNOR_ADAPTIVE_SCALE_MIN=0.5 (adaptive slowdown factor floor)  
RATE_GOVERNOR_ADAPTIVE_SCALE_MAX=4 (max stretch)

// All GEMINI_* variables now owned by F08-GEMINI-INTEGRATION.
// This feature receives provider limits via injected GeminiRateConfig.

// Injection Contract:
// constructor RateGovernor(deps: { gemini: GeminiRateConfig; global?: GlobalRateCaps })
// interface GeminiRateConfig {
//   ratePerMinute: number
//   burstCalls: number
//   refillRatePerSec: number
//   maxDailyTokens: number
//   softTokenWindowMs: number
//   softTokenBudget: number
// }
// RateGovernor MUST NOT read process.env.* for GEMINI_* directly.

------------------------------------------------------------
SECTION 6: DATA STRUCTURES (INITIAL)
------------------------------------------------------------
interface RateGovernorConfig {
  models: Record<string, ModelRateConfig>
  global: GlobalRateConfig
  eventBufferSize: number
  logLevel: 'silent'|'error'|'warn'|'info'|'debug'
  adaptiveAgentScaling: boolean
}
interface ModelRateConfig {
  callsPerMinute: number
  burstCalls: number
  refillRatePerSec: number
  softTokenWindowMs: number
  softTokenBudget: number
  maxDailyTokens: number
}
interface GlobalRateConfig {
  callsPerMinute: number
  burstCalls: number
  maxDailyTokens: number
}
interface BucketState {
  capacity: number
  tokens: number
  refillRatePerSec: number
  lastRefillTs: number
}
interface TokenStats {
  softWindowMs: number
  softBudget: number
  softUsed: number
  softWindowStart: number
  dailyUsed: number
  dailyCap: number
}
interface ApprovalMeta {
  model: string
  expectedInputTokens: number
  expectedOutputTokens?: number
  reason?: string
}
type ApprovalResult =
  | { approved: true; reason: 'OK'; advisories?: string[] }
  | { approved: false; reason: 'THROTTLED' | 'HARD_LIMIT' | 'SOFT_LIMIT'; retryInMs?: number; code: string };
interface RateEvent {
  id: string
  timestamp: number
  type: 'throttle'|'resume'|'quota_exhausted'|'soft_pressure'|'denied'
  model?: string
  details?: Record<string, unknown>
}
interface GovernorSnapshot {
  timestamp: number
  models: Record<string, {
    callsRemaining: number
    callsCapacity: number
    burstRemaining: number
    callsPerMinute: number
    softTokensRemaining: number
    dailyTokensRemaining: number
    state: 'normal'|'soft'|'throttle'|'exhausted'
  }>
  global: {
    callsRemaining: number
    burstRemaining: number
    dailyTokensRemaining: number
    state: 'normal'|'soft'|'throttle'|'exhausted'
  }
  recentEvents: RateEvent[]
  configDigest: string
  adaptiveScalingEnabled: boolean
}

------------------------------------------------------------
SECTION 7: ALGORITHMIC OVERVIEW
------------------------------------------------------------
1. Calls Bucket (Per Model & Global):
   - Token bucket pattern: refill = (now - lastRefillTs) * refillRatePerSec
   - Clamp to capacity (burstCalls)
   - Approval subtracts 1 if available else throttle.
2. Token Accounting:
   - Soft window rolling: if now - softWindowStart > softWindowMs => reset softUsed
   - Add (expectedInput + expectedOutputEstimate) to softUsed; if exceed softBudget => SOFT_LIMIT (advisory)
   - Daily tokens accumulate; if exceed hard cap => HARD_LIMIT denial
3. Adaptive Agent Scaling:
   - On soft pressure event, compute scale factor = clamp(softUsed / softBudget, min..max)
   - Engine emits rate:adaptiveScale { factor }
4. State Transitions:
   - normal -> soft (softUsed > 0.8 * softBudget)
   - soft -> throttle (bucket empty OR callsRemaining <=0)
   - throttle -> resume (bucket tokens >= threshold)
   - any -> exhausted (dailyUsed >= dailyCap)
5. Metrics & Snapshot:
   - O(Models) pass to capture dynamic remainder values
   - configDigest = stable hash of config JSON canonical ordering  

------------------------------------------------------------
SECTION 8: EVENT TAXONOMY
------------------------------------------------------------
rate:throttle { model?, global?:boolean, reason, retryInMs? }  
rate:resume { model?, global?:boolean }  
rate:softPressure { model, utilization, windowMs }  
llm:quota_exhausted { model?, scope: 'global'|'model', capType: 'dailyTokens' }  
rate:adaptiveScale { factor }  
rate:denied { model, code }  

------------------------------------------------------------
SECTION 9: ERROR CODES
------------------------------------------------------------
RATE_HARD_LIMIT (daily tokens exhaustion)  
RATE_THROTTLED (calls bucket empty)  
RATE_SOFT_LIMIT (advisory soft token pressure)  
RATE_MODEL_NOT_CONFIGURED  
RATE_GLOBAL_LIMIT_EXCEEDED  
RATE_INVALID_CONFIG  
RATE_APPROVAL_CONFLICT (double approval race—should not occur if single-thread)  

------------------------------------------------------------
SECTION 10: INTEGRATION POINTS
------------------------------------------------------------
- LLMManager.beforeCall(reqMeta) -> RateGovernor.approve(meta)  
- On denial: LLMManager emits llm:backoff and surfaces structured error  
- After success: RateGovernor.recordUsage(actualTokens)  
- Engine subscription to rate events to forward agent adaptation signals  
- Admin adjustment: Engine.request({type:'rate.updateConfig'}) -> RateGovernor.updateConfig(patch)  

------------------------------------------------------------
SECTION 11: ADAPTIVE AGENT BEHAVIOR (CONTRACT)
------------------------------------------------------------
If agent adaptation enabled and throttle occurs:
- Increase decision interval = baseInterval * scaleFactor (≥1.5)  
- On resume event: restore baseline with smoothing (e.g. gradual step)  
- On softPressure: shrink planning depth (strategy hint) or compress memory context (future)  

------------------------------------------------------------
SECTION 12: SUB-PROMPT GENERATION INDEX
------------------------------------------------------------
Create subordinate prompt directories & files:
1-core-interfaces/
   PROMPT_CORE_INTERFACES.md
2-bucket-algorithm/
   PROMPT_BUCKET_ALGORITHM.md
3-soft-token-window/
   PROMPT_SOFT_TOKEN_WINDOW.md
4-daily-cap-enforcement/
   PROMPT_DAILY_CAP_ENFORCEMENT.md
5-approval-pipeline/
   PROMPT_APPROVAL_PIPELINE.md
6-usage-recording/
   PROMPT_USAGE_RECORDING.md
7-event-emission/
   PROMPT_EVENT_EMISSION.md
8-adaptive-scaling/
   PROMPT_ADAPTIVE_SCALING.md
9-config-loader/
   PROMPT_CONFIG_LOADER.md
10-runtime-update-config/
   PROMPT_RUNTIME_UPDATE_CONFIG.md
11-snapshot-introspection/
   PROMPT_SNAPSHOT_INTROSPECTION.md
12-integration-llm-manager/
   PROMPT_INTEGRATION_LLM_MANAGER.md
13-test-harness/
   PROMPT_TEST_HARNESS.md
14-error-taxonomy/
   PROMPT_ERROR_TAXONOMY.md
15-logging-observability/
   PROMPT_LOGGING_OBSERVABILITY.md
16-agent-awareness-propagation/
   PROMPT_AGENT_AWARENESS_PROPAGATION.md

------------------------------------------------------------
SECTION 13: SUB-PROMPT TEMPLATE
------------------------------------------------------------
"""
Feature: F09-RATE-GOVERNOR
Sub-Task: <NAME>
Context:
Adaptive rate governance required to protect API quotas and optimize agent behavior responsiveness. This sub-task addresses <specific component>.

Objective:
<Concise measurable outcome>

Constraints:
- Strong typing (no any)
- Deterministic arithmetic (no hidden side-effects)
- Minimal latency overhead
- Config-driven; no hard-coded numeric constants
- Clear error codes from defined taxonomy

Inputs / References:
- Provided interfaces (RateGovernorConfig, ApprovalMeta, etc.)
- Environment variable keys (if relevant)

Output:
<Exact file paths + exports>

Validation:
- <3–7 bullet behavior-oriented checks>
- Includes at least one negative/error scenario
- Performance consideration if applicable

Non-goals:
- LLM semantic logic
- UI layer
- Persistent storage (only in-memory)
"""

------------------------------------------------------------
SECTION 14: SAMPLE SUB-PROMPT (APPROVAL PIPELINE)
------------------------------------------------------------
"""
Feature: F09-RATE-GOVERNOR
Sub-Task: Approval Pipeline
Context:
Need unified approve(meta) function performing bucket refill, call availability check, soft token window evaluation, daily token cap validation, and state transitions + event staging.

Objective:
Implement approve(meta: ApprovalMeta) -> ApprovalResult with event staging (not emission) and zero external side-effects besides internal state mutation on approval.

Constraints:
- Refill performed before capacity check
- Maintain state machine transitions (normal→soft→throttle→resume)
- Return earliest retryInMs when throttled (next bucket token availability)
- Do not record actual token usage here (that is recordUsage responsibility)

Output:
File: src/rate/approvalPipeline.ts
Exports: approve, classifyState, computeRetryInMs, ApprovalResult types (if not already central)

Validation:
- When bucket has capacity -> approved=true
- When bucket empty -> approved=false reason=THROTTLED retryInMs>0
- When soft budget exceeded but calls available -> approved=false reason=SOFT_LIMIT
- When daily cap exceeded -> approved=false reason=HARD_LIMIT code=RATE_HARD_LIMIT
- Deterministic result for same meta & state snapshot
Non-goals:
- Event emission (caller handles)
- Usage mutation after call
"""

------------------------------------------------------------
SECTION 15: METRICS & LOGGING
------------------------------------------------------------
Metrics:
- approvalsTotal, approvalsDenied
- modelCallRationing (callsDenied / callsTotal per model)
- throttleEvents, resumeEvents
- adaptiveScaleChanges
- averageApprovalLatencyNs (rough measurement using performance.now diff)
Logging Tags:
[RG][APPROVE], [RG][THROTTLE], [RG][RESUME], [RG][SOFT], [RG][HARD], [RG][CONFIG], [RG][ADAPT]

------------------------------------------------------------
SECTION 16: TEST STRATEGY
------------------------------------------------------------
Unit:
- Bucket refill math correctness (precision within ±1e-9 tolerance)
- Soft window rollover reset
- Daily cap exhaustion path
Integration:
- Load config -> simulate timeline of approvals -> verify sequence of events & states
- Adaptive scaling factor progression
Stress:
- 10k sequential approve calls (mock high rate) baseline performance < time threshold
Determinism:
- Same sequence of deltas -> identical state transition log hash
Failure Injection:
- Invalid model meta -> RATE_MODEL_NOT_CONFIGURED
- Negative expected tokens -> RATE_INVALID_CONFIG
Edge:
- Refill with very large time jump clamps to capacity
- Multiple resume events suppressed (only first after throttle)

------------------------------------------------------------
SECTION 17: RISK & MITIGATION
------------------------------------------------------------
R1: Drift between approval & usage accounting -> Segregate responsibilities & atomic call sequence.  
R2: Over-throttling due to stale refill -> Always refill before checking.  
R3: Memory growth of events -> Ring buffer with fixed size (evict oldest).  
R4: Race for dynamic config update -> Use replace-with-new-config & recompute digests.  
R5: Adaptive scaling oscillation -> Introduce hysteresis (resume threshold > throttle threshold).  

------------------------------------------------------------
SECTION 18: QUALITY GATES
------------------------------------------------------------
QG1: 100% defined error codes referenced in code (no stray strings).  
QG2: All exported functions have TSDoc.  
QG3: Snapshot stable structure; adding fields requires version note.  
QG4: Math functions pure & individually testable.  
QG5: Lint + type + simulation tests pass.  

------------------------------------------------------------
SECTION 19: EXECUTION ORDER (MICRO-STEPS)
------------------------------------------------------------
S1: Define config & types  
S2: Implement bucket utility (refill / subtract)  
S3: Implement soft token window logic  
S4: Implement daily cap logic  
S5: Approval pipeline (without events)  
S6: Event emission integration wrapper  
S7: Usage recording (post-call)  
S8: Snapshot builder & digest  
S9: Adaptive scaling logic & factor compute  
S10: Integration with LLMManager & Engine events  
S11: Dynamic config update path  
S12: Test harness scenarios & stress test  

------------------------------------------------------------
SECTION 20: SUB-PROMPT GENERATION INSTRUCTIONS (META)
------------------------------------------------------------
1. Use Section 13 template.  
2. Generate 16 sub-prompts (Section 12).  
3. Each sub-prompt ≤ 220 lines.  
4. Must list explicit file paths.  
5. Each includes at least one negative test bullet.  
6. Produce INDEX.md summarizing outputs.  
Validation After Generation:
- COUNT=16
- All include "Feature: F09-RATE-GOVERNOR"
- All have Objective, Constraints, Validation, Non-goals
- INDEX enumerates all file artifacts

------------------------------------------------------------
SECTION 21: FUTURE EXTENSION HOOKS
------------------------------------------------------------
+ Multi-tenant quota contexts (per user / per agent)  
+ Persistence backend (Redis / durable KV)  
+ Burst shaping for streaming token drains  
+ Predictive pre-allocation (forecasting upcoming cycles)  
+ Rate-informed strategy switching (tie into Feature 5)  

------------------------------------------------------------
SECTION 22: EXECUTION TRIGGER PHRASE
------------------------------------------------------------
"GENERATE_F09_SUB_PROMPTS_v1"

------------------------------------------------------------
SECTION 23: FINAL MASTER OBJECTIVE (CONDENSED)
------------------------------------------------------------
DELIVER a deterministic, extensible Rate Governor enforcing multi-level quotas (per-model + global), providing adaptive awareness events to agents, capturing real-time usage snapshots, and integrating cleanly with the Engine & LLMManager—ensuring sustainable, tunable resource usage under evolving multi-agent workloads.

END OF MASTER PROMPT