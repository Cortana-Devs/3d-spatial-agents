```Descendants/🚧 ✅ DEVELOPMENT-PLAN ✅ 🚧/PROMPTS/🧠 NEXT-FEATURES/10-ADVANCED-DATA-STRUCTURES/MASTER_PROMPT.md#L1-400
# MASTER PROMPT: ADVANCED DATA STRUCTURES & ALGORITHMIC OPTIMIZATION LAYER
Version: 1.0  
Feature ID: F10-ADVANCED-DATA-STRUCTURES  
Authoring Mode: High-Performance Systems Architecture / Algorithm Engineering / Determinism  
Primary Goal: Introduce a unified, high-performance, memory‑efficient, deterministic data structure & algorithm layer powering Engine (F02), LLM Integration (F03), Rate Governor (F04), Behavior Orchestrator (F05), Physics & Collision (F06–F07), UI Telemetry (F08), and Memory System (F09). Provide scalable primitives (queues, indexed stores, spatial structures, diff hashing, compressed logs, approximate similarity) with strict performance contracts and observability hooks.

------------------------------------------------------------
SECTION 1: ULTRA-COMPRESSED CONTEXT SNAPSHOT
------------------------------------------------------------
SYSTEM DOMAINS:
- Engine requests (throughput & latency)
- Rate limiting (token buckets, adaptive scaling)
- Memory retrieval (scoring & semantic relevance)
- Physics / collision (broad-phase + sensor queries)
- Behavior planning (perception diff hashing)
- Event streams (bounded ring buffers)
GOALS:
- Deterministic iteration
- Low GC pressure
- O(1) or amortized sub-linear critical hot paths
- Extensibility for distributed / persistence future

------------------------------------------------------------
SECTION 2: CORE OBJECTIVES
------------------------------------------------------------
O1: Provide canonical utilities: BoundedRingBuffer, PriorityMinMaxQueue, TimeWheelScheduler, TokenBucketMap.
O2: Implement rolling stable hash utilities for structural diff (world/perception/memory sets).
O3: Provide layered spatial acceleration structures (StaticBVH, DynamicAABBTree, GridHash) with unified API.
O4: Build pluggable vector similarity index (baseline: cosine linear scan + optional incremental HNSW stub).
O5: Implement deterministic PRNG & shuffle utilities for seed-based reproducibility.
O6: Introduce adaptive MultiLevelBloomFilter for fast membership / seen checks (event dedupe, memory pruning).
O7: Add compressed event log structure (delta-coded timestamps, tag dictionary) for UI + debugging.
O8: Provide memory-safe object + buffer pool manager for high-frequency ephemeral allocations.
O9: Implement partial persistent snapshot mechanism (structural digest generation & version tracking).
O10: Supply metrics & invariant check framework for DS health (fragmentation, occupancy, load factors).
O11: Harden rate governor algorithms (O(1) amortized) with monotonic high-resolution clocks.
O12: Provide generalized WeightedScorer pipeline (combining recency, importance, semantic similarity).
O13: Abstraction boundary for future WebAssembly accelerated kernels (placeholders + interface).
O14: Ensure all root structures export debug() returning shape + occupancy.

------------------------------------------------------------
SECTION 3: ACCEPTANCE CRITERIA
------------------------------------------------------------
AC1: All core collections: deterministic iteration order given identical insertion sequence & removals.
AC2: Ring buffer wrap-around preserves constant memory; oldest eviction emits optional callback.
AC3: TimeWheelScheduler executes ≤ ~O(k) per tick (k = due buckets) no full scan.
AC4: TokenBucketMap approve() path median < 0.05 ms across 10k sequential approvals (baseline dev machine).
AC5: Spatial queries (AABB overlap) scale sub-linearly vs naive O(n^2) (document benchmark).
AC6: Diff hash stable across runs: identical input sets -> identical 256-bit hash; single mutation alters hash.
AC7: Vector index retrieval returns top-K deterministic order (stable secondary key tie-break).
AC8: Memory object pools show reduced allocation count vs naive baseline (>40% fewer allocations under stress harness).
AC9: Compressed event log reduces storage ≥ 55% vs raw JSON (synthetic test).
AC10: Data structures produce metrics snapshot in < 3 ms aggregated.
AC11: All exported APIs fully typed, no `any`.
AC12: Fuzz tests uncover zero unhandled exceptions for random insertion/removal sequences.

------------------------------------------------------------
SECTION 4: CONSTRAINTS
------------------------------------------------------------
C1: No external runtime dependencies for core structures (only std TS/JS).
C2: Avoid hidden global mutable state (except controlled singleton PRNG if explicitly created).
C3: Provide pure functions for hash, scoring, compression components.
C4: Resilience: operations fail with typed errors + enumerated codes.
C5: Provide capacity guards & explicit failure modes (not silent dropping) where necessary.
C6: Memory overhead documented: each structure lists big-O + practical overhead metrics.
C7: Cross-feature integration only through stable interfaces (no feature-specific hacks).

------------------------------------------------------------
SECTION 5: ARCHITECTURE LAYERING
------------------------------------------------------------
Foundations:
- math / bit operations / hashing
- pooling & alloc reuse
Core Structures:
- BoundedRingBuffer<T>
- PriorityQueue<T> (binary heap + optional pairing heap variant)
- DoubleEndedQueue<T> (gap buffer or circular)
- TimeWheelScheduler (bucketed timing)
- TokenBucketMap (model->bucket state)
Analytical & Indexing:
- StaticBVH (build once)
- DynamicAABBTree (insert/move/remove)
- UniformGridHash (fast broad-phase fallback)
- VectorIndex (linear baseline + pluggable strategy)
- MultiLevelBloomFilter (tiered false positive optimization)
Scoring & Diff:
- WeightedScorer pipeline
- RollingHash (Rabin-Karp variant) + SHA256 fallback
- StructuralDigest (ordered canonical JSON -> hash)
Compression:
- EventLogCompressor (delta-coded timestamps, tag dictionary, variable-length ints)
- MemoryContextCompactor (semantic summarization pre-flight prep interface)
Utilities:
- DeterministicPRNG (Mulberry32 or SplitMix32)
- ObjectPool<T>
- ByteBufferWriter/Reader (little-endian for binary artifacts)
Diagnostics:
- InvariantChecker
- MetricsAggregator
- DSHealthReport builder

------------------------------------------------------------
SECTION 6: KEY INTERFACES
------------------------------------------------------------
interface RingBufferOptions { capacity: number; onEvict?<T>(item: T): void }
interface BoundedRingBuffer<T> {
  push(item: T): void
  get(index: number): T | undefined
  size(): number
  capacity(): number
  toArray(): T[]
  clear(): void
  debug(): { size: number; capacity: number; head: number }
}

interface PriorityQueue<T> {
  push(item: T, priority: number): void
  pop(): T | undefined
  peek(): T | undefined
  size(): number
  changePriority?(item: T, newPriority: number): void
  debug(): { size: number; heapHeight: number }
}

interface TimeWheelConfig { slots: number; slotDurationMs: number; maxDriftMs?: number }
interface TimeWheelScheduler {
  schedule(id: string, delayMs: number, cb: () => void): void
  cancel(id: string): boolean
  tick(nowMs: number): void
  debug(): { scheduled: number; wheelTime: number; slots: number }
}

interface TokenBucket {
  capacity: number
  tokens: number
  refillRatePerSec: number
  lastRefillMs: number
}

interface TokenBucketMap {
  approve(key: string, cost?: number, nowMs?: number): boolean
  snapshot(): Record<string,{ tokens: number; capacity: number }>
  refillAll(nowMs: number): void
}

interface SpatialQueryResult {
  id: string
  aabb: [number, number, number, number, number, number]
  distance?: number
  layer?: number
}

interface SpatialIndex {
  insert(id: string, aabb: [number, number, number, number, number, number]): void
  update(id: string, aabb: [number, number, number, number, number, number]): void
  remove(id: string): void
  queryAABB(aabb: [number, number, number, number, number, number], cb: (id: string) => void): void
  nearest?(point: [number, number, number], k: number): SpatialQueryResult[]
  size(): number
  debug(): unknown
}

interface VectorIndexOptions { dim: number; strategy?: 'linear' | 'hnsw-placeholder'; maxItems?: number }
interface VectorIndex {
  add(id: string, vector: Float32Array): void
  remove(id: string): void
  search(query: Float32Array, k: number): { id: string; score: number }[]
  size(): number
  debug(): { size: number; dim: number; strategy: string }
}

interface WeightedScoreComponents {
  recency: number
  importance: number
  semantic: number
  frequency?: number
  novelty?: number
}

interface WeightedScorerConfig {
  weights: Record<keyof WeightedScoreComponents, number>
  normalization?: boolean
}

interface WeightedScorer {
  score(c: WeightedScoreComponents): number
  debug(): { weights: Record<string, number>; normalization: boolean }
}

interface StructuralDigest {
  hash: string
  sizeBytes: number
  inputs: number
}

------------------------------------------------------------
SECTION 7: HASHING & DIFF PRINCIPLES
------------------------------------------------------------
- RollingHash: polynomial base with large prime modulus; used for streaming sequence digest (fast pre-check).
- StructuralDigest: canonical JSON serializer (sorted keys + stable array ordering) -> SHA256.
- CombinedDiffOutput: { oldHash, newHash, changed: boolean, delta?: { added: X[]; removed: X[]; modified: X[] } }.
- PerceptionDiff: generate set hashed by (entityId + coarseStateHash) -> compare vs prior snapshot.

------------------------------------------------------------
SECTION 8: PERFORMANCE TARGETS
------------------------------------------------------------
STRUCTURE | TARGET OPS (per test harness)
BoundedRingBuffer push | > 5,000,000 ops/sec (dev machine baseline)
PriorityQueue push+pop median | < 2 µs
TimeWheel tick (0–1000 timers) | < 0.3 ms
TokenBucketMap approve | < 0.05 ms p50, < 0.15 ms p95 (10k keys)
DynamicAABBTree update (move) | < 0.08 ms avg
VectorIndex linear search (1k vectors, dim 384) | < 3 ms
WeightedScorer 10k evaluations | < 2 ms
EventLog compression ratio | ≥ 55% reduction vs raw JSON (synthetic feed)
Bloom filter false positive rate (tier 1) | < 1.5% target
Memory pool reuse effectiveness | ≥ 40% allocation reduction (GC counts)

------------------------------------------------------------
SECTION 9: ERROR TAXONOMY
------------------------------------------------------------
DS_INVALID_CAPACITY  
DS_INDEX_OUT_OF_RANGE  
DS_DUPLICATE_ID  
DS_ID_NOT_FOUND  
DS_OVER_CAPACITY  
DS_VECTOR_DIM_MISMATCH  
DS_BUCKET_UNINITIALIZED  
DS_SCHED_DUPLICATE_ID  
DS_SCHED_NOT_FOUND  
DS_HASH_INPUT_INVALID  
DS_POOL_EXHAUSTED  
DS_BLOOM_CONFIG_INVALID  
DS_TIMEWHEEL_DRIFT  
DS_SPATIAL_INVALID_AABB  
DS_STRATEGY_UNSUPPORTED  
DS_INVARIANT_VIOLATION  
DS_DIFF_UNCOMPUTABLE  

------------------------------------------------------------
SECTION 10: EVENT TAXONOMY
------------------------------------------------------------
ds:ring:evict { itemId?, capacity }
ds:priority:resize { size }
ds:scheduler:due { id, latencyMs }
ds:bucket:refill { key, tokens }
ds:spatial:insert { id }
ds:spatial:update { id }
ds:spatial:remove { id }
ds:vector:add { id }
ds:vector:search { k, size, strategy, ms }
ds:log:compressed { originalBytes, compressedBytes }
ds:pool:expand { type, newSize }
ds:invariant:fail { code, context }
ds:diff:computed { hashOld, hashNew, changed }

------------------------------------------------------------
SECTION 11: METRICS & HEALTH SNAPSHOT
------------------------------------------------------------
{
  ringBuffers: [{ id, size, capacity, evictions }],
  priorityQueues: [{ id, size }],
  scheduler: { scheduled, wheelSlots, overflows },
  tokenBuckets: { keys, avgFillRatio, saturated },
  spatial: { indexType, items, rebuilds, avgQueryMs },
  vector: { size, dim, strategy },
  pools: [{ type, free, inUse }],
  hash: { lastStructuralHash, diffOps },
  log: { compressedBytes, ratio },
  memory: { rssApprox?, retainedObjects? },
  timestamp
}

------------------------------------------------------------
SECTION 12: COMPRESSION STRATEGIES
------------------------------------------------------------
Event Log:
- Tag dictionary (first pass gather unique tags -> index)
- Delta timestamps (varint of delta ms)
- Payload soft schema detection (flatten simple numeric/short string fields)
- Optional run-length for repeated tags within same time slice
Memory Context:
- Sentence boundary truncation under pressure
- Inline numeric normalization (hashing long IDs)
- Placeholder substitution for repeated entity tokens (e.g., %E1%)

------------------------------------------------------------
SECTION 13: OBJECT POOL DESIGN
------------------------------------------------------------
Pool<T>:
- Preallocate N objects (factory pattern)
- get(): returns free or creates if expansion allowed
- release(obj): resets shallow fields
- Stats: { total, free, inUse, expansions }
Constraints:
- Must avoid memory retention by clearing references
- Debug toggle: track stack trace of last checkout (development only)
Use Cases:
- Temporary scoring arrays
- Collision pair candidate lists
- Hash builder scratch buffers

------------------------------------------------------------
SECTION 14: ADAPTIVE MULTI-LEVEL BLOOM FILTER
------------------------------------------------------------
Level 1: fast small bitset (target low memory)
Level 2: larger bitset activated only when FPR > threshold
Insertion -> both active levels
Query -> early positive exit
Rebuild triggers when observed empirical FPR > configured bound (sample false positives)
Expose stats: { bitsLevel1, bitsLevel2, inserted, estimatedFPR }

------------------------------------------------------------
SECTION 15: SCORING PIPELINE (MEMORY/RETRIEVAL)
------------------------------------------------------------
score(record):
  recency = exp(-Δt / halfLife)
  importance = record.importance
  semantic = (cosine or stub)
  novelty = inverse frequency of tag
  frequency = usage count (decays)
  weighted = Σ (component * weight)
Return normalized optional (divide by Σweights)
Adaptive:
- Under rate throttle: weight semantic ↓, recency ↑
- Under memory pressure: cap lower tail (importance < threshold) earlier

------------------------------------------------------------
SECTION 16: DIFF HASHING PIPELINE
------------------------------------------------------------
Inputs:
- Set A (prior)
- Set B (current)
Process:
1. Stable sort each by key
2. Rolling hash each element -> merge with XOR folding
3. Compare digests
4. If change needed: produce delta arrays (binary search difference)
Optimization:
- Early exit if counts differ & no deep diff needed for some modules

------------------------------------------------------------
SECTION 17: WASM EXTENSION HOOKS (FUTURE)
------------------------------------------------------------
Interfaces reserved:
- wasmHashBulk(items: Uint32Array) -> Uint32Array
- wasmVectorSimBatch(query: Float32Array, matrix: Float32Array) -> Float32Array
Feature flags:
DS_USE_WASM_HASH
DS_USE_WASM_VECTOR
Graceful fallback: soft warning event if unsupported

------------------------------------------------------------
SECTION 18: RISK & MITIGATION
------------------------------------------------------------
R1: Over-engineering early -> Scope strictly by current hot paths (Engine, Rate, Memory).
R2: Hidden GC churn -> Benchmark harness + allocation counters.
R3: Non-deterministic iteration (JS object property order) -> Use arrays or Maps + explicit sorting.
R4: Missed regression detection -> Fuzz + snapshot hash tests in CI.
R5: Data corruption on pool reuse -> Provide optional invariants in dev with assertions.
R6: Premature WASM complexity -> Placeholder stubs only; enable later.
R7: Compression cost > benefit on small logs -> dynamic threshold (activate after N events).
R8: PriorityQueue changePriority high complexity -> Document or choose indexed heap extension.

------------------------------------------------------------
SECTION 19: SUB-PROMPT GENERATION INDEX
------------------------------------------------------------
Create subordinate prompt folders & prompt files:

1-ring-buffer/
  PROMPT_RING_BUFFER.md
2-priority-queue/
  PROMPT_PRIORITY_QUEUE.md
3-time-wheel-scheduler/
  PROMPT_TIME_WHEEL_SCHEDULER.md
4-token-bucket-map/
  PROMPT_TOKEN_BUCKET_MAP.md
5-spatial-static-bvh/
  PROMPT_SPATIAL_STATIC_BVH.md
6-spatial-dynamic-aabb/
  PROMPT_SPATIAL_DYNAMIC_AABB.md
7-uniform-grid-hash/
  PROMPT_UNIFORM_GRID_HASH.md
8-vector-index/
  PROMPT_VECTOR_INDEX.md
9-weighted-scorer/
  PROMPT_WEIGHTED_SCORER.md
10-rolling-hash/
  PROMPT_ROLLING_HASH.md
11-structural-digest/
  PROMPT_STRUCTURAL_DIGEST.md
12-diff-engine/
  PROMPT_DIFF_ENGINE.md
13-event-log-compressor/
  PROMPT_EVENT_LOG_COMPRESSOR.md
14-bloom-multilevel/
  PROMPT_BLOOM_MULTILEVEL.md
15-object-pool/
  PROMPT_OBJECT_POOL.md
16-byte-buffer-utils/
  PROMPT_BYTE_BUFFER_UTILS.md
17-invariant-checker/
  PROMPT_INVARIANT_CHECKER.md
18-metrics-aggregator/
  PROMPT_METRICS_AGGREGATOR.md
19-deterministic-prng/
  PROMPT_DETERMINISTIC_PRNG.md
20-memory-context-compactor/
  PROMPT_MEMORY_CONTEXT_COMPACTOR.md
21-scoring-benchmark-harness/
  PROMPT_SCORING_BENCHMARK_HARNESS.md
22-spatial-benchmark/
  PROMPT_SPATIAL_BENCHMARK.md
23-diff-fuzz-harness/
  PROMPT_DIFF_FUZZ_HARNESS.md
24-log-compression-benchmark/
  PROMPT_LOG_COMPRESSION_BENCHMARK.md
25-wasm-extension-stubs/
  PROMPT_WASM_EXTENSION_STUBS.md

------------------------------------------------------------
SECTION 20: SUB-PROMPT TEMPLATE
------------------------------------------------------------
"""
Feature: F10-ADVANCED-DATA-STRUCTURES
Sub-Task: <NAME>
Context:
Need <data structure / algorithm component> to meet performance & determinism guarantees for multi-system integration.

Objective:
<One measurable deliverable statement>

Constraints:
- Typed (no any)
- Deterministic iteration
- Allocation minimized (document strategy)
- Provide debug() summary
- Invariant assertions in dev mode
- No external dependencies

Inputs / References:
- Related config
- Performance targets
- Error taxonomy codes

Output:
<Exact file path(s) & exported symbols>

Validation:
- <3–7 behavior/performance/determinism bullets>
- ≥1 negative/error scenario
- If benchmarked: specify target thresholds

Non-goals:
- UI presentation
- Network persistence
- WASM acceleration (unless stub)
"""

------------------------------------------------------------
SECTION 21: SAMPLE SUB-PROMPT (RING BUFFER)
------------------------------------------------------------
"""
Feature: F10-ADVANCED-DATA-STRUCTURES
Sub-Task: Ring Buffer
Context:
High-throughput event ingestion requires bounded O(1) append & eviction with deterministic order.

Objective:
Implement BoundedRingBuffer<T> with push/get/clear/toArray/debug using contiguous circular array & optional eviction callback.

Constraints:
- push overwrites oldest on capacity exceed
- indexes stable 0..size-1 logical remap
- no dynamic resizing
- minimal branching inside push
- no hidden allocations on push

Output:
File: src/ds/ring/BoundedRingBuffer.ts
Exports: BoundedRingBuffer, createRingBuffer<T>(opts)

Validation:
- Inserting capacity+N evicts first N items
- get(i) stable after multiple pushes
- toArray returns logical order oldest→newest
- onEvict called exact times
- size <= capacity always
Non-goals:
- Random deletion
"""

------------------------------------------------------------
SECTION 22: EXECUTION ORDER (MICRO-STEPS)
------------------------------------------------------------
S1: Foundational utilities (rolling hash, PRNG, byte buffer)
S2: Ring buffer + priority queue
S3: Time wheel & token bucket
S4: Spatial indices (static BVH then dynamic tree)
S5: Vector index baseline
S6: Weighted scorer + diff engine
S7: Event log compressor + bloom multi-level
S8: Object pool + benchmark harnesses
S9: Invariant & metrics aggregator
S10: Memory context compactor + integration hooks
S11: Fuzz & performance validation
S12: WASM stubs + final documentation

------------------------------------------------------------
SECTION 23: BENCHMARK & TEST STRATEGY
------------------------------------------------------------
Bench Harness:
- Isolated Node script + (optional) browser microbench
- Warm-up phase -> measurement window
- Report: mean, p50, p95, ops/sec

Fuzz Harness:
- Random sequences insert/remove/update verifying invariants
- Stop on mismatch -> emit ds:invariant:fail

Determinism Tests:
- Seeded insertion sets -> captured hash -> repeat -> assert equality
- Spatial nearest queries vs baseline brute force for correctness

Compression Tests:
- Synthetic event feed; measure raw bytes vs compressed; assert ratio

Memory Profiling:
- Allocation sampling (globalThis.performance if available)
- Pool effectiveness metric (allocBefore - allocAfter)/allocBefore

------------------------------------------------------------
SECTION 24: METRICS & OBSERVABILITY TAGS
------------------------------------------------------------
[DS][RING][EVICT]
[DS][PQ][SIZE]
[DS][SCHED][DUE]
[DS][BUCKET][APPROVE][DENY]
[DS][SPATIAL][QUERY]
[DS][VECTOR][SEARCH]
[DS][DIFF][CHANGED]
[DS][COMPRESS][RATIO]
[DS][POOL][EXPAND]
[DS][INVARIANT][FAIL]
[DS][BLOOM][REBUILD]
[DS][BENCH][RESULT]

------------------------------------------------------------
SECTION 25: QUALITY GATES
------------------------------------------------------------
QG1: All public APIs documented (TSDoc)
QG2: Strict TS compile & lint pass
QG3: Benchmark harness meets or documents any shortfall
QG4: Fuzz tests zero invariant failures over 1M ops
QG5: Determinism suite passes for core indices
QG6: No unbounded memory growth (ring buffer, pools)
QG7: Compression ratio target achieved (≥ 55%)
QG8: Coverage for error throwing paths (≥ 1 test each code)
QG9: All debug() outputs JSON-serializable

------------------------------------------------------------
SECTION 26: FUTURE EXTENSION HOOKS
------------------------------------------------------------
+ Distributed shard-aware token buckets
+ Shared memory / Worker offload for spatial index
+ WASM accelerated vector search & hashing
+ Persistent snapshot incremental delta encoding
+ Tiered caching of retrieval scoring (memoizing last context)
+ GPU-assisted similarity search (WebGPU path placeholder)

------------------------------------------------------------
SECTION 27: EXECUTION TRIGGER PHRASE
------------------------------------------------------------
"GENERATE_F10_SUB_PROMPTS_v1"

------------------------------------------------------------
SECTION 28: FINAL MASTER OBJECTIVE (CONDENSED)
------------------------------------------------------------
DELIVER a cohesive, deterministic, memory-efficient advanced data structure & algorithm suite powering core simulation, AI reasoning, rate governance, memory retrieval, spatial perception, and observability—achieving strict performance targets, providing robust diagnostics, and establishing a scalable foundation for future distributed & WASM acceleration paths.

END OF MASTER PROMPT
