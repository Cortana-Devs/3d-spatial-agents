# Prompt 3 Specification – Character Physics Body (Third-Person View System)

Status: Draft (to be implemented after Prompt 2 completion)  
Depends On:  
- `01-physics-foundation.md` (PhysicsStage + preliminary player capsule)  
- `02-static-world-colliders.md` (WorldCollisionLayer)  

Goal: Replace the provisional player capsule from Prompt 1 with a robust, production-ready physics body + integration hooks that support future movement, animation state mapping, camera follow rigs, and world interaction.

---

## Objective

Deliver a stable, controllable character physics body abstraction with:
1. Proper capsule dimensions + grounded alignment
2. Predictable collision behavior (no tipping, no jitter)
3. Ground detection & basic state classification (grounded, airborne, sliding)
4. Surface material sampling stub (for future footstep / friction logic)
5. Hooks for movement logic (velocity-based now; forces/impulses optional later)
6. Clean separation between physics body + visual avatar + future controller logic

---

## Out of Scope (Deferred)

| Feature | Deferred To |
| ------- | ----------- |
| Full locomotion (acceleration curves, sprint, jump) | Prompt 4 |
| Animation speed scaling from velocity | Prompt 5 |
| Camera follow smoothing | Prompt 6 |
| Advanced step-up logic & slope navigation | Later movement refinement pass |
| Ragdoll / physics blending | Advanced character dynamics phase |
| Network prediction / reconciliation | Multiplayer phase (later) |

---

## High-Level Architecture

```
PlayerCharacterRoot
  ├─ PlayerPhysicsBody (capsule rigid body + collider(s))
  │    ├─ GroundContactSensor (optional second collider)
  │    └─ (Future) InteractionCollider(s)
  └─ PlayerVisualAttachment
       └─ <PlayerAvatarContainer /> (from Prompt 1)
```

Core Separation:
- PhysicsBody: Owns the Rapier `RigidBody` + colliders
- VisualAttachment: Receives transform each frame (interpolated)
- Movement Driver (later): Issues velocity / impulse commands

---

## Proposed Files

```
components/third-person/player/PlayerCharacterRoot.tsx
components/third-person/player/PlayerPhysicsBody.tsx
components/third-person/player/PlayerVisualAttachment.tsx
components/third-person/player/hooks/usePlayerGroundState.ts
components/third-person/player/hooks/usePlayerPhysicsApi.ts
components/third-person/player/constants.ts
components/third-person/player/types.ts (extend existing PlayerAvatarState from @/types/playerAvatar)
```

Exports aggregated via: `components/third-person/index.ts`.

---

## Core Constants (constants.ts)

```ts
export const PLAYER_HEIGHT_TOTAL = 2.4        // Visual height (tunable)
export const PLAYER_CAPSULE_RADIUS = 0.38
export const PLAYER_CAPSULE_HALF_HEIGHT = (PLAYER_HEIGHT_TOTAL / 2) - PLAYER_CAPSULE_RADIUS
export const PLAYER_MASS = 75                 // kg (semantic reference; Rapier auto-computes from collider, may override)
export const PLAYER_SPAWN = { x: 0, y: 2, z: 0 }
export const PLAYER_LINEAR_DAMPING = 0.2
export const PLAYER_ANGULAR_DAMPING = 2.0
export const PLAYER_MAX_SLOPE_DEG = 45
export const PLAYER_GROUND_CONTACT_EPS = 0.05
export const PLAYER_STEP_HEIGHT = 0.35        // (Future) step assist
export const PLAYER_FRICTION = 0.6
export const PLAYER_RESTITUTION = 0.0
```

---

## Types (types.ts)

```ts
// Extend existing types
import type { PlayerAvatarState } from '@/types/playerAvatar'
import type { RapierRigidBody } from '@react-three/rapier'
import type { Vector3 } from 'three'

export interface PlayerPhysicsRefs {
  rigidBody: React.MutableRefObject<RapierRigidBody | null>
  avatarGroup: React.MutableRefObject<THREE.Group | null>
}

export interface GroundState {
  isGrounded: boolean
  groundNormal: THREE.Vector3
  groundVelocity: THREE.Vector3
  lastGroundedTime: number
  surfaceMaterial?: string
}

export interface PlayerPhysicsConfig {
  spawn?: { x: number; y: number; z: number }
  debug?: boolean
  enableSurfaceSampling?: boolean
}

export interface PlayerPhysicsAPI {
  getPosition(out?: THREE.Vector3): THREE.Vector3
  getVelocity(out?: THREE.Vector3): THREE.Vector3
  setVelocity(v: THREE.Vector3): void
  applyImpulse(v: THREE.Vector3, wake?: boolean): void
  warp(position: THREE.Vector3): void
  getGroundState(): GroundState
  isGrounded(): boolean
  getForward(out?: THREE.Vector3): THREE.Vector3
  setDesiredYaw(radians: number): void
  getBody(): RapierRigidBody | null
}

// Context pattern matching existing project
export interface PlayerPhysicsContextValue {
  api: PlayerPhysicsAPI
  groundState: GroundState
  refs: PlayerPhysicsRefs
}
```

---

## PlayerPhysicsBody Responsibilities

| Responsibility | Implementation Note |
| -------------- | ------------------- |
| Create locked rotation dynamic rigid body | Use `enabledRotations={[false,false,false]}` |
| Provide capsule collider | `colliders={false}` + explicit `<CapsuleCollider />` |
| Optional ground sensor | Narrow horizontal ring via second small capsule or cylinder for more reliable ground flag |
| Maintain refs | Expose through context or direct prop |
| Handle initial spawn | Use config spawn; fallback constants |
| Provide minimal imperative control API | Hook returns stable object |
| Emit dev logs | Controlled via debug flag |

---

## Ground Detection Strategy

Approach: Hybrid contact + raycast fallback.

1. Primary: Use Rapier contact events (via `useFrame` + `rigidBodyRef.current?.sleeping()` check). Query `world.raw()` + collider parent handle for contact manifold normals (optional).
2. Secondary: Raycast straight down from body transform position + small upward offset to confirm ground distance < `PLAYER_GROUND_CONTACT_EPS + velocity.y * dt`.
3. Maintain `lastGroundedTime` for coyote-time style future jump logic.

Edge Cases:
- Sloped surfaces: Compare contact normal angle vs world up.
- Vertical surfaces (normals near horizontal): ignore for grounded classification.
- If multiple contacts: choose the one with greatest upward normal component.

---

## Surface Material Sampling (Stub)

Future Integration:
- Will map collider userData / metadata to material type (`stone`, `glass`, `voxel`).
- For now: always `undefined`.
- Provide placeholder function `sampleSurfaceMaterial(colliderHandle): string | undefined`.

---

## Visual Attachment Alignment

- GLTF pivot may not be at feet. Provide `AVATAR_VISUAL_FOOT_OFFSET_Y = -PLAYER_CAPSULE_HALF_HEIGHT - PLAYER_CAPSULE_RADIUS`.
- Apply once in `PlayerVisualAttachment` by offsetting the avatar group upward so feet align with ground when body y == collider base.

---

## Frame Update Responsibilities

| System | Action in this Prompt |
| ------ | --------------------- |
| PlayerPhysicsBody | Update ground state each frame |
| PlayerVisualAttachment | Lerp visual → physics position (alpha 0.18 default) |
| Movement (Prompt 4) | Not yet implemented |
| Animation (Prompt 5) | Will read velocity & ground state |

---

## Hook: usePlayerPhysicsApi

Returns stable object with methods:
- `getPosition(out?)`
- `getVelocity(out?)`
- `setVelocity(vec)`
- `applyImpulse(forceVec)`
- `warp(pos)`
- `getGroundState()`
- `isGrounded()`
- `setDesiredYaw(rad)` (stores target yaw → applied to visual only until rotational movement system added)

Implementation Detail:
- Avoid creating new objects; reuse internal cached vectors.

---

## Hook: usePlayerGroundState

- Accepts `rigidBodyRef`
- Internally holds:
  - `groundStateRef: GroundState`
  - `tempVectors` to avoid allocations
- Runs inside `useFrame`
- Updates `isGrounded` + derived fields
- Provides derived smoothing for `groundNormal` (lerp to reduce jitter)

---

## PlayerCharacterRoot

Composite component orchestrating:
```
<PlayerPhysicsBody config={...}>
  <PlayerVisualAttachment>
    <PlayerAvatarContainer modelUrl="/models/player-ready-player-me.glb" />
  </PlayerVisualAttachment>
</PlayerPhysicsBody>
```

Provides:
- Context: `PlayerPhysicsContext` exposing `api` + `groundState` + refs
- Future: Movement system will consume this context

---

## Integration with WorldStore

Minimal (non-invasive):
- Import: `import { useWorldStore } from '@/store/worldStore'`
- Use existing selectors: `updateAvatarPosition`, `setPlayerAvatar`
- On first mount, if `playerAvatar` in store is null AND GLTF loaded, call `setPlayerAvatar` with existing PlayerAvatarState schema
- Each frame (for now OPTIONAL): update avatar `position` using `updateAvatarPosition` every N frames (e.g. throttled to 5–10 Hz) to reduce store churn (introduce later if needed).

This prompt: Document strategy only; defer store update rate optimization until movement visible.

---

## Debug & Logging

Prefix: `[PlayerPhysics]`
Use existing: `import { devLog, devWarn, devError } from '@/utils/devLogger'`
Conditions: Only when `config.debug === true` OR global dev flag.

Log Events:
- Creation (capsule dims, spawn)
- First grounded event
- Unexpected NaN position detection (auto warp to spawn)
- Ground lost > 2s (warning for stuck airborne state)

---

## Acceptance Criteria

1. Capsule-based dynamic rigid body spawns at configured position and remains stable (no rotation, no jitter) for at least 60 seconds.
2. `isGrounded` flag transitions correctly when teleported upward (manual test: warp y +5).
3. Visual avatar aligns feet with ground plane (tolerance ≤ 0.05 units).
4. No uncontrolled drift on X/Z when idle (velocity magnitude < 0.01).
5. Ground detection remains true on flat ground, false during free fall (drop test).
6. API methods (`getPosition`, `setVelocity`, `warp`) function without throwing and reflect actual physics state.
7. No unbounded object allocations per frame (verify via performance profiling — stable memory).
8. Physics debug overlay still shows a single player body & correct collider.
9. All new components are client-only & cause no SSR hydration mismatch.
10. Total LOC for new prompt additions ≤ ~500 (excluding existing files).

---

## Manual QA Plan

| Test | Procedure | Expected |
| ---- | --------- | -------- |
| Basic Spawn | Load dev page with PhysicsStage | Model visible, stable |
| Ground Flag | Log ground state each second | `isGrounded: true` steady |
| Airborne Transition | Call `api.warp(position.addY(5))` in console | `isGrounded: false` then true after landing |
| Velocity Set | `api.setVelocity(new Vector3(2,0,0))` | Capsule moves horizontally |
| Impulse | `api.applyImpulse(new Vector3(0,5,0))` | Short hop observed |
| Rotation Lock | Attempt `rigidBody.setAngvel` | No visual tipping due to locked rotation |
| Foot Alignment | Inspect in debug view | Feet ≈ ground plane |
| Debug Toggle | Enable physics debug | Capsule outlines match spec |

---

## Implementation Steps (Ordered)

1. Create constants + types files.
2. Implement `usePlayerPhysicsApi` (internal ref placeholders).
3. Implement `usePlayerGroundState`.
4. Implement `PlayerPhysicsBody`:
   - Dynamic body
   - Locked rotations
   - Capsule collider
   - Optional sensor collider (placeholder or commented scaffold)
5. Implement `PlayerVisualAttachment`:
   - Accept `rigidBodyRef`
   - `useFrame`: sample rigid body translation → apply to group with lerp
   - Offset group Y by computed foot offset
6. Implement `PlayerCharacterRoot` composing all layers:
   - Create `PlayerPhysicsContext` using React.createContext
   - Provide context value with api, groundState, refs
7. Update third-person index exports.
8. Update (or create) a development scene snippet (doc only, not code here).
9. Validate with physics debug toggled.
10. Document any collider dimension adjustments discovered during tuning.
11. Mark prompt complete and prepare movement spec (Prompt 4).

---

## Performance Considerations

| Concern | Mitigation |
| ------- | ---------- |
| Frame allocations | Reuse vectors in hooks |
| Jitter in visual sync | Lerp with configurable smoothing factor |
| Physics stepping cost | Single dynamic body → negligible |
| Ground spam logs | Debounce events |
| Store write spam (future) | Introduce write throttle (not in this prompt) |

---

## Risk Matrix

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Collider mismatch with avatar scale | Medium | Medium | Provide clear constants + alignment offset |
| Incorrect grounded detection on edges | Medium | Medium | Add fallback raycast + normal angle filtering |
| Rotational drift due to impulses | Low | Low | Locked rotations + high angular damping |
| Visual desync at low FPS | Low | Medium | Optionally disable lerp when delta > threshold |
| Future step-up logic conflict | Medium | Low | Keep API surface minimal / extendable |

---

## Extension Hooks (Documented for Future Prompts)

| Future Feature | Hook / Entry |
| -------------- | ------------ |
| Jump System | `api.isGrounded()` + `applyImpulse` wrapper |
| Sprint / Accel Curves | Movement driver uses `setVelocity` smoothing |
| Procedural Foot IK | Add surface normal sampling in ground state |
| Animation Mapping | Use `getVelocity()` magnitude & grounded |
| Camera Follow | Use `getPosition()` each frame (Prompt 6) |
| Network Sync | Snapshot `position`, `velocity`, `groundState` |

---

## Example Pseudocode Usage

```tsx
const { api, groundState } = usePlayerPhysicsContext()

useFrame(() => {
  if (!groundState.isGrounded) {
    // Future: apply extra fall logic
  }
})
```

---

## Validation Checklist Before Advancing to Prompt 4

- [ ] Meets all acceptance criteria
- [ ] Code merged & reviewed
- [ ] Debug logs validated (no spam)
- [ ] Ground detection stable under minor numeric perturbation
- [ ] Documentation updated if constants changed
- [ ] Movement driver tasks clearly scoped for next prompt

---

End of Prompt 3 Specification