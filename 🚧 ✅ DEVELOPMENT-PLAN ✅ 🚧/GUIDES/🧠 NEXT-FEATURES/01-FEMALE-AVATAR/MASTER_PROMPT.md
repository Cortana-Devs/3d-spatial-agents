# MASTER PROMPT: FEMALE AVATAR INTEGRATION & PRESENTATION PIPELINE
Version: 1.0
Feature ID: F01-FEMALE-AVATAR
Authoring Mode: Systems / Runtime / Asset Pipeline Engineering
Primary Goal: Introduce fully selectable, performant female simulant avatar (c-girl.glb) with modular animation loading, UI toggle, state-driven animation blending, and future AI control readiness.

------------------------------------------------------------
SECTION 1: ULTRA-COMPRESSED CONTEXT SNAPSHOT
------------------------------------------------------------
PROJECT_KIND=3D_WEB_SIM_WORLD
ENGINE_GOAL=Centralized authority controlling entity requests
CURRENT_MODELS=male(player-ready-player-me.glb)
NEW_MODEL=c-girl.glb
ANIM_SRC=public/animations/(F_* + future female subset)
FEMALE_ANIM_TARGET_DIR=public/animations/female
RUNTIME_STACK=React + (likely) three-fiber + TS
DESIRED UX: Left side menu toggle male/female; persists; triggers avatar replacement live; sets up for AI agent binding.

------------------------------------------------------------
SECTION 2: CORE OBJECTIVES
------------------------------------------------------------
O1: Import & register female model (lazy loaded).
O2: Curate minimal initial animation set (Idle, Talk, Walk, Emote/Dance).
O3: Provide animation library map with semantic categories.
O4: Implement AvatarSelector UI (male|female) + persistence (localStorage or global store).
O5: Implement animation state machine with blending (Idle->Walk->Emote, Idle->Talk).
O6: Provide instrumentation hooks for future AI control (e.g. setExpression, playGesture).
O7: Maintain performance budget (≤ 2ms avg update cost, no >1MB additional initial bundle).
O8: Provide test plan & validation prompts for QA + integration with Engine events (avatar:changed).

------------------------------------------------------------
SECTION 3: ACCEPTANCE CRITERIA
------------------------------------------------------------
AC1: Switching avatars updates active mesh without full scene reload.
AC2: Animations load lazily (code-splitting) & play smoothly (no T-pose flash).
AC3: At least: 1 idle variation, 1 talk/gesticulation, 1 walk or locomotion, 1 dance/emote.
AC4: Avatar state transitions do not exceed 150ms perceived delay from trigger.
AC5: Avatar selection persists across refresh.
AC6: Emission of event 'avatar:changed' (payload: { previous, next, timestamp }).
AC7: Logging for animation load timings & memory footprint.
AC8: Unit/dev test stub verifying store + selector + event emission.
AC9: Animation map easily extendable (single file registry).
AC10: All code typed with strict TS; no any.

------------------------------------------------------------
SECTION 4: CONSTRAINTS
------------------------------------------------------------
C1: NO direct AI logic here—only hooks for future agent control.
C2: NO blocking synchronous GLTF processing on main thread if large (consider async/Promise).
C3: DO NOT inflate initial JS bundle >10% baseline: use dynamic import() for model + animations.
C4: Uniform interface for future multi-avatar variations.
C5: Avoid hard-coded absolute paths—centralize paths in a config.
C6: Provide fallback if female asset fails to load (revert to male + toast/log).
C7: All asset references must be relative and validated at runtime once.

------------------------------------------------------------
SECTION 5: DOMAIN DATA SCHEMA (PROPOSED)
------------------------------------------------------------
type AvatarId = 'male-default' | 'female-c-girl'
type AnimationCategory = 'idle' | 'talk' | 'walk' | 'emote' | 'system'
interface AnimationDef {
  id: string
  path: string
  category: AnimationCategory
  loop: boolean
  approximateDuration?: number
  lazy: boolean
}
interface AvatarDefinition {
  id: AvatarId
  modelPath: string
  skeletonProfile: string
  defaultAnimations: {
    idle: string
    walk?: string
    talk?: string
    emote?: string
  }
  extra?: Record<string, string>
}
interface AvatarRuntimeHandle {
  id: AvatarId
  load(): Promise<void>
  play(animId: string, opts?: { fadeMs?: number; loopOverride?: boolean })
  stop(animId?: string)
  dispose(): void
  setMood?(mood: string)
  debug(): AvatarDebugInfo
}
interface AvatarDebugInfo {
  activeAnimation: string | null
  loadedAnimations: string[]
  memoryEstimateKB?: number
}

------------------------------------------------------------
SECTION 6: STATE MACHINE (INITIAL)
------------------------------------------------------------
States: IDLE, WALKING, TALKING, EMOTING
Events: onUserMove, onUserStop, onTalkStart, onTalkEnd, onEmoteTrigger
Transitions:
- IDLE -> WALKING (onUserMove)
- WALKING -> IDLE (onUserStop)
- IDLE -> TALKING (onTalkStart)
- TALKING -> IDLE (onTalkEnd)
- ANY -> EMOTING (onEmoteTrigger) -> returns to previous baseline (IDLE or WALKING)
Blending: cross-fade default 250ms (configurable via ANIM_BLEND_MS env or constant)

------------------------------------------------------------
SECTION 7: SUB-PROMPT GENERATION INDEX
------------------------------------------------------------
Generate the following subordinate prompt folders & individual prompt files:

1-asset-normalization/
  - PROMPT_ASSET_NORMALIZATION.md
2-animation-registry/
  - PROMPT_ANIMATION_REGISTRY.md
3-selector-ui/
  - PROMPT_SELECTOR_UI.md
4-runtime-adapter/
  - PROMPT_RUNTIME_ADAPTER.md
5-state-machine/
  - PROMPT_STATE_MACHINE.md
6-performance-profiling/
  - PROMPT_PERF_PROFILING.md
7-logging-telemetry/
  - PROMPT_LOGGING_TELEMETRY.md
8-failure-fallback/
  - PROMPT_FAILURE_FALLBACK.md
9-test-plan/
  - PROMPT_TEST_PLAN.md
10-integration-hooks/
  - PROMPT_INTEGRATION_HOOKS.md
11-ui-integration-test/
  - PROMPT_UI_INTEGRATION_TEST.md
12-engine-integration-test/
  - PROMPT_ENGINE_INTEGRATION_TEST.md

Each subordinate prompt MUST:
- Reuse the MASTER TEMPLATE (Section 11).
- Reference feature ID.
- Define Output Artifacts precisely.
- Include mini acceptance tests.

------------------------------------------------------------
SECTION 8: KPIs / METRICS
------------------------------------------------------------
KPI1: Avatar switch latency (ms) < 300
KPI2: Animation load time (first idle) < 500ms on cold
KPI3: Memory footprint (mesh + core animations) < 15MB
KPI4: CPU cost (per frame) < 2ms average on mid-tier laptop
KPI5: Zero unhandled promise rejections during avatar swap
KPI6: Logging coverage—≥ 1 line for load start, success, failure, disposal

------------------------------------------------------------
SECTION 9: RISK TABLE (CONDENSED)
------------------------------------------------------------
R1: Skeleton mismatch causing retarget failure -> Mitigation: introspect bone names & assert
R2: Animation bloat -> On-demand lazy map; only load first idle eagerly
R3: Race condition on rapid avatar toggles -> Use swap token / generation id
R4: UI store desync -> Single source of truth store slice + effect verifying active runtime
R5: Performance degrade -> Provide on-demand dispose()

------------------------------------------------------------
SECTION 10: IMPLEMENTATION ORDER (MICRO-STEPS)
------------------------------------------------------------
S1: Define avatar constants + config file.
S2: Build animation registry placeholder (no loads).
S3: Implement dynamic model loader (female).
S4: Hook skeleton compatibility check.
S5: Create runtime adapter implementing AvatarRuntimeHandle.
S6: Add UI selector + persistence.
S7: Implement animation loading & state machine.
S8: Add logging + metrics stamps.
S9: Add test harness (mock timing).
S10: Stress test with rapid toggle loop (≥20 toggles) ensure no leak.

------------------------------------------------------------
SECTION 11: MASTER SUB-PROMPT TEMPLATE
------------------------------------------------------------
"""
Feature: F01-FEMALE-AVATAR
Sub-Task: <SUBTASK_NAME>
Context:
Current codebase supports only male avatar; need to extend to female with modular architecture.

Objective:
<One measurable sentence>

Constraints:
- Strong TypeScript typing
- Lazy load assets
- No global mutable state outside store
- Provide debug() entry point
- Performance budget awareness

Inputs / References:
- Model: /public/models/c-girl.glb
- Source animations: /public/animations/F_*.glb
- Target registry path: <proposed path>

Output:
<List exact files & exported symbols to produce>

Validation:
- <3–6 bullet acceptance tests>

Non-goals:
- AI decision logic
- Networking
- LLM calls
"""

------------------------------------------------------------
SECTION 12: SAMPLE GENERATED SUB-PROMPT (ANIMATION REGISTRY)
------------------------------------------------------------
"""
Feature: F01-FEMALE-AVATAR
Sub-Task: Animation Registry
Context:
Need a centralized animation mapping for female avatar with categories (idle, talk, walk, emote) & lazy load support.

Objective:
Produce a TypeScript module exporting ANIMATION_REGISTRY_FEMALE + a loadAnimation(id) function that returns a Promise<AnimationClip> and caches results.

Constraints:
- Must not preload all animations
- Provide type AnimationDef[]
- Fail gracefully if animation missing with custom error class AnimationNotFoundError
- Provide getCategoryAnimations(category) helper

Output:
File: src/avatars/female/animationRegistry.ts
Exports:
- FEMALE_ANIMATIONS: AnimationDef[]
- loadFemaleAnimation(id: string): Promise<AnimationClip>
- getFemaleAnimationsByCategory(c: AnimationCategory): AnimationDef[]

Validation:
- Contains at least idle_1, talk_basic, walk_cycle, dance_emote
- Duplicate ids rejected at module init (throw)
- loadFemaleAnimation('idle_1') resolves
- loadFemaleAnimation('bad_id') throws AnimationNotFoundError
Non-goals:
- Playing / blending logic
"""

------------------------------------------------------------
SECTION 13: EVENT & LOGGING LEXICON
------------------------------------------------------------
Events Emitted:
- avatar:changed
- avatar:animation:started
- avatar:animation:completed
- avatar:animation:error
- avatar:load:start
- avatar:load:success
- avatar:load:failure

Log Tags:
[AVATAR][LOAD], [AVATAR][SWITCH], [ANIM][PLAY], [ANIM][ERROR], [PERF][AVATAR]

------------------------------------------------------------
SECTION 14: ENV / CONFIG KEYS (IF NEEDED)
------------------------------------------------------------
AVATAR_ANIM_BLEND_MS=250
AVATAR_DEBUG=0|1
AVATAR_PREF_KEY=selectedAvatar

------------------------------------------------------------
SECTION 15: QUALITY GATES
------------------------------------------------------------
QG1: Lint & Type Check passes
QG2: No unreferenced assets in female registry
QG3: Swap stress test completes without memory growth > 5%
QG4: All acceptance criteria satisfied

------------------------------------------------------------
SECTION 16: SUB-PROMPT GENERATION INSTRUCTIONS (META)
------------------------------------------------------------
Procedure:
1. Read this MASTER_PROMPT
2. For each folder enumerated in Section 7, instantiate a sub-prompt using Section 11 template
3. Include EXACT file targets & exported symbol names
4. Include at least 4 validation bullets referencing runtime behavior
5. Keep each sub-prompt ≤ 250 lines
6. After generation, produce an index file summarizing all sub-prompts (INDEX.md)

Output Validation for Generation Process:
- COUNT(sub-prompts) = 12
- All sub-prompts mention Feature ID
- No empty Objective fields
- No missing Validation section

------------------------------------------------------------
SECTION 17: EXECUTION TRIGGER PHRASE
------------------------------------------------------------
When ready to generate subordinate prompts use command phrase (for internal orchestration):
"GENERATE_F01_SUB_PROMPTS_v1"

------------------------------------------------------------
SECTION 18: FINAL MASTER OBJECTIVE (CONDENSED FOR AGENT)
------------------------------------------------------------
DELIVER a modular female avatar integration providing selectable model, lazy animation map, robust runtime adapter, efficient state transitions, telemetry, and future AI control readiness—without regressing performance or architecture cleanliness.

END OF MASTER PROMPT