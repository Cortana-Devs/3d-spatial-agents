# 3D Spatial Agents — The Research Facility

> AI-native 3D simulation framework embedding LLM-driven autonomous agents inside a physically navigable virtual research facility.
> **Stack**: Next.js 16 · React 19 · React Three Fiber · Yuka.js · Zustand · Groq (Llama 3.1 8B) · IndexedDB · eSpeak/Piper TTS

---

## 1. Project Overview

The Research Facility is a real-time 3D multi-agent simulation where autonomous virtual agents — powered by large language models — coexist in a shared circular research complex. Each agent perceives its environment through raycasted line-of-sight, maintains episodic and semantic memory, develops internal motivation through a drive system, and takes actions via LLM function-calling. A human player navigates the same space in third-person, interacting with agents and the world through physics, chat, voice, and a task assignment system.

### Design Philosophy

- **Apple-inspired aesthetic**: Clean glass surfaces, premium materials, dynamic UI overlays
- **Dual-layer cognition**: Fast per-frame utility evaluation + slow episodic LLM reasoning
- **Emergent behavior**: No scripted behaviors — agents act from personality, drives, and perception
- **Research-grade observability**: Full cognitive dashboards, tick snapshots, and performance probes

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Next.js App Shell                            │
│  src/app/layout.tsx → page.tsx → Scene.tsx (R3F Canvas)             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │  Player      │  │  Agent (×N)  │  │  World                   │   │
│  │  Controller  │  │  Brain Loop  │  │  Builder + Facility      │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────────┘   │
│         │                 │                      │                   │
│  ┌──────▼─────────────────▼──────────────────────▼───────────────┐   │
│  │                    Systems Layer                               │   │
│  │  AgentTaskQueue · ClientBrain · NavigationNetwork              │   │
│  │  InteractableRegistry · ZoneInfluence · POIRegistry            │   │
│  │  AIManager · InterAgentComms · IdleExplorer · ProxemicsSystem  │   │
│  └──────┬────────────────────────────────────────────────────────┘   │
│         │                                                           │
│  ┌──────▼────────────────────────────────────────────────────────┐   │
│  │                    Library Layer                               │   │
│  │  agent-brain.ts (prompt) · agent-tools.ts (tool defs)         │   │
│  │  UtilityBrain · SensorySystem · DriveManager · NLP Parser     │   │
│  │  Memory: MemoryStream · KnowledgeGraph · ConversationMemory   │   │
│  │  Audio: useAudioController · Piper/eSpeak/Kokoro TTS Workers  │   │
│  └──────┬────────────────────────────────────────────────────────┘   │
│         │                                                           │
│  ┌──────▼────────────────────────────────────────────────────────┐   │
│  │                    State Layer (Zustand)                       │   │
│  │  gameStore · agentStore · chatStore · uiStore · worldStore    │   │
│  │  worldTaskStore · podStore · settingsStore · InterestMap       │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │                    UI / HUD Layer                              │   │
│  │  Overlay · GameMenu · ResearchDashboard · CommandBar           │   │
│  │  ThoughtBubble · Minimap · StatusBar · AgentChatPanel          │   │
│  │  AgentInteractionPanel · TaskAssignmentPanel · InspectorPanel  │   │
│  └───────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Directory Structure

### `src/app/` — Next.js App Router

| File            | Purpose                                                                                       |
| --------------- | --------------------------------------------------------------------------------------------- |
| `page.tsx`    | Root page, mounts the 3D scene                                                                |
| `layout.tsx`  | Root layout with metadata                                                                     |
| `actions.ts`  | Server Actions:`generateAgentThought()`, `generateReflection()` — proxies Groq API calls |
| `globals.css` | Global styles                                                                                 |
| `api/audio/`  | Audio API routes (TTS streaming)                                                              |
| `api/logs/`   | Simulation logging endpoint                                                                   |

### `src/components/` — React Components (Rendering & HUD)

#### `src/components/agent/` — Agent Visual & Brain

| File                     | Size    | Purpose                                                                                                                                                                                                                                                                                                   |
| ------------------------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Agent.tsx`            | 19.6 KB | Main agent component: 3D mesh, IK skeleton, speech bubbles, proximity detection. Renders visual variations per agent ID (ties for agent-03, dark suits for agent-04)                                                                                                                                      |
| `useAgentBrain.ts`     | 70 KB   | **Master simulation loop** — the single most critical file. Per-frame orchestration: polls SensorySystem, evaluates UtilityBrain, manages ClientBrain LLM calls, resolves AgentTaskQueue, drives procedural IK gait, handles proximity chat, coordinates InterAgentComms, and manages voice output |
| `useAgentVehicle.ts`   | 3.2 KB  | Yuka.js Vehicle entity setup and steering behaviors                                                                                                                                                                                                                                                       |
| `useProceduralGait.ts` | 25 KB   | Procedural IK animation system for walking, sitting, leaning, and emoting                                                                                                                                                                                                                                 |

#### `src/components/core/` — Scene Infrastructure

| File                    | Purpose                                                          |
| ----------------------- | ---------------------------------------------------------------- |
| `Scene.tsx`           | R3F Canvas setup: physics, lighting, camera rig, post-processing |
| `ScenarioManager.tsx` | Research evaluation scenario loader                              |
| `DebugCrosshair.tsx`  | Dev-mode crosshair and interaction target display                |
| `YukaSystem.tsx`      | Yuka.js entity manager integration with R3F                      |
| `FPSMonitor.tsx`      | Frame rate overlay                                               |

#### `src/components/player/` — First/Third-Person Controller

| File                       | Purpose                                                                                                               |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `Player.tsx`             | Player mesh, camera attachment, collision body                                                                        |
| `usePlayerController.ts` | 34 KB — WASD movement, mouse look, sprint, jump, item pickup/placement, interaction raycasting, inventory management |

#### `src/components/world/` — 3D Environment

| File                 | Purpose                                                                                                        |
| -------------------- | -------------------------------------------------------------------------------------------------------------- |
| `WorldBuilder.tsx` | Top-level world assembly: spawns floor, walls, furniture, terrain                                              |
| `OfficeHub.tsx`    | 54 KB — Primary interior environment: desks, cupboards, storage, benches, equipment, and interactable objects |
| `CenterGarden.tsx` | Central zen garden with koi pond, arowana, waterfall, bridge, and vegetation                                   |
| `Terrain.tsx`      | External terrain, hills, and outdoor environment                                                               |
| `LabFloor.tsx`     | Circular lab floor with ring geometry                                                                          |
| `Elevator.tsx`     | Elevator shaft geometry                                                                                        |

#### `src/components/world/facility/` — Facility-Specific Assets

| File                         | Purpose                                                                                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FacilityLabFurniture.tsx` | 31 KB — Service counters (Bank Teller, Insurance Officer desks), modular desk assemblies, and furniture placement. Defines `ServiceCounter` zones |
| `FacilityLabWorld.tsx`     | Facility lab world wrapper and zone registration                                                                                                     |
| `FacilityCenterPark.tsx`   | 28 KB — Central park: pond geometry, fish AI, dock, flora, waterfall particle system                                                                |
| `FacilityWalls.tsx`        | Curved glass walls and structural elements                                                                                                           |
| `FacilityObstacles.ts`     | Navigation obstacle definitions for wall/furniture collision avoidance                                                                               |
| `FacilityMaterials.ts`     | Shared PBR material library (glass, metal, wood, fabric)                                                                                             |
| `FacilityGeometries.ts`    | Reusable geometry primitives                                                                                                                         |
| `AgentPodsGroup.tsx`       | Agent deployment pod ring: 5 pods evenly spaced on the outer wall                                                                                    |
| `AgentPod.tsx`             | Individual pod component                                                                                                                             |

#### `src/components/ui/` — 2D Interface

| Subdirectory / File                    | Purpose                                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `hud/Overlay.tsx`                    | 27 KB — Master HUD overlay: renders all floating UI, status bars, interaction prompts           |
| `hud/GameMenu.tsx`                   | 38 KB — Pause menu: settings, key bindings, audio config, agent management                      |
| `hud/ResearchDashboard.tsx`          | 39 KB — Full cognitive dashboard: drive charts, tick timelines, KG explorer, memory browser     |
| `hud/CommandBar.tsx`                 | Spotlight-style command palette (Cmd+K)                                                          |
| `hud/ThoughtBubble.tsx`              | Floating thought display above agents                                                            |
| `hud/Minimap.tsx`                    | Top-down facility minimap with agent positions                                                   |
| `hud/StatusBar.tsx`                  | Bottom status bar: FPS, agent count, metrics                                                     |
| `hud/InspectorPanel.tsx`             | Agent detail inspector panel                                                                     |
| `hud/SpeechIndicator.tsx`            | Visual speech activity indicator                                                                 |
| `panels/AgentChatPanel.tsx`          | 34 KB — 1:1 chat interface with agents: message history, voice input, typing indicators         |
| `panels/AgentInteractionPanel.tsx`   | Floating interaction panel above agents: live thoughts, chat entry, protocol editor              |
| `panels/AgentCommunicationPanel.tsx` | Broadcast/group communication UI                                                                 |
| `panels/TaskAssignmentPanel.tsx`     | 29 KB — Task creation wizard: select agent → choose action → configure parameters → dispatch |
| `panels/FileEditorModal.tsx`         | In-world document editor for file objects                                                        |
| `DynamicStatsIsland.tsx`             | Floating stats island (live metrics)                                                             |
| `PodInteractionPrompt.tsx`           | Deploy/recall UI for agent pods                                                                  |
| `audio/AudioPrompt.tsx`              | Audio permission and unlock prompt                                                               |
| `audio/AudioUnlocker.tsx`            | WebAudio context unlock handler                                                                  |

### `src/systems/` — Core Simulation Systems

| File                        | Size   | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AgentTaskQueue.ts`       | 21 KB  | **Task execution engine**: manages the ordered queue of discrete physical tasks per agent. Task types: `GO_TO`, `SIT`, `PICK_NEARBY`, `PLACE_INVENTORY`, `INTERACT`, `SAY`, `EMOTE`, `WAIT`, `LEAN`, `LOOK_AT`, `CONTEMPLATE`, `EXPLORE`, `REST`, `COLLABORATE`, `PRESENT`, `REST_IN_POD`, `WANDER`, `FOLLOW_PLAYER`. Handles collision recovery, stuck detection, path replanning, and task phase transitions (`IDLE → NAVIGATING → ACTION_START → SEATED/LEANING/GAZING/... → COMPLETED`) |
| `ClientBrain.ts`          | 24 KB  | **LLM interaction layer**: constructs `AgentContext`, manages rate limiting (default 8 req/60s), formats episodic + semantic memory for prompt injection, runs hallucination critic loop (validates entity IDs against perception), parses tool call responses into `AgentTask[]`, auto-extracts KnowledgeGraph facts from actions, dispatches tick snapshots for the cognitive dashboard                                                                                                                                         |
| `NavigationNetwork.ts`    | 29 KB  | **Grid-based A* pathfinding**: 2m-cell occupancy grid (160×160 cells), dynamic obstacle carving (OBB + sphere), center park and outer wall void carving, 8-directional A* with octile heuristic, fat line-of-sight path smoothing, Catmull-Rom spline interpolation, corner angle computation for speed scheduling                                                                                                                                                                                                                     |
| `InteractableRegistry.ts` | 19 KB  | **World object manager**: singleton registry for all pickable items and placing areas (desk surfaces). Semantic zoning (infers zone names from area proximity), claim system (prevents two agents targeting the same item), fuzzy name lookup (Levenshtein), world-position resolution (mesh world matrix), item pickup/putdown/placement with parent-space transforms                                                                                                                                                                |
| `ZoneInfluenceSystem.ts`  | 3.7 KB | **Zone-based drive modifiers**: each physical zone (garden, workshop, break room) registers per-second drive effects (e.g., garden restores `wonder`, workshop boosts `focus`). Injects zone mood and environment description into LLM prompts                                                                                                                                                                                                                                                                                    |
| `POIRegistry.ts`          | 3.5 KB | **Point of Interest system**: scenic viewpoints, exhibits, landmarks, social spots. Novelty scores decay on visit and recover over real time. Agents are drawn to novel, nearby POIs when wonder/curiosity is low                                                                                                                                                                                                                                                                                                                     |
| `AIManager.ts`            | 2.2 KB | **Yuka.js entity registry**: central tracking of all Vehicle entities. Provides partner approach positions for collaborative tasks                                                                                                                                                                                                                                                                                                                                                                                                    |
| `InterAgentComms.ts`      | 1.8 KB | **Agent-to-agent messaging bus**: direct messages (`message_agent`) and broadcasts (`announce`). Messages are consumed by the recipient's next ClientBrain tick                                                                                                                                                                                                                                                                                                                                                                   |
| `TextureGenerator.ts`     | 4.6 KB | Runtime canvas-based texture generation for labels and signage                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

#### `src/systems/autonomy/` — Autonomous Behavior

| File                   | Purpose                                                                                                                                                                                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `IdleExplorer.ts`    | 10 KB — Autonomous navigation when no LLM tasks are active. Analyzes spatial bounds, scores destinations by curiosity/familiarity, issues `GO_TO` events. **Bypassed for agents with `stationaryDesk`** (service counter agents remain seated) |
| `ProxemicsSystem.ts` | 3.1 KB — Conversational distance management. Ensures agents face each other during dialogue, maintains appropriate interpersonal spacing                                                                                                                 |

### `src/lib/` — Utility & Processing Libraries

#### Core Agent Logic

| File                      | Size   | Purpose                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `agent-brain.ts`        | 15 KB  | **LLM prompt template**: constructs the full system + user prompt for Groq. Injects: personality block, environment description, zone navigation table, drive state, spatial memory, conversation history, peer messages, world tasks, perception table (Markdown entity grid), tool catalog, speech discipline rules, and system prompt overrides                                         |
| `agent-tools.ts`        | 16 KB  | **Tool definitions**: 20 Groq function-calling tools: `pick_up`, `place_at`, `go_to`, `interact`, `say`, `message_agent`, `announce`, `web_search`, `observe`, `sit`, `contemplate`, `rest`, `explore`, `collaborate`, `emote`, `present`, `rest_in_pod`, `claim_desk`, `claim_task`, `release_task`                                               |
| `UtilityBrain.ts`       | 10 KB  | **Subconscious drive evaluator**: runs per-frame (no LLM). Evaluates drive urgency using non-linear curves (exponential/logistic/logarithmic), generates local tasks for the most urgent drive (energy→sit at desk, tidiness→pickup stray items, wonder→visit POIs, curiosity→explore least-visited zone, social→approach nearby agent). Per-agent personality noise prevents herding |
| `SensorySystem.ts`      | 8.1 KB | **Perception pipeline**: FOV-limited vision (126°, 30m range), raycasted line-of-sight against collidable meshes (max 10 raycasts/frame, priority: player > agent > object), working memory with 10s persistence for recently-seen entities, hearing bus for environmental sounds, attention target prioritization, perception interrupts for loud stimuli                                |
| `agent-drives.ts`       | 9.1 KB | **DriveManager**: 8 numeric drives (0–100): `tidiness`, `curiosity`, `helpfulness`, `social`, `energy`, `focus`, `wonder`, `belonging`. Drives decay/recover based on zone effects and current actions (e.g., `SIT` recovers energy). Personality `driveWeights` modulate decay rates                                                                                 |
| `nlp-parser.ts`         | 15 KB  | Spatial language frequency analysis for research metrics                                                                                                                                                                                                                                                                                                                                         |
| `SpatialFamiliarity.ts` | 2.3 KB | Per-agent position familiarity tracking for curiosity dampening                                                                                                                                                                                                                                                                                                                                  |
| `agent-brain-utils.ts`  | 2.4 KB | Prompt formatting utilities                                                                                                                                                                                                                                                                                                                                                                      |
| `agentSpeechGate.ts`    | 0.5 KB | Speech rate limiter to prevent agent spam                                                                                                                                                                                                                                                                                                                                                        |

#### Memory Subsystem (`src/lib/memory/`)

| File                      | Size   | Purpose                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `MemoryStream.ts`       | 7.4 KB | **Episodic memory**: CRUD with IndexedDB persistence. Trust-weighted retrieval scoring: `importance × 0.5 + recency × 0.2 + trust × 0.3`. Automatic compaction: when count exceeds 400, oldest 50 memories are LLM-summarized into a reflective insight. Memory types: `OBSERVATION`, `DIALOGUE`, `THOUGHT`, `ACTION`, `SCRIPT_OUTCOME` |
| `KnowledgeGraph.ts`     | 14 KB  | **Semantic memory**: per-agent triple store `(subject, predicate, object)` with confidence scores (0–1), provenance tracking, hourly confidence decay (0.5%/hr), reinforcement on re-observation (+0.1), TTL expiry, and auto-pruning below 0.15 confidence. Formats top-N relevant facts as Markdown table for LLM injection                       |
| `ConversationMemory.ts` | 6.4 KB | Structured conversation history tracking per agent-entity pair                                                                                                                                                                                                                                                                                               |
| `SpatialMemory.ts`      | 4.9 KB | Zone visit frequency tracking for least-visited-zone exploration                                                                                                                                                                                                                                                                                             |
| `idb-adapter.ts`        | 11 KB  | IndexedDB storage adapter with agent-scoped indexes                                                                                                                                                                                                                                                                                                          |
| `types.ts`              | 2.2 KB | Memory type definitions:`MemoryObject`, `MemorySource` (7 provenance levels: `direct_observation` → `system`), `RetrievalContext`, `MemoryConfig`                                                                                                                                                                                               |

#### Audio Subsystem (`src/lib/audio/`)

| File                      | Purpose                                                                                                                                                                                            |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useAudioController.ts` | 27 KB — Master audio controller: manages TTS pipeline selection (Piper → eSpeak → Kokoro), spatial audio positioning via Web Audio API, distance attenuation models, per-agent voice assignment |
| `VoiceProvider.tsx`     | Voice context provider                                                                                                                                                                             |
| `espeak.worker.js`      | eSpeak-NG WebAssembly TTS worker                                                                                                                                                                   |
| `piper.worker.js`       | Piper neural TTS worker                                                                                                                                                                            |
| `kokoroWorker.js`       | Kokoro TTS worker                                                                                                                                                                                  |
| `piperModelCache.ts`    | ONNX model caching for Piper                                                                                                                                                                       |
| `piperPhonemize.ts`     | Phonemization pipeline                                                                                                                                                                             |
| `phraseBank.ts`         | Common phrase templates for agent speech                                                                                                                                                           |
| `chunkTextForTts.ts`    | Text chunking for streaming TTS                                                                                                                                                                    |
| `useSpeechToText.ts`    | Microphone input → text transcription                                                                                                                                                             |
| `voiceTypes.ts`         | Voice configuration types                                                                                                                                                                          |

#### Other Libraries

| File               | Purpose                                                                                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `groq.ts`        | Groq SDK client with API key rotation                                                                                                                       |
| `rateLimiter.ts` | Token bucket rate limiter                                                                                                                                   |
| `search.ts`      | Web search tool implementation                                                                                                                              |
| `worldTasks.ts`  | 8.3 KB — World task system: shared lab-wide task queue (deliver items, go to zones, follow player), subtask tracking, player/scenario/system task creation |
| `math-utils.ts`  | Vector math helpers                                                                                                                                         |
| `materials.ts`   | Shared Three.js material library                                                                                                                            |
| `bvh-setup.ts`   | BVH acceleration setup for raycasting                                                                                                                       |

#### Workers (`src/lib/workers/`)

| File                     | Purpose                                             |
| ------------------------ | --------------------------------------------------- |
| `AgentBrainClient.ts`  | Web Worker client for offloading brain computations |
| `agentBrain.worker.ts` | Brain computation worker thread                     |

#### Logging (`src/lib/logging/`)

| File                | Purpose                                                     |
| ------------------- | ----------------------------------------------------------- |
| `logger.ts`       | Simulation log dispatcher (metrics, decisions, performance) |
| `agent-logger.ts` | Agent interaction logger (LLM request/response tracing)     |
| `db.ts`           | Logging database adapter                                    |

### `src/store/` — Zustand State Management

| File                  | Purpose                                                                                                         |
| --------------------- | --------------------------------------------------------------------------------------------------------------- |
| `gameStore.ts`      | Root store — composes all slices                                                                               |
| `gameStoreTypes.ts` | 10 KB — Complete type definitions for all store slices                                                         |
| `agentStore.ts`     | Agent slice: positions, metrics, trajectories, research management, prompt overrides, personal desk assignments |
| `chatStore.ts`      | Chat slice: per-agent message history, nearby agent detection, common broadcast channel                         |
| `uiStore.ts`        | UI slice: menus, panels, debug mode, inventory, file editor, task panel wizard state, command bar, pod focus    |
| `worldStore.ts`     | World slice: collidable meshes, obstacles, interactables                                                        |
| `settingsStore.ts`  | Settings slice: mouse sensitivity, volume, audio config, key bindings                                           |
| `podStore.ts`       | Pod slice: 5 deployment pods, agent assignment, deploy/recall state                                             |
| `worldTaskStore.ts` | World task slice: shared lab task CRUD, auto-dispatch, claim/release                                            |
| `InterestMap.ts`    | Dynamic interest point tracking for curiosity-driven exploration                                                |

### `src/config/` — Configuration & Domain Constraints

| File                               | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agentPersonalities.ts`          | Agent profiles (4 agents): names, traits, bios, preferred zones, drive weight multipliers, speech styles, idle biases, accent colors, and `stationaryDesk` bindings. **Agent-01 (Chama)**: Lead Architect, work bias. **Agent-02 (Yuka)**: AI Ethics Specialist, social bias. **Agent-03 (Teller)**: Bank Teller, stationary at `desk-east-2`. **Agent-04 (Officer)**: Insurance Officer, stationary at `desk-east-3` |
| `facilityLabDeskAssignments.ts`  | Maps desk IDs (`desk-east-0..3`, `extra-table-A..D`) to agent ownership. Provides claimable desk ID list                                                                                                                                                                                                                                                                                                                                        |
| `agentPods.ts`                   | Pod ring geometry: 5 pods at 345°, 72°, 144°, 216°, 288° on the outer wall. Dock positions, look-at targets, deploy exit positions                                                                                                                                                                                                                                                                                                             |
| `agentRoutines.ts`               | Agent → storage table assignments, storage checklists, workbench helpers, meeting room positions                                                                                                                                                                                                                                                                                                                                                   |
| `facilityLabRoutines.ts`         | Facility-specific zone routines and bench lookup                                                                                                                                                                                                                                                                                                                                                                                                    |
| `ResearchComplexLayout.ts`       | World definition: wall positions, floor planes, and furniture placement coordinates                                                                                                                                                                                                                                                                                                                                                                 |
| `ResearchEvaluationScenarios.ts` | Pre-built evaluation scenarios for research demonstrations                                                                                                                                                                                                                                                                                                                                                                                          |
| `facilityWorldTasksSeed.ts`      | Initial world task seeding                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `WorldConfig.ts`                 | World definition types                                                                                                                                                                                                                                                                                                                                                                                                                              |

### `src/types/` — TypeScript Definitions

| File             | Purpose                                                                                                                                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agent.ts`     | Core agent types:`AgentDrives` (8 drives), `AgentContext` (full perception+memory context for LLM), `AgentPersonality`, `AgentTask` (18 task types), `AgentTaskType`, `TaskPhase` (9 phases), `SteeringCommand`, `WalkPace` |
| `world.ts`     | World types:`WorldObject` (20 object types), `PlacingArea`, `Obstacle`                                                                                                                                                                |
| `worldTask.ts` | Task types:`WorldTask`, `WorldTaskStatus`, `WorldTaskPayload` (deliver/go_zone/follow_player), `WorldTaskSubtask`                                                                                                                   |
| `ui.ts`        | UI types: debug targets, grid rows                                                                                                                                                                                                          |
| `semantic.ts`  | Semantic analysis types                                                                                                                                                                                                                     |
| `yuka.d.ts`    | Yuka.js type declarations                                                                                                                                                                                                                   |

### `src/debug/` — Development Tools

| File                         | Purpose                                                                                                                                                                                            |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TickSnapshot.ts`          | 7.6 KB — Per-tick cognitive snapshot buffer: captures drives, task phase, decisions, tool calls, zone, latency, spatial language frequency, critic retries. Powers the ResearchDashboard timeline |
| `agentPerformanceProbe.ts` | Agent performance profiling (raycasts, memory usage, LLM latency)                                                                                                                                  |

### `src/constants/` — Simulation Constants

| File              | Purpose                                                       |
| ----------------- | ------------------------------------------------------------- |
| `simulation.ts` | Core simulation parameters: tick rates, distances, thresholds |

---

## 4. Agent Cognitive Architecture

### The Dual-Layer Brain

```
┌──────────────────────────────────────────────────────────────────┐
│                        useAgentBrain.ts                           │
│                    (Master Loop — per-frame)                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────┐     ┌────────────────────────────────┐  │
│  │   Layer 1:          │     │   Layer 2:                      │  │
│  │   UtilityBrain      │     │   ClientBrain (LLM)            │  │
│  │   (Subconscious)    │     │   (Conscious Mind)             │  │
│  │                     │     │                                 │  │
│  │  • Runs every frame │     │  • Rate-limited (≤8/min)       │  │
│  │  • No LLM calls     │     │  • Groq API → Llama 3.1 8B    │  │
│  │  • Evaluates drives  │     │  • Full context injection      │  │
│  │  • Non-linear curves │     │  • 20 function-calling tools   │  │
│  │  • Generates local   │     │  • Hallucination critic loop   │  │
│  │    tasks (sit, tidy, │     │  • Knowledge graph extraction  │  │
│  │    explore, wander)  │     │  • Memory consolidation        │  │
│  └──────────┬───────────┘     └──────────────┬─────────────────┘  │
│             │                                 │                    │
│             ▼                                 ▼                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    AgentTaskQueue                             │ │
│  │  Priority-ordered task execution with phase state machine    │ │
│  │  IDLE → NAVIGATING → ACTION_START → [SEATED|GAZING|...] →   │ │
│  │  COMPLETED                                                   │ │
│  └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Perception Pipeline

1. **Raw Entity Collection**: World objects, agents, and the player within vision range are gathered
2. **FOV Filter**: 126° forward cone, 30m range
3. **Line-of-Sight Raycasting**: Up to 10 raycasts/frame against collidable meshes (priority: player > agents > objects)
4. **Working Memory**: Entities persist in memory for 10 seconds after last sighting, enabling short-term recall
5. **Hearing Bus**: Environmental sounds (footsteps, interactions, crashes) trigger attention and possible interrupts
6. **Perception Table**: Visible entities are formatted as a Markdown table injected into the LLM prompt

### Memory Architecture

| Layer               | System                 | Persistence     | Purpose                                     |
| ------------------- | ---------------------- | --------------- | ------------------------------------------- |
| Working Memory      | `SensorySystem`      | In-memory (10s) | Frame-to-frame entity tracking              |
| Episodic Memory     | `MemoryStream`       | IndexedDB       | Event history with trust-weighted retrieval |
| Semantic Memory     | `KnowledgeGraph`     | IndexedDB       | Structured beliefs as (S, P, O) triples     |
| Conversation Memory | `ConversationMemory` | IndexedDB       | Per-partner dialogue logs                   |
| Spatial Memory      | `SpatialMemory`      | In-memory       | Zone visit frequency for exploration bias   |

### Drive System

Eight numeric drives (0–100) create emergent motivation:

| Drive           | Effect when LOW        | Recovery method                     |
| --------------- | ---------------------- | ----------------------------------- |
| `energy`      | Seek rest, sit at desk | SIT action, pod docking, break room |
| `tidiness`    | Pick up stray items    | PICK_NEARBY → PLACE_INVENTORY      |
| `curiosity`   | Explore new zones      | EXPLORE, GO_TO least-visited zone   |
| `wonder`      | Visit scenic POIs      | CONTEMPLATE at viewpoints           |
| `social`      | Approach nearby agents | COLLABORATE, wave gesture           |
| `focus`       | Seek workspaces        | GO_TO core-lab or data-analysis     |
| `helpfulness` | Assist with tasks      | claim_task, collaborate             |
| `belonging`   | Return to home zone    | GO_TO preferred zone                |

Drives are modified by:

- **Zone effects**: Being in the garden restores `wonder`, the workshop boosts `focus`
- **Action outcomes**: `SIT` recovers `energy`, completing a task boosts `helpfulness`
- **Personality weights**: Each agent has multipliers that bias drive decay/recovery rates
- **UtilityBrain thresholds**: Non-linear urgency curves trigger behaviors at personality-specific thresholds

---

## 5. Agent Types

### Roaming Agents (agent-01, agent-02)

- Full autonomous behavior: `IdleExplorer` navigates between zones based on curiosity
- Dynamic desk claiming via `claim_desk` tool
- Social interaction, exploration, and task participation
- Procedural IK walking animation with walk pace tiers (stroll/normal/purposeful)

### Stationary Service Agents (agent-03, agent-04)

- Bound to a `stationaryDesk` via `agentPersonalities.ts` config
- On instantiation, a high-priority `SIT` command keeps them at their counter
- `IdleExplorer` is **bypassed** — they never autonomously wander
- They still perceive, think, and respond to nearby entities via the LLM
- **Agent-03 (Teller)**: Bank Teller at `desk-east-2` — transactions, budget approvals
- **Agent-04 (Officer)**: Insurance Officer at `desk-east-3` — liability, risk assessment
- Each has a `systemPromptOverride` field editable via the Protocol UI panel at runtime

---

## 6. Navigation System

The `NavigationNetwork` is a singleton A* pathfinder operating on a 2D occupancy grid:

- **Grid**: 160×160 cells at 2m resolution, covering a 320m² area
- **Obstacle carving**: OBB (oriented bounding box) and sphere obstacles are carved with 0.8m padding
- **Void carving**: Center park pond (inner circle) and exterior beyond glass walls (outer circle) are blocked
- **A***: 8-directional with octile heuristic, corner-cutting prevention, binary heap open set
- **Path smoothing**: Fat line-of-sight reduction (accounts for agent width), then Catmull-Rom spline interpolation
- **Approach positions**: When a target is inside a carved obstacle, the nearest walkable cell biased toward the start is used
- **Content-based deduplication**: Grid rebuilds are skipped when obstacle fingerprints hash identically

---

## 7. World Task System

Shared lab-wide tasks visible to all agents:

```
WorldTask {
  id, title, description, status, priority, assigneeId,
  createdBy: "player" | "scenario" | "system",
  payload: { kind: "deliver", itemId, destAreaId }
         | { kind: "go_zone", zoneId }
         | { kind: "follow_player" },
  subtasks?: WorldTaskSubtask[],
  helpersNeeded?: boolean
}
```

- **Player creates tasks** via `TaskAssignmentPanel` (step-by-step wizard)
- **Agents claim tasks** via `claim_task` tool (LLM decides based on prompt context)
- **Auto-dispatch**: `dispatchOpenWorldTask()` picks the nearest idle agent
- **Release**: Agents can `release_task` to hand back uncompleted work

---

## 8. Interactable World Objects

### Object Types

`file`, `laptop`, `pendrive`, `coffeecup`, `generic`, `sofa`, `chair`, `whiteboard`, `projector_screen`, `tv`, `coffee_machine`, `telephone`, `pc`, `switch`, `door`

### Placing Areas

Desk surfaces register as `PlacingArea` with dimensions, rotation, and slot occupancy. The `InteractableRegistry` manages:

- **Semantic zoning**: Infers zone names from nearest area group (e.g., "Storage Table 6")
- **Claim system**: Prevents two agents from targeting the same item simultaneously
- **Fuzzy lookup**: Levenshtein distance matching for LLM-hallucinated names
- **World-space resolution**: Correct transforms even for items parented to furniture groups

---

## 9. Audio System

Multi-provider TTS pipeline with spatial audio:

1. **Piper** (preferred): Neural ONNX TTS via Web Worker, model cached in browser
2. **eSpeak-NG** (fallback): WebAssembly-based parametric TTS
3. **Kokoro** (experimental): Alternative neural TTS

Features:

- Spatial audio via Web Audio API (distance attenuation: linear/inverse/exponential)
- Per-agent voice assignment
- Text chunking for streaming playback
- `useSpeechToText` for player microphone input
- Phrase bank for common agent utterances

---

## 10. State Management

Zustand store composed of 7 slices:

| Slice              | Key State                                                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `WorldSlice`     | Collidable meshes, obstacles, interactables                                                                                 |
| `AgentSlice`     | Agent positions, metrics (latency, spatial ratio), trajectories, prompt overrides, personal desks, research agent lifecycle |
| `ChatSlice`      | Per-agent chat history, nearby agent detection, broadcast channel                                                           |
| `UISlice`        | Menu/panel visibility, inventory, file editor, task panel wizard, debug mode, placing targets, scenario selection           |
| `SettingsSlice`  | Mouse, audio, key bindings, run ID, FPS                                                                                     |
| `PodSlice`       | 5 pod states: assigned agent, deploy status, position                                                                       |
| `WorldTaskSlice` | Task CRUD, claim/release, auto-dispatch                                                                                     |

---

## 11. Key Data Flows

### Agent Think Cycle

```
useAgentBrain (per-frame)
  → SensorySystem.update() — raycasted perception
  → DriveManager.update() — drive decay + zone effects
  → UtilityBrain.evaluate() — subconscious local tasks
  → ClientBrain.update() — if rate limit allows:
      → MemoryStream.retrieve() — episodic context
      → KnowledgeGraph.toContextString() — semantic context
      → ConversationMemory.formatForPrompt() — dialogue history
      → agent-brain.ts (prompt assembly)
      → Groq API (Server Action) → Llama 3.1 8B
      → Hallucination Critic (validate entity IDs)
      → Parse tool_calls → AgentTask[]
      → Auto-extract KG facts
      → CalculateSpatialLanguageFrequency (idle callback)
      → TickSnapshot → ResearchDashboard
  → AgentTaskQueue.execute() — physical task resolution
  → useProceduralGait — IK animation
  → useAudioController — TTS speech output
```

### Player Chat with Agent

```
Player types message → chatStore.addChatMessage()
  → useAgentBrain detects nearbyAgentId
  → ClientBrain receives conversationHistory in context
  → LLM responds with say() tool call
  → AgentTaskQueue enqueues SAY task
  → ThoughtBubble displays text
  → useAudioController speaks via TTS
  → ConversationMemory logs the exchange
```

### Task Assignment

```
Player opens TaskAssignmentPanel → selects agent → chooses action → configures params
  → worldTaskStore.addWorldTask()
  → Agent's ClientBrain sees worldTasksContext in prompt
  → Agent uses claim_task tool → worldTaskStore.claimWorldTaskForAgent()
  → AgentTaskQueue receives task payload (deliver/go_zone/follow)
  → On completion → worldTaskStore.updateWorldTask(status: 'done')
```

---

## 12. Environment & Configuration

| Variable                           | Purpose                                                     |
| ---------------------------------- | ----------------------------------------------------------- |
| `GROQ_API_KEY`                   | Groq API authentication (supports comma-separated rotation) |
| `NEXT_PUBLIC_AGENT_BRAIN_RL_MAX` | Brain rate limit max (default: 8 requests per 60s window)   |

**Package manager**: pnpm
**Dev server**: `pnpm dev` (runs `copy-tts-assets.mjs` first, then `next dev`)
**Build**: `pnpm build` → `next build`

---

## 13. Usage for AI Assistants

This document is the authoritative structural reference for the 3D Spatial Agents codebase. Use it when:

- **Adding new agent tools**: Define in `agent-tools.ts`, handle in `ClientBrain.ts` switch statement, add task type to `AgentTaskType` union, implement execution in `AgentTaskQueue.ts`
- **Creating new task types**: Add to `AgentTaskType` in `types/agent.ts`, add `TaskPhase` if needed, implement in `AgentTaskQueue.ts`, update `ClientBrain.ts` parser
- **Modifying the LLM prompt**: Edit `agent-brain.ts` — the prompt template, tool catalog, and rules are all in this file
- **Adding world objects/furniture**: Add geometry in `OfficeHub.tsx` or `FacilityLabFurniture.tsx`, register obstacles in `FacilityObstacles.ts`, register interactables/placing areas via hooks
- **Extending memory**: Add fields to `MemoryObject` in `memory/types.ts`, update `idb-adapter.ts` schema, modify retrieval scoring in `MemoryStream.ts`
- **Adding new zones**: Register in `ZoneInfluenceSystem`, add POIs in `POIRegistry`, add zone ID to `ALL_ZONE_IDS`, update navigation table in `agent-brain.ts`
- **Creating new agents**: Add personality in `agentPersonalities.ts`, assign pod or desk, configure drive weights and speech style
- **Modifying the brain loop**: Edit `useAgentBrain.ts` — this 70KB file is the central orchestrator; changes here affect all agent behavior
