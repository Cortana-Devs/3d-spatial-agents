# Prompt 1 – Physics Foundation (Third‑Person View System)

Status: Draft → To Implement  
Version: 1.0.0  
Owner: Third-Person Character Initiative  
Last Updated: (fill on commit)  

---

## 1. Overview

This prompt establishes the minimal yet production-aligned physics foundation required to support a third‑person controllable character. It introduces a self-contained `PhysicsStage` with a temporary ground collider, a provisional player capsule body, and an avatar loader wrapper. It must integrate cleanly with the existing Descendants architecture (WorldStore, RPM avatar/animation system, camera modes) without breaking current scenes or introducing SSR issues.

Primary goals:
1. Make the player model physically present and visible.
2. Provide a predictable physics environment for future movement, rotation, animation, and camera prompts.
3. Keep code modular, low-noise, and forward-compatible.

---

## 2. In Scope / Out of Scope

| Category | In Scope (Prompt 1) | Deferred |
|----------|---------------------|----------|
| Physics Provider | Rapier `<Physics>` integration | Time step tuning, sub-stepping strategies |
| Player Body | Single dynamic capsule | Advanced ground sensors, step offset, slope logic |
| Ground | Temporary large static box | Voxel integration & merged colliders |
| Avatar | Load + mount RPM model | Animation state updates (later prompt) |
| Debug | Toggleable physics debug | On-canvas overlays & profiling HUD |
| State | Optional WorldStore avatar registration | Continuous transform sync & network replication |
| Performance | Avoid per-frame allocations | Sleep management, broadphase tuning |
| Tests | Manual QA + future test placeholders | Automated CI test suite |

---

## 3. Dependencies

- React Three Fiber (already installed)
- @react-three/drei (already installed)
- three (v0.179.x)
- ADD: `@react-three/rapier` (new dependency)

Install command (not run in SSR):
```
pnpm add @react-three/rapier
```

Compatibility:
- Ensure `three` version compatibility (rapier supports current version).
- No server-side usage (wrap components with `'use client'`).

---

## 4. Architectural Principles

| Principle | Application |
|-----------|------------|
| Single Responsibility | Each file has a narrow domain (stage, ground, player body, avatar loader). |
| Open/Closed | Colliders extend via children; no rewrites for world integration later. |
| Low Coupling | Physics body & visual avatar are connected by refs, not hard-coded logic. |
| Separation of Concerns | No movement, rotation, or animation logic in this phase. |
| Performance | Vector reuse, zero per-frame object churn in foundational layer. |
| Debuggability | Controlled, prefixed logs with opt‑in toggles. |
| Forward Compatibility | Hooks & refs exposed for movement/animation/camera phases. |

---

## 5. High-Level Component Graph

```
<PhysicsStage>
  <Physics gravity={[0,-9.81,0]} debug={debugFlag} timeStep="vary">
    <GroundCollider />        // Temporary static body
    <PlayerPhysicsRoot>       // Capsule rigid body container
      <PlayerAvatarContainer />  // GLTF model (RPM)
    </PlayerPhysicsRoot>
  </Physics>
  <Environment preset="sunset" />
</PhysicsStage>
```

---

## 6. Module & Directory Plan

Create new directory: `components/third-person`

| File | Responsibility |
|------|----------------|
| `PhysicsStage.tsx` | Mounts Physics provider + environment + core children |
| `GroundCollider.tsx` | Temporary fixed ground collider |
| `PlayerPhysicsRoot.tsx` | Creates rigid body + capsule collider; owns refs |
| `PlayerAvatarContainer.tsx` | Loads GLTF, aligns mesh to collider |
| `hooks/useThirdPersonPlayerRefs.ts` | Returns stable refs `{ rigidBodyRef, avatarGroupRef }` |
| `utils/physicsDebugFlag.ts` | Determines debug mode from flags (use existing `devLog` pattern) |
| `index.ts` | Barrel export for all third-person modules |

---

## 7. Configuration Constants (Initial)

```ts
export const PLAYER_CAPSULE = {
  radius: 0.35,
  halfHeight: 0.9  // Capsule height ~= 2 * halfHeight + 2 * radius ≈ 2.5
};
export const PLAYER_SPAWN = { x: 0, y: 2, z: 0 };
export const PLAYER_SCALE = 1.0;
export const TEMP_GROUND_SIZE = 50;  // half-extent size => plane ≈ 100x100
export const TEMP_GROUND_THICKNESS = 0.2;
```

---

## 8. Debug & Dev Flags

Resolution order (first truthy wins):
1. URL query param: `?physicsDebug=1`
2. `window.__DEV_FLAGS__?.physicsDebug`
3. Env var: `process.env.NEXT_PUBLIC_PHYSICS_DEBUG === "true"`

Utility: `getPhysicsDebugFlag(): boolean` (reuse existing `utils/devLogger.ts` pattern)

---

## 9. Component Responsibilities

| Component | Key Behaviors |
|-----------|---------------|
| PhysicsStage | Resolve debug; wrap children; provide lighting/environment |
| GroundCollider | Fixed body + single `CuboidCollider` |
| PlayerPhysicsRoot | Dynamic rigid body; locked rotations; capsule collider; spawn transform |
| PlayerAvatarContainer | Loads RPM GLTF; vertical offset so feet align at collider base |
| useThirdPersonPlayerRefs | Single source of truth refs for later movement/camera systems |

---

## 10. Player Physics Body (Provisional Spec)

- Type: dynamic (`<RigidBody colliders={false}>`)
- Rotations locked: `[false,false,false]` (through `enabledRotations={[false,false,false]}`)
- Linear damping: light (tunable later)
- Angular damping: high (prevents micro torsion)
- Collider: `<CapsuleCollider args={[halfHeight, radius]} />` (Rapier order)
- Spawn transform: `translation={PLAYER_SPAWN}`

No forces/impulses or velocity logic in this phase.

---

## 11. Avatar Alignment Strategy

Issue: RPM models often root at approximate foot plane *or* slight offset.
Approach:
1. Place model inside a parent group.
2. Compute offset: `group.position.y = -PLAYER_CAPSULE.halfHeight - PLAYER_CAPSULE.radius`
3. Allow manual `ADJUST_AVATAR_FOOT_OFFSET` constant if fine‑tuning is needed after visual verification.

---

## 12. State Integration (Optional Minimal Touch)

If `playerAvatar` in WorldStore is `null` and the GLTF loads:
- Import: `import { useWorldStore } from '@/store/worldStore'`
- Call `setPlayerAvatar({... minimal stub ...})`
- DO NOT update animation or movement properties.
- Provide future hook for positional syncing (Prompt 3–4).

---

## 13. Logging & Telemetry

All logs prefixed with `[ThirdPersonPhysics]`.

Events:
- Mount/unmount of PhysicsStage
- Player rigid body created (collider metrics)
- Avatar GLTF loaded (approximate mesh count / children)
- (Future placeholder) Physics step average (not implemented here)

Use existing utilities: `import { devLog, devWarn } from '@/utils/devLogger'`

---

## 14. Performance Strategy (Prompt 1 Scope)

| Concern | Strategy |
|---------|----------|
| Allocation | No new objects in render loop; refs cached |
| Physics Overhead | Single dynamic body + 1–2 fixed bodies -> negligible |
| Debug Overdraw | Only enable Rapier debug when flagged |
| Reload Stability | Avoid incremental body duplication (component keys stable) |
| GC Pressure | No ephemeral vectors in components; predefine constants |

---

## 15. Risk & Mitigation Matrix

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| SSR Hydration Mismatch | Medium | Low | `'use client'` at each entry + avoid window access before mount |
| Collider ↔ Avatar Mismatch | Visual quality | Medium | Provide documented foot offset & test early |
| Debug Spam | Dev noise | Medium | Single-shot logs + conditional debug flag |
| Falling Through Ground (precision) | Blocker | Low | Increase ground thickness & spawn Y clearance |
| Future API Rewrites | Ref churn | Low | Establish `useThirdPersonPlayerRefs` now |

---

## 16. Implementation Plan (Concrete Steps)

1. Install dependency: `pnpm add @react-three/rapier`
2. Add constants file (`components/third-person/constants.ts`)
3. Create utility `utils/physicsDebugFlag.ts` (import existing `devLog` from `@/utils/devLogger`)
4. Implement `PhysicsStage.tsx`
   - `'use client'`
   - Read `debugFlag`
   - Render: `<Physics debug={debugFlag} gravity={[0,-9.81,0]} timeStep="vary">`
   - Children: `<GroundCollider />`, `<PlayerPhysicsRoot />`
   - Place `<Environment preset="sunset" />`
5. Implement `GroundCollider.tsx`
   - `<RigidBody type="fixed" colliders={false}>`
   - `<CuboidCollider args={[TEMP_GROUND_SIZE, TEMP_GROUND_THICKNESS, TEMP_GROUND_SIZE]} restitution={0} friction={0.9} />`
6. Implement `PlayerPhysicsRoot.tsx`
   - Create `rigidBodyRef`
   - `<RigidBody colliders={false} enabledRotations={[false,false,false]} position={[spawn.x, spawn.y, spawn.z]}>`
   - `<CapsuleCollider args={[PLAYER_CAPSULE.halfHeight, PLAYER_CAPSULE.radius]} friction={0.2} restitution={0} />`
   - Wrap `<PlayerAvatarContainer bodyRef={rigidBodyRef} />`
7. Implement `PlayerAvatarContainer.tsx`
   - `useGLTF('/models/player_ReadyPlayerMe.glb')`
   - Wrap scene in `<group ref={avatarGroupRef} scale={[PLAYER_SCALE,PLAYER_SCALE,PLAYER_SCALE]} />`
   - Apply vertical offset for feet
   - Optional: update WorldStore if empty
8. Implement `hooks/useThirdPersonPlayerRefs.ts`
   - Return stable refs + use existing `devWarn` for invariant warnings
9. Barrel export in `components/third-person/index.ts`
10. Add doc snippet for usage (see Section 20)
11. Manual QA checklist execution
12. Mark prompt complete & proceed to Prompt 2 (Static World Colliders)

---

## 17. Acceptance Criteria

1. No runtime errors in dev and production build.
2. Player capsule visible in debug overlay (when `?physicsDebug=1`).
3. Avatar feet approximately rest at y=0 (±0.05 tolerance).
4. Capsule remains stable (no tipping, no drift) for ≥30 seconds idle.
5. Ground collision reliable (no falling through).
6. Code footprint for new files ≤ ~400 LOC combined (excluding comments).
7. Disabling debug flag removes Rapier debug overlay cleanly.
8. Hot reload does not create duplicate rigid bodies (verify via debug logs).
9. Switching existing camera modes (orbit/fly) still functional (no crash).
10. GLTF properly released on unmount (no memory leak warnings in console).

---

## 18. Manual QA Checklist

| Action | Expected |
|--------|----------|
| Load page with `?physicsDebug=1` | Capsule + ground colliders rendered |
| Remove debug param & reload | Debug overlay absent |
| Resize window | No re-mount spam logs |
| Toggle camera mode (existing UI) | No warnings/errors |
| Inspect avatar alignment | Feet close to ground plane |
| Let scene idle 30s | No downward drift |
| Reload (hot module) | Single creation log (no duplicates) |
| Production build run | Identical behavior, no hydration warnings |

---

## 19. Future Automated Tests (Placeholders)

| Test Type | Description |
|-----------|-------------|
| Render Snapshot | `PhysicsStage` renders provider skeleton |
| Rigid Body Integrity | Capsule collider args match constants |
| Debug Flag Resolution | Query param overrides env & global flag |
| Avatar Alignment | Foot offset calculation within tolerance (utility test) |

---

## 20. Example Usage Snippet (Documentation Only)

```tsx
<Canvas shadows camera={{ position: [4, 3, 6], fov: 55 }}>
  <Suspense fallback={null}>
    <PhysicsStage />
  </Suspense>
</Canvas>
```

With debug:
```
http://localhost:3000/third-person-dev?physicsDebug=1
```

---

## 21. Extension Hooks (For Later Prompts)

| Future Feature | Hook / Ref |
|----------------|-----------|
| Movement (Prompt 4) | `rigidBodyRef` (set linear velocity) |
| Rotation (Prompt 5) | `avatarGroupRef.quaternion` |
| Animation (Prompt 5) | Avatar GLTF node references |
| Camera Follow (Prompt 6) | Physics body world position |
| World Colliders (Prompt 2) | Replace `<GroundCollider />` with `WorldCollisionLayer` |
| Ground Sensors (Prompt 3 refinement) | Additional sensor collider child |
| Network Sync | Periodic sampling of position/velocity |

---

## 22. Risks Requiring Revisit Later

| Deferred Risk | Planned Resolution Prompt |
|---------------|--------------------------|
| Voxel collider integration | Prompt 2 |
| Precise ground detection & slope handling | Prompt 3 |
| Movement state derivation | Prompt 4 |
| Orientation smoothing | Prompt 5 |
| Camera collision & follow | Prompt 6 |

---

## 23. Open Questions (To Resolve Before Merge)

| Question | Resolution Strategy |
|----------|---------------------|
| Avatar forward axis alignment needed? | Inspect RPM model; add `MODEL_FORWARD_OFFSET` constant if mismatch |
| Should we pre-warm navmesh? | Out-of-scope (document in later navigation spec) |
| Will ground be replaced by chunk colliders soon? | Yes—design aggregator in Prompt 2 |

---

## 24. Completion Gate

Prompt 1 is “Complete” when:
- All Acceptance Criteria satisfied.
- QA checklist executed & logged.
- Any axis / scale adjustments applied & documented.
- PR reviewed with no architectural concerns.
- Next prompt (Static World Colliders) unblocked.

---

## 25. Appendix – Minimal Pseudocode Reference

```tsx
// PhysicsStage.tsx (conceptual)
'use client'
import { Physics } from '@react-three/rapier'
import { Environment } from '@react-three/drei'
import { GroundCollider } from './GroundCollider'
import { PlayerPhysicsRoot } from './PlayerPhysicsRoot'
import { getPhysicsDebugFlag } from '../utils/physicsDebugFlag'

export function PhysicsStage() {
  const debug = getPhysicsDebugFlag()
  return (
    <>
      <Physics gravity={[0, -9.81, 0]} debug={debug} timeStep="vary">
        <GroundCollider />
        <PlayerPhysicsRoot />
      </Physics>
      <Environment preset="sunset" />
    </>
  )
}
```

---

End of Prompt 1 Specification