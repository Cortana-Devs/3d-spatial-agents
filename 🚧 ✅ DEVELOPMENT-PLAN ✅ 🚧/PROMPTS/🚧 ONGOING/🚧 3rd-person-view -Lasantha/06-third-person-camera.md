# Prompt 6 Specification – Third‑Person Camera System (Follow Rig & Cinematic Smoothing)

Status: Draft (implement after Prompt 5 completion)  
Depends On:  
- `01-physics-foundation.md` (PhysicsStage)  
- `02-static-world-colliders.md` (collision layer)  
- `03-character-physics-body.md` (player physics API)  
- `04-basic-movement-input.md` (locomotion state)  
- `05-rotation-and-animation.md` (rotation + animation bridge)  
- Existing camera framework (`@/components/world/CameraController.tsx`, `@/hooks/useSafeCameraMode` + WorldStore `activeCamera` state)

Goal: Introduce a modular third‑person camera rig that follows the player smoothly with collision-aware repositioning, shoulder offset, dynamic FOV modulation, and low-latency responsiveness—without breaking existing camera modes (orbit, fly, cinematic) managed by WorldStore.

---

## Objectives

1. Add a new camera mode `'thirdPerson'` (string constant) to existing `CameraMode` type and WorldStore `activeCamera` state.
2. Implement smooth follow with dual-smoothing layers (position + aim).
3. Provide configurable shoulder offset (left / right / center) and height.
4. Add basic camera collision avoidance (push in when obstructed).
5. Modulate FOV slightly based on player speed (subtle acceleration feedback).
6. Maintain stable horizon (no roll), optional pitch clamp.
7. Ensure system performs with minimal allocations and is decoupled from physics tick rate.
8. Provide debug overlay (optional) for tuning.

---

## Out of Scope (Deferred)

| Feature | Deferred To |
|---------|-------------|
| Advanced spline-based cinematic transitions | Cinematic system extension |
| Dynamic occlusion transparency (fade walls) | Rendering pass after baseline |
| Shoulder switching auto-detection | Interaction / combat refinement |
| Advanced predictive camera (velocity extrapolation) | Performance / polish phase |
| Multiplayer per-player camera multiplexing | Network / multiplayer milestone |
| Photo mode integration | UX tools later |
| Camera shake / impulses | VFX integration phase |
| Dynamic obstacle avoidance pathing (slide around) | Advanced camera AI pass |

---

## High-Level Architecture

```
ThirdPersonCameraProvider
  ├─ ThirdPersonCameraRig
  │    ├─ Target Acquisition (player physics / avatar group)
  │    ├─ Position Solver
  │    │     ├─ Desired Orbit Calculation
  │    │     ├─ Collision Probe (ray / shape cast)
  │    │     └─ Clamped Offset Resolution
  │    ├─ Smoothing Layer (position + lookAt)
  │    ├─ FOV Modulator
  │    └─ Shoulder Offset Logic
  └─ (Bridges)
       ├─ WorldStore cameraMode sync
       └─ useSafeCameraMode integration
```

---

## Proposed Files

```
components/third-person/camera/ThirdPersonCameraRig.tsx
components/third-person/camera/ThirdPersonCameraProvider.tsx
components/third-person/camera/useThirdPersonCamera.ts
components/third-person/camera/useCameraCollisionProbe.ts
components/third-person/camera/useDynamicFOV.ts
components/third-person/camera/constants.ts
components/third-person/camera/types.ts
components/third-person/camera/debug/ThirdPersonCameraDebugPanel.tsx
```

Export via existing third-person barrel index.

---

## Constants (constants.ts)

```ts
// Align with existing CameraMode type from @/types/index.ts
export const TPC_MODE_KEY = 'thirdPerson' as const

export const TPC_DEFAULT_DISTANCE = 4.5          // Base follow distance
export const TPC_MIN_DISTANCE = 1.25
export const TPC_MAX_DISTANCE = 8.0
export const TPC_VERTICAL_OFFSET = 1.55          // Eye level above feet
export const TPC_SHOULDER_OFFSET = 0.75          // Lateral shift
export const TPC_COLLISION_RADIUS = 0.28         // Sphere probe radius
export const TPC_COLLISION_SAFETY = 0.15         // Pull in slightly before surface

export const TPC_POS_SMOOTH = 10.0               // Exponential smoothing factor
export const TPC_LOOK_SMOOTH = 12.0
export const TPC_MAX_PITCH = 65 * Math.PI/180
export const TPC_MIN_PITCH = -45 * Math.PI/180

export const TPC_INPUT_YAW_SENS = 0.0022
export const TPC_INPUT_PITCH_SENS = 0.0018

export const TPC_SPEED_FOV_DELTA = 6             // Degrees at max run velocity
export const TPC_BASE_FOV = 60
export const TPC_FOV_SMOOTH = 6

export const TPC_SPEED_FOR_MAX_FOV = 7.0         // m/s (slightly above run)
export const TPC_OBSTRUCTION_RECHECK = 0.08      // Seconds between heavy collision casts
export const TPC_MICRO_RECHECK = 0.016           // Light forward revalidation
```

---

## Types (types.ts)

```ts
export interface ThirdPersonCameraConfig {
  distance?: number
  minDistance?: number
  maxDistance?: number
  verticalOffset?: number
  shoulderOffset?: number
  collisionRadius?: number
  invertY?: boolean
  allowZoom?: boolean
  enableFOVModulation?: boolean
  enableCollision?: boolean
  debug?: boolean
}

export interface ThirdPersonCameraRuntimeState {
  yaw: number
  pitch: number
  targetDistance: number
  currentDistance: number
  obstructionDistance: number | null
  lastObstructionCheck: number
}

export interface ThirdPersonCameraAPI {
  setYaw(y: number): void
  setPitch(p: number): void
  addYaw(delta: number): void
  addPitch(delta: number): void
  setDistance(d: number): void
  getState(): ThirdPersonCameraRuntimeState
  forceSnap(): void
  setShoulder(side: 'left' | 'right' | 'center'): void
}

export interface CameraCollisionResult {
  hit: boolean
  distance: number
  point?: THREE.Vector3
  normal?: THREE.Vector3
}
```

---

### Control & Input Strategy

- Integrate with existing input handling patterns from `@/components/modules/PlayerControlModule.tsx`.
- Use existing pointer lock / mouse movement capture from current camera system.
- Mouse movement updates yaw/pitch each frame (clamped pitch).
- Scroll wheel adjusts `targetDistance` when `allowZoom` true.
- Shoulder swap (future): key `'V'` or context menu (not required now; supportive API).

---

## Position & Look Computation

1. Acquire player anchor position:
   - Prefer physics body `getPosition()` then add `verticalOffset`.
2. Compute camera basis:
   - `forward` from yaw/pitch (spherical).
   - `right = forward × up` normalized.
3. Apply shoulder offset:
   - `shoulderVec = right * shoulderOffset`.
4. Desired camera position:
   - `desiredPos = anchor + shoulderVec - forward * desiredDistance`.
5. Collision resolution adjusts distance before smoothing.

---

## Smoothing Model

Use exponential smoothing for frame-rate independence:

```
alphaPos = 1 - exp(-POS_SMOOTH * dt)
smoothedPos = lerp(currentPos, desiredPos, alphaPos)

alphaLook = 1 - exp(-LOOK_SMOOTH * dt)
smoothedLook = lerp(currentLookAt, anchor, alphaLook)
camera.position.copy(smoothedPos)
camera.lookAt(smoothedLook)
```

Snap on mode activation (`forceSnap()`).

---

## Collision Avoidance (Minimal Viable)

- Sphere cast (or multi-ray fallback if sphere cast unavailable):
  - Rays: center + slight up offset (avoid ground jitter).
  - If hit distance < desired:
    - Clamp `effectiveDistance = hitDistance - COLLISION_SAFETY`.
- Micro recheck each frame using a single ray to refine last result.
- Debounce heavy multi-ray / shape probe to `OBSTRUCTION_RECHECK`.
- If obstruction clears, ease distance back toward `targetDistance` with smoothing.

Fallback if physics ray API unavailable:
- Use three.js `Raycaster` vs environment meshes (optional; defer if not pre-integrated).

Graceful degradation: if no colliders hit, revert to unmodified desired distance.

---

## FOV Modulation

```
effectiveSpeed = clamp(playerPlanarSpeed, 0, SPEED_FOR_MAX_FOV)
ratio = effectiveSpeed / SPEED_FOR_MAX_FOV
targetFov = BASE_FOV + ratio * SPEED_FOV_DELTA
smoothFov with alpha (1 - exp(-FOV_SMOOTH * dt))
camera.fov = smoothFov; camera.updateProjectionMatrix()
```

Optional (config toggle). If disabled, keep constant FOV.

---

### Integration with Existing Camera Modes

- Add `'thirdPerson'` to existing `CameraMode` type in `@/types/index.ts`.
- Update `useSafeCameraMode` to handle new mode.
- Integrate with WorldStore `activeCamera` state: `import { useWorldStore } from '@/store/worldStore'`.
- When switching:
  - On entering thirdPerson:
    - Initialize yaw/pitch from current camera orientation (extract yaw around Y, pitch from forward vector).
    - `forceSnap()` to avoid large interpolation jump.
  - On leaving:
    - Stop updates (component remains mounted OR conditionally unmount).
- Ensure no cycle dependency with existing `CameraController.tsx`:
  - ThirdPerson rig runs conditionally when `activeCamera === 'thirdPerson'`.

---

## React Component Flow

```tsx
<ThirdPersonCameraProvider config={...}>
   {children}
</ThirdPersonCameraProvider>
```

Inside provider:
- Subscribe to WorldStore `activeCamera`: `const { activeCamera } = useWorldStore()`.
- Conditionally mount `ThirdPersonCameraRig` when `activeCamera === TPC_MODE_KEY`.
- Provide context with `ThirdPersonCameraAPI`.

---

## useThirdPersonCamera Hook

Returns:
- API
- Current smoothed yaw/pitch/distance
- Shoulder side
- Debug instrumentation (if enabled)

Use stable refs; avoid causing re-renders per frame (consumers read imperatively).

---

## Debug Panel (Optional)

Overlay (portal or simple absolutely positioned div):

| Field | Display |
|-------|---------|
| Mode Active | boolean |
| Yaw / Pitch (deg) | numeric |
| Distance (target/current) | numbers |
| Obstruction Distance | number / none |
| Player Speed | m/s |
| FOV | current value |
| Frame dt (avg) | rolling average |
| Collision Hits (last 10s) | count |

Enable via `config.debug` or query param `?tpcDebug=1`.

---

## Performance & Allocation Policy

| Area | Approach |
|------|----------|
| Vectors | Preallocate: tempForward, tempRight, tempAnchor, tempPos, etc. |
| Ray data | Reuse objects; no per-frame arrays |
| Logging | Throttled (e.g., once per sec) for non-critical metrics |
| Smoothing | Use exponential for frame-rate invariance |
| Store Access | Single selector for `activeCamera`; rest via refs |
| FOV Updates | Only when difference > 0.05 deg to avoid projection churn |

---

## Edge Cases & Handling

| Edge Case | Resolution |
|-----------|------------|
| Player teleports (warp) | Detect large delta (>5m) → `forceSnap()` |
| Near vertical surfaces behind player | Collision reduces distance smoothly—no jitter by applying min clamp |
| Camera inside geometry at activation | Perform immediate collision probe pre-snap |
| Pitch overflow (rapid mouse) | Clamp after update before computing forward |
| Zero speed FOV jitter | Use speed threshold 0.1 before FOV modulation starts |
| Missing player ref temporarily | Skip update; keep last position |
| Distance < MIN | Clamp before collision probe |
| Negative dt anomaly | Ignore frame |

---

## Acceptance Criteria

1. Selecting camera mode `'thirdPerson'` switches to follow behavior with no large jump (hard snap expected).
2. Camera maintains smooth follow at 60 FPS with ≤1 frame perceivable lag.
3. Collision avoidance prevents the camera from passing through walls and pulls it forward instead of clipping.
4. FOV modulation varies smoothly with running vs idle (visual difference ≥5° at run speed).
5. Shoulder offset visible (camera shifts horizontally from centerline).
6. Yaw / pitch controls rotate camera independently without affecting player physics body (rotation system controls avatar orientation).
7. No memory allocation spikes (GC stable) during continuous movement.
8. Disabling mode (switch back to orbit/fly) restores original external camera control.
9. Debug panel (when enabled) shows live metrics without causing >1ms CPU overhead per frame.
10. No runtime errors or unhandled promise rejections in console.
11. Large teleport (manual test) triggers snap without interpolation smear.
12. Min / max distance constraints respected under zoom attempts & collision conditions.

---

## Manual QA Checklist

| Test | Steps | Expected |
|------|-------|----------|
| Mode Switch | Change to thirdPerson via UI | Smooth activation, correct anchor |
| Follow Basic | Walk forward / strafe | Camera maintains consistent trailing distance |
| Sprint | Hold sprint key | Slight FOV increase, follow stable |
| Jump | Jump repeatedly | Camera vertical smoothing (no harsh snap) |
| Obstruction | Walk backward against wall so camera would intersect | Camera moves closer without clipping |
| Rapid Turn | Move + spin mouse yaw | Camera orbits smoothly, no inversion |
| Pitch Clamp | Move mouse up/down extremes | Pitch stops at defined clamps |
| Zoom In/Out | Scroll wheel | Distance clamps within [min, max] |
| Teleport | Programmatically warp player position | Camera instantly relocates (snap) |
| Mode Exit | Switch to fly/orbit | Third-person update stops, no residual smoothing |
| Debug Overlay | Enable debug | Accurate metrics update; no warnings |
| Performance | Profile 30s run | Minor overhead (<0.3ms/update typical) |

---

## Implementation Steps (Ordered)

1. Define constants & types files.
2. Implement `useThirdPersonCamera` (core runtime state + API).
3. Implement collision probe hook:
   - Accept start (anchor) + desired camera world position
   - Return clamped distance (simulate sphere cast or fallback multi-ray).
4. Implement dynamic FOV hook (optional gating).
5. Implement `ThirdPersonCameraRig`:
   - Acquire references: player physics API, active camera, R3F camera
   - `useFrame` loop: compute desired, collision correct, smooth set
6. Integrate with existing WorldStore camera mode:
   - Import: `import { useWorldStore } from '@/store/worldStore'`
   - When `activeCamera !== 'thirdPerson'` -> early return
7. Add provider + context API for external debug / dev tools.
8. Add debug panel (conditional mount).
9. Add activation side-effect:
   - Extract initial yaw/pitch from current camera transform (`yaw = atan2(pos.x - anchor.x, pos.z - anchor.z)`).
10. Implement scroll wheel & pointer movement listeners (dispose on unmount).
11. Validate FOV & distance smoothing.
12. Tune damping and offsets for natural motion.
13. Document any dimension tweaks.
14. Complete QA & finalize.

---

## Collision Strategy (Baseline Multi-Ray Fallback)

If sphere cast utility not available:

Rays (all from anchor + small vertical bias):
- Center
- +Right * half shoulder offset
- -Right * half shoulder offset
- Up (optional if vertical occlusion likely)
Take minimal hit distance; subtract safety; clamp.

Cache last clear distance & only redo full ray set every `OBSTRUCTION_RECHECK`, while per-frame do a single center ray quick check.

---

## Math Notes

Forward vector from yaw/pitch:

```
forward.x = Math.sin(yaw) * Math.cos(pitch)
forward.y = Math.sin(pitch)
forward.z = Math.cos(yaw) * Math.cos(pitch)
```

Right vector: normalize(cross(forward, UP))

Exponential smoothing coefficient `alpha = 1 - exp(-k * dt)`.

---

## Debug & Logging Conventions

Prefix: `[ThirdPersonCamera]`
Import: `import { devLog, devWarn, devError } from '@/utils/devLogger'`

Events:
- Mode activation
- Obstruction detected (distance delta > 0.25)
- Obstruction cleared
- Teleport snap
- Zoom boundary clamp (once per edge per second)

Use existing logging utilities. Avoid frame spam with time-throttled logs.

---

## Performance Considerations

| Concern | Mitigation |
|---------|------------|
| Frequent raycasts | Throttle heavy probes, reuse objects |
| FOV projection churn | Update only if difference > 0.05 deg |
| React re-renders | Store runtime state in refs; context supplies stable API |
| Jitter on low FPS | Use exponential smoothing & dt clamp (max dt 0.05 for smoothing) |
| GC overhead | Preallocate vectors / arrays |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Player anchor mismatch (using avatar vs physics) | Wobbly follow | Standardize anchor from physics body + vertical offset |
| Over-aggressive collision push-in | Claustrophobic view | Minimum clamp to `minDistance` & smoothing re-expand |
| Rotation desync with animation rotation | Facing mismatch | Keep facing logic separate (Prompt 5) & do not modify avatar from camera |
| Zoom leaving camera inside wall | Visual clipping | Re-run collision after distance change |
| Pitch inversion confusion | UX issue | Configurable invertY flag |
| Multi-frame obstruction flicker | Visual jitter | Hysteresis: require small threshold change to log/alter state |

---

## Extension Hooks (Future)

| Feature | Hook |
|---------|------|
| Camera Shake | Add post-position offset layer |
| Shoulder Auto-Swap | Add environment side sample & scoring |
| Soft Target Lock | Override yaw/pitch to track target anchor |
| Predictive Follow | Extrapolate anchor position by velocity * leadTime |
| Drone Cinematic Mode | Blend to spline path controlling rig |
| Assist Aiming (Combat) | Add bias to yaw based on input deltas |

---

## Example (Pseudocode – Conceptual)

```tsx
// Integrate with existing project patterns
function ThirdPersonCameraRig({ config }: { config?: ThirdPersonCameraConfig }) {
  const { activeCamera } = useWorldStore() // existing WorldStore hook
  const { api: physics } = usePlayerPhysicsContext() // from Prompt 3
  const locomotion = usePlayerLocomotion() // from Prompt 4
  const camera = useThree(state => state.camera)
  const runtime = useThirdPersonCamera(config)

  useEffect(() => {
    if (activeCamera === TPC_MODE_KEY) runtime.forceSnap()
  }, [activeCamera])

  useFrame((_, dt) => {
    if (activeCamera !== TPC_MODE_KEY) return
    runtime.update(dt, {
      anchor: physics.getPosition(),
      speed: locomotion.speed
    })
  })

  return config?.debug ? <ThirdPersonCameraDebugPanel api={runtime} /> : null
}
```

---

## Completion Gate (Before Post-Camera Polish)

- [ ] All acceptance criteria met
- [ ] QA checklist passed
- [ ] No unresolved TODOs in implementation
- [ ] Code size within maintainable bounds (each file < ~200 LOC target)
- [ ] Docs updated if constants tuned
- [ ] Ready for polish tasks (occlusion fade, advanced transitions)

---

End of Prompt 6 Specification