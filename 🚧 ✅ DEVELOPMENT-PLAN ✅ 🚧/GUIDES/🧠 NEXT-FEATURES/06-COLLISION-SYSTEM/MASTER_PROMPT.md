# MASTER PROMPT: COLLISION SYSTEM (ADVANCED CONTACT, SENSORS & PREDICTIVE AVOIDANCE)
Version: 1.0  
Feature ID: F06-COLLISION-SYSTEM
Authoring Mode: Real‑Time Simulation Architecture / Deterministic Event Mediation  
Primary Goal: Deliver a modular Collision System layered atop / alongside Physics (F05) that provides high‑quality contact detection, trigger / sensor volumes, predictive avoidance utilities for autonomous agents, spatial acceleration structure governance, event coalescing, and Engine (F02) mediated state change guarantees—while remaining backend‑agnostic (Rapier-first) and extensible to future physics or custom kernels.

------------------------------------------------------------
SECTION 1: ULTRA-COMPRESSED CONTEXT SNAPSHOT
------------------------------------------------------------
WORLD: 3D simulation with AI agents + player + interactive environment  
EXISTING FOUNDATIONS: Engine (F02), Data Structures (F03), UI Layer (F04), Physics Core (F05)  
GAP: Need refined collision abstraction (beyond raw physics), sensor layering, predictive queries, robust event semantics, spatial query caching for perception  
NON-GOALS: Rendering, animation blending, raw LLM reasoning  
TARGET PROPERTIES: Deterministic ordering, low overhead, minimal GC churn, scalable to thousands of colliders

------------------------------------------------------------
SECTION 2: WHY SEPARATE FROM PHYSICS?
------------------------------------------------------------
1. Decouples semantic interactions (triggers, AI zones, perceptual sensors) from rigidbody specifics.  
2. Enables specialized broad-phase strategies for static vs dynamic volumes (e.g. BVH for static, Sweep & Prune for dynamic small sets).  
3. Allows predictive collision checks (sweeps, time-of-impact) without full physics integration step.  
4. Uniform event contract for Engine + Behavior subsystem (F10).  
5. Supports high-frequency, lightweight "ghost" queries (line-of-sight, threat proximity) independent of full physics step cadence.

------------------------------------------------------------
SECTION 3: CORE OBJECTIVES
------------------------------------------------------------
O1: Abstract CollisionSystem independent of underlying physics adapter (consumes adapter hooks if present).  
O2: Provide broad-phase acceleration structure(s) (static BVH + dynamic AABB tree / SAP hybrid).  
O3: Implement collider registration API with typed categories: SOLID, TRIGGER, SENSOR, NAV_BLOCKER.  
O4: Support dynamic AABB updates with minimal cost (temporal coherence exploitation).  
O5: Generate stable contact & trigger event sequences: collision.enter, collision.stay, collision.exit (debounced).  
O6: Provide sensor volume system (spherical, box, capsule, convex) for AI perception queries.  
O7: Provide predictive sweep / time-of-impact (TOI) utilities for path planning & avoidance.  
O8: Implement fast approximate line-of-sight (LOS) and field-of-view (FOV) tests with early abort heuristics.  
O9: Maintain collision manifold cache reducing repeated normal recalculation noise (stability).  
O10: Support per-collider layer & mask filtering consistent with F06 but augment with logical “tags” system.  
O11: Provide batched spatial queries for multiple agents (per-frame query scheduler).  
O12: Expose snapshot + diff for deterministic replays / debugging.  
O13: Telemetry: per-frame collision pairs processed, skipped (culled), sensor query cost, average broad-phase time.  

------------------------------------------------------------
SECTION 4: ACCEPTANCE CRITERIA
------------------------------------------------------------
AC1: Registering a collider emits collision:collider:registered with canonical descriptor hash.  
AC2: Contacts generate at most one enter and one exit per collider pair across uninterrupted overlap span.  
AC3: Sensor volume (type: TRIGGER or SENSOR) within proximity range produces sensor.enter / sensor.exit events with entity sets diffed properly.  
AC4: Sweep test (capsule or AABB) returns earliest hit with TOI ∈ [0,1] and stable ordering for ties.  
AC5: LOS test returns boolean + (optional) first obstruction entityId within micro-benchmark threshold (< 0.15 ms for mid complexity).  
AC6: Adding 1000 static colliders + 200 dynamic colliders results in broad-phase build once then ≤ 2 ms incremental dynamic update cost (target baseline).  
AC7: Manifold stabilization reduces normal jitter such that angular deviation frame-to-frame < 10° for resting contacts.  
AC8: Event ordering deterministic for same insertion order + update sequence (hash reproducibility test).  
AC9: Snapshot export contains consistent sorted lists (by colliderId) and size overhead < 2% relative to raw collider state memory footprint.  
AC10: Unregistering collider flushes pending events instantly; no stale “stay” events emitted next frame.  

------------------------------------------------------------
SECTION 5: CONSTRAINTS
------------------------------------------------------------
C1: No direct game logic may mutate collision transforms; must go through Engine or Physics adapter sync.  
C2: All timing and ordering deterministic given same tick delta sequence.  
C3: Strict TypeScript types; no untyped dynamic event payloads.  
C4: Colliders immutable in shape post-registration (require re-register or shape update API w/ version bump).  
C5: Minimize allocations (object pooling or struct-like arrays for hot loops).  
C6: Provide fail-fast errors for invalid layer or duplicate ID.  
C7: Multi-thread / Worker offload optional future; design core to allow extraction of update loop.  

------------------------------------------------------------
SECTION 6: KEY DATA TYPES (PROPOSED)
------------------------------------------------------------
type ColliderId = string
type ColliderKind = 'SOLID' | 'TRIGGER' | 'SENSOR' | 'NAV_BLOCKER'
type ShapeType = 'BOX' | 'SPHERE' | 'CAPSULE' | 'CYLINDER' | 'MESH' | 'CONVEX'

interface ColliderDescriptor {
  id: ColliderId
  entityId: string
  kind: ColliderKind
  shape: {
    type: ShapeType
    // standardized dimensions: BOX: [x,y,z], SPHERE: [r], CAPSULE: [radius, halfHeight], etc.
    dimensions: number[]
  }
  worldPosition: [number, number, number]
  worldRotation: [number, number, number, number] // quaternion
  layer: string
  mask: string[]                    // which layers collidable / detectable
  tags?: string[]                   // semantic classification
  dynamic: boolean
  userData?: Record<string, unknown>
  version: number                   // increments on shape/transform update
}

interface CollisionPairKey { a: ColliderId; b: ColliderId } // canonical sorted ordering (a<b lexicographically)

interface ContactManifold {
  key: CollisionPairKey
  normal: [number, number, number]
  points: { position: [number, number, number]; penetration: number }[]
  framesStable: number
  lastUpdatedFrame: number
}

interface SensorResult {
  sensorId: ColliderId
  enters: string[]      // collider Ids
  stays: string[]
  exits: string[]
  frame: number
}

interface SweepHit {
  colliderId: ColliderId
  toi: number                // time of impact normalized
  point: [number, number, number]
  normal: [number, number, number]
}

interface LineOfSightResult {
  visible: boolean
  obstruction?: {
    colliderId: ColliderId
    distance: number
    point: [number, number, number]
  }
}

interface CollisionSystemConfig {
  broadPhase: {
    staticStructure: 'BVH' | 'QUADTREE' | 'AABB_TREE'
    dynamicStrategy: 'SAP' | 'AABB_TREE'
    rebuildStaticThreshold: number // ratio of static changes to trigger rebuild
  }
  stableManifolds: boolean
  maxContactsPerPair: number
  sensorUpdateRate: number     // frames interval (1 = every frame)
  predictiveSweepsEnabled: boolean
  losMaxIterations: number
  manifoldNormalSmoothing: number // 0..1 weight
  maxColliderCountWarning: number
  eventCoalesce: boolean
  debug?: boolean
}

interface CollisionSnapshot {
  frame: number
  colliders: ColliderDescriptor[]
  activePairs: { a: ColliderId; b: ColliderId }[]
  manifolds: { key: CollisionPairKey; points: number; stable: number }[]
}

------------------------------------------------------------
SECTION 7: EVENT TAXONOMY
------------------------------------------------------------
// NOTE: These collision:* events are semantic lifecycle abstractions built
// from raw physics:contact:start/end (F05). Do not emit raw physics contact
// events here to avoid namespace overlap.
collision:collider:registered { colliderId, entityId, kind, shapeType, layer, version }
collision:collider:updated { colliderId, version }
collision:collider:removed { colliderId }
collision:enter { a, b, manifoldSummary }
collision:stay { a, b, frames, avgNormal }
collision:exit { a, b, durationFrames }
sensor:enter { sensorId, colliderId }
sensor:stay { sensorId, colliderId }
sensor:exit { sensorId, colliderId, durationFrames }
sensor:batch { sensorId, enters[], stays[], exits[] } // optional aggregated form
predictive:sweep:hit { requestId, colliderId, toi }
predictive:sweep:miss { requestId }
los:result { fromId, toId, visible, obstruction? }
collision:warning { code, message, context }
collision:metrics { frame, pairsTested, pairsNarrow, contactsGenerated, sensorsProcessed, timeMs }

------------------------------------------------------------
SECTION 8: SUBSYSTEM LAYERS
------------------------------------------------------------
1. ColliderRegistry: ID maps, shape data, transform updates, version increments.
2. BroadPhaseManager: static BVH build + dynamic update tree / SAP lists.
3. NarrowPhaseResolver: pair filtering, manifold generation, stability smoothing.
4. ManifoldCache: retains last frame manifolds for smoothing & stay detection.
5. SensorManager: maintains sensors, performs periodic overlap queries.
6. PredictiveQueryService: sweeps, time-of-impact, path probe sampling.
7. LOS/FOV Service: high-level occlusion + angular sector checks (fast prune).
8. EventCoalescer: merges raw events into stable enter/stay/exit semantics.
9. MetricsTracker: collects per-frame simulation metrics & exposes snapshot.
10. SnapshotExporter: builds serializable state for debugging/determinism.
11. IntegrationBridge: syncs with Physics (F06) transforms & Engine events.

------------------------------------------------------------
SECTION 9: MANIFOLD STABILIZATION
------------------------------------------------------------
Technique:
- Maintain last normal; newNormal = lerp(old, raw, smoothingFactor) normalized.
- framesStable++ if angular difference < threshold (e.g. 10°); else reset.
Benefits:
- Reduces jittery surface alignment for AI ground checks or foot IK.
Constraints:
- Disable if stableManifolds=false (performance path).

------------------------------------------------------------
SECTION 10: PREDICTIVE SWEEP / TOI
------------------------------------------------------------
API: predictiveSweep(shapeDesc, fromPos, toPos, filter) -> SweepHit | null  
Algorithm Flow:
1. Broad-phase candidate collection by inflating AABB along motion vector.
2. Sort candidates by projected TOI bound.
3. Narrow-phase shape cast (library or custom intersection).
4. Early exit at first blocking hit (or collect all if gatherAll flag).
Time normalization: toi ∈ [0,1] relative to displacement vector.
Use Cases: Path planning, avoidance, pre-emptive steering corrections.

------------------------------------------------------------
SECTION 11: LOS / FOV
------------------------------------------------------------
LOS:
- Ray or multi-segment ray (if approximating curved terrain predicted path).
- Early acceptance if distance > maxRange (fail).
- Optional: multi-sample path for tall obstacles.
FOV:
- Precompute cos(FOV/2) for angle test: dot(dir, toTargetNorm) >= threshold.
- Combine FOV + LOS for final visible classification.
Return earliest obstruction collider if blocked.

------------------------------------------------------------
SECTION 12: BATCH QUERY SCHEDULING
------------------------------------------------------------
Problem: Many agents requesting LOS / proximity -> potential N^2 explosion.
Solution:
- Frame-level QueryQueue aggregated by request signature (e.g. same origin / direction).
- De-duplicate identical queries; broadcast result to subscribers.
- Stagger sensor updates (round-robin with sensorUpdateRate).
- Provide adaptive budget: limit queries per frame; remaining deferred with warning event if over threshold.

------------------------------------------------------------
SECTION 13: PERFORMANCE & OPTIMIZATIONS
------------------------------------------------------------
- SOA (structure-of-arrays) for positions & AABBs to enable vectorized loops.
- Cache broad-phase candidate lists; temporal coherence reduce full rebuild.
- Maintain “dirty” dynamic collider list; skip static recomputation.
- Use integer layer/mask bitfields; pre-resolve mask bitset on registration.
- Pool arrays for candidate pairs to reduce GC (e.g. ring-buffers).
- Provide debug cost breakdown (broadPhaseMs, narrowPhaseMs, sensorMs, queriesMs).

------------------------------------------------------------
SECTION 14: ERROR TAXONOMY
------------------------------------------------------------
COLLISION_COLLIDER_DUPLICATE_ID  
COLLISION_COLLIDER_UNKNOWN_ID  
COLLISION_COLLIDER_LAYER_UNDEFINED  
COLLISION_COLLIDER_SHAPE_INVALID  
COLLISION_MAX_CONTACTS_EXCEEDED  
COLLISION_PAIR_OVERFLOW  
COLLISION_SENSOR_INVALID_SHAPE  
COLLISION_SWEEP_UNSUPPORTED_SHAPE  
COLLISION_LOS_ITERATION_LIMIT_REACHED  
COLLISION_BVH_REBUILD_THRESHOLD_EXCEEDED  
COLLISION_SNAPSHOT_EXPORT_FAILED
COLLISION_CONFIG_INVALID  
EVENT_COALESCE_CONFLICT  
PREDICTION_DISABLED  
DETERMINISM_VIOLATION (hash mismatch in test mode)  

------------------------------------------------------------
SECTION 15: RISK & MITIGATION
------------------------------------------------------------
R1: Broad-phase rebuild cost spikes -> Rebuild threshold & incremental updates.  
R2: Event spam for jittery contacts -> Coalesce + normal smoothing + stable manifolds.  
R3: Sensor starvation under high load -> Adaptive scheduling & per-frame budget.  
R4: Determinism drift due to unordered maps -> Always sort collider IDs before iterating stable lists.  
R5: Memory growth from pooled arrays -> Periodic pool compaction heuristic (usage counters).  
R6: Overly expensive sweep queries -> Early candidate prune & abort after first blocking (config).  
R7: Jitter from fast-moving bodies (tunneling) -> Encourage physics CCD + predictive sweeps in planning stage.  

------------------------------------------------------------
SECTION 16: SUB-PROMPT GENERATION INDEX
------------------------------------------------------------
Generate the following subordinate prompt folders & files:

1-collider-registry/
  PROMPT_COLLIDER_REGISTRY.md
2-broadphase-static-bvh/
  PROMPT_BROADPHASE_STATIC_BVH.md
3-broadphase-dynamic/
  PROMPT_BROADPHASE_DYNAMIC.md
4-narrowphase-manifolds/
  PROMPT_NARROWPHASE_MANIFOLDS.md
5-manifold-stabilization/
  PROMPT_MANIFOLD_STABILIZATION.md
6-event-coalescer/
  PROMPT_EVENT_COALESCER.md
7-sensor-manager/
  PROMPT_SENSOR_MANAGER.md
8-predictive-sweep/
  PROMPT_PREDICTIVE_SWEEP.md
9-line-of-sight-fov/
  PROMPT_LINE_OF_SIGHT_FOV.md
10-batch-query-scheduler/
  PROMPT_BATCH_QUERY_SCHEDULER.md
11-query-filtering/
  PROMPT_QUERY_FILTERING.md
12-metrics-telemetry/
  PROMPT_METRICS_TELEMETRY.md
13-snapshot-exporter/
  PROMPT_SNAPSHOT_EXPORTER.md
14-error-domain/
  PROMPT_ERROR_DOMAIN.md
15-config-validation/
  PROMPT_CONFIG_VALIDATION.md
16-integration-physics/
  PROMPT_INTEGRATION_PHYSICS.md
17-integration-engine/
  PROMPT_INTEGRATION_ENGINE.md
18-performance-optimizations/
  PROMPT_PERFORMANCE_OPTIMIZATIONS.md
19-determinism-test-harness/
  PROMPT_DETERMINISM_TEST_HARNESS.md
20-debug-visualization/
  PROMPT_DEBUG_VISUALIZATION.md

------------------------------------------------------------
SECTION 17: SUB-PROMPT TEMPLATE
------------------------------------------------------------
"""
Feature: F06-COLLISION-SYSTEM
Sub-Task: <NAME>
Context:
Collision subsystem requires <specific aspect> to achieve deterministic, high-performance interaction semantics.

Objective:
<One precise, measurable outcome statement>

Constraints:
- Strong typing
- Deterministic ordering of outputs
- Minimized allocations (reuse buffers)
- Config-driven (no magic constants)
- Engine event contract compliance
- Compatible with Physics adapter hooks

Inputs / References:
- CollisionSystemConfig
- ColliderDescriptor
- Existing broad-phase / narrow-phase interfaces (if any)

Output:
<Exact file path(s) & exported symbols>

Validation:
- <3–7 bullet behavior tests>
- At least one negative/error scenario
- Performance note if applicable
- Determinism hash scenario if relevant

Non-goals:
- Rendering
- AI reasoning
- Network replication
"""

------------------------------------------------------------
SECTION 18: SAMPLE SUB-PROMPT (MANIFOLD STABILIZATION)
------------------------------------------------------------
"""
Feature: F06-COLLISION-SYSTEM
Sub-Task: Manifold Stabilization
Context:
Need smoothing of contact normals & frame stability tracking to reduce jitter for agent grounding logic.

Objective:
Implement ManifoldStabilizer applying exponential smoothing to contact normals & tracking framesStable.

Constraints:
- O(1) update per manifold
- Smoothing factor configurable
- Accept up to maxContactsPerPair; discard overflow deterministically (by penetration depth rank)
- Deterministic ordering across frames

Output:
File: src/collision/manifold/ManifoldStabilizer.ts
Exports: ManifoldStabilizer class, stabilizeManifold(manifold, prev?) function

Validation:
- Same input normals -> framesStable increments
- Normal change > threshold resets framesStable
- Excess contacts trimmed consistently
- Disabled stableManifolds -> pass-through (no smoothing)
Non-goals:
- Collision pair generation
"""

------------------------------------------------------------
SECTION 19: METRICS FORMAT (CANON)
------------------------------------------------------------
[COLLISION][FRAME][pairsTested=842][narrow=119][contacts=72][sensors=34][ms=1.87]
[COLLISION][ENTER][a=agent-12][b=crate-7][points=2]
[COLLISION][EXIT][a=agent-12][b=crate-7][frames=14]
[SENSOR][BATCH][sensor=area-safezone][enters=3][exits=1]
[PREDICT][SWEEP][hit][req=swp-223][target=wall-3][toi=0.42]
[LOS][RESULT][from=agent-4][to=agent-7][visible=false][blocker=rock-2]

------------------------------------------------------------
SECTION 20: INTEGRATION WITH EXISTING FEATURES
------------------------------------------------------------
F02 Engine: All events emitted through Engine event bus; collision queries accessible via Engine.request wrappers (e.g., world.queryCollision).  
F03 Data Structures: Uses spatial indices, bloom filters, and ring buffers for efficient collision detection and event management.  
F04 UI: Displays collision metrics, sensor activation counts, and predictive query performance in debug overlays.  
F05 Physics: Source of authoritative transforms for dynamic bodies; collision system supplements with sensors & predictive queries.  
F07 Memory: Spatial collision events may be ingested as episodic memories for agent situational awareness.  
F08 Gemini / F10 Behavior: Perception gathers sensor & LOS results for plan context; predictive sweeps aid movement decisions.  
F09 Rate Governor: Expose query cost metrics (optional rate adaptation if collision queries become expensive).  
F01 Avatar: Movement controllers can request predictive sweeps to avoid collisions before physics resolution.

------------------------------------------------------------
SECTION 21: CONFIG & ENV SUGGESTIONS
------------------------------------------------------------
COLLISION_STATIC_STRUCTURE=BVH  
COLLISION_DYNAMIC_STRATEGY=SAP  
COLLISION_MAX_CONTACTS_PER_PAIR=4  
COLLISION_SENSOR_UPDATE_RATE=1  
COLLISION_MANIFOLD_SMOOTHING=0.6  
COLLISION_PREDICTIVE_SWEEPS=1  
COLLISION_LOS_MAX_ITER=32  
COLLISION_DETERMINISM_TEST=0  
COLLISION_MAX_COLLIDERS_WARNING=5000  

------------------------------------------------------------
SECTION 22: DETERMINISM & HASHING
------------------------------------------------------------
- Build frame hash: hash(sorted(activePairs) + sorted(colliderIds) + frameIndex).  
- Determinism harness compares hash across identical simulation seeds.  
- Divergence emits DETERMINISM_VIOLATION with diff (list of mismatched pair keys).  

------------------------------------------------------------
SECTION 23: QUALITY GATES
------------------------------------------------------------
QG1: All public APIs documented with TSDoc.  
QG2: Determinism harness passes for reference scenario.  
QG3: Negative tests for duplicate IDs & unknown layers succeed.  
QG4: Broad-phase rebuild threshold logic covered by tests.  
QG5: Memory churn threshold (GC allocations/frame) below target median (document baseline).  
QG6: Performance test scenario under configured collider counts within time budget.  

------------------------------------------------------------
SECTION 24: EXECUTION ORDER (MICRO-STEPS)
------------------------------------------------------------
S1: Define types & config validator  
S2: ColliderRegistry + ID management  
S3: Broad-phase static BVH builder  
S4: Dynamic broad-phase strategy (SAP or AABB tree)  
S5: Pair generation & filtering (layer/mask)  
S6: Narrow-phase interface + basic manifold generation (delegate to physics or custom)  
S7: Manifold cache & stabilization  
S8: Event coalescing (enter/stay/exit)  
S9: Sensor manager (overlap queries + batching)  
S10: Predictive sweep utilities  
S11: LOS/FOV service  
S12: Query scheduler + batching  
S13: Metrics & telemetry hooks  
S14: Snapshot exporter  
S15: Determinism harness & hash tests  
S16: Performance optimization pass & memory pooling  
S17: Debug visualization overlays (AABBs, sensor volumes)  
S18: Final integration with Engine & Behavior Orchestrator  

------------------------------------------------------------
SECTION 25: SUB-PROMPT GENERATION INSTRUCTIONS (META)
------------------------------------------------------------
1. Use Section 17 template for each sub-prompt.  
2. Generate exactly 20 sub-prompts (Section 16 index).  
3. Each ≤ 225 lines.  
4. Must include explicit file path(s) & exported symbol list.  
5. Each includes at least one error/negative validation bullet.  
6. Produce INDEX.md summarizing all sub-prompts & artifacts.  
Validation After Generation:
- COUNT=20
- All contain "Feature: F07-COLLISION-SYSTEM"
- Each has Objective, Constraints, Validation, Non-goals
- INDEX enumerates outputs & trigger phrase

------------------------------------------------------------
SECTION 26: EXECUTION TRIGGER PHRASE
------------------------------------------------------------
"GENERATE_F06_SUB_PROMPTS_v1"

------------------------------------------------------------
SECTION 27: FINAL MASTER OBJECTIVE (CONDENSED)
------------------------------------------------------------
DELIVER a deterministic, high-performance Collision System offering stable contact events, sensor & predictive query capabilities, broad-phase efficiency, low-latency perceptual utilities, and robust integration with Engine, Physics, and Behavior layers—enabling advanced autonomous agent navigation and interaction at scale.

END OF MASTER PROMPT