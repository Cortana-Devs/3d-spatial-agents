# 3D Spatial Agents: The Research Facility

## 1. Project Overview & Aesthetic
The "Research Facility" (formerly Donut Lab) is an AI-native 3D spatial simulation framework utilizing large language models (LLMs) to power embedded virtual agents. The aesthetic is clean, Apple-inspired, premium "tech facility" with dynamic UI popups. The framework merges a rigorous 3D physics/navigational layer (React Three Fiber, Yuka) with robust, prompt-driven multi-agent AI logic and a Zustand state-management backbone.

## 2. Core Codebase Structure

### `/src/components` (Rendering & HUD)
- **`/agent`**: Hosts visual models (`RobotModel.tsx`, rendering variations based on ID, like Ties for agent-03 and Dark Suits for agent-04), physical skeletons, and the bridging `useAgentBrain.ts` hook. 
  - *`useAgentBrain.ts`* is the master simulation loop for an agent, polling proximity chat, resolving `AgentTaskQueue` operations, rendering procedural IK gaits, and calling the LLM brain.
- **`/world/facility/FacilityLabFurniture.tsx`**: Defines 3D geometries for the environment including modular `ServiceCounter` zones for Bank Tellers and Insurance Officers.
- **`/ui/panels/AgentInteractionPanel.tsx`**: Displays live floating UI elements directly above an agent, showing live thoughts, chat boxes, and the "Protocol" system-prompt overriding module.

### `/src/systems` (Simulation Physics & State)
- **`AgentTaskQueue.ts`**: The execution registry for an agent's discrete physical tasks (GO_TO, SIT, EMPOTE, WAIT, LOOK_AT). Manages collisions, routing, stuck-recovery, and phasing.
- **`ClientBrain.ts`**: The central LLM interaction layer. Manages API rate-limiting, formats episodic/spatial memory schemas, passes tool-execution results from Groq into `AgentTaskQueue`, and emits logs into the Cognitive Dashboard.
- **`autonomy/`**: 
  - *`IdleExplorer.ts`*: Analyzes spatial bounds and scores destinations based on curiosity to issue autonomous GO_TO events. Bypassed for agents with a `stationaryDesk`.
  - *`ProxemicsSystem.ts`*: Defines conversational interaction boundaries and visual rotation alignment when agents talk to each other.
- **`AIManager.ts`**: The central registry tracking all Yuka.js vehicle entities.

### `/src/lib` (Utilities & Processing)
- **`agent-brain.ts`**: The core LLM prompt templating script mapping context matrices (nearby entities, internal drives, system prompt overrides) into raw strings for `llama-3.1-8b-instant`.
- **`agent-drives.ts`**: Implementation of `DriveManager`, mapping physical actions (e.g. `SIT`) into emotional status resolution (e.g. recovering `ENERGY`).
- **`worldTasks.ts`**: Shared lab objectives queue.

### `/src/store` (State Management)
- **`gameStore.ts` & `agentStore.ts`**: Unified Zustand state containing agent coordinates, LLM metrics/latency profiling, the global task registry, real-time thought streams, and declarative overrides (`agentPromptOverrides`).

### `/src/config` (Domain Constraints)
- **`agentPersonalities.ts`**: Defines standard traits, speech styles, accent colors, specific `stationaryDesk` binding rules, and idle biases for all agents (01-04).
- **`facilityLabDeskAssignments.ts`**: Matches desk asset IDs (e.g., `desk-east-2`) to active agent ownership.

## 3. Key Concepts & Patterns
- **Dual-Layer Brain**: Agents evaluate simple physics limits per-frame (`UtilityBrain`). LLM requests (`ClientBrain`) are slow, episodic, and only invoked when an agent perceives significant contextual shifts, avoiding token bankruptcy.
- **Service vs Roving Agents**: Agents like `agent-03` and `agent-04` are bound to a `stationaryDesk` via their configuration context. The simulation detects this and natively pipelines high-priority `SIT` commands to these agents upon instantiation, blocking them from utilizing the `IdleExplorer`.
- **Sensory & Memory**: Agents utilize intersection vectors to form localized visual tables (`Perceptions`). Interactions log into IndexedDB (`SpatialMemory`) to form the subjective history injected into their individual prompts.

## Contextual Usage for AI
You may scrape this Markdown file completely and utilize it as the structural reference when adding modules, creating new task types, expanding API functionality, or modifying `useAgentBrain.ts` logic mapping across this codebase.
