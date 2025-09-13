# Prompt 5 Specification – Rotation & Animation State Integration (Third-Person View)

Status: Draft (execute after Prompt 4 completion)  
Depends On:  
- `01-physics-foundation.md` (PhysicsStage)  
- `02-static-world-colliders.md` (WorldCollisionLayer)  
- `03-character-physics-body.md` (PlayerCharacterRoot + physics API)  
- `04-basic-movement-input.md` (Locomotion state + physics-driven velocity)  
- Existing RPM Animation System (`types/playerAvatar.ts`, `components/animations/PlayerAvatarLoader.tsx`, `useRPMAnimations` hook)

Goal: Make the player avatar visually face its movement direction and drive baseline locomotion animations (idle, walk, run, jump, fall, land) with *smooth, latency-tolerant* rotation + animation blending, without yet introducing advanced layered animation or camera-follow smoothing (Prompt 6).

---

## Objectives

1. Character visually rotates toward planar movement direction using eased interpolation (no snapping).
2. Avatar animation reflects locomotion class:
   - Idle (no meaningful movement)
   - Walk (low-speed locomotion)
   - Run (sprint threshold)
   - Jump (initial upward trigger)
   - Falling (airborne, downward vel)
   - Landing (on ground transition after airborne)
3. Smooth animation cross-fades with configurable durations (default 0.25s).
4. Integrates with existing `PlayerAvatarState` + `MovementAnimationState` types from `@/types/playerAvatar` (no schema changes required).
5. Uses *read-only* locomotion + ground state (no side-effects back into physics system).
6. Zero per-frame allocations (reused vectors/quaternions).
7. Modular – animation & rotation subsystems can be disabled or replaced later.

---

## Out of Scope (Deferred)

| Feature | Deferred To |
|---------|-------------|
| Upper-body overlay layers (tool holding, emotes) | Advanced animation phase |
| Foot IK / procedural leaning | Advanced locomotion refinement |
| Strafe vs forward locomotion mode switching | Later camera-relative combat mode |
| Network animation compression | Multiplayer phase |
| Additive aim offsets | Combat / interaction phase |
| Ragdoll blending | Physics/animation convergence phase |
| Full blend trees / curve-driven speed scaling | Enhanced animation controller milestone |

---

## High-Level Architecture

```
PlayerCharacterRoot
  ├─ PlayerPhysicsBody (Prompt 3)
  ├─ PlayerMovementController (Prompt 4)
  ├─ PlayerAnimationBridge (NEW)
  │    ├─ useMovementAnimationState (derive target anim state)
  │    ├─ useAnimationTransitionManager (fade logic)
  │    └─ useCharacterRotationController (rotation smoothing)
  └─ PlayerVisualAttachment (Prompt 3)
        └─ <PlayerAvatarContainer />
```

Separation of Concerns:
- `useMovementAnimationState`: Stateless classification from locomotion + ground flags.
- `useAnimationTransitionManager`: Imperative control over animation mixer / actions.
- `useCharacterRotationController`: Applies quaternion rotation to avatar group (NOT physics body).
- `PlayerAnimationBridge`: Orchestrates the three; subscribes to contexts (physics + locomotion + avatar state).

---

## Proposed Files

```
components/third-person/animation/PlayerAnimationBridge.tsx
components/third-person/animation/useMovementAnimationState.ts
components/third-person/animation/useAnimationTransitionManager.ts (extends existing useRPMAnimations pattern)
components/third-person/animation/rotation/useCharacterRotationController.ts
components/third-person/animation/constants.ts
components/third-person/animation/types.ts (imports from @/types/playerAvatar)
```

Exports aggregated in existing third-person barrel `index.ts`.

---

## Constants (animation/constants.ts)

```
export const ANIM_CROSSFADE_DEFAULT = 0.25        // seconds
export const ANIM_FADE_FAST = 0.15
export const ANIM_FADE_SLOW = 0.5

export const ROTATION_LERP_FACTOR_GROUNDED = 10   // higher = faster snap
export const ROTATION_LERP_FACTOR_AIRBORNE = 4
export const ROTATION_MIN_SPEED_DIR = 0.15        // below -> do not rotate
export const ROTATION_UP_VECTOR = [0, 1, 0]

export const WALK_SPEED_THRESHOLD = 0.2
export const RUN_SPEED_THRESHOLD = 4.2
export const FALLING_VEL_THRESHOLD = -2.0
export const LANDING_RECENCY_MS = 250             // classify landing state window
export const JUMP_TRIGGER_VERTICAL_VEL = 2.0
```

---

## Types (animation/types.ts)

```ts
// Import existing types
import type { 
  MovementAnimationState, 
  PlayerAvatarState,
  AnimationTransition 
} from '@/types/playerAvatar'

export interface AnimationClassification {
  locomotionState: MovementAnimationState
  speed: number
  isAirborne: boolean
  justJumped: boolean
  justLanded: boolean
}

export interface RotationControllerConfig {
  groundedLerp?: number
  airborneLerp?: number
  minDirectionSpeed?: number
}

export interface RotationControllerAPI {
  update(delta: number): void
  setForcedYaw(radians: number): void
  getCurrentYaw(): number
}

export interface AnimationTransitionEvent {
  from: string
  to: string
  time: number
  duration: number
}
```

---

## Animation State Classification (useMovementAnimationState)

Input Sources:
- `LocomotionState` (Prompt 4 context): `speed`, `velocity`, `isGrounded`, `justJumped`, `lastJumpTime`
- Ground state (Prompt 3) if needed for robustness
- Previous classified state (for hysteresis)

Decision Logic (simplified priority order):
1. If `justJumped`: state = `jumping`
2. Else if `!isGrounded`:
   - If vertical velocity < `FALLING_VEL_THRESHOLD`: `falling`
   - Else keep `jumping` or transitional airborne state
3. Else if landing (was airborne last frame & now grounded & time since last airborne < `LANDING_RECENCY_MS`): `landing`
4. Else if speed >= `RUN_SPEED_THRESHOLD`: `running`
5. Else if speed >= `WALK_SPEED_THRESHOLD`: `walking`
6. Else: `idle`

Hysteresis:
- Optionally add mild dwell (e.g., require leaving a band before switching) – keep simple for baseline (document extension).

Output: `AnimationClassification`.

---

## Animation Transition Manager (useAnimationTransitionManager)

Responsibilities:
- Use existing `useRPMAnimations` hook pattern from `@/components/animations/`
- Maintain references to active animation actions in `PlayerAvatarState.currentAnimations`
- Provide `playState(targetState: MovementAnimationState, fadeSeconds?: number)`
- Avoid redundant transitions (`if (current === target) return`)
- Apply cross-fades:
  ```
  prevAction.crossFadeTo(nextAction, fadeSec, false)
  nextAction.reset().play()
  ```
- Track last transition in ref for debug reporting.
- Fail gracefully if an animation clip missing (log once; fallback to idle).

Fallback Mapping Table (internal):

| MovementAnimationState | Expected Clip Keys (ordered fallback) |
|------------------------|----------------------------------------|
| idle     | idle, Idle, IDLE |
| walking  | walk, Walking, locomotion_walk |
| running  | run, running, locomotion_run |
| jumping  | jump, Jump, jumping |
| falling  | fall, falling, airborne_fall |
| landing  | land, landing, Land |

Missing -> fallback chain `walking` → `idle`.

---

## Rotation Controller (useCharacterRotationController)

Inputs:
- `LocomotionState.speed`
- Movement direction (planar) from locomotion
- Airborne vs grounded
- Config (lerp constants)
- Avatar group reference (from PlayerVisualAttachment or explicit prop)

Algorithm:
1. If speed < `ROTATION_MIN_SPEED_DIR`: early return (do not rotate).
2. Derive target yaw from `atan2(moveDir.x, moveDir.z)` (Z-forward assumption).
3. Maintain current yaw in ref; use exponential smoothing:
   ```
   const factor = (isGrounded ? groundedLerp : airborneLerp)
   currentYaw = lerpAngle(currentYaw, targetYaw, 1 - exp(-factor * dt))
   ```
4. Apply quaternion each frame:
   ```
   group.quaternion.setFromAxisAngle(upVector, currentYaw)
   ```
5. Provide API:
   - `setForcedYaw(radians)` (overrides immediately)
   - `getCurrentYaw()`
6. Avoid gimbal issues by confining to Y-axis only.

Edge Cases:
- If movement direction near zero vector → do not modify yaw.
- If animation bone root already handles orientation (RPM root) – confirm pivot; if mismatch, keep rotation at outer group only.

---

## PlayerAnimationBridge Component

Responsibilities:
1. Acquire contexts:
   - Player physics (Prompt 3): `usePlayerPhysicsContext()`
   - Locomotion state (Prompt 4): `usePlayerLocomotion()`
   - Avatar state: `import { useWorldStore } from '@/store/worldStore'` selector for `playerAvatar`
2. Run hooks:
   - `const classification = useMovementAnimationState(locomotion)`
   - `useAnimationTransitionManager(classification)`
   - `useCharacterRotationController(locomotion)`
3. Provide dev logs (debounced) when:
   - State transitions
   - Rotation forced / large deltas
   - Missing animation fallback engaged
4. Optional prop: `debug` → renders a small overlay (DOM) with:
   - Current state
   - Speed  
   - Yaw (deg)
   - Grounded / Airborne / Jump flags
   - Use existing debug panel patterns from project

Props:
```
interface PlayerAnimationBridgeProps {
  enabled?: boolean
  rotationEnabled?: boolean
  animationsEnabled?: boolean
  debug?: boolean
  onTransition?: (evt: AnimationTransitionEvent) => void
}
```

Behavior when disabled:
- If `animationsEnabled === false`: Do not request transitions (leave last playing action).
- If `rotationEnabled === false`: Freeze yaw at last value (no drift).
- If `enabled === false`: Skip all updates (pass-through).

---

## Debug Logging Conventions

Prefix: `[AnimBridge]`
Import: `import { devLog, devWarn, devError } from '@/utils/devLogger'`

One-time:
- Loaded actions: list of resolved clip keys
On transition:
- `[AnimBridge] transition walking -> running (0.25s)`
Missing clip:
- `[AnimBridge] missing clip for 'running' (fallback idle)`
Rotation anomaly:
- Delta yaw > 90° in single frame: log warning (diagnostic for malformed moveDir)

Use existing utilities pattern from project.

---

## Performance & Allocation Strategy

| Concern | Mitigation |
|---------|------------|
| Per-frame object churn | Reuse classification + temp vectors |
| Excess transitions causing blend spam | Prevent repeats (store lastState) |
| Large delta frames causing snap | Exponential smoothing with dt clamp (e.g., max dt 0.066) |
| Missing animation warnings spam | Track warnedStates Set |
| GC pressure from string building | Concise logging; no JSON stringify loops |

---

## Acceptance Criteria

1. Avatar rotates to face movement direction within ≤250ms under continuous input (speed ≥ walk threshold).
2. Idle rotation remains stable (no drift / jitter) when not moving.
3. Walk ↔ Run animation transitions cross-fade smoothly (no hard pop) based on sprint key speed change.
4. Jump animation triggers exactly once per jump event.
5. Falling animation activates only after vertical velocity below threshold while airborne.
6. Landing animation activates after airborne → grounded transition (single cycle or blended to idle/walk).
7. Disabling rotation (prop) freezes orientation; movement continues unaffected.
8. Disabling animations (prop) leaves last active clip playing (no errors).
9. No frame stutters introduced (measured delta consistency; zero new frequent allocations).
10. Logs show at most one missing-clip warning per state when assets absent.
11. Rotation system never modifies physics rigid body (visual-only transform).
12. All code paths SSR-safe (client-only hooks inside React Three Fiber tree).

---

## Manual QA Checklist

| Test | Steps | Expected |
|------|-------|----------|
| Basic Rotation | Move forward then left | Character smoothly faces new direction |
| Idle Stability | Release keys | Orientation remains fixed |
| Run Transition | Hold W, press Shift | Walk → Run animation cross-fade |
| Jump Cycle | Space while moving | Jump animation → Falling → Landing/Walk |
| Airborne Turn | Jump then strafe mid-air | Rotation responds slower (airborne lerp) |
| Disable Rotation | Toggle prop | Character stops re-orienting |
| Missing Clip Fallback | Temporarily remove 'run' | Warning + uses walk/idle (no crash) |
| High Latency Sim | Throttle (dev tools) | Rotation eases; no snapping >30° abrupt |
| Re-enable Systems | Toggle enabled flags | State resumes without desync |
| Repeated Short Inputs | Tap A/D rapidly | Minimal over-rotation / jitter |

---

## Implementation Steps (Ordered)

1. Add `constants.ts`, `types.ts`.
2. Implement `useMovementAnimationState`:
   - Accept locomotion + previous state  
   - Return memoized classification
3. Implement `useAnimationTransitionManager`:
   - Extend existing `useRPMAnimations` pattern from `@/components/animations/`
   - Resolve action map from `PlayerAvatarState.currentAnimations`
   - Build fallback resolution function
   - Handle cross-fade logic; expose `applyClassification(classification)`
4. Implement `useCharacterRotationController`:
   - Maintain `currentYaw`
   - Exponential smoothing
   - Provide `update(delta)` method
5. Implement `PlayerAnimationBridge`:
   - Wire hooks inside `useFrame`
   - Call rotation + animation updates only when `enabled`
6. Add small optional debug overlay (abides by <100 LOC)
7. Integrate into dev scene after movement controller
8. Tune thresholds (walk/run, airborne detection) if jitter observed
9. Run QA checklist
10. Mark prompt complete → proceed to Prompt 6 (Camera System)

---

## Rotation Math Notes

- Use `atan2(moveDir.x, moveDir.z)` assuming model forward is +Z in its local space.  
- If actual model forward is -Z or +X, add an orientation offset constant (`MODEL_FORWARD_OFFSET_RAD`).
- Exponential smoothing formula:
  ```
  alpha = 1 - exp(-k * dt)
  yaw = yaw + shortestAngleDelta(yaw, target) * alpha
  ```
- Shortest delta:
  ```
  function deltaAngle(a, b) {
    let d = (b - a + Math.PI) % (2 * Math.PI) - Math.PI
    return d < -Math.PI ? d + 2 * Math.PI : d
  }
  ```

---

## Extension Hooks (Future)

| Feature | Hook / Extension |
|---------|------------------|
| Strafe Mode | Add facing mode switch: 'movement' | 'camera' |
| Head Look / Aim | Layer after base yaw; adjust skeleton bones |
| Speed-Based Clip Blend | Introduce parametric blend tree vs discrete states |
| Procedural Lean | Add tilt quaternion based on lateral acceleration |
| Emote Override | Priority stack above locomotion state machine |
| Animation LOD | Skip certain transitions when far from camera |

---

## Risk & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Missing animations causing flicker | Medium | Fallback mapping + single warning |
| Model forward mismatch | High (rotation appears wrong) | Add orientation offset constant & verify early |
| Over-rotation on micro-movement noise | Low | Speed threshold gate |
| Airborne rotation too snappy | Medium | Distinct airborne lerp factor |
| Cross-fade piling | Low | Guard duplicate state transitions |
| Performance overhead | Low | Refs + no allocations approach |
| Debug overlay impacting FPS | Low | Disable by default |

---

## Example (Pseudocode – Not Final Implementation)

```tsx
// Integrate with existing project patterns
function PlayerAnimationBridge({ enabled = true, debug }: PlayerAnimationBridgeProps) {
  const locomotion = usePlayerLocomotion()
  const { api: physics } = usePlayerPhysicsContext()
  const { playerAvatar } = useWorldStore() // existing selector
  const classification = useMovementAnimationState(locomotion)
  const { applyClassification } = useAnimationTransitionManager(playerAvatar)
  const rotation = useCharacterRotationController({})

  useFrame((_, dt) => {
    if (!enabled || !playerAvatar?.isLoaded) return
    rotation.update(dt)
    applyClassification(classification)
  })

  return debug ? <AnimDebugPanel data={{ classification, yaw: rotation.getCurrentYaw() }} /> : null
}
```

---

## Completion Gate (Before Prompt 6)

- [ ] All acceptance criteria met
- [ ] No runtime warnings in normal flow
- [ ] Rotation stable & visually correct
- [ ] Animation transitions verified (manual)
- [ ] Fallback behavior tested (remove one clip)
- [ ] Debug overlay optional & performant
- [ ] No memory leak (profiling stable)
- [ ] Documentation (this file) unchanged except tuned constants if needed

---

End of Prompt 5 Specification