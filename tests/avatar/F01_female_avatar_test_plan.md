# Test Plan: F01-FEMALE-AVATAR
Version: 1.0  
Feature ID: F01-FEMALE-AVATAR  
Document Role: Comprehensive validation strategy (unit + integration + perf + stress) for female avatar integration.

---

## 1. Scope

Introduce a selectable female avatar (`c-girl.glb`) with lazy-loaded animations, a runtime adapter, state machine orchestration, event + logging hooks, and fallbacks—without regressing performance or architectural cleanliness.

---

## 2. Objectives

Validate that:
1. Female avatar loads on demand, swaps in-place with male.
2. Animations (idle, talk, walk, emote) load lazily and blend correctly.
3. State machine transitions follow defined rules with baseline restoration.
4. Event emissions and logging semantics match contract.
5. Selection persists and survives rapid toggling (no race / leak).
6. Performance & memory budgets remain within KPIs.
7. Failure fallback reverts to male avatar gracefully.
8. Test harness provides deterministic mocks for animation/runtime.

---

## 3. Out of Scope

- AI decision logic / mood semantics.
- Networking / server authoritative sync.
- Full rendering correctness (visual QA manual).
- GPU driver-specific performance deep dives.

---

## 4. References

| Artifact | Purpose |
|----------|---------|
| Master Prompt Sections 2–15 | Acceptance & constraints |
| Source Models + Animations | `/public/models/*`, `/public/animations/*` |
| Runtime Adapter | `src/avatars/female/femaleRuntimeAdapter.ts` |
| State Machine | `src/avatars/state/avatarStateMachine.ts` |
| Event Bus | `src/avatars/events/avatarEvents.ts` |
| Logging | `src/avatars/logging/avatarLogger.ts` |
| Fallback Guard | `src/avatars/fallback/femaleFallbackGuard.ts` |
| Perf Probes | `src/avatars/perf/perfProbes.ts` |
| Selector Store/UI | `src/state/avatarSelectionStore.ts` |

---

## 5. Acceptance Criteria Traceability Matrix

| AC | Description (Condensed) | Test IDs |
|----|-------------------------|----------|
| AC1 | Switch updates active mesh w/out scene reload | INT-SWAP-001, STRESS-SWAP-020 |
| AC2 | Lazy animation load; no T-pose flash | ANI-LAZY-002, ANI-IDLE-READY-003 |
| AC3 | Required animation set present | REG-SET-001 |
| AC4 | State transitions ≤150ms perceived delay | FSM-LAT-001 |
| AC5 | Selection persists | UI-PERSIST-001 |
| AC6 | Emits `avatar:changed` event | EVT-CHG-001, UI-INTEG-002 |
| AC7 | Load timing + memory logs exist | LOG-PROBE-001 |
| AC8 | Store + selector + event unit stub | STORE-UNIT-001, UI-INTEG-002 |
| AC9 | Extendable animation registry (single file) | REG-EXT-001 |
| AC10 | Strict TS typing (no any) | TYPE-SCAN-001 |

---

## 6. KPI Validation Mapping

| KPI | Metric | Threshold | Test IDs |
|-----|--------|-----------|----------|
| KPI1 | Avatar switch latency | < 300ms | PERF-SWAP-001 |
| KPI2 | Idle animation first load | < 500ms cold | PERF-IDLE-001 |
| KPI3 | Memory footprint (model+core anims) | < 15MB | PERF-MEM-001 |
| KPI4 | CPU cost update/frame | < 2ms avg | PERF-FRAME-001 |
| KPI5 | Unhandled promise rejections | 0 | NEG-ERR-001 |
| KPI6 | Logging coverage lines | ≥6 scenario lines | LOG-COVER-001 |

---

## 7. Test Categories

1. Registry & Asset Integrity  
2. Runtime Adapter Unit  
3. State Machine Behavior  
4. UI & Store Integration  
5. Event & Logging Semantics  
6. Fallback / Failure Handling  
7. Performance & Stress  
8. Negative / Robustness  
9. Type & Lint Quality Gates  

---

## 8. Environment & Tooling

| Aspect | Details |
|--------|---------|
| Test Runner | Vitest / Jest-compatible |
| DOM Env | JSDOM for UI integration tests |
| 3D / Three.js | Mocks for AnimationMixer, AnimationClip, GLTFLoader |
| Timing Control | Fake timers for deterministic latency measurement |
| Performance Sampling | PerfProbe + manual timestamps |
| Memory Approx | Summation of mock geometry byte lengths (simulated) |

---

## 9. Mocks & Utilities

### 9.1 Mock Female Runtime (Unit Scope)
A lightweight implementation capturing `play`, `stop`, `dispose` calls.

```/dev/null/mockRuntime.ts#L1-40
export function createMockAvatarRuntime(): AvatarRuntimeHandle { /* stub - see plan */ }
```

Stores:
- playCalls: ordered list of animation IDs.
- stopCalls: ordered list of animation IDs.

Inspection via `getMockRuntimeInspection()`.

### 9.2 GLTFLoader Mock
- Returns a fake scene with skeleton bone names required for tests.
- Idle clip sized to 4s; walk 1.1s; dance 6.5s.

### 9.3 Animation Clip Factory (Engine Integration)
`createMockClip(name, duration)` returns consistent `THREE.AnimationClip`.

---

## 10. Detailed Test Cases

### 10.1 Registry & Asset

| ID | Title | Description | Expected |
|----|-------|-------------|----------|
| REG-SET-001 | Base animation IDs present | Validate `idle_1`, `talk_basic`, `walk_cycle`, `dance_emote` | All definitions found |
| REG-EXT-001 | Extend registry non-breaking | Add new entry -> earlier calls unchanged | No duplicate id error |
| ANI-LAZY-002 | Lazy loading semantics | Load not triggered until `loadFemaleAnimation` call | Network mock called once |
| ANI-IDLE-READY-003 | Idle warm baseline | Optional warm triggers only idle_1 | Cache contains only idle_1 |

### 10.2 Runtime Adapter

| ID | Title | Description | Expected |
|----|-------|-------------|----------|
| RT-LOAD-001 | Initial load sets mixer | After `load()` runtime.isReady() true | Scene & mixer defined |
| RT-PLAY-001 | Play cross-fade | Two sequential plays apply fade < configured | Actions transitioned |
| RT-DISPOSE-001 | Dispose lifecycle | After `dispose()` further play rejects | Error thrown |
| RT-CONCUR-001 | Concurrent load dedupe | Two parallel load() calls -> one GLTF fetch | Single loader invocation |
| RT-EMOTE-001 | Non-loop emote completion event | Play emote -> completion event fired | Event payload correct |

### 10.3 State Machine

| ID | Title | Description | Expected |
|----|-------|-------------|----------|
| FSM-IDLE-WALK-001 | IDLE->WALK->IDLE | onUserMove then onUserStop | Correct play sequence |
| FSM-TALK-001 | IDLE->TALK->IDLE | onTalkStart/onTalkEnd | Sequence matches config |
| FSM-EMOTE-STACK-001 | Baseline restoration | Trigger emote in WALKING -> restore WALKING | Final baseline= WALKING |
| FSM-EMOTE-RESTART-001 | Restart active emote | Fire second onEmoteTrigger while EMOTING | Emote clip restarts |
| FSM-LAT-001 | Transition latency | Measure start->play invocation | <150ms (mock timers) |

### 10.4 UI & Store

| ID | Title | Description | Expected |
|----|-------|-------------|----------|
| UI-PERSIST-001 | Persistence across reload | Set female, remount store | Value persists (localStorage) |
| UI-INTEG-002 | Event emission on toggle | Click toggles 2 times | 2 `avatar:changed` events |
| STORE-UNIT-001 | No duplicate events | Setting same avatar twice | Second no-op (no event) |
| UI-ARIA-001 | Accessibility roles | Component root radiogroup, buttons radio | ARIA attributes correct |

### 10.5 Events & Logging

| ID | Title | Description | Expected |
|----|-------|-------------|----------|
| EVT-CHG-001 | avatar:changed payload | Change selection | previous/next present |
| EVT-ANIM-START-001 | Animation start event | runtime.play() | `avatar:animation:started` fired |
| EVT-ANIM-COMP-001 | Animation completion event | Non-loop clip finish | `avatar:animation:completed` fired |
| LOG-COVER-001 | Logging coverage | Load, switch, play, error, perf sequence | ≥6 lines produced |
| LOG-PROBE-001 | Perf sample logged | start/end probe wrapper | Contains [PERF][AVATAR] |

### 10.6 Fallback / Failure

| ID | Title | Description | Expected |
|----|-------|-------------|----------|
| FB-TIMEOUT-001 | Load timeout triggers fallback | Force slow GLTF mock > timeout | runtime null; timeout flag true |
| FB-SKELETON-001 | Skeleton mismatch recoverable | Mock missing bone | fallback invoked |
| FB-NET-ERR-001 | Network error recoverable | Loader rejects | fallback invoked |
| FB-DISPOSE-LEAK-001 | Timeout disposal | Post-timeout load completes | Disposed & no events after |

### 10.7 Performance / Stress

| ID | Title | Description | Expected |
|----|-------|-------------|----------|
| PERF-IDLE-001 | Idle load cold | Time from load() start->first idle ready | <500ms (mock scaling) |
| PERF-SWAP-001 | Switch latency | Measure setAvatar to runtime ready | <300ms |
| PERF-FRAME-001 | Per-frame update cost | Simulate 600 frames; measure average | <2ms avg (mock) |
| PERF-MEM-001 | Memory estimate | Query VRAM heuristic | <15MB |
| STRESS-SWAP-020 | 20 rapid toggles | Alternating male/female | No leaks or unhandled rejections |
| STRESS-EMOTE-010 | Emote spam | 10 emote triggers sequentially | All complete events present |

### 10.8 Negative / Robustness

| ID | Title | Description | Expected |
|----|-------|-------------|----------|
| NEG-PLAY-NONEXIST-001 | Play unknown anim | runtime.play('bad') | Rejects AnimationNotFoundError |
| NEG-DOUBLE-DISPOSE-001 | Dispose twice | Call dispose() twice | No exception |
| NEG-ERR-001 | Promise rejection tracking | Global unhandled hook | Count = 0 |
| NEG-EMOTE-NOCONFIG-001 | Emote trigger w/out config | Remove fallback ID | Warning & no crash |

### 10.9 Typing & Quality

| ID | Title | Description | Expected |
|----|-------|-------------|----------|
| TYPE-SCAN-001 | No any usage in feature files | Static analysis | 0 matches (strict) |
| LINT-FEAT-001 | ESLint clean | Run lint | 0 errors |
| BUILD-TS-001 | TypeScript compile | tsc --noEmit | Success |

---

## 11. Test Data

| Data Element | Notes |
|--------------|-------|
| Animation IDs | 'idle_1','walk_cycle','talk_basic','dance_emote' |
| Avatar IDs | 'male-default','female-c-girl' |
| Emote Override | Provided by config (dance_emote) |
| Timeout (fallback) | 2500–5000 ms depending on test |

---

## 12. Execution Order (Suggested Pipeline)

1. Type & lint gate (TYPE-SCAN-001, LINT-FEAT-001, BUILD-TS-001)  
2. Registry + asset (REG-*, ANI-*)  
3. Runtime adapter (RT-*)  
4. State machine (FSM-*)  
5. Store/UI (STORE-*, UI-*)  
6. Events + logging (EVT-*, LOG-*)  
7. Fallback (FB-*)  
8. Negative / robustness (NEG-*)  
9. Performance & stress (PERF-*, STRESS-*)  

---

## 13. Tooling Hooks

- Global harness registers event listeners for counting transitions.
- Performance tests wrap critical sections: `const t = probe.start('label'); ... probe.end(t);`
- Memory test uses `summarizeFemaleAsset()` + counted geometry attributes (mocked).

---

## 14. Risk Mitigation via Tests

| Risk | Mitigating Test IDs |
|------|---------------------|
| Skeleton mismatch | FB-SKELETON-001 |
| Race on toggles | STRESS-SWAP-020, RT-CONCUR-001 |
| Animation bloat | ANI-LAZY-002, REG-EXT-001 |
| UI desync | UI-INTEG-002, STORE-UNIT-001 |
| Performance regression | PERF-* group |
| Memory leak after dispose | RT-DISPOSE-001, FB-TIMEOUT-001 |

---

## 15. Reporting & Metrics

Aggregate JSON after run:
```json
{
  "feature": "F01-FEMALE-AVATAR",
  "passed": <number>,
  "failed": <number>,
  "avgSwitchLatencyMs": <number>,
  "coldIdleLoadMs": <number>,
  "avgFrameCostMs": <number>,
  "memoryMB": <number>
}
```

---

## 16. Exit Criteria

- All AC-linked tests pass.
- All KPIs meet thresholds (no red).
- No unhandled promise rejections.
- No memory growth >5% in stress tests.
- Zero open high-severity defects.

---

## 17. Maintenance Notes

- Adding new animations: extend registry; only new test needed is presence + lazy load.
- Extending states: augment state machine matrix + add FSM-* tests.
- Introducing AI layer: new category separate (not modifying current tests except integration adjacency).

---

## 18. Appendix A: Mock Runtime Sketch

```/dev/null/mockRuntimeSketch.ts#L1-80
import type { AvatarRuntimeHandle, AvatarDebugInfo } from '../../src/avatars/female/femaleRuntimeAdapter';

interface MockRuntimeInspection {
  playCalls: string[];
  stopCalls: string[];
  disposed: boolean;
}

const inspection: MockRuntimeInspection = {
  playCalls: [],
  stopCalls: [],
  disposed: false,
};

export function createMockAvatarRuntime(): AvatarRuntimeHandle {
  return {
    id: 'female-c-girl',
    async load() { /* noop */ },
    async play(animId: string) {
      inspection.playCalls.push(animId);
    },
    stop(animId?: string) {
      inspection.stopCalls.push(animId ?? '<ALL>');
    },
    dispose() {
      inspection.disposed = true;
    },
    debug(): AvatarDebugInfo {
      return {
        activeAnimation: inspection.playCalls[inspection.playCalls.length - 1] ?? null,
        loadedAnimations: [...new Set(inspection.playCalls)],
        memoryEstimateKB: 1024,
      };
    },
  };
}

export function getMockRuntimeInspection(): MockRuntimeInspection {
  return { ...inspection, playCalls: [...inspection.playCalls], stopCalls: [...inspection.stopCalls] };
}

export function resetMockRuntimeInspection(): void {
  inspection.playCalls.length = 0;
  inspection.stopCalls.length = 0;
  inspection.disposed = false;
}
```

---

## 19. Appendix B: State Transition Truth Table (Baseline)

| Current | Event | Next | Animation |
|---------|-------|------|-----------|
| IDLE | onUserMove | WALKING | walk_cycle |
| WALKING | onUserStop | IDLE | idle_1 |
| IDLE | onTalkStart | TALKING | talk_basic |
| TALKING | onTalkEnd | IDLE | idle_1 |
| ANY | onEmoteTrigger | EMOTING | dance_emote |
| EMOTING Complete | (auto) | previous baseline | baseline anim |

---

## 20. Approval

| Role | Name | Status | Date |
|------|------|--------|------|
| Author | QA Engineer | Pending | TBD |
| Tech Lead | Avatar Subsystem Lead | Pending | TBD |
| PM | Feature Owner | Pending | TBD |

---

END OF TEST PLAN