type MemoryLayer = 'episodic' | 'semantic' | 'procedural' | 'social' | 'spatial' | 'system'

interface MemoryRecord {
  id: string
  layer: MemoryLayer
  agentId: string
  createdAt: number
  importance: number              // 0..1
  recencyAnchor: number           // same as createdAt or logical tick
  ttl?: number                    // optional expiry (ms)
  embeddingRef?: string           // key into vector index
  tokensEstimate?: number
  content: string                 // raw text or structured JSON stringified
  metadata: {
    tags?: string[]
    sourceEvent?: string
    sourceRefIds?: string[]
    spatial?: { x: number; y: number; z: number }
    social?: { otherAgentId?: string; sentiment?: number }
    procedural?: { patternId?: string; successRate?: number }
  }
  redacted?: boolean
  hash?: string
}

interface RetrievalRequest {
  agentId: string
  purpose: 'reasoning' | 'dialog' | 'navigation' | 'summary'
  maxTokens: number
  strategy?: 'balanced' | 'recency' | 'importance' | 'semantic'
  model?: string
  pressureState?: 'normal' | 'soft' | 'throttle' | 'exhausted'
}

interface RetrievedBundle {
  records: MemoryRecord[]
  totalTokens: number
  truncated: boolean
  strategyApplied: string
  diagnostics: RetrievalDiagnostics
}

interface RetrievalDiagnostics {
  candidateCount: number
  filteredCount: number
  scoringBreakdown: { key: string; weight: number }[]
  timeMs: number
  compressionApplied?: boolean
}

interface SummarizationTask {
  id: string
  agentId: string
  targetLayer: MemoryLayer
  sourceIds: string[]
  createdAt: number
  status: 'queued' | 'running' | 'completed' | 'failed' | 'skipped'
  summaryRecordId?: string
  failureReason?: string
}

interface MemoryConfig {
  episodicWindow: number
  episodicMax: number
  summarizationBatchSize: number
  summarizationMinIntervalMs: number
  decayHalfLifeMs: number
  importanceBoost: number
  throttleCompressionRatio: number
  embeddingDim: number
  maxContextTokens: number
  redactPatterns: string[]
  retentionPolicy: {
    semanticMax?: number
    socialMax?: number
    proceduralMax?: number
  }
}

```

---

## 7. SCORING MODEL (HYBRID)
FinalScore = (importance * IW) + (recencyScore * RW) + (semanticSimilarity * SW) + (structuralWeight * PW)  
- importance: user/agent flagged or heuristic (emotion intensity, novelty)  
- recencyScore: exp(-Δt / halfLife)  
- semanticSimilarity: cosine(vector, query centroid) (stub until embeddings real)  
- structuralWeight: layer weighting (e.g. semantic > episodic when purpose=dialog)  
Dynamic Weights adapt to RetrievalRequest.purpose & Rate Governor pressure.  

---

## 8. COMPRESSION & SUMMARIZATION
Phases:  
1. Collection (select low-importance episodic older than threshold).  
2. Grouping (cluster by tags / temporal proximity / involved entities).  
3. Prompt Assembly (structured template: events list → thematic synthesis + key facts).  
4. Synthesis (LLM mediated; fallback local heuristics if LLM unavailable).  
5. Replacement: Insert semantic summary record; retire original episodic (store references).  
Safety: Keep at least K recent episodic untouched for temporal fidelity.  

---

## 9. RETRIEVAL FLOW
1. Build candidate set (filter by agentId + live TTL + layer policy).  
2. Evaluate each candidate (score components).  
3. Sort stable (score DESC, tie-break id).  
4. Pack sequentially until token budget reached.  
5. If Rate Pressure=throttle → apply compression: shorten content (first sentence + tags).  
6. Emit memory:retrieval event with diagnostics.  

---

## 10. EVENTS (EMITTED)
memory:record:created { id, layer, agentId, importance }  
memory:record:expired { id, layer }  
memory:record:redacted { id }  
memory:summarization:queued { taskId, agentId, sourceCount }  
memory:summarization:completed { taskId, summaryRecordId, reductionRatio }  
memory:summarization:failed { taskId, reason }  
memory:retrieval { agentId, purpose, candidateCount, used, truncated, pressureState }  
memory:compaction { agentId, removed, remaining }  
memory:decay:applied { agentId, affected }  

---

## 11. ERROR TAXONOMY
MEMORY_CONFIG_INVALID  
MEMORY_RECORD_NOT_FOUND  
MEMORY_CAPACITY_EXCEEDED  
MEMORY_SUMMARY_LOCKED (concurrent summarization)  
MEMORY_SUMMARY_FAILED  
MEMORY_EMBEDDING_UNAVAILABLE  
MEMORY_EMBEDDING_FAILED  
MEMORY_RETRIEVAL_EMPTY  
MEMORY_REDACTION_PATTERN_INVALID  
MEMORY_RETENTION_VIOLATION  
MEMORY_TOKEN_BUDGET_UNDEFINED  

---

## 12. DATA STRUCTURES / ALGORITHMS
- Episodic Ring Buffer (O(1) append, O(1) overwrite when full).  
- Layered Skip List or Balanced AVL for time-sorted semantic/procedural sets (deterministic iteration).  
- Min-Heap for summarization candidates (key: importance ascending, recency ascending).  
- Vector Index (abstract): baseline = in-memory array + partial linear scan; hook for approximate methods (HNSW / IVF) later.  
- Importance-Decayed Score = importance * exp(-Δt / halfLife).  
- Redaction Pass: regex pattern compile once; streaming replace; store redacted flag.  

---

## 13. INTEGRATION TOUCHPOINTS
F02 Engine: All write operations triggered by Engine events or Engine.request.  
F03 LLM: Summarization & embedding call surfaces via LLMManager; if throttled → degrade.  
F04 Rate Governor: Pressure modifies retrieval weights & compression ratio.  
F05 Behavior: AgentContext memory slice resolver uses Retrieval API.  
F06/F07 Physics + Collision: Spatial events ingested if flagged (movement boundary crossing, new contact class).  
F08 UI: Memory Viewer queries snapshot + diff endpoints; redaction toggle.  

---

## 14. SECURITY & PRIVACY / REDACTION
- Redaction patterns configurable (EMAIL, UUID, numeric sequences beyond length threshold).  
- Redacted content retains hashed placeholder: `<REDACT:sha256-abc123>`  
- Flagged memory never leaves system unredacted if redactionMode=ON (UI toggle).  
- Logging excludes raw redacted content (store hashed).  

---

## 15. PERFORMANCE TARGETS
- Retrieval (candidate set ≤ 2k): < 5 ms average (no embedding heavy path).  
- Summarization batch (N=25 episodic) LLM latency external; internal orchestration ≤ 2 ms overhead.  
- Memory insert throughput target: ≥ 2k records/min sustained (in-memory baseline).  
- Compaction cycle executes under 15 ms (spread incremental if > budget).  
- GC Pressure: Avoid > 5% frame time spikes due to memory churn (reuse object pools for transient scoring structs).  

---

## 16. RISK & MITIGATION
| Risk | Impact | Mitigation |
|------|--------|-----------|
| Unbounded growth | Memory/latency | Strict retention + compaction triggers |
| Over-summarization info loss | Poor context | Coverage heuristic + summary quality validator |
| Rate throttle stalls summarization | Stale context | Degraded local heuristic summarizer fallback |
| Embedding mismatch future model | Re-index cost | Abstract embedding & maintain version field |
| Non-deterministic retrieval | Inconsistent reasoning | Stable multi-key sorting + seed injection |
| Redaction false positives | Context distortion | Maintain redaction diagnostics & allow override |
| Token budget overflow | LLM failure | Pre-flight token estimate & iterative trim algorithm |

---

## 17. SUB-PROMPT GENERATION INDEX
Create subordinate prompt folders & prompt files:

1-schema-types/  
  PROMPT_SCHEMA_TYPES.md  
2-config-validation/  
  PROMPT_CONFIG_VALIDATION.md  
3-ingestion-pipeline/  
  PROMPT_INGESTION_PIPELINE.md  
4-importance-scoring/  
  PROMPT_IMPORTANCE_SCORING.md  
5-decay-engine/  
  PROMPT_DECAY_ENGINE.md  
6-embedding-adapter/  
  PROMPT_EMBEDDING_ADAPTER.md  
7-vector-index-baseline/  
  PROMPT_VECTOR_INDEX_BASELINE.md  
8-retrieval-orchestrator/  
  PROMPT_RETRIEVAL_ORCHESTRATOR.md  
9-context-packer/  
  PROMPT_CONTEXT_PACKER.md  
10-summarization-pipeline/  
  PROMPT_SUMMARIZATION_PIPELINE.md  
11-compression-strategies/  
  PROMPT_COMPRESSION_STRATEGIES.md  
12-redaction-filter/  
  PROMPT_REDACTION_FILTER.md  
13-retention-compaction/  
  PROMPT_RETENTION_COMPACTION.md  
14-procedural-pattern-miner/  
  PROMPT_PROCEDURAL_PATTERN_MINER.md  
15-social-layer-handler/  
  PROMPT_SOCIAL_LAYER_HANDLER.md  
16-spatial-layer-adapter/  
  PROMPT_SPATIAL_LAYER_ADAPTER.md  
17-introspection-api/  
  PROMPT_INTROSPECTION_API.md  
18-ui-integration-endpoints/  
  PROMPT_UI_INTEGRATION_ENDPOINTS.md  
19-test-harness-determinism/  
  PROMPT_TEST_HARNESS_DETERMINISM.md  
20-observability-metrics/  
  PROMPT_OBSERVABILITY_METRICS.md  

---

## 18. SUB-PROMPT TEMPLATE
```
Feature: F09-MEMORY-SYSTEM
Sub-Task: <NAME>
Context:
Memory subsystem requires <specific component> aligned with Engine governance & multi-layer cognitive model.

Objective:
<Clear measurable deliverable>

Constraints:
- Strong TypeScript
- Deterministic ordering (where retrieval/scoring)
- No direct LLM calls (use injected adapters)
- Rate-aware if long-running
- Config-driven (no magic constants)
- Minimal GC churn

Inputs / References:
- MemoryConfig
- MemoryRecord
- Engine events (if ingestion)
- Rate pressure states

Output:
<Exact file path(s) & exported symbols>

Validation:
- <3–7 bullet acceptance checks>
- Include at least one negative/error scenario
- Performance or determinism assertion if relevant

Non-goals:
- UI rendering
- Hard-coded provider specifics
- External DB deployment (abstract only)
```

---

## 19. SAMPLE SUB-PROMPT (RETRIEVAL ORCHESTRATOR)
```
Feature: F09-MEMORY-SYSTEM
Sub-Task: Retrieval Orchestrator
Context:
Need unified retrieval API combining scoring, filtering, compression & token budgeting for agent reasoning.

Objective:
Implement retrieve(request: RetrievalRequest) -> Promise<RetrievedBundle> with deterministic ordering & diagnostics.

Constraints:
- Hybrid scoring: importance, recency, semantic (placeholder)
- Stable multi-key sort
- Token budget enforcement with iterative shrink
- Pressure-aware compression (throttle => apply ratio)
- Must emit memory:retrieval event

Output:
File: src/memory/retrieval/retrievalOrchestrator.ts
Exports: retrieve, computeScores, RetrievalDiagnostics

Validation:
- Deterministic ordering for identical state
- Exceeding token budget triggers truncated=true
- Pressure=throttle reduces total tokens vs normal
- Empty candidate set returns bundle with records=[]
- Importance boost ensures flagged record in top positions
Non-goals:
- Summarization
- Embedding generation
```

---

## 20. METRICS & OBSERVABILITY
Metrics (per agent + aggregate):
- memoryRecordsTotal
- episodicCount / semanticCount / proceduralCount / socialCount / spatialCount
- averageRetrievalMs / p95RetrievalMs
- summarizationTasksQueued / Completed / Failed
- compressionUsageRate
- redactedRecords
- retentionPrunedCount
Log Tags:
[MEM][CREATE], [MEM][RETRIEVE], [MEM][SUMMARY], [MEM][COMPACT], [MEM][REDACT], [MEM][ERROR]
Debug Endpoint (optional): /debug/memory -> sanitized snapshot.

---

## 21. CONFIG & ENV SUGGESTIONS
MEMORY_EPISODIC_MAX=1200  
MEMORY_EPISODIC_WINDOW_MS=900000  
MEMORY_SUMMARIZATION_MIN_INTERVAL_MS=60000  
MEMORY_SUMMARIZATION_BATCH=25  
MEMORY_DECAY_HALFLIFE_MS=3600000  
MEMORY_IMPORTANCE_BOOST=2.5  
MEMORY_THROTTLE_COMPRESSION_RATIO=0.55  
MEMORY_EMBEDDING_DIM=384  
MEMORY_MAX_CONTEXT_TOKENS=1800  
MEMORY_REDACT_PATTERNS="EMAIL,UUID,NUMSEQ16"  
MEMORY_RETENTION_SEMANTIC_MAX=400  
MEMORY_RETENTION_SOCIAL_MAX=300  
MEMORY_RETENTION_PROCEDURAL_MAX=250  

---

## 22. TEST STRATEGY (OVERVIEW)
Unit:
- Scoring function weight correctness
- Redaction pattern compile & apply
- Ring buffer overflow behavior
- Decay & importance interplay
Integration:
- Summarization pipeline reduces records & emits summary
- Retrieval under throttle compresses tokens
- Determinism harness stable ordering (hash check)
Failure:
- Embedding unavailable → fallback score path
- Summarization LLM error → fallback retention
Performance:
- 2k records retrieval < 5 ms (mock embeddings)
- Compaction cycle incremental under target budget
Determinism:
- Same seed & dataset => identical retrieval hash
Edge:
- All records expired -> retrieval empty but no error

---

## 23. QUALITY GATES
QG1: 0 `any` in public types.  
QG2: Determinism harness passes for baseline scenario.  
QG3: Summarization fallback path tested (LLM unavailable).  
QG4: Retrieval latency p95 < 10 ms (mock embeddings).  
QG5: Redaction patterns applied before LLM exposure.  
QG6: Memory growth plateau under retention + compaction.  
QG7: All exported functions TSDoc documented.  

---

## 24. EXECUTION ORDER (MICRO-STEPS)
S1: Define types & config validator  
S2: Implement base MemoryStore + ingestion mapping  
S3: Add episodic ring buffer + retention primitives  
S4: Scoring & retrieval orchestrator (no embeddings)  
S5: Embedding adapter stub + vector index baseline  
S6: Summarization scheduler + pipeline (LLM -> fallback)  
S7: Compression strategies & pressure integration  
S8: Redaction filter pass  
S9: Procedural/social/spatial layer adapters  
S10: Introspection & metrics collector  
S11: Determinism test harness  
S12: Optimization & memory profiling pass  

---

## 25. SUB-PROMPT GENERATION INSTRUCTIONS (META)
1. Use Section 18 template for each sub-prompt.  
2. Generate exactly 20 sub-prompts (Section 17 index).  
3. Each ≤ 220 lines.  
4. Include explicit file paths + exported symbols.  
5. Provide ≥1 negative test bullet each.  
6. Produce INDEX.md summarizing artifacts after generation.  
Validation After Generation:
- COUNT(sub-prompts)=20
- All contain "Feature: F09-MEMORY-SYSTEM"
- Each has Objective, Constraints, Validation, Non-goals
- INDEX lists all outputs + trigger phrase

---

## 26. EXECUTION TRIGGER PHRASE
"GENERATE_F09_SUB_PROMPTS_v1"

---

## 27. FINAL MASTER OBJECTIVE (CONDENSED)
DELIVER a deterministic, rate-aware, multi-layer Memory System with robust ingestion, hybrid scoring retrieval, adaptive summarization & compression, redaction safety, and introspection—anchoring agent cognition depth while safeguarding performance, token efficiency, and future extensibility.

END OF MASTER PROMPT