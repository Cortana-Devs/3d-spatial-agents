# MASTER PROMPT: GEMINI 2.5 INTEGRATION & DUAL ACTIVE AI AGENTS
Version: 1.0  
Feature ID: F03-GEMINI-INTEGRATION  
Authoring Mode: LLM Infrastructure / Runtime Adapters / Multi-Agent Activation  
Primary Goal: Integrate Google Gemini 2.5 (Flash + Pro) via a secure, modular adapter layer powering two in-world active AI-controlled avatars (male + female), enabling perception → reasoning → action cycles routed exclusively through the central Engine. Provide forward extensibility (GPT‑5 & other providers), structured prompt templating, usage telemetry, safety/error isolation, and environment-driven operational controls (latency, rate, fallback).

------------------------------------------------------------
SECTION 1: ULTRA-COMPRESSED CONTEXT SNAPSHOT
------------------------------------------------------------
RUNTIME=Web/Node hybrid (likely Next.js server functions + client scene)
EXISTING_FEATURES=F01 (avatar runtime), F02 (Engine skeleton)
THIS FEATURE DEPENDS_ON=Engine request API + entity registration
OUTPUT CORE: LLMAdapter + LLMManager + Dual Agent Activation + Persona/Memory Loading
RATE AWARENESS=Delegates hard governance to Feature 4 (RateGovernor hook), but must expose usage counters now.
SECURITY=No API key leaks client-side; server-only invocation path.

------------------------------------------------------------
SECTION 2: CORE OBJECTIVES
------------------------------------------------------------
O1: Implement pluggable `GeminiAdapter` conforming to `LLMAdapter` interface.  
O2: Support models: gemini-2.5-flash (default fast) & gemini-2.5-pro (deeper reasoning).  
O3: Establish `LLMManager` to route requests, manage adapters, track usage, surface metrics.  
O4: Introduce dual agent controllers (male/female) bound to Engine entities using LLM cycles.  
O5: Provide persona + memory (episodic + summary) loaders (lazy, cache).  
O6: Standardize internal prompt template assembly (system + persona + situational + memory slice + instruction).  
O7: Implement structured usage tracking: calls, input tokens, output tokens, per-model aggregation.  
O8: Safe error taxonomy and resilient retries (transient vs fatal).  
O9: Provide streaming extension seam (Flash streaming optional; non-blocking initial).  
O10: Expose debug snapshot & introspection events: llm:request, llm:response, llm:error, agent:decision.  
O11: Ensure no direct LLM call bypasses Engine (only via `Engine.request({type:'agent.cycle'})` hooking into LLMManager).  
O12: Future-proof GPT‑5 placeholder adapter (feature flag).  

------------------------------------------------------------
SECTION 3: ACCEPTANCE CRITERIA
------------------------------------------------------------
AC1: Two active agents (male/female) respond to a test “describe environment” query within model & rate constraints.  
AC2: All LLM invocations pass through `LLMManager` and are logged with model + tokens.  
AC3: Persona + memory fragments combined deterministically into final prompt (hash stable given identical state).  
AC4: Adapter rejects missing API key with typed error GEMINI_CONFIG_ERROR.  
AC5: Switching model (Flash → Pro) via Engine request updates reasoning strategy without restart.  
AC6: Usage snapshot returns JSON: { models: { name: { calls, inputTokens, outputTokens } }, total }  
AC7: Token + call counts increment only after successful response parse.  
AC8: Failure (network 5xx) triggers bounded retry (≤2) with exponential backoff (configurable).  
AC9: Streaming stub optionally yields partial tokens (if enabled) without breaking non-stream fallback.  
AC10: GPT‑5 placeholder selection yields controlled NOT_IMPLEMENTED error event, not crash.  

------------------------------------------------------------
SECTION 4: CONSTRAINTS
------------------------------------------------------------
C1: No secret exposure client-side—adapter logic server-only / secure boundary.  
C2: Strict TypeScript; no implicit any; discriminated union for adapter errors.  
C3: Hard separation: Prompt assembly vs transport vs usage accounting.  
C4: No coupling to UI frameworks; agents purely event/tick driven.  
C5: Provide pure functions for deterministic prompt building (test hashed).  
C6: Avoid premature optimization—batching optional, not mandatory now.  
C7: Model names & env-config references centralized single source.  

------------------------------------------------------------
SECTION 5: ENV / CONFIG KEYS (INITIAL SPEC)
------------------------------------------------------------
GEMINI_API_KEY=<secret>  
GEMINI_MODEL_FLASH=gemini-2.5-flash  
GEMINI_MODEL_PRO=gemini-2.5-pro  
GEMINI_DEFAULT_MODEL=gemini-2.5-flash  
GEMINI_TEMPERATURE=0.7  
GEMINI_MAX_OUTPUT_TOKENS=1024  
GEMINI_TOP_P=0.9  
GEMINI_TOP_K=40  
GEMINI_MAX_RETRIES=2  
GEMINI_RETRY_BASE_DELAY_MS=250  
GEMINI_ENABLE_STREAM=0|1  
GEMINI_PERSONA_DIR=./ai/personas  
GEMINI_MEMORY_DIR=./ai/memory  
LLM_USAGE_SNAPSHOT_WINDOW_MS=60000 (rolling instrumentation)  
LLM_AGENT_DECISION_INTERVAL_MS=2500 (fallback to AGENT_DECISION_INTERVAL_MS if set)  
LLM_GPT5_FEATURE_FLAG=0|1  

------------------------------------------------------------
SECTION 6: HIGH-LEVEL DATA FLOWS
------------------------------------------------------------
(1) Engine.tick -> schedules agent.cycle request  
(2) Engine.request(type='agent.cycle') -> AgentRuntime -> Perception gather -> Prompt assembly -> LLMManager.complete()  
(3) LLMManager selects adapter (Flash | Pro) + passes structured LLMRequest  
(4) Adapter HTTP call -> parse -> standardize LLMResponse -> usage tracking -> events emitted  
(5) AgentRuntime transforms LLM response into action plan -> Engine.request(world.mutate ...)  

------------------------------------------------------------
SECTION 7: CORE INTERFACES (PROPOSED)
------------------------------------------------------------
interface LLMRequest {
  id: string
  model: string
  messages: LLMMessage[]
  temperature?: number
  maxOutputTokens?: number
  topP?: number
  topK?: number
  metadata?: Record<string, unknown>
}

interface LLMMessage {
  role: 'system'|'user'|'assistant'|'tool'
  content: string
}

interface LLMResponse {
  id: string
  model: string
  created: number
  inputTokens: number
  outputTokens: number
  text: string
  finishReason: 'stop'|'length'|'error'|'other'
  raw?: unknown
}

interface LLMUsageSnapshot {
  timestamp: number
  models: Record<string,{ calls:number; inputTokens:number; outputTokens:number }>
  total: { calls:number; inputTokens:number; outputTokens:number }
}

interface LLMAdapter {
  name: string
  supports(model: string): boolean
  complete(req: LLMRequest): Promise<LLMResponse>
  stream?(req: LLMRequest): AsyncIterable<LLMResponse>
  usage(): LLMUsageSnapshot
}

interface PersonaData {
  id: string
  systemDirectives: string
  traits: string[]
  style: string
  goals: string[]
}

interface MemorySnapshot {
  episodic: string[]            // recent events
  semanticSummary: string       // compressed persona-aligned summary
  lastUpdated: number
}

interface AgentContext {
  agentId: string
  worldStateHash: string
  nearbyEntities: string[]
  lastActions: string[]
  persona: PersonaData
  memory: MemorySnapshot
}

------------------------------------------------------------
SECTION 8: PROMPT ASSEMBLY SCHEMA
------------------------------------------------------------
Final Prompt = 
  SYSTEM BLOCK (engine governance + safety constraints) +
  PERSONA BLOCK (traits, style, goals) +
  CONTEXT BLOCK (world snapshot summary, nearby entity descriptors) +
  MEMORY BLOCK (recent episodic lines + semantic summary) +
  INSTRUCTION BLOCK (action objective) +
  OUTPUT FORMAT INSTRUCTION (JSON plan contract)
All concatenated with deterministic separators:
"---SECTION:<NAME>---\n"
Hash derivation (SHA-256) over sections (excluding dynamic timestamps) for determinism.

------------------------------------------------------------
SECTION 9: ERROR TAXONOMY
------------------------------------------------------------
GEMINI_CONFIG_ERROR (missing/invalid env)  
GEMINI_HTTP_ERROR (non-2xx, includes status)  
GEMINI_PARSE_ERROR (unexpected response shape)  
GEMINI_API_LIMIT (quota/rate/429)  
GEMINI_RETRY_EXHAUSTED  
GEMINI_NOT_IMPLEMENTED (GPT-5 placeholder)  
LLM_UNSUPPORTED_MODEL  
LLM_PROMPT_BUILD_FAILED  
AGENT_PERSONA_LOAD_FAILED  
AGENT_MEMORY_LOAD_FAILED  

All errors: { code, message, cause?, details? }

------------------------------------------------------------
SECTION 10: EVENTS (THIS FEATURE EMITS)
------------------------------------------------------------
llm:request { requestId, model, tokensEst, agentId? }  
llm:response { requestId, model, inputTokens, outputTokens, ms }  
llm:error { requestId, code, model }  
agent:decision:start { agentId, cycleId }  
agent:decision:plan { agentId, cycleId, planActions }  
agent:decision:error { agentId, cycleId, errorCode }  
agent:persona:loaded { agentId, personaId }  
agent:memory:loaded { agentId, episodicCount, summaryChars }  

------------------------------------------------------------
SECTION 11: SUB-PROMPT GENERATION INDEX
------------------------------------------------------------
Generate subordinate prompt folders & prompts:

1-adapter-core/
  PROMPT_ADAPTER_CORE.md
2-http-transport/
  PROMPT_HTTP_TRANSPORT.md
3-env-loader/
  PROMPT_ENV_LOADER.md
4-llm-manager/
  PROMPT_LLM_MANAGER.md
5-persona-loader/
  PROMPT_PERSONA_LOADER.md
6-memory-store/
  PROMPT_MEMORY_STORE.md
7-prompt-builder/
  PROMPT_PROMPT_BUILDER.md
8-dual-agent-activation/
  PROMPT_DUAL_AGENT_ACTIVATION.md
9-usage-tracking/
  PROMPT_USAGE_TRACKING.md
10-error-handling/
  PROMPT_ERROR_HANDLING.md
11-test-harness/
  PROMPT_TEST_HARNESS.md
12-streaming-extension/
  PROMPT_STREAMING_EXTENSION.md
13-safety-filter/
  PROMPT_SAFETY_FILTER.md
14-future-gpt5-placeholder/
  PROMPT_GPT5_PLACEHOLDER.md

Each subordinate prompt uses template (Section 16) and includes:
- Objective
- Constraints
- File outputs + exports
- Validation bullets
- Non-goals

------------------------------------------------------------
SECTION 12: IMPLEMENTATION ORDER (PHASED)
------------------------------------------------------------
P1 (Foundations): env-loader, adapter-core (non-stream), http-transport, error-handling  
P2 (Runtime): persona-loader, memory-store, prompt-builder  
P3 (Orchestration): llm-manager, usage-tracking, dual-agent-activation  
P4 (Extensions): streaming-extension, safety-filter, test-harness  
P5 (Future-Proof): GPT‑5 placeholder adapter + gating  

------------------------------------------------------------
SECTION 13: TEST STRATEGY
------------------------------------------------------------
Unit:
- Env loader: missing key rejection
- Prompt builder: deterministic hash & stable ordering
- Adapter mock: parse & error classification

Integration:
- Simulated agent cycle with stubbed LLM returning fixed plan JSON
- Dual agent interleaving decisions with consistent scheduling intervals

Resilience:
- Inject HTTP 500 -> verify retry then success
- Inject 429 -> verify early raise GEMINI_API_LIMIT (RateGovernor will handle later)

Determinism:
- Same persona + memory + context → identical prompt hash across 3 runs

Performance (baseline):
- Single Flash call median latency overhead (framework code) < 10ms over raw HTTP

Memory:
- Persona + memory caching prevents redundant file reads after warm phase

------------------------------------------------------------
SECTION 14: METRICS & OBSERVABILITY
------------------------------------------------------------
Track:
- callsPerModel
- tokensIn/Out per model
- avgLatencyMs per model
- lastErrorCode per model
- agentCycleDuration distribution (min, p50, p95, max)
Expose:
- llmManager.snapshot()
- agentRuntime.debug(agentId)
Provide optional /debug/llm JSON export (future endpoint).

------------------------------------------------------------
SECTION 15: RISK TABLE (CONDENSED)
------------------------------------------------------------
R1: API schema drift → Mitigation: central response normalizer + version guard  
R2: Token miscount → Parse vendor usage fields; fallback heuristic if missing  
R3: Persona file corruption → Validate YAML/JSON schema; fallback default persona  
R4: Memory explosion (episodic growth) → Cap lines; periodic summarize hook (future)  
R5: Prompt length overflow → Pre-flight token estimation & trimming strategy  
R6: Hidden PII leakage → Safety filter stage pre-send (basic regex + allowlist)  
R7: GPT‑5 future API mismatch → Adapter boundary isolation + NOT_IMPLEMENTED stub  

------------------------------------------------------------
SECTION 16: SUB-PROMPT TEMPLATE
------------------------------------------------------------
"""
Feature: F03-GEMINI-INTEGRATION
Sub-Task: <NAME>
Context:
Gemini 2.5 integration requires modular adapter + structured multi-agent reasoning pipeline.
This sub-task focuses on <specific component>.

Objective:
<One measurable, outcome-oriented sentence>

Constraints:
- Strong TypeScript typing
- Separation of concerns (no cross-layer bleed)
- Deterministic outputs where claimed
- No exposure of secrets to client bundle
- Maintain testability (pure functions where possible)

Inputs / References:
- Env vars (list if needed)
- Shared interfaces (LLMRequest, LLMResponse, etc.)

Output:
<List exact file paths & exported symbols>

Validation:
- <3–7 bullet acceptance tests referencing behavior, not implementation>
- Determinism checks where relevant
- Error propagation rules

Non-goals:
- Rate governance logic (Feature 4)
- UI layer
- Long-term memory summarization (placeholder only if needed)
"""

------------------------------------------------------------
SECTION 17: SAMPLE SUB-PROMPT (ADAPTER CORE)
------------------------------------------------------------
"""
Feature: F03-GEMINI-INTEGRATION
Sub-Task: Adapter Core
Context:
Need GeminiAdapter implementing LLMAdapter.complete() (non-stream first), returning normalized LLMResponse with token usage.

Objective:
Implement geminiAdapter with complete() performing HTTP POST to Gemini models endpoint (model from req.model) using env key.

Constraints:
- Throw GEMINI_CONFIG_ERROR if missing API key
- Map vendor errors to taxonomy
- Parse input/output token counts
- No streaming yet here

Output:
File: src/llm/adapters/geminiAdapter.ts
Exports: createGeminiAdapter(), GEMINI_ADAPTER_NAME, GeminiAdapterError (enum or codes)

Validation:
- createGeminiAdapter() returns object supporting flash & pro
- Unsupported model triggers LLM_UNSUPPORTED_MODEL
- Missing key triggers GEMINI_CONFIG_ERROR
- Mocked 500 triggers GEMINI_HTTP_ERROR
- Response shape normalized with text populated
Non-goals:
- Streaming
- Usage aggregation (handled by manager)
"""

------------------------------------------------------------
SECTION 18: DUAL AGENT ACTIVATION LOGIC OVERVIEW
------------------------------------------------------------
Each agent:
- Has personaId (female_agent, male_agent)
- Memory snapshot loaded (episodic recent events, semantic summary)
- Decision cycle timer (interval)
Cycle Steps:
1. Gather world context (Engine snapshot subset)
2. Build prompt
3. LLMManager.complete()
4. Parse structured JSON plan (validate schema)
5. Convert plan actions -> Engine requests
6. Emit agent:decision:plan

Error Path:
- On LLM error → agent:decision:error → schedule backoff (exponential capped)

------------------------------------------------------------
SECTION 19: FILE / DIRECTORY SCHEMA (PROPOSED)
------------------------------------------------------------
/ai/personas/
  female_agent.yaml
  male_agent.yaml
/ai/memory/
  female/episodic.log
  female/summary.txt
  male/episodic.log
  male/summary.txt
/src/llm/
  adapters/geminiAdapter.ts
  adapters/gpt5AdapterPlaceholder.ts
  manager/llmManager.ts
  prompt/promptBuilder.ts
  prompt/templates.ts
  persona/personaLoader.ts
  memory/memoryStore.ts
  usage/usageTracker.ts
  errors/llmErrors.ts
  safety/safetyFilter.ts
  agents/agentRuntime.ts
  agents/agentControllerFactory.ts
  test/ (integration harness & mocks)

------------------------------------------------------------
SECTION 20: EXECUTION ORDER (MICRO-STEPS)
------------------------------------------------------------
S1: Define shared types + error codes  
S2: Env loader + validation  
S3: Gemini adapter (non-stream)  
S4: Prompt builder (system + persona + memory + context)  
S5: Persona + memory loaders + caching  
S6: Usage tracker (in-memory)  
S7: LLMManager orchestrating adapters + usage  
S8: Agent runtime (perception → reason → plan)  
S9: Dual activation + Engine integration (agent.cycle)  
S10: Error handling / retry logic  
S11: Safety filter (basic)  
S12: Streaming extension seam  
S13: GPT‑5 placeholder adapter  
S14: Integration tests & snapshot harness  

------------------------------------------------------------
SECTION 21: QUALITY GATES
------------------------------------------------------------
QG1: All public functions documented (TSDoc)  
QG2: 0 uncaught promise rejections in test harness  
QG3: Deterministic prompt hash stable across runs (when state unchanged)  
QG4: Coverage for error taxonomy resolution paths  
QG5: GPT‑5 placeholder behind feature flag returns NOT_IMPLEMENTED w/out crash  

------------------------------------------------------------
SECTION 22: EXECUTION TRIGGER PHRASE
------------------------------------------------------------
"GENERATE_F03_SUB_PROMPTS_v1"

------------------------------------------------------------
SECTION 23: FINAL MASTER OBJECTIVE (CONDENSED)
------------------------------------------------------------
DELIVER a secure, modular Gemini 2.5 (Flash + Pro) integration enabling dual autonomous agents with deterministic prompt assembly, persona+memory contextualization, structured usage tracking, resilient error handling, streaming-ready interface, and forward-compatible multi-model expansion (GPT‑5), all mediated exclusively through the central Engine.

END OF MASTER PROMPT