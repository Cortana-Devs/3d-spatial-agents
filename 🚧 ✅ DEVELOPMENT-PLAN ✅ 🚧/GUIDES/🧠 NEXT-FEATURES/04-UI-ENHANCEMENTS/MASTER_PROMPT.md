# MASTER PROMPT: ADVANCED UI / UX ENHANCEMENTS & INTERACTIVE CONTROL LAYER
Version: 1.0  
Feature ID: F04-UI-ENHANCEMENTS
Authoring Mode: Systems UX Engineering / Interaction Architecture / Observability Design  
Primary Goal: Deliver a cohesive, high-performance, adaptive UI layer aligned with Engine-mediated simulation (F02), foundational data structures (F03), physics/collision feedback (F05–F06), memory insights (F07), multi-agent cognition (F08–F10), and future extensibility—while preserving clarity, aesthetic cohesion, accessibility, and low cognitive load for both human players and developer-operators.

------------------------------------------------------------
SECTION 1: ULTRA-COMPRESSED CONTEXT SNAPSHOT
------------------------------------------------------------
WORLD: 3D simulation with autonomous LLM-driven agents + player  
CURRENT UI: Ad hoc panels/components (sidebar, floating panels, basic controls)  
NEEDS: Unified interaction shell, modular panels, live telemetry surfaces, agent introspection, data structure metrics + memory + physics insights, avatar management, responsive layout, accessibility, theming, performance budgets  
NON-GOALS: Implementing core Engine logic, LLM reasoning, physics simulation, data structures (UI is consumer)  
TARGET QUALITIES: Legible | Reactive | Low-latency | Accessible | Extensible | Instrumented

------------------------------------------------------------
SECTION 2: CORE OBJECTIVES
------------------------------------------------------------
O1: Introduce a UI Shell (Layout Orchestrator) with dockable panels & dynamic regions (left nav, bottom console, right inspector).  
O2: Provide an Agent Control & Insight Panel (live plan, last actions, pressure state, memory summary).  
O3: Implement a Performance & Rate Dashboard (LLM usage, rate governor state, physics step time, collision counts).  
O4: Add Avatar / Simulation Control Palette (switch avatar, pause/resume ticks, time scaling).  
O5: Provide Unified Event Console (filterable, stream-slicing, structured categories).  
O6: Integrate Memory Viewer (episodic, semantic, persona diff) with search & redaction awareness.  
O7: Responsive & adaptive layout (desktop>tablet>narrow) with graceful collapse rules.  
O8: Theming & Design Tokens (dark/light + high contrast + scalable typography).  
O9: Accessibility baseline (WCAG AA contrast, keyboard nav, ARIA roles, focus order, reduced motion mode).  
O10: Micro-interaction patterns (state transitions, plan arrival, throttle bursts) with subtle haptic-style feedback (visual only).  
O11: Provide UI Telemetry hooks (FPS overlay, store mutation cost, React commit durations if feasible).  
O12: Export diagnostic snapshots as JSON from UI (agent state + system metrics + configuration digest).  

------------------------------------------------------------
SECTION 3: ACCEPTANCE CRITERIA
------------------------------------------------------------
AC1: Dockable panel layout persists across reload (localStorage or pluggable persistence).  
AC2: Event console supports filter by tag (e.g. [ENGINE], [LLM], [AGENT], [RATE], [PHYSICS], [COLLISION]) and time range slicing.  
AC3: Agent panel displays: strategyId, lastPlanId, actionCount, pressureState, memory lines, token usage sample.  
AC4: Rate dashboard reflects throttle/resume transitions in < 250ms from event emission.  
AC5: UI responsive breakpoints: ≥1280px (full multi-panel), 960–1279px (reduced side inspector), <960px (collapsible drawer pattern).  
AC6: Keyboard-only navigation can access all interactive controls; focus outline visible & consistent.  
AC7: Theming switch (light/dark/high-contrast) applies global tokens with no layout shift.  
AC8: Performance overlay shows: avgFrameMs, physicsStepMs, agentCycleMs, LLMLatencyAvg, ratePressure.  
AC9: Memory viewer supports search (case-insensitive) and toggled redaction mode (hide PII-like tokens with pattern match).  
AC10: No UI action triggers direct LLM or engine mutation bypassing central `Engine.request`.  
AC11: Console retains only last N events (configurable) with ring buffer; memory does not grow unbounded.  
AC12: All major panels lazy-loaded (code-split) to keep initial bundle within target budget (< X MB configurable).  

------------------------------------------------------------
SECTION 4: CONSTRAINTS
------------------------------------------------------------
C1: Pure UI layer must remain side-effect free except via Engine/store dispatch abstraction.  
C2: No ungoverned direct fetches to LLM or physics; use injection boundaries.  
C3: Avoid global mutable singletons outside state management patterns.  
C4: Maintain strict TypeScript (no `any` in public component props).  
C5: Avoid expensive re-renders (batched state selectors, memoization, virtualization).  
C6: Zero blocking synchronous loops > 10ms on main thread from UI logic.  
C7: Provide graceful degrade if a panel fails to load (error boundary).  

------------------------------------------------------------
SECTION 5: ARCHITECTURE LAYERS
------------------------------------------------------------
1. UI Shell & Layout Manager (grid + docking logic)  
2. Panel Registry (declarative metadata for dynamic mounting)  
3. Global State Bridge (selectors + event ingestion adapters)  
4. Event Stream Adapter (Engine event bus → UI ring buffer)  
5. Telemetry Collector (frame, memory, perf marks)  
6. Theming & Design Tokens (CSS vars or Tailwind tokens extension)  
7. Accessibility Layer (focus scope management, ARIA mapping)  
8. Console Subsystem (filtering, search, virtualization)  
9. Introspection & Export (JSON snapshot builder)  
10. Interaction Palette (quick command bar / shortcuts)  

------------------------------------------------------------
SECTION 6: DATA / TYPE SKETCH
------------------------------------------------------------
interface PanelDefinition {
  id: string
  title: string
  icon?: string
  regionPreferred: 'left' | 'right' | 'bottom' | 'floating'
  closable: boolean
  persistent: boolean
  lazyImport: () => Promise<React.ComponentType<any>>
  allowMultiple?: boolean
  minimumSize?: { w: number; h: number }
}

interface EventLogEntry {
  id: string
  t: number
  tag: string   // e.g. ENGINE | LLM | AGENT | RATE | PHYSICS | COLLISION | UI
  level: 'info' | 'warn' | 'error' | 'debug'
  payload: Record<string, unknown>
  text?: string
}

interface AgentInsightSnapshot {
  agentId: string
  strategyId: string
  lastPlanId?: string
  lastPlanHash?: string
  actionCount: number
  pressureState: string
  tokensIn?: number
  tokensOut?: number
  memoryPreview?: string[]
}

interface TelemetrySample {
  frame: number
  frameMs: number
  physicsStepMs?: number
  agentCycleMs?: number
  llmLatencyAvgMs?: number
  ratePressure?: string
}

interface UISnapshotExport {
  timestamp: number
  panels: string[]
  eventsRecent: EventLogEntry[]
  agents: AgentInsightSnapshot[]
  telemetryLast: TelemetrySample
  configDigest: string
  version: string
}

------------------------------------------------------------
SECTION 7: EVENT TAXONOMY (UI LEVEL)
------------------------------------------------------------
ui:panel:open { id }  
ui:panel:close { id }  
ui:panel:move { id, toRegion }  
ui:theme:changed { theme }  
ui:shortcut:triggered { key, actionId }  
ui:console:filter:update { filter }  
ui:snapshot:export { sizeBytes }  
ui:accessibility:focusRing { enabled }  
ui:perf:sample { frameMs, physicsMs, agentMs }  
ui:reaction:planFlash { agentId, planId }  

------------------------------------------------------------
SECTION 8: THEME & DESIGN TOKENS
------------------------------------------------------------
Core tokens (CSS vars / tailwind extension):
- Color palette: surface, surface-alt, surface-inset, brand-accent, accent-muted, border-strong, semantic-success|warn|error
- Typography scale: --font-xs ... --font-2xl (clamp-based responsive)
- Radius scale: --r-xs, --r-sm, --r-md, --r-lg
- Elevation: layered shadow tokens (--elevation-1..5)
- Motion: --transition-base (prefers-reduced-motion fallback)
- Spacing scale: --space-1..8
High Contrast Mode: Overwrite contrast-critical tokens; ensure min 4.5:1 body text contrast.

------------------------------------------------------------
SECTION 9: ACCESSIBILITY REQUIREMENTS
------------------------------------------------------------
A11Y1: All interactive elements reachable via Tab/Shift+Tab with logical order.  
A11Y2: Provide “Skip to Main” anchor at top for screen reader efficiency.  
A11Y3: Panel titles use semantic headings (h2/h3) with aria-label when truncated.  
A11Y4: Role mapping: region, navigation, complementary, status, log (for event console with aria-live="polite").  
A11Y5: Provide toggles: High Contrast, Reduced Motion, Dyslexia-friendly font fallback optional.  
A11Y6: Keyboard shortcuts documented in a “?” command palette overlay.  
A11Y7: Focus outline always visible; theme-safe color selection.  

------------------------------------------------------------
SECTION 10: PERFORMANCE BUDGETS
------------------------------------------------------------
Initial JS (UI-specific) budget: define target (e.g., ≤ 350KB gzip incremental beyond core engine).  
Panel lazy load: each heavy panel < 120KB gzip ideally.  
Re-render frequency: Key panels (console, agent insight) should batch updates to ≤ 10Hz when high event volume (buffer & flush).  
Virtualization: Event console uses windowing (only ~50 rows live).  
Telemetry sampling: Not more frequent than every 500ms (configurable) for UI overlay.  
Overhead: UI instrumentation under 1ms average CPU per frame.  

------------------------------------------------------------
SECTION 11: SUB-PROMPT GENERATION INDEX
------------------------------------------------------------
Create subordinate prompt folders & files:

1-layout-shell/
  PROMPT_LAYOUT_SHELL.md
2-panel-registry/
  PROMPT_PANEL_REGISTRY.md
3-event-stream-adapter/
  PROMPT_EVENT_STREAM_ADAPTER.md
4-console-view/
  PROMPT_CONSOLE_VIEW.md
5-agent-insight-panel/
  PROMPT_AGENT_INSIGHT_PANEL.md
6-rate-telemetry-panel/
  PROMPT_RATE_TELEMETRY_PANEL.md
7-avatar-control-palette/
  PROMPT_AVATAR_CONTROL_PALETTE.md
8-memory-viewer/
  PROMPT_MEMORY_VIEWER.md
9-performance-overlay/
  PROMPT_PERFORMANCE_OVERLAY.md
10-theme-tokens/
  PROMPT_THEME_TOKENS.md
11-accessibility-framework/
  PROMPT_ACCESSIBILITY_FRAMEWORK.md
12-shortcuts-command-palette/
  PROMPT_SHORTCUTS_COMMAND_PALETTE.md
13-state-optimization/
  PROMPT_STATE_OPTIMIZATION.md
14-event-console-virtualization/
  PROMPT_EVENT_CONSOLE_VIRTUALIZATION.md
15-snapshot-export/
  PROMPT_SNAPSHOT_EXPORT.md
16-error-boundaries/
  PROMPT_ERROR_BOUNDARIES.md
17-panel-persistence/
  PROMPT_PANEL_PERSISTENCE.md
18-telemetry-collector/
  PROMPT_TELEMETRY_COLLECTOR.md
19-test-strategy-ui/
  PROMPT_TEST_STRATEGY_UI.md
20-observability-hooks/
  PROMPT_OBSERVABILITY_HOOKS.md

------------------------------------------------------------
SECTION 12: SUB-PROMPT TEMPLATE
------------------------------------------------------------
"""
Feature: F04-UI-ENHANCEMENTS
Sub-Task: <NAME>
Context:
Need <specific UI subsystem / component> to align with unified simulation governance and UX standards.

Objective:
<One measurable outcome statement>

Constraints:
- Strong TypeScript props (no any)
- Accessibility baseline (focus, aria, contrast)
- Performance budget adherence
- Lazy loading if heavy
- State isolation & memoization
- Deterministic event ordering where relevant

Inputs / References:
- Engine event bus adapter
- Panel registry API
- Theme tokens (if styling)
- Telemetry interfaces (if needed)

Output:
<Exact file path(s) & exported symbols>

Validation:
- <3–7 bullet acceptance checks>
- Include at least one negative/error or fallback scenario
- Performance or a11y assertion where applicable

Non-goals:
- Direct LLM calls
- Core engine mutation logic (use provided request API)
- Physics math
"""

------------------------------------------------------------
SECTION 13: SAMPLE SUB-PROMPT (PERFORMANCE OVERLAY)
------------------------------------------------------------
"""
Feature: F04-UI-ENHANCEMENTS
Sub-Task: Performance Overlay
Context:
Need a lightweight overlay showing frame timing, physics step ms, agent cycle latency, LLM average latency, rate pressure.

Objective:
Implement <PerformanceOverlay /> component with adaptive sampling & minimal overhead (<0.3ms average).

Constraints:
- Avoid causing layout shift
- Use requestAnimationFrame batching
- Respect reduced motion (no pulsing animations when preference set)
- Tooltip or detail expansion on hover

Output:
File: src/ui/performance/PerformanceOverlay.tsx
Exports: PerformanceOverlay component, usePerformanceOverlay hook

Validation:
- Displays live numbers updating (mockable)
- Sampling interval configurable (default 1000ms)
- Hidden state removes listeners
- When reduced motion active => no animated transitions
Non-goals:
- Persisting historical charts
- Server-side rendering
"""

------------------------------------------------------------
SECTION 14: EVENT CONSOLE FUNCTIONAL SPEC (HIGHLIGHT)
------------------------------------------------------------
- Filter expression syntax: tag:AGENT level:error text:"throttle"
- Debounced search (300ms)
- Color-coded tags
- Structured row expansion (JSON viewer)
- Export subset (filtered) as JSON
- Pause/resume stream
- Buffer capacity setting (default 1000 entries)
- Virtualized list with consistent row height; variable height expansion on demand

------------------------------------------------------------
SECTION 15: RISK & MITIGATION
------------------------------------------------------------
R1: Event flood causing UI jank → batching + virtualization + priority filtering.  
R2: Cognitive overload (too many panels) → default minimal layout + progressive disclosure.  
R3: Inconsistent design language → centralized tokens + shared component primitives.  
R4: A11y regressions on new panels → a11y checklist enforced per sub-prompt.  
R5: Memory blow-up in logs → bounded ring buffer & trimming policy.  
R6: Race in panel persistence restore → hydration sequencing + safe defaults.  
R7: Performance overlay influencing frame cost → passive sampling & disable when not visible.  

------------------------------------------------------------
SECTION 16: TEST STRATEGY
------------------------------------------------------------
Unit:
- Panel registry (duplicate ID rejection)
- Event console filtering parser
- Theme token resolver
- Snapshot export structure
Integration:
- Simulated high-volume events (5k) → UI still responsive (no blocking > 50ms)
- Accessibility: tab order test, ARIA roles presence
- Responsive breakpoints snapshot (visual regression harness)
Performance:
- Measure overlay cost with dev instrumentation (target <0.3ms)
- Render baseline diff pre/post feature (budget enforcement)
A11y:
- Axe / testing-library checks (no critical violations)
Failure:
- Panel load error triggers fallback boundary component & logs
Determinism:
- Same event injection order yields identical filtered ordering output hash (excluding timestamps)

------------------------------------------------------------
SECTION 17: QUALITY GATES
------------------------------------------------------------
QG1: TypeScript strict passes with zero implicit any.  
QG2: Lighthouse accessibility score ≥ 90 (UI subset).  
QG3: Console virtualization validated under 5k event dataset.  
QG4: No panel adds >10% bundle delta beyond documented thresholds.  
QG5: Snapshot export passes schema validation.  
QG6: Keyboard navigation fully traverses interactive controls (automated test).  
QG7: Dark/light/high-contrast themes maintain required contrast ratios.  

------------------------------------------------------------
SECTION 18: EXECUTION ORDER (MICRO-STEPS)
------------------------------------------------------------
S1: Panel registry + layout shell scaffolding  
S2: Event stream adapter + ring buffer  
S3: Console panel (basic) + virtualization  
S4: Theme tokens & theming switcher  
S5: Agent insight & rate telemetry panels  
S6: Performance overlay + telemetry collector integration  
S7: Avatar control + command palette (shortcuts)  
S8: Memory viewer (episodic + semantic) + redaction layer  
S9: Snapshot export + diagnostics endpoint bridging  
S10: Accessibility refinements & keyboard traversal matrix  
S11: Optimization pass (memoization, splitting)  
S12: Test harness & performance verification  

------------------------------------------------------------
SECTION 19: METRICS & OBSERVABILITY
------------------------------------------------------------
UI Logging Tags:
[UI][PANEL][OPEN]
[UI][PANEL][CLOSE]
[UI][EVENT][FILTER]
[UI][SNAPSHOT][EXPORT]
[UI][PERF][SAMPLE]
[UI][A11Y][VIOLATION]
[UI][THEME][CHANGE]
[UI][AGENT][FLASH]
Telemetry Exposed (JSON): /debug/ui (optional)  
Data: activePanels[], fpsAvg, frameMsAvg, eventBufferSize, lastExportSize, memory (approx via performance API).  

------------------------------------------------------------
SECTION 20: INTEGRATION WITH EXISTING FEATURES
------------------------------------------------------------
F02 Engine: Consumes event stream; never mutates Engine state directly except via `Engine.request` wrappers.  
F03 Data Structures: Displays ring buffer occupancy, priority queue sizes, spatial index metrics.  
F05–F06 Physics/Collision: Shows contact counts, grounded status, collision pairs (optional detail panel).  
F07 Memory: Visualizes episodic/semantic counts, retrieval latency, summarization status.  
F08–F10 LLM & Behavior: Displays plan, reasoning metrics, rate pressure.  
F09 Rate Governor: Visualizes throttle stages, adaptive scaling factors.  
F01 Avatars: Avatar switch triggers UI event & state reflect.

------------------------------------------------------------
SECTION 21: CONFIG & ENV SUGGESTIONS
------------------------------------------------------------
UI_EVENT_BUFFER=1000  
UI_CONSOLE_FILTER_DEFAULT=level!=debug  
UI_THEME_DEFAULT=dark  
UI_ENABLE_PERF_OVERLAY=1  
UI_SNAPSHOT_MAX_EVENTS=250  
UI_PANEL_PERSIST_KEY=ui_layout_v1  
UI_REDUCED_MOTION=auto|force_on|force_off  
UI_HIGH_CONTRAST=0|1  

------------------------------------------------------------
SECTION 22: SUB-PROMPT GENERATION INSTRUCTIONS (META)
------------------------------------------------------------
1. Use Section 12 template for each sub-prompt.  
2. Generate exactly 20 sub-prompts (Section 11 index).  
3. Each ≤ 220 lines.  
4. Explicit file paths & exports mandatory.  
5. Include at least one negative/fallback validation bullet.  
6. Produce INDEX.md summarizing all sub-prompts + artifact list.  
Validation After Generation:
- COUNT=20
- Every prompt contains Feature ID
- Each has Objective, Constraints, Validation, Non-goals
- INDEX enumerates outputs & trigger phrase

------------------------------------------------------------
SECTION 23: EXECUTION TRIGGER PHRASE
------------------------------------------------------------
"GENERATE_F04_SUB_PROMPTS_v1"

------------------------------------------------------------
SECTION 24: FINAL MASTER OBJECTIVE (CONDENSED)
------------------------------------------------------------
DELIVER a unified, accessible, performant, extensible UI infrastructure with dockable panels, adaptive telemetry visualization, agent insight surfaces, event filtering, system introspection, memory exploration, and robust theming—fully mediated by Engine requests & event streams—while preserving deterministic behavior under identical event sequences and staying within strict performance & accessibility budgets.

END OF MASTER PROMPT