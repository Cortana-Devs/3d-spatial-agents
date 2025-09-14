# Prompt 2 Specification – Static World Colliders (Third-Person View System)

Status: Draft (to be implemented after Prompt 1 completion)  
Depends On: `01-physics-foundation.md` (PhysicsStage + Player capsule)  
Goal: Introduce static / fixed colliders representing ground & early world geometry without breaking existing voxel / floor rendering or PlayerControl+Camera modules.

---

## Objective

Provide a robust, incremental collision layer for the world so the player capsule:
1. Stands on ground / floor surfaces reliably
2. Cannot fall off initial platform areas (optional temporary boundaries)
3. Supports future voxel expansion (block placement / removal)
4. Minimizes physics body churn and rebuild cost

This phase does NOT introduce dynamic block-collider regeneration for full editing yet—only a stable foundation and an abstraction layer ready for upgrade in later tasks.

---

## Scope

IN SCOPE:
- Fixed ground plane (replace temporary `GroundCollider.tsx` from Prompt 1)
- Optional perimeter bounding walls (toggleable)
- Thin abstraction for future voxel → collider aggregation
- Efficient Rapier collider creation (static bodies only)
- Dev debug instrumentation (counts, bounding volumes)

OUT OF SCOPE (Future Prompts):
- Per-block collider regeneration
- Advanced slope / ramp geometry
- Scene mesh trimesh ingestion
- NavMesh generation
- Moving / dynamic platforms

---

## Architecture Overview

```
WorldCollisionLayer
  ├─ GroundStaticBody (main floor)
  ├─ BoundaryWalls (optional)
  └─ VoxelColliderAggregator (stub: no-op or minimal merge)
       └─ (Future) ChunkColliderMesh | CuboidBatchColliders
```

Integration Insert Point:
`<PhysicsStage>` (Prompt 1) adds `<WorldCollisionLayer />` above `<PlayerPhysicsRoot />`.

**WorldStore Integration**: Use existing `useWorldStore` hook and `blockMap` for future voxel collider sync.

---

## Files (Planned)

- `components/third-person/collision/WorldCollisionLayer.tsx`
- `components/third-person/collision/GroundStaticBody.tsx`
- `components/third-person/collision/BoundaryWalls.tsx`
- components/third-person/collision/VoxelColliderAggregator.tsx (stub)
- components/third-person/collision/types.ts (shared interfaces)
- (Update) `components/third-person/index.ts` – export new modules
- (Note) Use existing `@/utils/devLogger` for logging (no new collision debug file)

---

## Design Details

### 1. Ground Collider

| Parameter | Value | Reason |
|-----------|-------|--------|
| Size (half extents) | `[GROUND_SIZE, 0.25, GROUND_SIZE]` | Slight thickness prevents tunneling |
| Default GROUND_SIZE | 100 | Matches or exceeds typical initial block area |
| Body Type | `fixed` | Non-moving world geometry |
| Friction | 0.9 | Allows stable foot plant |
| Restitution | 0.0 | No bounce for player |

Implementation:  
```
<RigidBody type="fixed" colliders={false}>
  <CuboidCollider args={[size, 0.25, size]} friction={0.9} restitution={0} />
</RigidBody>
```

Elevate slightly? No. Keep top surface at y=0 → thickness extends downward (`-0.25`). Player spawn still at y=2 (prompt 1 constant).

### 2. Boundary Walls (Optional)

Four vertical thin boxes forming a square boundary:
```
height = 10
thickness = 0.5
offset = GROUND_SIZE - thickness
```
Visibility: OFF (collision only). Controlled by:
- Query param: `?worldBounds=1`
- Env var: `NEXT_PUBLIC_THIRDPERSON_BOUNDS=1`

### 3. Voxel Collider Aggregator (Stub)

Purpose:
- Provide API surface now to avoid refactors later.
- Reads existing `blockMap` from `useWorldStore` hook: `import { useWorldStore } from '@/store/worldStore'`
- For Prompt 2: returns nothing OR (optional) single merged axis-aligned region if blocks exist.

Interface (types.ts):
```
export interface IVoxelColliderAggregator {
  initialize(): void
  syncIfNeeded(): void
  dispose(): void
}
```

Future Upgrades:
- Chunk partitioning (e.g., 16³)
- Merge contiguous solids
- Replace with trimesh (only if perf acceptable)
- Support diff-based rebuild (dirty set pattern)

### 4. Update Strategy

For Prompt 2: `syncIfNeeded()` NO-OP (logs first invocation).  
We DO NOT rebuild during runtime yet—prevents premature complexity.

### 5. Debug Telemetry (Dev Only)

Console group prefix: `[WorldCollision]`  
Logged:
- Ground size / boundaries enabled
- Aggregator status (stub)
- Count of fixed bodies added
- Later: potential collider surface area sum

Use existing: `import { devLog, devWarn } from '@/utils/devLogger'`

### 6. Performance Considerations

| Concern | Mitigation |
|---------|------------|
| Too many initial bodies | Limit to 1–5 (ground + walls) |
| Re-render thrash | Components are pure; no state loops |
| Memory overhead | No geometry instantiation beyond simple colliders |
| Future rebuild cost | API staging now (Aggregator stub) |

### 7. Compatibility

- Works with existing `PlayerPhysicsRoot` (capsule stands on ground)
- Does not interfere with camera modes
- No reliance on SSR (client-only components)
- Avoids touching existing WorldStore mutation paths

---

## Configuration Constants (Shared)

```
export const WORLD_GROUND_SIZE = 100
export const WORLD_BOUNDARY_HEIGHT = 10
export const WORLD_BOUNDARY_THICKNESS = 0.5
```

Optional central file: `components/third-person/collision/constants.ts`

---

## Acceptance Criteria

1. Replaces temporary `GroundCollider` with `WorldCollisionLayer` (no regressions).
2. Player capsule rests on ground (no drift, no sinking) for 60s idle.
3. Optional boundaries prevent exiting area when enabled.
4. No more than 5 fixed rigid bodies created in current stage.
5. Disabling boundaries removes wall colliders without error.
6. No runtime warnings from Rapier in console.
7. Colliders appear correctly in physics debug view (Prompt 1 toggle).
8. Code additions within ~300 LOC (excluding comments).
9. Aggregator stub present & documented for follow-up expansion.

---

## Step-by-Step Implementation Plan

1. Create collision folder & constant file.
2. Implement `GroundStaticBody.tsx` (pure component).
3. Implement `BoundaryWalls.tsx` with conditional rendering.
4. Implement `VoxelColliderAggregator.tsx` (stub hook returning ref object):
   - Import: `import { useWorldStore } from '@/store/worldStore'`
   - Access `blockMap` but return no-op for now
5. Implement `WorldCollisionLayer.tsx`:
   - Compose ground + boundaries + (future) aggregator invocation.
6. Update `PhysicsStage.tsx`: remove old ground import; insert `WorldCollisionLayer` before player root.
7. Add index re-exports.
8. Manual QA with & without `?physicsDebug=1` and `?worldBounds=1`.
9. Document quick usage snippet for dev page.
10. Mark prompt complete; prepare for Prompt 3 (dynamic player physics body refinements + alignment with movement system).

---

## Manual QA Checklist

| Action | Expected Result |
|--------|-----------------|
| Launch dev without params | Ground only, capsule stable |
| Add `?worldBounds=1` | Invisible walls block movement near edges |
| Toggle physics debug | See ground + 4 perimeter boxes |
| Resize window | No collider duplication |
| Inspect console | Single initialization log set |
| Build production | No SSR mismatch errors |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Future need to remove base ground | Wrap ground in dedicated component; easy swap to voxel mesh |
| Collider coordinate mismatch with future voxel grid | Keep floor top at y=0 (aligned with existing block placement rounding) |
| Walls interfering with later expansive worlds | Configurable; default disabled |
| Overlapping colliders later | Provide doc note: future voxel colliders should not overlap main ground; will segment ground when dynamic passes are introduced |

---

## Future Extension Hooks (Documented Now)

| Feature | Hook / Placeholder |
|---------|--------------------|
| Chunk diff rebuild | `aggregator.syncIfNeeded()` |
| Dynamic remove/add | Maintain `dirtyChunks: Set<string>` |
| Trimesh import | `importSceneMesh(mesh: THREE.Mesh)` API |
| NavMesh generation | Future `generateNavMesh(): Promise<void>` (separate system) |

---

## Example Usage Snippet (PhysicsStage Integration)

(Pseudocode only – actual file already created in Prompt 1)
```
<Physics>
  <WorldCollisionLayer />
  <PlayerPhysicsRoot />
</Physics>
```

---

## Completion Gate for Prompt 3

Prompt 2 is considered complete when:
- All acceptance criteria pass
- Code merged & dev toggle validated
- Documentation updated (this file) if any size / friction adjustments were necessary

---

End of Prompt 2 Specification