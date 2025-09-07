# Island Generation (Procedural Floor Islands) — Implementation Prompt

Author: Systems Engineering
Status: Draft (🚧)
Audience: Gameplay + Rendering + Tools engineers
Scope: Procedural generation of “islands” using floor blocks only, driven by a deterministic seed. The result must match the spatial intent from the provided reference diagram:
- Blue “All” clusters (north-west region)
- Orange “Unique” chain diagonally (south-west → east)
- White “Pure” arc (eastern rim)

The generator produces contiguous, organic island shapes partitioned into regions. Each region enforces one of three placement rules: All, Pure, Unique. The output is a list (or stream) of floor-block placements compatible with the current block/world store and the instanced rendering pipeline.

----------------------------------------------------------------

## 1) Goals

- Deterministic, seedable island generation that produces:
  - A cohesive island silhouette (organic shape, coast falloff)
  - Region partitioning consistent with the diagram (clusters/arc/chain)
  - Floor block placements with rule-based palettes:
    - All: choose from all allowed floor types (weighted)
    - Pure: one floor type per region (monochrome region)
    - Unique: each tile uses a unique type (no repeats within region)
- Efficient batching and chunk-safe updates for smooth runtime generation.
- Debug overlays to validate region layout and rule enforcement.

Non-goals (for this iteration):
- 3D terrain verticality (we place floors at a fixed Y level)
- Biome weather/foliage/props (can be layered later)
- Pathfinding meshes (will be generated in a later task)

----------------------------------------------------------------

## 2) Terminology

- Tile: A single grid location where one floor block can be placed.
- Island Mask: A 2D boolean/float mask defining which tiles belong to the island shape.
- Region: A contiguous subset of the island mask governed by a placement rule and palette method (All, Pure, Unique).
- Palette: A set of floor types available to a region, with optional weights and constraints.

----------------------------------------------------------------

## 3) High-level System Design

Pipeline:
1. Seed & Space
   - Seed RNG with worldSeed + islandId for determinism.
   - Define an island-local coordinate frame (centered at 0,0) and a grid extent.

2. Island Silhouette (Mask)
   - Generate a circular/ovoid base via radial falloff.
   - Modulate edges with multi-octave noise (FBM/Simplex) for organic shores.
   - Optional: Dilate/erode to control coastline smoothness.

3. Region Layout (matches the reference diagram)
   - Place category seeds:
     - All: 3 seeds in north-west quadrant, loosely clustered.
     - Unique: diagonal seed chain from south-west to east (gentle arc or straight with jitter).
     - Pure: arc on the eastern rim (semi-circular set of seeds).
   - Assign tiles to nearest region seed (Voronoi/Worley partition) constrained by the island mask.

4. Region Post-process
   - Relaxation: Lloyd-like smoothing for seed positions (1–2 iterations).
   - Connectivity: Ensure regions are contiguous (split tiny fragments; merge into nearest major region).
   - Edge-soothe: Slight blur/feather between neighboring regions to avoid “hard” jaggies.

5. Palette Assignment & Placement
   - All: Weighted distribution from the global floor palette.
   - Pure: Per-region single floor type (sample once and repeat).
   - Unique: Use a non-repeating sequence of exotic/rare floor types per region; when exhausted, fallback to a safe unique-like pattern with minimal repetition distance.

6. Emission (Batched)
   - Convert tiles → block placements at fixed Y (e.g., y=0 or configured).
   - Batch commits per chunk to avoid long main-thread stalls.
   - Produce debug metadata for overlays.

----------------------------------------------------------------

## 4) Region Semantics

- All (Blue):
  - Purpose: Mixed, lively core. Matches “All” circles cluster (north-west).
  - Behavior: Any floor in allowed set; apply weights (favor common floors).
  - Visual: Soft noise to prevent visible repetition (shuffle in 3–5 tile kernels).

- Pure (White):
  - Purpose: Clean rim/arc on the east. Uniform look within each region.
  - Behavior: Choose one floor type per Pure region. Enforce that type across all tiles.
  - Visual: Crisp silhouettes; optional accent rings separating from neighbors.

- Unique (Orange):
  - Purpose: Distinct diagonal chain. Non-repeating, special surfaces.
  - Behavior: No duplicates within the same Unique region. Use rare/exotic floors first.
  - Visual: Punctuated, expressive. If palette runs short, enforce “no-repeat distance K” rule (e.g., K=5) and cycle safely.

----------------------------------------------------------------

## 5) Configuration Model (TypeScript types)

Use/extend these shapes in the generator implementation:

    type RNG = {
      next(): number;          // 0..1
      nextInt(min: number, max: number): number;
      pick<T>(arr: T[], weights?: number[]): T;
      shuffleInPlace<T>(arr: T[]): void;
    };

    type FloorId = string;

    type GlobalPalette = {
      all: { id: FloorId; weight?: number }[];
      exotic: { id: FloorId; rarity?: number }[]; // for Unique
      safeFallback: FloorId[];                     // never empty
    };

    type RegionRule = 'ALL' | 'PURE' | 'UNIQUE';

    type RegionSeed = {
      id: string;
      rule: RegionRule;
      pos: { x: number; y: number }; // island-local
    };

    type IslandMaskConfig = {
      radius: number;           // base radius in tiles
      noiseFrequency: number;   // 0.0..2.0
      noiseAmplitude: number;   // 0..1
      fbmOctaves: number;       // 1..5
      shoreSoftness: number;    // 0..1, blend at edge
    };

    type RegionLayoutConfig = {
      allCount: number;         // default: 3
      pureCount: number;        // e.g., 5–7 along arc
      uniqueCount: number;      // e.g., 5–6 diagonally
      uniqueNoRepeatDistance: number; // K, default: 5
      relaxIterations: number;  // 0..3
    };

    type GridConfig = {
      size: { width: number; height: number }; // island grid extents
      origin: { x: number; z: number };        // world offset
      yLevel: number;                          // floor y
      chunkSize: number;                       // for batching
    };

    type IslandGenConfig = {
      seed: number | string;
      islandId: string;
      mask: IslandMaskConfig;
      layout: RegionLayoutConfig;
      palette: GlobalPalette;
      grid: GridConfig;
      debug?: {
        emitOverlay: boolean;
        labelRegions: boolean;
      };
    };

    type TilePlacement = {
      x: number; y: number; z: number;
      floorId: FloorId;
      regionId: string;
      rule: RegionRule;
    };

    type IslandGenResult = {
      placements: TilePlacement[];          // may be streamed
      regions: { id: string; rule: RegionRule }[];
      debug?: {
        seeds: RegionSeed[];
        mask: number[][];                   // 0..1 island mask
        regionIdByTile: string[][];
      };
    };

----------------------------------------------------------------

## 6) Reference Diagram → Deterministic Layout

We translate the diagram into normalized island-local coordinates ([-1..1] in both axes), then map into grid space.

- All cluster (NW):
  - Scatter 3 seeds inside a disc centered at (-0.55, 0.55) with radius 0.2.
  - Jitter positions by +/-0.05 to avoid perfect symmetry.

- Unique diagonal (SW → E):
  - Sample 5–6 seeds along a curve y = lerp(-0.7, -0.1, t), x = lerp(-0.6, 0.6, t).
  - Jitter each by +/-0.05.

- Pure eastern arc:
  - Center at (0.6, 0.2), arc radius 0.35, angles from -45° to 90°.
  - Place 5–7 seeds evenly on this arc; small jitter to avoid rigid spacing.

All sampling is deterministic via the RNG seeded by (seed, islandId).

----------------------------------------------------------------

## 7) Algorithms

A) Island Mask
- Start with circular mask: m0 = clamp01(1 - distance(pos, 0) / radius).
- Add FBM noise on the boundary: m = smoothstep(0, 1, m0 - noiseAmplitude * fbm(noiseFrequency * pos)).
- Optionally apply a simple morphological smooth (box blur 1 pass) to soften pixel edges.

B) Region Assignment
- Use closest-seed Voronoi partition restricted to tiles where mask > 0.5.
- If a tile is equidistant between different rules, bias priority: PURE > UNIQUE > ALL to preserve the diagram emphasis on clear ring + unique chain.
- After assignment, run a connectivity pass: for each region, build connected components; keep the largest, merge small fragments into the closest neighboring region.

C) Palette Application
- ALL:
  - For each tile, RNG.pick from palette.all using weights.
  - Apply local 3×3 shuffle every N tiles to reduce visible banding.

- PURE:
  - For each PURE region, pick a single floorId from palette.all but bias toward “clean” floors (engineer-specified list or weight > threshold).
  - Apply that floorId to every tile in the region.

- UNIQUE:
  - For each UNIQUE region, build a non-repeating sequence:
    * First pass: take from palette.exotic (sorted by rarity desc), one each.
    * When exhausted, switch to round-robin from palette.safeFallback but enforce a minimum Manhattan distance ≥ uniqueNoRepeatDistance for the same floorId within that region.
  - If constraints cannot be satisfied, degrade gracefully: allow repetition after K failures while trying to keep distance high.

D) Emission & Batching
- Convert island-local (x,y in 2D) into world (x,z) offsets plus grid.origin; place at yLevel.
- Emit in chunk batches (grid.chunkSize x grid.chunkSize) per microtask/frame for smoothness.
- Keep an optional streaming mode for very large islands.

----------------------------------------------------------------

## 8) Pseudocode (outline)

Note: Use this as a guide; integrate with existing world store and types.

    function generateIsland(config: IslandGenConfig): IslandGenResult {
      const rng = createDeterministicRNG(config.seed, config.islandId);
      const W = config.grid.size.width;
      const H = config.grid.size.height;

      // 1) Mask
      const mask = buildIslandMask(W, H, config.mask, rng);

      // 2) Seeds
      const seeds: RegionSeed[] = [
        ...spawnAllSeeds(rng, config.layout),
        ...spawnUniqueSeeds(rng, config.layout),
        ...spawnPureSeeds(rng, config.layout),
      ];
      if (config.layout.relaxIterations > 0) {
        relaxSeeds(seeds, mask, config.layout.relaxIterations);
      }

      // 3) Voronoi assignment
      const regionIdByTile: string[][] = assignRegionsVoronoi(W, H, mask, seeds);

      // 4) Connectivity fix
      ensureRegionConnectivity(regionIdByTile, seeds);

      // 5) Placement generation
      const placements: TilePlacement[] = [];
      const perRegionChoice: Map<string, FloorId> = new Map(); // for PURE

      for (let gy = 0; gy < H; gy++) {
        for (let gx = 0; gx < W; gx++) {
          if (mask[gy][gx] <= 0.5) continue;

          const rsId = regionIdByTile[gy][gx];
          const seed = getSeedById(seeds, rsId);
          const rule = seed.rule;

          let floorId: FloorId;
          if (rule === 'ALL') {
            floorId = rng.pick(config.palette.all.map(p => p.id), config.palette.all.map(p => p.weight ?? 1));
          } else if (rule === 'PURE') {
            if (!perRegionChoice.has(rsId)) {
              const candidate = pickPureFloor(rng, config.palette);
              perRegionChoice.set(rsId, candidate);
            }
            floorId = perRegionChoice.get(rsId)!;
          } else { // UNIQUE
            floorId = pickUniqueForTile(rng, rsId, gx, gy, config, placements);
          }

          placements.push({
            x: config.grid.origin.x + gx,
            y: config.grid.yLevel,
            z: config.grid.origin.z + gy,
            floorId,
            regionId: rsId,
            rule
          });
        }
      }

      // 6) (Optional) Batch commit outside of this function

      return {
        placements,
        regions: seeds.map(s => ({ id: s.id, rule: s.rule })),
        debug: config.debug?.emitOverlay ? { seeds, mask, regionIdByTile } : undefined
      };
    }

----------------------------------------------------------------

## 9) Integration Plan

- Module location:
  - utils/generation/islands/IslandGenerator.ts
  - utils/generation/noise/*.ts (FBM/Simplex)
  - utils/generation/rng/DeterministicRNG.ts
  - components/debug/IslandDebugOverlay.tsx (optional UI overlay)
- Store integration:
  - Expose a top-level function `generateIslandAndCommit(config)`.
  - It streams/batches `placements` into worldStore in chunk-sized groups.
  - Progress events can update a debug HUD.

- Controls:
  - Add a development toggle to invoke generation for a demo area:
    * worldSeed: string
    * islandId: “demo-01”
    * grid.origin from player or fixed
    * grid.size 128×128 (default)
  - Keyboard: Shift+I to generate, Shift+K to clear.

----------------------------------------------------------------

## 10) Performance & Quality

- Keep mask and region assignment O(W×H).
- Use simple distance metric for Voronoi to avoid heavy libs.
- Batch commits in 32×32 or 64×64 tiles per microtask.
- Ensure Unique selection does not degenerate into O(n^2):
  - Maintain per-region recent-usage spatial map for distance checks.
- Memory: Reuse arrays where possible; avoid big object churn.

----------------------------------------------------------------

## 11) Debug & Tooling

- Optional overlay layer (development only):
  - Render seed positions and their rule labels (“All”, “Pure”, “Unique”).
  - Draw Voronoi edges (low opacity).
  - Show island mask as a faint heatmap.
- Log deterministic seed strings for repro:
  - seedString = `${config.seed}:${config.islandId}`.

Acceptance checks:
- The NW area clearly shows mixed “All” variety.
- The eastern rim has 5–7 uniform “Pure” subregions.
- The diagonal from SW→E shows distinct, non-repeating “Unique” patches.
- Re-running with the same seed reproduces identical output.

----------------------------------------------------------------

## 12) Example Config

    const demoConfig: IslandGenConfig = {
      seed: 'world-42',
      islandId: 'isle-A',
      mask: {
        radius: 58,
        noiseFrequency: 0.8,
        noiseAmplitude: 0.18,
        fbmOctaves: 3,
        shoreSoftness: 0.35,
      },
      layout: {
        allCount: 3,
        pureCount: 6,
        uniqueCount: 6,
        uniqueNoRepeatDistance: 5,
        relaxIterations: 1,
      },
      palette: {
        all: [
          { id: 'STONE_TERRAZZO', weight: 3 },
          { id: 'WOOD_OAK', weight: 2 },
          { id: 'CONCRETE_LIGHT', weight: 2 },
          { id: 'MARBLE_WHITE', weight: 1 },
        ],
        exotic: [
          { id: 'GLASS_FROSTED', rarity: 5 },
          { id: 'NEON_GRID', rarity: 4 },
          { id: 'LAVA_TILED', rarity: 3 },
        ],
        safeFallback: ['STONE_TERRAZZO', 'WOOD_OAK', 'CONCRETE_LIGHT'],
      },
      grid: {
        size: { width: 128, height: 128 },
        origin: { x: 0, z: 0 },
        yLevel: 0,
        chunkSize: 64,
      },
      debug: {
        emitOverlay: true,
        labelRegions: true,
      },
    };

----------------------------------------------------------------

## 13) Edge Cases

- Very small island radius: ensure a minimum of 3–4 regions exist; reduce counts proportionally.
- Palette exhaustion in UNIQUE: fallback to safeFallback with distance constraints; if impossible, allow minimal repetition.
- Pure region with a “bad” pick (e.g., visually noisy): allow config to constrain candidates for PURE (add `pureWhitelist?: FloorId[]`).
- Overlapping seeds collapsing into one Voronoi cell: on relax, push apart slightly.
- Mask holes near the rim: permit small holes; fill if they fragment regions excessively.

----------------------------------------------------------------

## 14) Deliverables

- `IslandGenerator.ts` with:
  - `generateIsland(config): IslandGenResult`
  - `generateIslandAndCommit(config): Promise<void>` (chunked store updates)
- Helper modules for RNG and Noise.
- Optional debug overlay component.
- A demo action wired to a dev-only control to generate at player’s current area.

----------------------------------------------------------------

## 15) Definition of Done

- Deterministic generation confirmed (same seed → same result).
- Visual inspection matches the diagram intent:
  - All cluster NW
  - Unique diagonal SW→E
  - Pure arc East
- Palettes applied per rule, constraints enforced.
- Generation time for 128×128 ≤ 40ms CPU (excluding store commits).
- No frame hitching when using chunked commit mode.
- Debug overlay shows seeds, mask, region boundaries correctly.

----------------------------------------------------------------

Use this prompt as the authoritative specification for the first implementation pass. Future iterations may add biome blending, multi-island archipelagos, and height layering.