```Descendants/🚧 ✅ DEVELOPMENT-PLAN ✅ 🚧/PROMPTS/🧠 NEXT-FEATURES/05-PHYSICS/MASTER_PROMPT.md#L1-320
# MASTER PROMPT: REAL‑TIME PHYSICS & COLLISION INTEGRATION LAYER
Version: 1.0  
Feature ID: F05-PHYSICS
Authoring Mode: Realtime Systems / Simulation Architecture / Engine Mediation  
Primary Goal: Introduce a modular, deterministic-friendly physics and collision subsystem (baseline: Rapier via @react-three/rapier / Drei helpers; fallback adapters for Cannon/Ammo) fully mediated by the central Engine (F02), utilizing foundational data structures (F03), providing UI feedback (F04), emitting structured collision & trigger events, supporting character controllers for AI simulants and player, and integrating with upcoming Collision System (F06), Memory System (F07), and Behavior Orchestrator (F10) without leaking ungoverned world mutation paths.

------------------------------------------------------------
SECTION 1: ULTRA-COMPRESSED CONTEXT SNAPSHOT
------------------------------------------------------------
WORLD: 3D immersive sim with autonomous agents + human player  
CURRENT CORE: Engine authority, data structures foundation, UI observability layer ready  
GAP: No formal physics abstraction or collision event routing  
REQUIREMENTS: Deterministic-ish stepping, event surfacing, stable character movement, spatial queries, future nav integration  
PHYSICS LIB TARGETS: Primary = Rapier (high performance, WASM), Alt = CannonJS/Ammo (adapter pattern)  
CONSTRAINT: All world physical state changes must be mirrored & auditable via Engine-layer events (no silent mutation)

------------------------------------------------------------
SECTION 2: CORE OBJECTIVES
------------------------------------------------------------
O1: Provide PhysicsManager abstraction decoupled from specific backend (Rapier first).  
O2: Deterministic stepping interface PhysicsManager.step(fixedDelta) coordinated by Engine.tick.  
O3: Entity–Body binding registry (Engine entityId ↔ physics handle).  
O4: Collision & trigger event emission into Engine event bus (collision.start / collision.end / overlap).  
O5: Character controller module (kinematic capsule) for player + simulant agents with slope handling & step offset.  
O6: Spatial query API (raycast, shapeCast, areaQuery) returning structured results for AI perception (F05).  
O7: Broad-phase optimized body grouping & layer masks with bitmask configuration.  
O8: Runtime switchable backend (future) via adapter injection.  
O9: Debug overlay togglable (wireframes, AABB, contact points) with zero overhead when disabled.  
O10: Performance instrumentation (step time, body count, contact count).  
O11: Replay / snapshot partial support (serialize minimal snapshot for future determinism & debugging).  

------------------------------------------------------------
SECTION 3: ACCEPTANCE CRITERIA
------------------------------------------------------------
AC1: Physics step invoked ONLY through Engine → PhysicsSystem integration (no direct uncontrolled stepping).  
AC2: Registering entity with physics body emits physics:body:registered event.  
AC3: Collision between two registered bodies emits collision.start then collision.end (single pair – no duplicates) with contact manifold summary.  
AC4: Character controller moves over small steps, respects gravity, prevents tunneling (CCD optional flag).  
AC5: Raycast API returns ordered hits with { entityId, distance, normal, point }.  
AC6: Removing entity disposes physics body and emits physics:body:removed.  
AC7: Fixed time stepping (e.g. 1/60) with accumulator for variable render frames; no spiral of death.  
AC8: Debug overlay toggling does not degrade baseline frame time by more than 0.3ms when off.  
AC9: Layer mask filtering prevents unnecessary collision resolution per config.  
AC10: Snapshot export lists deterministic ordering of bodies & minimal state (id, transform, velocity).  

------------------------------------------------------------
SECTION 4: CONSTRAINTS
------------------------------------------------------------
C1: Physics library never called directly by game logic—always through adapter.  
C2: No side-effects during module import (lazy init).  
C3: Strict TypeScript with generics where appropriate; no any.  
C4: Engine remains source of truth for entity lifecycle; physics cannot spawn autonomous bodies.  
C5: Avoid excessive object churn—reuse temp vectors to lower GC pressure.  
C6: Collision event flood protection (coalesce multiple contacts per pair per step).  
C7: All times measured in milliseconds; convert explicitly from seconds when library uses seconds.  

------------------------------------------------------------
SECTION 5: ARCHITECTURE OVERVIEW
------------------------------------------------------------
Layers:
1. PhysicsAdapter (RapierPhysicsAdapter implements IPhysicsAdapter)
2. PhysicsManager (coordinate stepping, registration, event translation)
3. CharacterController module (integrated with PhysicsManager)
4. CollisionEventEmitter (dedupe + emit to Engine)
5. SpatialQueryService (ray/shape queries, layer filters)
6. DebugVisualizer (optional)
7. SnapshotSerializer (selective state extraction)
8. ConfigProvider (layer masks, gravity, step config)
9. EngineBinding (subscribe to engine:entity.* events, propagate updates)
10. PerformanceTracker (timing, counts, moving averages)

------------------------------------------------------------
SECTION 6: KEY INTERFACES
------------------------------------------------------------
interface PhysicsConfig {
  gravity: [number, number, number]
  fixedTimeStep: number            // e.g. 1/60
  maxSubSteps: number              // safety for accumulator
  enableCCD?: boolean
  layers: Record<string, number>   // name -> bit (power of two)
  collisionMatrix: Record<string, string[]> // layerName -> collidesWith layerNames
  debug?: boolean
}

interface PhysicsBodyDesc {
  entityId: string
  shape: 'box' | 'sphere' | 'capsule' | 'mesh' | 'cylinder'
  size: [number, number, number]     // usage depends on shape
  offset?: [number, number, number]
  rotation?: [number, number, number]
  dynamic: boolean
  mass?: number
  kinematic?: boolean
  layer: string
  material?: {
    friction?: number
    restitution?: number
    density?: number
  }
  userData?: Record<string, unknown>
}

interface PhysicsBodyHandle {
  entityId: string
  setTranslation(v: [number, number, number]): void
  getTranslation(): [number, number, number]
  getVelocity(): [number, number, number]
  setVelocity(v: [number, number, number]): void
  applyImpulse?(v: [number, number, number]): void
  dispose(): void
}

interface CollisionEvent {
  a: string            // entityId
  b: string
  type: 'start' | 'end'
  impactVelocity?: number
  contacts?: {
    point: [number, number, number]
    normal: [number, number, number]
    separation?: number
  }[]
  timestamp: number
  frame: number
}

interface RaycastHit {
  entityId: string
  point: [number, number, number]
  normal: [number, number, number]
  distance: number
  fraction: number
  layer: string
}

interface IPhysicsAdapter {
  init(config: PhysicsConfig): Promise<void>
  step(dt: number): void
  createBody(desc: PhysicsBodyDesc): PhysicsBodyHandle
  removeBody(entityId: string): void
  raycast(origin: [number, number, number], dir: [number, number, number], maxDist: number, mask?: number): RaycastHit[]
  shapeCast?(/* future extension */): unknown
  getBody(entityId: string): PhysicsBodyHandle | undefined
  getAllBodies(): PhysicsBodyHandle[]
  onCollision?(cb: (e: CollisionEvent) => void): void
  dispose(): void
}

interface CharacterControllerOptions {
  entityId: string
  height: number
  radius: number
  stepHeight?: number
  slopeLimitDeg?: number
  layer: string
}

interface CharacterController {
  move(input: {
    desiredVelocity: [number, number, number]
    deltaTime: number
    jump?: boolean
  }): void
  getGrounded(): boolean
  getVelocity(): [number, number, number]
  dispose(): void
}

------------------------------------------------------------
SECTION 7: EVENT TAXONOMY (ENGINE-FACING)
------------------------------------------------------------
// NOTE: physics:contact:* are raw low-level contact pair events.
// Higher-level semantic lifecycle (enter/stay/exit) emitted by Collision System (F06).
physics:body:registered { entityId, shape, dynamic, layer }
physics:body:removed { entityId }
physics:contact:start { a, b, contacts, impactVelocity }
physics:contact:end { a, b }
physics:controller:created { entityId }
physics:controller:grounded { entityId, grounded }
physics:raycast:debug (optional) { origin, dir, hits }
physics:step { dt, bodies, contacts, frame, ms }
physics:snapshot:exported { bodyCount, sizeBytes }
physics:body:updated (future - if sync transform from physics to Engine tracked state)

------------------------------------------------------------
SECTION 8: FIXED TIME STEP STRATEGY
------------------------------------------------------------
Use accumulator pattern:
1. Frame delta added to accumulator.
2. While accumulator >= fixedTimeStep and subSteps < maxSubSteps:
   - adapter.step(fixedTimeStep)
   - accumulator -= fixedTimeStep
3. Track leftover ratio for interpolation (optional for render smoothing).
Prevent runaway: If accumulator too large (lag spike), clamp and emit warning event [physics:lag:clamp].

------------------------------------------------------------
SECTION 9: COLLISION LAYER & MASK DESIGN
------------------------------------------------------------
layers:
  PLAYER: 0x0001
  AGENT:  0x0002
  STATIC: 0x0004
  TRIGGER:0x0008
  WORLD:  0x0010
collisionMatrix example:
  PLAYER: [WORLD, STATIC, AGENT, TRIGGER]
  AGENT:  [WORLD, STATIC, PLAYER, TRIGGER]
  STATIC: [PLAYER, AGENT]
  TRIGGER:[PLAYER, AGENT]
  WORLD:  [PLAYER, AGENT]

Mask resolve: Build per-layer bitmask at init; store for quick lookup.  
Collision filtering executed at narrowphase pre-filter if supported by backend; else post-check before event emission.

------------------------------------------------------------
SECTION 10: CHARACTER CONTROLLER LOGIC (ABBREVIATED)
------------------------------------------------------------
Loop:
- Input desired horizontal velocity (flat plane XZ)
- Project onto ground plane (if grounded)
- Perform capsule sweep / raycast downward to confirm ground
- Apply gravity if not grounded or small "stick to ground" impulse when descending slight slopes
- Handle jump: upward impulse only if grounded
- Slope limit: reject movement where surface normal angle > slopeLimitDeg
- Step offset: attempt small vertical adjustments (< stepHeight) if blocked at foot level
Emit physics:controller:grounded on transitions.

------------------------------------------------------------
SECTION 11: PERFORMANCE & GC OPTIMIZATION
------------------------------------------------------------
- Reuse preallocated temp vectors (e.g. Float32Array length 3) for hot loops.
- Avoid allocating collision event objects per contact point; aggregate and shallow copy minimal data.
- Defer heavy debug generation until debug flag true.
- Provide metrics: stepTimeMs (rolling avg), broadPhasePairs, narrowPhaseContacts.

------------------------------------------------------------
SECTION 12: SNAPSHOT & (FUTURE) REPLAY
------------------------------------------------------------
Snapshot content (JSON):
{
  version: 1,
  timestamp,
  bodies: [
    { id, t:[x,y,z], r:[qx,qy,qz,qw], v:[vx,vy,vz], w:[wx,wy,wz], kinematic }
  ]
}
DO NOT store shape geometry; assume static definitions replicate externally.  
Replay (future): feed snapshot to adapter after clearing existing bodies (consistency check on count).  

------------------------------------------------------------
SECTION 13: ERROR & WARNING TAXONOMY
------------------------------------------------------------
PHYSICS_ADAPTER_INIT_FAILED  
PHYSICS_BODY_DUPLICATE  
PHYSICS_BODY_NOT_FOUND  
PHYSICS_LAYER_UNKNOWN  
PHYSICS_COLLISION_HANDLER_MISSING  
PHYSICS_CONTROLLER_EXISTS  
PHYSICS_UNSUPPORTED_FEATURE (e.g., shapeCast when backend lacks support)  
PHYSICS_LAG_CLAMP (accumulator clamp triggered)  
PHYSICS_SNAPSHOT_INCONSISTENT  

------------------------------------------------------------
SECTION 14: SUB-PROMPT GENERATION INDEX
------------------------------------------------------------
Create subordinate prompt folders & files:
1-adapter-rapier/
  PROMPT_ADAPTER_RAPIER.md
2-adapter-interface/
  PROMPT_ADAPTER_INTERFACE.md
3-manager-core/
  PROMPT_MANAGER_CORE.md
4-collision-events/
  PROMPT_COLLISION_EVENTS.md
5-character-controller/
  PROMPT_CHARACTER_CONTROLLER.md
6-spatial-queries/
  PROMPT_SPATIAL_QUERIES.md
7-layer-masks/
  PROMPT_LAYER_MASKS.md
8-fixed-timestep/
  PROMPT_FIXED_TIMESTEP.md
9-performance-metrics/
  PROMPT_PERFORMANCE_METRICS.md
10-debug-visualizer/
  PROMPT_DEBUG_VISUALIZER.md
11-snapshot-serializer/
  PROMPT_SNAPSHOT_SERIALIZER.md
12-engine-binding/
  PROMPT_ENGINE_BINDING.md
13-error-domain/
  PROMPT_ERROR_DOMAIN.md
14-test-harness/
  PROMPT_TEST_HARNESS.md
15-fallback-adapter-placeholder/
  PROMPT_FALLBACK_ADAPTER_PLACEHOLDER.md
16-controller-grounding-tests/
  PROMPT_CONTROLLER_GROUNDING_TESTS.md
17-collision-filtering/
  PROMPT_COLLISION_FILTERING.md
18-raycast-api/
  PROMPT_RAYCAST_API.md
19-memory-optimization/
  PROMPT_MEMORY_OPTIMIZATION.md
20-integration-behavior-orchestrator/
  PROMPT_INTEGRATION_BEHAVIOR_ORCHESTRATOR.md

------------------------------------------------------------
SECTION 15: SUB-PROMPT TEMPLATE
------------------------------------------------------------
"""
Feature: F05-PHYSICS
Sub-Task: <NAME>
Context:
Physics subsystem requires <specific focus> to satisfy Engine-mediated deterministic simulation & AI integration.

Objective:
<Measurable deliverable sentence>

Constraints:
- Strong TypeScript types
- No direct global state leaks
- Adapter boundary respected
- Avoid unnecessary allocations
- Emit standardized events
- Deterministic step ordering

Inputs / References:
- PhysicsConfig, IPhysicsAdapter
- Engine event bus
- Layer/mask config

Output:
<Exact file path(s) & exported symbols>

Validation:
- <3–7 bullet behavioral tests or acceptance checks>
- At least one negative/error scenario
- Performance or allocation note (if relevant)

Non-goals:
- Rendering details
- AI reasoning logic
- Network synchronization (future)
"""

------------------------------------------------------------
SECTION 16: SAMPLE SUB-PROMPT (FIXED TIMESTEP)
------------------------------------------------------------
"""
Feature: F05-PHYSICS
Sub-Task: Fixed Time Step
Context:
Need deterministic accumulator-based fixed delta stepping bridging variable render frame rates and constant physics dt.

Objective:
Implement FixedStepController with update(realDeltaMs) calling adapter.step(fixedDelta) N times bounded by maxSubSteps, emitting PHYSICS_LAG_CLAMP warning when clamped.

Constraints:
- No floating drift (accumulator uses double precision)
- Clamp large frame delta (e.g. > 250ms)
- Provide getStats() returning { subStepsLast, accumulator, clamped }

Output:
File: src/physics/time/FixedStepController.ts
Exports: FixedStepController class

Validation:
- 16.6ms input -> 1 substep at 1/60
- 33.3ms input -> 2 substeps
- 500ms spike -> clamped flag true
- Accumulator never negative
Non-goals:
- Variable time step physics
"""

------------------------------------------------------------
SECTION 17: PERFORMANCE METRICS (CANON)
------------------------------------------------------------
[PHYSICS][STEP][ms=2.15][bodies=124][contacts=18][pairs=34]
[PHYSICS][COLLISION][start][a=agent-1][b=world-floor][impact=1.2]
[PHYSICS][CONTROLLER][grounded=true][entity=player]
[PHYSICS][SNAPSHOT][bodies=130][bytes=8192]
[PHYSICS][LAG][CLAMP][delta=420ms][subSteps=6]

------------------------------------------------------------
SECTION 18: TEST STRATEGY (OVERVIEW)
------------------------------------------------------------
Unit:
- LayerMaskBuilder (matrix -> bitmasks)
- Accumulator stepping edge cases
- Collision dedupe aggregator
Integration:
- Spawn 10 dynamic bodies dropping onto static plane -> stable rest (low jitter)
- Character controller walking up slope < limit allowed, > limit blocked
- Rapid entity add/remove does not leak handles
Regression / Determinism:
- Same scripted sequence with seed -> identical collision start ordering hash
Stress:
- 1000 small static bodies + 200 dynamic -> step time < threshold (document baseline)
Negative:
- Duplicate body registration -> error PHYSICS_BODY_DUPLICATE
- Unknown layer -> error PHYSICS_LAYER_UNKNOWN
Snapshot:
- Export & re-import (future) body counts match expectation

------------------------------------------------------------
SECTION 19: RISK & MITIGATION
------------------------------------------------------------
R1: Non-deterministic floating errors -> keep stable ordering & avoid relying on unsorted maps for iteration sequence.  
R2: Event spam under dense contact -> coalesce by pair & frame.  
R3: Character jitter on edges -> apply small grounded tolerance & velocity projection.  
R4: Memory leak (never disposing bodies) -> engine binding listens to entity:removed.  
R5: Performance regression enabling debug -> gate heavy debug building behind flag.  

------------------------------------------------------------
SECTION 20: INTEGRATION WITH EXISTING FEATURES
------------------------------------------------------------
F02 (Engine): PhysicsSystem registers as a module; emits events via Engine.on/emitInternal.  
F03 (Data Structures): Uses spatial indices, time wheel scheduling, ring buffers for event management.  
F04 (UI): Displays physics metrics, collision counts, grounded status in performance overlay.  
F06 (Collision): Higher-level collision system builds upon physics foundation for sensors & predictive queries.  
F07 (Memory): Spatial events may be ingested as episodic memories for agents.  
F10 (Behavior): Uses perception diff with physics-based proximity & ground state for agent reasoning.  
F01 (Avatars): Character controllers link to avatar root transforms; animation system can derive movement speed.

------------------------------------------------------------
SECTION 21: CONFIG & ENV SUGGESTIONS
------------------------------------------------------------
PHYSICS_FIXED_DT=0.0166667
PHYSICS_MAX_SUBSTEPS=5
PHYSICS_ENABLE_CCD=0
PHYSICS_DEBUG=0
PHYSICS_GRAVITY_Y=-9.81
PHYSICS_LAYER_MATRIX_FILE=./config/physicsLayers.json (optional external JSON)

------------------------------------------------------------
SECTION 22: QUALITY GATES
------------------------------------------------------------
QG1: Type checks pass (strict).  
QG2: No unbounded collision listener growth.  
QG3: Step time instrumentation present.  
QG4: All exported public APIs TSDoc documented.  
QG5: Negative tests for duplicate registration & unknown layer pass.  
QG6: Controller ground transition events verified.  

------------------------------------------------------------
SECTION 23: SUB-PROMPT GENERATION INSTRUCTIONS (META)
------------------------------------------------------------
1. Use Section 15 template for all sub-prompts.  
2. Generate 20 sub-prompts (Section 14 index).  
3. Each ≤ 220 lines.  
4. Include explicit file paths + exported symbol names.  
5. Provide at least one error scenario bullet.  
6. Produce INDEX.md summarizing sub-prompts, artifacts, triggers.  

Validation After Generation:
- COUNT(sub-prompts)=20
- All include "Feature: F05-PHYSICS"
- Each contains Objective, Constraints, Validation, Non-goals
- INDEX enumerates all outputs

------------------------------------------------------------
SECTION 24: EXECUTION TRIGGER PHRASE
------------------------------------------------------------
"GENERATE_F05_SUB_PROMPTS_v1"

------------------------------------------------------------
SECTION 25: FINAL MASTER OBJECTIVE (CONDENSED)
------------------------------------------------------------
DELIVER a modular, Engine-mediated physics subsystem (Rapier-first) providing deterministic fixed stepping, collision & trigger events, character control, spatial queries, performance metrics, snapshot capability, and robust layer-based filtering—scalable for AI perception and future backend swaps without architectural rewrites.

END OF MASTER PROMPT
