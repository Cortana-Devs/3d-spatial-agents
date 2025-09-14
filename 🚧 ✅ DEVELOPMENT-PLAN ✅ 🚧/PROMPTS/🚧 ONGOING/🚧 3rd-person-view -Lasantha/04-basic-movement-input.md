# Prompt 4 Specification – Basic Movement Input System (Third-Person View)

Status: Draft (implement after Prompt 3 completion)  
Depends On:  
- `01-physics-foundation.md` (PhysicsStage & base scene)  
- `02-static-world-colliders.md` (WorldCollisionLayer)  
- `03-character-physics-body.md` (PlayerCharacterRoot + physics API)  

Goal: Enable WASD (and basic modifiers) to move the player physics capsule using a *physics-aligned* approach (linear velocity driven), without yet introducing rotation-facing logic, animation blending, or camera follow smoothing (reserved for Prompts 5 & 6).

---

## Objective

Provide a minimal, modular, low-allocation movement input pipeline:

1. Collect keyboard input (W/A/S/D + Shift + Space) via @react-three/drei `KeyboardControls`
2. Convert input state → desired planar movement vector (camera-relative)
3. Apply smoothed velocity to player physics body (capsule) through the physics API (from Prompt 3)
4. Supply movement / locomotion state (speed, direction, grounded) to downstream systems (animation & rotation in Prompts 5+)
5. Keep system easily swappable (future: AI / gamepad / network driver)

---

## Out of Scope (Deferred)

| Feature | Defer To |
|---------|----------|
| Character facing direction / yaw interpolation | Prompt 5 (Rotation & Animation) |
| Animation state transitions (idle / walk / run) | Prompt 5 |
| Jump buffering / coyote time | Advanced locomotion refinement |
| Sprint stamina / acceleration curves | Later locomotion polish |
| Step climbing / slope limiting | Movement refinement pass |
| Gamepad & AI command bridging | Extended input layer milestone |
| Camera smoothing & shoulder follow offset | Prompt 6 |
| Network prediction & reconciliation | Multiplayer phase |

---

## High-Level Flow

```
KeyboardControls (drei)
   ↓ (subscription / hook)
usePlayerInputState (maps keys → normalized intents)
   ↓
useMovementIntent (camera-space projection + speed selection)
   ↓
usePlayerMovementDriver (velocity smoothing + physics API calls)
   ↓
PlayerPhysicsBody (rigid body velocity updated)
```

---

## Proposed Files

```
components/third-person/input/KeyboardInputProvider.tsx
components/third-person/input/usePlayerInputState.ts
components/third-person/movement/useMovementIntent.ts
components/third-person/movement/usePlayerMovementDriver.ts
components/third-person/movement/PlayerMovementController.tsx
components/third-person/movement/constants.ts
components/third-person/movement/types.ts
```

(Exported via existing third-person barrel index.)

---

## Key Concepts

### 1. Input Abstraction

Use Drei `KeyboardControls` wrapper once, near `PhysicsStage` or inside a `ThirdPersonGameplayRoot`.  
**Integration**: Extend existing `PlayerControlModule` patterns or use alongside existing keyboard handling.
Define a mapping array:

```ts
// Match existing project key mapping style
[
  { name: 'forward', keys: ['KeyW', 'ArrowUp'] },
  { name: 'backward', keys: ['KeyS', 'ArrowDown'] },
  { name: 'left', keys: ['KeyA', 'ArrowLeft'] },
  { name: 'right', keys: ['KeyD', 'ArrowRight'] },
  { name: 'jump', keys: ['Space'] },
  { name: 'sprint', keys: ['ShiftLeft', 'ShiftRight'] }
]
```

Return shape from `usePlayerInputState`:

```ts
interface RawInputState {
  forward: boolean
  backward: boolean
  left: boolean
  right: boolean
  sprint: boolean
  jump: boolean
  lastUpdate: number
}
```

### 2. Movement Intent

Transform `RawInputState` → `MovementIntent`:

```ts
interface MovementIntent {
  moveDir: THREE.Vector3   // WORLD space (camera-relative)
  inputMagnitude: number   // 0..1 pre-sprint
  desiredSpeed: number     // scalar (walk or run)
  wantsJump: boolean
  isMoving: boolean
}
```

Projection:
- Use existing camera system: `import { useThree } from '@react-three/fiber'`
- Access via `const { camera } = useThree()` 
- `forward` = camera forward flattened on XZ (y=0 then normalize)
- `right` = cross(forward, UP)
- Combine: `moveDir = forward * (fwd-back) + right * (right-left)`
- Normalize only if length > epsilon (0.0001)

### 3. Speed Model (Baseline)

Constants:

```
WALK_SPEED = 3.5      // m/s
RUN_SPEED = 6.5       // m/s
AIR_CONTROL_SCALE = 0.6
JUMP_SPEED = 5.0      // vertical impulse (converted to velocity set)
GROUND_FRICTION_DAMP = 10  // smoothing for velocity blending
AIR_FRICTION_DAMP = 2
```

Compute `desiredSpeed = (sprint ? RUN_SPEED : WALK_SPEED) * inputMagnitude`.

### 4. Smoothing Strategy

We DO NOT apply manual friction impulses yet; instead:

```
currentVelXZ ← physics.getVelocity()
targetVelXZ ← moveDir * desiredSpeed
blendedVelXZ ← lerp(currentVelXZ, targetVelXZ, 1 - exp(-damping * dt))
newVel = (blendedVelXZ.x, existingVel.y, blendedVelXZ.z)
physics.setVelocity(newVel)
```

Damping constant picks depend on grounded vs airborne.

### 5. Jump (Minimal)

Trigger:
- `wantsJump && isGrounded && velocity.y < 0.1`
- Set vertical component: `velocity.y = JUMP_SPEED`
- Future (Prompt 5+): integrate animation event triggers

No double-jump, no buffering (deferred).

### 6. Ground Influence

If airborne:
- Reduce horizontal damping (using AIR_FRICTION_DAMP)
- Limit horizontal acceleration rate (optional for current prompt; baseline uses slowed lerp)

### 7. Locomotion State (Output)

Provide a derived state object to be consumed by rotation / animation:

```ts
// Align with existing MovementState from types/playerAvatar.ts
import type { MovementState } from '@/types/playerAvatar'

interface LocomotionState extends Partial<MovementState> {
  isGrounded: boolean
  speed: number        // planar magnitude
  velocity: THREE.Vector3 // full copy or reused reference (document immutability)
  moveDirection: THREE.Vector3 // normalized planar direction (0,0,0 if idle)
  rawInput: RawInputState
  sprinting: boolean
  justJumped: boolean
  lastJumpTime: number
}
```

### 8. Performance / Allocation Rules

| Practice | Rule |
|----------|------|
| Vector reuse | All hooks reuse internal temp vectors |
| Object mutation | Provide stable references; caller reads fields (document “do not mutate”) |
| Per-frame closures | Avoid creating functions inside `useFrame` |
| Logging | Guard with dev flag; no spam every frame (aggregate every N frames if needed) |

---

## Component: `PlayerMovementController`

Responsibilities:
1. Wire hooks together:
   - `usePlayerPhysicsContext()` (from Prompt 3)
   - `usePlayerInputState()`
   - `useMovementIntent(camera, inputState, physicsApi)`
   - `usePlayerMovementDriver(intent, physics)`
2. Expose `LocomotionState` via React Context: `PlayerLocomotionContext`
3. (Developer convenience) Optionally render a tiny debug panel (if `debug` prop true)

Props:

```ts
interface PlayerMovementControllerProps {
  enabled?: boolean
  debug?: boolean
  onState?: (state: LocomotionState) => void  // emission each frame or throttled
}
```

If `enabled === false`: Zero only the horizontal component gradually (friction-like) but do not hard snap velocity.

---

## Edge Cases & Fallbacks

| Case | Handling |
|------|----------|
| No camera available / ref null | Fallback to world forward (0,0,-1) |
| Input all false | Target velocity → (0,0); smoothing handles glide to stop |
| Large frame delta (>0.1) | Clamp dt for smoothing to 0.1 to avoid huge acceleration burst |
| Physics body missing | Early return; use existing `devWarn` from `@/utils/devLogger` |
| Jump pressed while airborne | Ignored silently |
| Sprint without movement | Keep idle (no micro creeping) |

---

## Debug Logging (Dev Only)

Prefix: `[MovementDriver]`
Import: `import { devLog, devWarn, devError } from '@/utils/devLogger'`

Events:
- First activation
- Jump executed (timestamp + velocity.y)
- Speed transitions (idle→move, move→idle, run↔walk) (debounced)
- Unexpected NaN velocity (auto corrective zero & warning)

Use existing project dev utilities pattern.

---

## Configuration Constants (movement/constants.ts)

```
export const MOVEMENT_WALK_SPEED = 3.5
export const MOVEMENT_RUN_SPEED = 6.5
export const MOVEMENT_JUMP_VELOCITY = 5.0
export const MOVEMENT_AIR_CONTROL = 0.6
export const MOVEMENT_GROUND_DAMPING = 10
export const MOVEMENT_AIR_DAMPING = 2
export const MOVEMENT_STOP_EPS = 0.05
export const MOVEMENT_MAX_DT = 0.1
```

---

## Acceptance Criteria

1. Pressing W moves capsule forward relative to camera forward (XZ plane).
2. A/S/D provide strafing & backward movement correctly (no unintended diagonal speed boost; diagonals normalized).
3. Holding Shift increases ground speed (RUN) without snapping, using smooth acceleration.
4. Releasing all movement keys decelerates smoothly to near-zero ≤ 0.05 m/s within ~0.4–0.6s.
5. Space triggers a jump only while grounded; vertical velocity set to constant JUMP_VELOCITY.
6. Airborne horizontal control is reduced (feels “floatier” but responsive).
7. No console errors or continuous warnings under normal use.
8. No noticeable jitter in capsule translation at 60 FPS.
9. Per-frame allocations minimized (memory stable in performance panel).
10. Locomotion state context exposes correct speed & grounded state (>95% accuracy in manual tests).
11. Movement logic does not break camera mode switching (no dependency loops).
12. Disabling controller (if prop added) stops applying new input but preserves physics body (no forceful freeze snaps).

---

## Manual QA Checklist

| Test | Steps | Expectation |
|------|-------|-------------|
| Forward Movement | Hold W | Consistent forward motion aligned with camera |
| Diagonal | Hold W+D | 45° movement; speed ≈ base speed (not 1.4×) |
| Sprint Toggle | W then hold Shift | Smooth transition to higher speed |
| Jump | Press Space while grounded | Vertical lift; grounded false until landing |
| Air Control | Jump + hold A | Slight lateral drift obeying AIR_CONTROL |
| Idle Decel | Release keys at run speed | Smooth decel without oscillation |
| Rapid Key Spam | Alternate W/S quickly | No velocity explosion or jitter |
| Large Delta Simulation | Throttle tab for a moment | No extreme acceleration spike |
| Physics Debug | Enable debug flag | Capsule moves; no collider duplication |
| Logging | Dev mode with debug | Sparse, meaningful logs only |

---

## Implementation Plan (Ordered)

1. Add constants & types.
2. Implement `KeyboardInputProvider` wrapping children (one per scene root).
3. Implement `usePlayerInputState` (subscribes to `KeyboardControls`).
4. Implement `useMovementIntent`:
   - Acquire camera via `const { camera } = useThree()`
   - Compute flattened forward/right
   - Derive `moveDir`, magnitude, desiredSpeed
5. Implement `usePlayerMovementDriver`:
   - Hook into `useFrame`
   - Fetch physics velocity from `PlayerPhysicsContext`
   - Apply smoothing
   - Handle jump
   - Produce locomotion state (store in ref & update context)
6. Implement `PlayerMovementController` composing the hooks.
7. Create `PlayerLocomotionContext` & `usePlayerLocomotion()` consumer hook.
8. Integrate with existing `PlayerPhysicsContext` from Prompt 3.
9. Perform QA using physics debug overlay.
10. Optimize any allocations / fix logs using existing `devLog`.
11. Mark prompt complete → proceed to Prompt 5 (rotation & animation coupling).

---

## Example Pseudocode Usage (Not Final Code)

```tsx
// Integrate with existing camera/physics contexts
<KeyboardInputProvider>
  <PhysicsStage>
    <PlayerCharacterRoot>
      <PlayerMovementController debug onState={s => window.__locState = s} />
    </PlayerCharacterRoot>
  </PhysicsStage>
</KeyboardInputProvider>
```

Consume locomotion state later:

```ts
// Use existing pattern matching project context style
const locomotion = usePlayerLocomotion()
const { api } = usePlayerPhysicsContext() // From Prompt 3

if (locomotion.isGrounded && locomotion.speed > 0.1) {
  // Will feed animation selection in Prompt 5
}
```

---

## Performance Considerations

| Concern | Approach |
|---------|----------|
| Allocation | Reuse pre-allocated Vector3s in all hooks |
| Lerp Stability | Exponential smoothing: `1 - exp(-k*dt)` for framerate resilience |
| Idle CPU | Skip velocity recalculation if no input & already below stop epsilon |
| Store Spam | Do NOT write to Zustand per frame (animations will pull from context instead) |
| Future Extensibility | MovementDriver accepts strategy injection (later) |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Camera not yet set for third-person rig | Fallback to static world forward |
| Diagonal speed inflation | Normalize combined input vector before scaling |
| Over-smoothing causing sluggish feel | Tune ground damping (target time constant ~120ms) |
| Jump spamming | Requires grounded state; ignore else |
| Inconsistent velocity after direct physics impulses (future) | Provide reconcile step later if impulses used externally |

---

## Extension Hooks (For Prompt 5+)

| Future Feature | Hook / Data |
|----------------|-------------|
| Facing Rotation | Use `moveDir` & `speed > threshold` |
| Animation Blending | Use `locomotion.speed`, `isGrounded`, `justJumped` |
| Camera Follow | Position from physics API |
| Sprint FX | Listen to `sprinting` field |
| Network Snapshots | Serialize `position`, `velocity`, `sprinting`, `isGrounded` |

---

## Completion Criteria Before Advancing

All Acceptance Criteria satisfied + QA checklist complete + Locomotion state stable under variable frame times.

---

End of Prompt 4 Specification