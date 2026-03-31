# 🧠 Research & Architecture Context: 3D Spatial Agents
**Platform:** 3D Spatial Agents (Donut Lab) | **Framework:** Next.js + React Three Fiber + Yuka AI
**Cognitive Engine:** Groq Cloud (`llama-4-maverick`, `llama-3.1-8b-instant`)

> **🤖 LLM Agent Directives:** 
> This document is the source of truth for both the theoretical research goals and the practical codebase implementation. When generating code, architectural decisions, or writing academic paper sections, cross-reference the **Codebase Mapping** sections to ensure alignment between theory and code.

***

## 1. Core Problem & Literature Gap
**Literature Gap:** Current multi-agent LLM simulations (e.g., Stanford's Generative Agents) rely on 2D discrete grid-based movement and synchronous API calls, leading to poor spatial grounding and simulation pauses. 
**Core Problem:** *How can a multi-agent cognitive architecture be designed to reliably scale emergent generative agent behaviour within a dynamic, continuous 3D spatial environment without sacrificing real-time simulation integrity?*

## 2. Research Objectives
**Main Objective:** 
To design, implement, and empirically validate a neuro-symbolic multi-agent cognitive architecture that enables coherent, spatially-grounded emergent behaviour in a continuous, web-based 3D simulation environment powered by Large Language Models.

**Specific Objectives (SOs):**
- **SO1:** Design and implement a modular neuro-symbolic framework (Context Mixer, Spatial Oracle, Subconscious Engine) bridging LLM reasoning with continuous 3D navigation.
- **SO2:** Develop a web-based 3D platform integrating React Three Fiber, Yuka AI navmesh, and Groq-hosted Llama models (via Web Workers).
- **SO3:** Evaluate the coherence of emergent behaviour across three scenarios (Routine, Propagation, Collaboration).
- **SO4:** Quantify spatial language frequency in dialogues as a proxy for 3D spatial grounding via automated NLP parsing.
- **SO5:** Assess computational trade-offs (per-cycle latency, token consumption) of LLM-driven 3D simulations.
- **SO6:** Test behavioural invariance by comparing outcomes between `llama-4-maverick` and `llama-3.1-8b-instant`.

***

## 3. Research Questions & Hypotheses

| ID | Research Question | Hypothesis |
|:---|:---|:---|
| **RQ1** | What modular mechanisms bridge symbolic LLM reasoning with continuous 3D spatial navigation? | **H1 (Architectural Viability):** The Neuro-Symbolic architecture via Capability Adaptors + Context Mixer will drive coherent agent behaviour without spatial breakdowns. |
| **RQ2** | Does 3D structural embodiment overcome spatial grounding errors prevalent in text-based representations? | **H2 (Spatial Language):** Agent dialogues will contain a statistically significant frequency of complex spatial prepositions ("behind", "under") resolving local 3D coordinates. |
| **RQ3** | What are the computational trade-offs of driving 3D simulations via LLMs, and how are they mitigated? | **H3 (System Cost):** 3D simulation incurs measurable latency/token consumption, mitigated via Web Worker offloading and Subconscious Utility Fallbacks. |
| **RQ4** | How does model scale affect embodied spatial reasoning? | **H4 (Model Variance):** `llama-4-maverick` will demonstrate statistically significant improvements in Coordination Quality over `llama-3.1-8b-instant`. |

***

## 4. System Architecture & Codebase Mapping

The architecture is divided into a 5-stage **Neuro-Symbolic Cognitive Pipeline**.

### ⚙️ Stage 1: Subconscious Tick (Utility Evaluator)
Fires when the LLM is unavailable (rate limit, high latency) or busy. Selects deterministic actions to ensure continuous agent operation.
- **Theory:** AgentNeeds (energy, social) + PersonalityMatrix.
- **Codebase:** `src/lib/UtilityBrain.ts`, `src/lib/agent-drives.ts`, `src/config/agentPersonalities.ts`.

### 👁️ Stage 2: Perception (Context Mixer & Shards)
Assembles a token-budgeted prompt from modular "Shards".
- **Spatial Shard:** Navmesh zones, landmarks, anchors. (`src/systems/ZoneInfluenceSystem.ts`, `src/systems/POIRegistry.ts`).
- **Visual Cortex Shard:** 120° FOV, occlusion data. **Crucial implementation:** Uses BVH Raycasting via `src/lib/bvh-setup.ts` and `three-mesh-bvh` for high-performance line-of-sight.
- **Hippocampus Shard:** Episodic memory. **Crucial implementation:** Uses IndexedDB via `src/lib/memory/idb-adapter.ts` for cross-session persistence.
- **Social Shard:** Familiarity & sentiment. (`src/lib/SpatialFamiliarity.ts`).
- **Amygdala Shard:** Valence/arousal tracking. (`src/lib/agent-drives.ts`).

### 🧠 Stage 3: LLM Reasoning (Web Worker Isolated)
Prompt is sent to Groq. 
- **Theory:** High-speed inference to minimize cognitive lag.
- **Codebase:** `src/lib/agent-brain.ts`, executed securely off the main thread via `src/lib/workers/agentBrain.worker.ts` and `AgentBrainClient.ts` to prevent UI freezing during React Three Fiber renders.

### 🛡️ Stage 4: Symbolic Verify (Capability Adaptors)
LLM outputs are intercepted and checked against physical 3D preconditions.
- **Theory:** `verify()` and `reflect()` methods.
- **Codebase:** Handled via Zod schemas and validation logic in `src/lib/agent-tools.ts` and `src/systems/AgentTaskQueue.ts`.

### 🏃 Stage 5: Execute
Physical realization in the 3D environment.
- **Theory:** Yuka steering behaviors.
- **Codebase:** `src/components/agent/useAgentVehicle.ts`, `src/systems/NavigationNetwork.ts`.

***

## 5. Additional Modalities (Audio / TTS)
While not the primary DV, the platform features a complete audio pipeline for embodied agent speech, increasing observational validity.
- **Implementation:** Web-Assembly based TTS workers (`kokoroWorker.js`, `piper.worker.js`, `espeak.worker.js`) located in `src/lib/audio/`.
- **UI:** Managed via `src/components/ui/audio/`.

***

## 6. Experimental Design: Scenarios

The system will be evaluated across three structured scenarios, configured via `src/config/` (e.g., `donutLabRoutines.ts`, `ResearchComplexLayout.ts`).

| ID | Scenario | Description | Success Metric |
|:---|:---|:---|:---|
| **A** | **Daily Routine** | Agents follow individual schedules, adapting to dynamic pathing and physical obstacles. | % schedule items completed without spatial breakdown. |
| **B** | **Information Propagation** | One agent receives novel info; system tracks spread via spatial proximity conversations. | Simulated minutes until 100% of agents are informed. |
| **C** | **Collaborative Planning** | Agents coordinate a spatial task (e.g., gathering items, meeting at coordinates). | Composite sub-task score + CQR Scale. |

### CQR Scale (Coordination Quality Rubric)
Used for Scenario C. Scored 1 to 5:
1. Chaotic (Contradictory actions)
2. Reactive (Responds, no proactive plan)
3. Coordinated (Shared plan, inefficient execution)
4. Collaborative (Explicit role allocation)
5. Synergistic (Dynamic role adaptation)

***

## 7. Data Collection & Variables

### Variables
- **Independent Variables (IV):** LLM Engine (`Maverick` vs `8B`), Scenario Type (A, B, C).
- **Dependent Variables (DV):**
  - `TaskSuccess` (Ratio)
  - `SpatialLanguageFrequency` (Ratio - Counted via `src/lib/nlp-parser.ts`)
  - `Latency_ms` (Continuous - Recorded via API roundtrip)
  - `TokenConsumption` (Continuous)
  - `CoordinationQuality` (Ordinal 1-5)

### Logging & Instrumentation Schema
All ticks, thoughts, and metrics are caught by `src/lib/logging/agent-logger.ts` and routed to `src/app/api/logs/json/route.ts` using this exact schema:

```typescript
interface SimulationLog {
  timestamp: string;          // ISO 8601
  agent_id: string;
  run_id: string;             // UUID for reproducibility
  perception: string;         // Full Context Mixer output
  response: {
    text: string;
    tool_calls: Array<any>;
  };
  verification: boolean;      // Did the Capability Adaptor approve?
  execution: {
    action: string;
    outcome: string;
  };
  metrics: {
    latency_ms: number;       // From worker thread timing
    token_count: number;      // From Groq response headers
    fps: number;              // From R3F / Zustand
  };
}
```

***

## 8. Development & Setup Directives (For Agents)

1. **Tech Stack Nuances:** This project uses Next.js 16 (App Router) with React 19. All `three.js` interactions must go through `@react-three/fiber` hooks or the `useFrame` loop. Avoid instantiating raw Three.js singletons outside of React lifecycle unless inside a Yuka `GameEntity` or `EntityManager` (`src/systems/`).
2. **State Management:** All cross-component state is managed by Zustand (`src/store/gameStore.ts`). **Do not use React Context for rapidly updating 3D variables**, as it will cause cascade re-renders. Use transient Zustand updates (`useStore.getState()`).
3. **LLM Invocation:** Do not invoke `@ai-sdk/groq` on the main thread. Always route inference requests through `src/lib/workers/AgentBrainClient.ts` to maintain smooth 60 FPS rendering.
4. **Environment:** API keys must be validated via `src/lib/groq.ts`. Rate limits are handled by `src/lib/rateLimiter.ts`—ensure this is respected to trigger the Subconscious fallback (H3 testing).

***

# State of the Art for 3D Spatial LLM Agents and Neuro-Symbolic Generative Agents
## 1. Scope and Problem Setting
This report surveys state-of-the-art (SOTA) research relevant to the **3D Spatial Agents** platform: a web-native 3D simulation with LLM-driven generative agents, explicit spatial grounding, and a neuro-symbolic verification loop. It positions the project within three overlapping research lines:

- **Generative agents and LLM-empowered agent-based modeling (ABM)**.[1][2][3]
- **Embodied and spatially grounded LLM agents in 3D environments**.[4][5][6]
- **Neuro-symbolic agent architectures that couple neural and symbolic reasoning**.[7][8]

The distinctive feature of 3D Spatial Agents is its **continuous 3D, web-based environment** with **LLM cognition integrated into a deterministic game loop** and guarded by symbolic precondition checks, rather than purely script-based or 2D grid simulations.
## 2. Core Terminology and Conceptual Frame
### 2.1 Generative Agents
Park et al. define *generative agents* as computational agents that draw on generative models (LLMs) to simulate believable human behavior in a sandbox environment inspired by The Sims, using a memory stream, reflection, and planning loop to drive daily routines and emergent social dynamics. Their architecture includes:[2][9][10]

- A structured **memory store** of observations and past events.
- Periodic **reflection** to synthesize higher-level summaries.
- A **planning** component that uses retrieved memories to generate daily plans and actions.

3D Spatial Agents inherits this lineage but relocates it into a real-time, physics-based 3D scene with explicit pathfinding and continuous navigation.
### 2.2 LLM-Empowered Agent-Based Modeling
Recent surveys describe *LLM-empowered agent-based modeling* as the integration of large language models into agent-based simulations across social, cyber, physical, and hybrid domains, typically to enhance perception, decision-making, and communication among agents. These works emphasize:[11][3]

- High-level decision policies written or guided by LLMs.
- Richer natural-language interactions among agents.
- New evaluation challenges in **environment perception**, **action grounding**, and **scalable coordination**.

3D Spatial Agents fits this category but emphasizes **fine-grained 3D spatial grounding and real-time control**, which most social simulations treat only coarsely (e.g., abstract networks or simple 2D layouts).[11]
### 2.3 Embodied and Spatially Grounded LLM Agents
Embodied navigation research with LLMs focuses on agents that interpret language instructions to navigate or act within 3D worlds, often using LLMs as high-level planners on top of visual and geometric perception stacks. Surveys of LLM-based spatial intelligence distinguish between:[4][5][6]

- **Spatial perception and understanding** (building internal maps, scene graphs, or 3D representations).
- **Spatial interaction and navigation** (executing movement and tasks based on these internal models).[5]

3D Spatial Agents corresponds to an **embodied, language-driven multi-agent system** where spatial context is rendered into textual prompts by a spatial oracle and perception shards, and actions are executed by Yuka-based vehicles in a continuous 3D navmesh.
### 2.4 Neuro-Symbolic Agent Architectures
Neuro-symbolic agent architectures combine sub-symbolic learners (LLMs, neural networks) with symbolic reasoning or constraint engines to improve robustness, interpretability, and systematic generalization. Typical patterns include:[7][8]

- Neural modules for perception and proposal generation.
- Symbolic modules for constraint checking, rule enforcement, or causal reasoning.
- Feedback loops where symbolic reasoning can override or correct neural outputs.

The 3D Spatial Agents platform implements this pattern via a **Context Mixer + LLM planner + symbolic CapabilityAdaptor with verify/execute/reflect hooks**, closely aligned with emerging neuro-symbolic agent design principles.[7]
## 3. Closest Prior Work: Generative Agents and Social Simulators
### 3.1 Generative Agents (Park et al., 2023)
Park et al.'s "Generative Agents" is the seminal work on LLM-driven agents that live in a small town, form memories, plan daily routines, and exhibit emergent group behaviors such as party planning. Key properties:[2][9][10]

- **Environment:** 2D, tile-based sandbox reminiscent of The Sims.
- **Cognition:** LLM (GPT-4) loop with observation, reflection, and planning.
- **Embodiment:** Abstracted spatial model; no continuous physics or navigation.
- **Evaluation:** Believability of individual and social behavior; qualitative and crowdsourced ratings.

**Contrast to 3D Spatial Agents:**

- Uses a **discrete 2D layout**, while 3D Spatial Agents operates in a **continuous 3D navmesh with physics and steering behaviors**.
- Lacks explicit **symbolic precondition checking**; actions are not validated against a 3D world model before execution.
- Focuses on **social believability and narrative behavior**, whereas 3D Spatial Agents additionally quantifies **spatial language usage**, **latency**, and **coordination quality**.
### 3.2 AgentSociety and Large-Scale Generative Simulations
AgentSociety proposes a large-scale social simulator with LLM-driven generative agents to study human behavior and social phenomena at scale, simulating tens of thousands of agents and millions of interactions in complex social networks. The focus is on:[12]

- **Scale:** Thousands of agents and millions of interactions.
- **Domains:** Societal and policy questions, attitude dynamics, and information propagation.
- **Environment:** Primarily abstract topologies rather than continuous 3D spaces.

3D Spatial Agents is much smaller in scale but richer in **physical and spatial fidelity**, more aligned with game AI and embodied navigation than macro-level social science simulations.
### 3.3 Humanoid Agents, Lyfe Agents, MetaAgents, and TravelAgent
Several works extend generative agents into richer or more interactive settings:

- **Humanoid Agents** introduce a platform that combines generative agents with additional System 1–style fast processes and a Unity WebGL interface, focusing on more human-like behavior patterns and interactive analytics.[13]
- **Lyfe Agents** aim at low-cost generative agents with real-time responsiveness for social interactions, optimizing for latency and resource use in real-time scenarios.[14]
- **MetaAgents** focus on collaborative generative agents in structured task-oriented contexts (e.g., job fairs), highlighting coordination and task completion rather than continuous embodiment.[15]
- **TravelAgent** embeds generative agents in 3D built environments for pedestrian navigation and activity modeling, analyzing navigation tasks and free exploration in diverse spatial layouts.[16]

**Position of 3D Spatial Agents relative to these systems:**

- Like TravelAgent, 3D Spatial Agents situates agents in 3D environments, but it is **web-native** (Three.js/React Three Fiber) rather than Unity- or game-engine-based.[16]
- It incorporates real-time **Yuka steering** and navmesh-based movement, focusing on continuous body-level navigation rather than only activity selection.[17][18]
- It introduces an explicit **neuro-symbolic verification loop** (CapabilityAdaptor.verify) that is not a central feature in these prior works, which typically rely on LLM outputs and heuristic guards.
## 4. LLM-Empowered Agent-Based Modeling and Social Simulation
A 2023–2024 line of surveys and systems explores how LLMs can enhance agent-based modeling and social simulations in cyber, physical, social, and hybrid domains. These works show that:[11][3]

- LLM agents can replicate complex diffusion patterns, attitude dynamics, and epidemic curves when calibrated against real-world data.[11]
- Multi-role agent frameworks (e.g., planner, analyst, executor) can improve task performance in domains such as healthcare, finance, and forecasting.[3][11]
- Evaluation remains difficult, especially for internal cognitive consistency, long-term memory, and alignment.

3D Spatial Agents shares the ABM orientation but stands out in:

- Treating **3D spatial layout and navigation** as first-class experimental variables.
- Instrumenting **per-agent logs** at each cognitive tick with latency, token counts, and spatial context, enabling detailed system-level evaluation.
- Providing a **real-time interactive UI** where human users can inject tasks and monitor agent cognition.
## 5. Embodied Navigation and 3D Spatial Intelligence
### 5.1 LLMs for Embodied Navigation
Surveys on LLM-based embodied navigation review systems where LLMs provide high-level plans or pseudo-code for navigation while lower-level controllers handle motor control and collision avoidance. They highlight two main patterns:[4]

- LLM as **planner**, generating stepwise subgoals or pseudo-code for perception-based controllers.
- LLM as **semantic filter**, extracting task-relevant information from multimodal inputs before a separate navigation policy acts.

Works such as LM-Nav and SayNav show that LLM-based planners can decompose long-horizon navigation tasks, recognize landmarks, and adjust plans according to environmental feedback, often using 3D scene graphs or semantic maps as intermediate representations.[4]
### 5.2 Spatial Intelligence and 3D Capacity of LLMs
Surveys of LLM-powered spatial intelligence review human spatial cognition, LLM spatial memory and reasoning, and applications from embodied robots to urban and earth-scale intelligence. Key findings include:[5][6]

- Pre-trained LLMs possess limited but non-trivial **geospatial knowledge**, improved by structured reasoning and knowledge-guided training.[5]
- Embodied spatial intelligence can be decomposed into (1) spatial perception and map-building and (2) spatial interaction and navigation, with current systems often focusing more on perception than robust action generation.[5]
- Aligning continuous 3D geometry with discrete language models remains an open challenge, especially for long-term memory and efficient retrieval.[6][5]
### 5.3 Open-Ended Embodied Agents (Voyager and Related Work)
Voyager presents an LLM-powered embodied agent in Minecraft that autonomously explores, acquires new skills, and discovers novel behaviors through curriculum-style self-improvement and tool learning. It demonstrates that:[19]

- LLMs can drive **lifelong skill acquisition** when embedded in rich open-world environments.
- Code-generation and tool augmentation enable agents to expand their own capabilities over time.

3D Spatial Agents does not target open-ended skill discovery but instead focuses on **controlled experimental scenarios** with fixed action sets and well-defined dependent variables in a 3D lab environment.
## 6. Neuro-Symbolic and Hybrid Architectures
### 6.1 General Neuro-Symbolic Agent Frameworks
Recent overviews describe neuro-symbolic agent architectures where neural components propose actions or hypotheses and symbolic modules enforce constraints, logical consistency, or causal reasoning. Examples include:[7]

- Logical neural agents for RL and event detection that outperform pure MLP baselines in few-shot and temporal reasoning tasks.[7]
- Hybrid agents (e.g., SymAgent, NeSyC) that combine LLM-based hypothesis generation with symbolic validation and rule learning for robust long-horizon control.[7]

These works show that **Neuro → Symbolic → Neuro** feedback loops can improve robustness, explainability, and trajectory-level performance compared to LLM-only systems.
### 6.2 Chimera and Neuro-Symbolic-Causal Architectures
Chimera is a neuro-symbolic-causal architecture combining an LLM strategist, a formally verified symbolic constraint engine, and a causal inference module for robust, multi-objective decision-making. It addresses the brittleness of prompt-only LLM agents in high-stakes domains by:[8]

- Separating **strategy generation**, **constraint checking**, and **causal reasoning** into distinct modules.
- Using formally verified symbolic components to bound the behavior of neural planners.

3D Spatial Agents parallels this approach at a lower complexity level:

- The LLM corresponds to the **strategist**, producing plans and tool calls.
- The **CapabilityAdaptor.verify** step corresponds to the symbolic constraint engine checking spatial preconditions.
- The **reflect** and memory logging mechanisms provide a rudimentary feedback path for updating agent behavior over time.
## 7. Comparative Positioning of 3D Spatial Agents
### 7.1 Dimension Table
| Dimension | Generative Agents (Park et al.) | AgentSociety / Social ABM | Embodied Nav / Spatial Intelligence | Neuro-Symbolic Architectures | 3D Spatial Agents |
|----------|----------------------------------|----------------------------|-------------------------------------|------------------------------|-------------------|
| Environment | 2D sandbox town[2][9] | Abstract networks, macro social systems[11][12] | 3D robotics or simulated scenes[4][5] | Abstract task / RL domains[7][8] | Web-native 3D lab (navmesh + physics) |
| Embodiment | Symbolic positions, no physics | Mostly non-embodied, abstract agents | Physically embodied agents/robots | Varies by domain | Physically embodied robot agents (Yuka) |
| Cognition | LLM with memory, reflection, planning[2] | LLM roles (planner/analyst/executor)[11][3] | LLM as planner or semantic filter[4] | LLM + symbolic reasoning/constraints[7][8] | LLM + Context Mixer + symbolic verify/execute loop |
| Spatial Grounding | Coarse 2D layout | Often implicit or coarse | Explicit 3D maps, scene graphs[4][5] | Task-dependent | Explicit 3D navmesh, anchors, BVH occlusion |
| Scale | ~25 agents[2] | Up to 10k+ agents[12] | Typically single or small set of robots[4] | Varies | Small to medium agent population in detailed 3D lab |
| Evaluation Focus | Believability, emergent social behavior[2][10] | Macro behavior fidelity, policy analysis[11][12] | Navigation success, path efficiency, multimodal accuracy[4][5] | Robustness, explainability, constraint satisfaction[7][8] | Task success, spatial language frequency, latency, coordination quality |
### 7.2 Novelty and Contribution Summary
Within this landscape, 3D Spatial Agents is best understood as:

- A **web-native, continuous 3D generative agent platform** that combines LLM cognition with classic game AI (Yuka steering, navmeshes) in real time.
- A **neuro-symbolic architecture** where every LLM action is filtered by symbolic precondition checks and embedded in a deterministic game loop.
- A **research instrument** that measures not only behavioral outcomes (task success, coordination) but also **spatial language usage** and **system-level costs** (latency, tokens) under different LLM backends.

This combination is not replicated directly in existing generative agents, social ABM, or robotics-oriented embodied navigation platforms, which either lack the neuro-symbolic verification loop, the web-native 3D environment, or the LLM-powered multi-agent social layer.
## 8. Academic Writing and Terminology Guidelines
### 8.1 Terminology Usage
For clarity and alignment with the literature:

- Use **"generative agents"** when referring to LLM-driven agents with memory, reflection, and planning capabilities, following Park et al..[2][9]
- Use **"LLM-empowered agent-based modeling"** or **"LLM-based ABM"** when situating the work within broader simulation studies across social, cyber, and physical domains.[11][3]
- Use **"embodied LLM agents"** or **"embodied spatial agents"** when emphasizing physical navigation, perception, and 3D interaction.[4][5]
- Use **"neuro-symbolic cognitive architecture"** when describing the Context Mixer + LLM + CapabilityAdaptor pipeline.[7][8]
- Reserve **"3D spatial intelligence"** and **"LLM 3D capacity"** for sections directly engaging with surveys on spatial reasoning and 3D understanding in LLMs.[5][6]
### 8.2 Positioning Statements
In the thesis or papers, consider standard formulations such as:

- *"Building on Generative Agents, which demonstrated LLM-driven emergent behavior in a 2D sandbox town, this work extends generative agents into a continuous 3D environment with explicit spatial grounding and neuro-symbolic verification."*[2][10]
- *"Unlike large-scale social simulations that prioritize population-level phenomena in abstract spaces, our focus is on fine-grained 3D navigation and local coordination in a physically simulated lab environment."*[12][11]
- *"In contrast to embodied navigation systems that treat LLMs primarily as planners atop perception stacks, 3D Spatial Agents integrates LLM cognition into a multi-agent social setting with task queues, drives, and interpersonal communication."*[4][5]
- *"The architecture aligns with recent neuro-symbolic agent frameworks that combine neural proposal generators with symbolic constraint engines, but is instantiated within a web-native 3D game loop accessible via the browser."*[7][8]
### 8.3 Methodological and Reporting Guidelines
- Explicitly describe the **cognitive loop** (perception → context mixing → LLM reasoning → symbolic verification → execution) and relate it to established patterns in generative agents and neuro-symbolic architectures.[2][7]
- Justify the use of **LLM backends** (e.g., Llama 4 Maverick vs Llama 3.1 8B) by referencing broader trends in LLM agent research, but keep the focus on **relative behavior and system trade-offs** rather than raw model benchmarks.[11][3]
- When evaluating **spatial language**, connect the metric to findings from spatial intelligence surveys that highlight gaps in LLM spatial reasoning and the need for richer benchmarks.[5][6]
- For **neuro-symbolic claims**, avoid overstating formal guarantees; characterize the CapabilityAdaptor as a **symbolic precondition and consistency layer** rather than a fully verified constraint solver, unless formal verification is added.[7][8]
## 9. Conclusion
The current state of the art features powerful but largely separate strands: social generative agents in simple environments, large-scale LLM-empowered ABM, embodied navigation in robotics-grade simulators, and neuro-symbolic architectures for robust decision-making. 3D Spatial Agents occupies a distinctive niche at their intersection by providing a web-native 3D lab where LLM-driven generative agents act through a neuro-symbolic control loop with explicit spatial grounding and comprehensive instrumentation. Framing the work with the terminology, comparisons, and citation patterns outlined above will align it with contemporary literature while highlighting its unique contributions.
