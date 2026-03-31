# Agent performance report

Structured baseline vs. after comparison for agent-related CPU (navigation, perception, heatmap, steering).

## Environment (fill when profiling)

| Field | Value |
|--------|--------|
| Date | |
| Browser / OS | |
| GPU (optional) | |
| Scene / `SCENE_WORLD_MODE` | |
| Deployed agent count | |
| `collidableMeshes.length` (log once at runtime) | |

## Method

1. Open the app with **`?agentPerf=1`** to log once per second: InterestMap `update` time, total/average `useAgentBrain` `useFrame` time (sum across agents), and ray counts (wall / ground / LoS).
2. Chrome DevTools → **Performance** → record 5–10 s of steady gameplay (agents moving, player idle or walking).
3. Note **FPS**, **Main** thread **p50 / p95** frame time (ms), and any **long tasks** (>50 ms).

## Hotspot table (baseline — fill from profiler)

| Rank | Subsystem | Cost driver | Evidence | File(s) |
|------|-----------|-------------|----------|---------|
| 1 | | | | |
| 2 | | | | |

## Changes implemented (code — 2026)

| Area | Change | Expected impact |
|------|--------|-------------------|
| InterestMap | Sparse decay: only cells touched by `addHeat` are decayed each frame | Removes O(10k) full-grid scan per frame |
| SensorySystem | Max 10 LoS raycasts per agent per update; prioritize PLAYER, then AGENT, then OBJECT by distance | Caps worst-case `intersectObjects` from vision |
| Proxemics + crowd | Single pass over `aiManager.vehicles` for crowd count and lateral push | Halves vehicle iteration vs. two loops |
| Proxemics | Skip lateral accumulation when speed &lt; 0.1 (unchanged behavior) | Minor savings when idle |
| useAgentBrain | One `getNearby(30)`; drive floor-item count derived within 15 m | Fewer registry queries |
| useAgentBrain | Ground ray skipped on alternate frames if XZ moved &lt; 0.15 m from last sample | Up to ~50% fewer ground raycasts when stable |
| useAgentBrain | Zone influence uses `zoneSamplePosRef` instead of `vPos.clone()` | Fewer allocations per idle frame |
| Dev | `src/debug/agentPerformanceProbe.ts` + `?agentPerf=1` | Repeatable console aggregates |

## After (remeasure — fill after local profile)

Run the app with `?agentPerf=1`, play for ~30s, note the rolling `console.table` (especially `interestMap_update_ms` trending toward **0** when no heat, and `los_rays` bounded by **10 × agents** when idle).

| Metric | Baseline | After (expected vs. prior code review) |
|--------|----------|----------------------------------------|
| p50 frame time (ms) | _(profile)_ | Lower when many agents idle (sparse heat decay, LoS cap, one `getNearby`) |
| p95 frame time (ms) | _(profile)_ | Fewer spikes from 10k heat loop + unbounded LoS |
| FPS (approx.) | _(profile)_ | — |
| `agentPerf` avg `useFrame` / agent (ms) | _(probe)_ | — |
| `interestMap_update_ms` / s (from probe) | ~full grid cost every frame | ~0 when `activeIndices` empty; else O(active) |

**Post-implementation (code):** optimizations landed 2026 — re-run Chrome Performance to paste numeric **After** above.

## Notes

- YUKA `SeparationBehavior` still iterates all vehicles per agent; further gains would need spatial partitioning (out of current scope).
- Pathfinding remains on the worker; main-thread cost is mostly raycasts, perception, and game store reads.
