# Descendants 🌌

> **A Next-Generation Agentic AI Simulation Platform**  
> *Powered by Cortana Research & Development Center*

![Cortana Descendants Large](https://github.com/user-attachments/assets/ccf630db-ff2b-4ad2-9f2d-5cf5262c6eff)


## 📖 Overview

**Descendants** is an advanced 3D simulation platform designed to bridge the gap between human intelligence and artificial agents. Built on a "Modular Monolith" architecture, it combines high-fidelity 3D rendering with autonomous agent logic, enabling complex interactions in a persistent virtual world.

This project represents the foundation of **CortanaOS**—a future operating system for spatial computing and agentic collaboration.

## 🚀 Vision & Future

Our roadmap is driven by the convergence of Spatial Intelligence and Generative AI.

### 🧠 6-Layer Design Architecture
1.  **Application Layer**: User interfaces, Next-gen UI/UX.
2.  **Communication Layer**: Multi-Protocol Support (MCP), A2A (Agent-to-Agent) messaging.
3.  **Intelligence Layer**: Agentic AI, Large Model integration (500+ models), Adaptive Context.
4.  **Spatial Layer**: World Engine, Custom 3D Pipeline, Physics & Environment.
5.  **Encryption Layer**: Secure data handling for "Dual User" (Human & Simulant) privacy.
6.  **Hardware Abstraction Layer**: Cross-platform compatibility (Web, VR/AR).

### 🌟 Key Pillars
*   **RealityLink**: Seamless bridging of virtual and physical contexts.
*   **Simulated Vision**: Agents possess depth perception, temporal context, and simulated "senses".
*   **Time-Travel**: Advanced state management allowing temporal navigation of simulation states.
*   **Agentic Collaboration**: Simulants (AI) and Humans working together in shared spaces.

---

## 🏗️ Current Architecture

The current codebase establishes the **Core/Spatial** and **Intelligence** layers:

### 🎮 World Engine (Spatial Layer)
*   **Rendering**: `React Three Fiber` (R3F) & `Three.js` for high-performance WebGL graphics.
*   **Physics & Environment**:
    *   Dynamic **Time System** (Day/Night cycles) with accurate Sun/Moon positioning.
    *   Procedural Terrain generation using FBM noise & Instanced foliage.
    *   **Atmospheric Zone Controller** for smooth Fog/Lighting transitions between biomes.
    *   Collision detection with Raycasting and Height-field physics.

### 🤖 AI System (Intelligence Layer)
*   **Brain**: Integrated with **Google Gemini 2.5 Flash** for high-level decision making.
    *   *Perception*: Agents "see" nearby entities (Players, Agents, Obstacles) and their status.
    *   *Reasoning*: Agents autonomously decide to Follow, Wander, Chat, or Wait based on visual context.
*   **Motor Control**: Powered by **Yuka AI** for autonomous steering behaviors.
    *   `Seek`, `Wander`, `Separation`, `ObstacleAvoidance`.
    *   Smooth navigation and separation logic for crowd dynamics.
*   **Social**:
    *   Agent-to-Agent interactions (Greeting, Chatting states).
    *   Agent-to-Player interactions (Look-at, Waving, Following).

### 🛠 Tech Stack
*   **Framework**: Next.js 16 (React 19)
*   **Language**: TypeScript
*   **State Management**: Zustand
*   **AI/ML**: Google GenAI SDK (Gemini), Yuka GameAI
*   **3D**: React Three Fiber, Drei

---

## 💻 Getting Started

### Prerequisites
*   Node.js 18+
*   pnpm (recommended) or npm
*   Google Gemini API Key

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/Cortana-Devs/Descendants.git
    cd Descendants
    ```

2.  **Install dependencies**
    ```bash
    pnpm install
    ```

3.  **Environment Setup**
    Create a `.env.local` file in the root directory:
    ```env
    NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here
    ```

4.  **Run Development Server**
    ```bash
    pnpm dev
    ```
    Open [http://localhost:3000](http://localhost:3000) to enter the simulation.

---

## 🗺️ Roadmap

| Phase | Status | Feature |
|-------|:------:|---------|
| **Phase 1: Foundation** | ✅ | Core 3D Engine, Procedural Terrain, Day/Night Cycle |
| **Phase 2: Intelligence** | ✅ | Gemini 2.5 Integration, Yuka Steering, Basic Agent Behaviors |
| **Phase 3: Social** | 🚧 | Multi-Agent Chat, Group Dynamics, "Simulacra" Personality Engine |
| **Phase 4: Expansion** | ⏳ | Infinite Terrain, MCP Integration, RealityLink Prototype |
| **Phase 5: CortanaOS** | 🔮 | Full Operating System Logic, Async Priority Queues, Deep Memory |

---

## 🤝 Contributing

We welcome contributions from industry experts and engineers.
1.  Fork the repository.
2.  Create your feature branch (`git checkout -b feature/amazing-feature`).
3.  Commit your changes (`git commit -m 'Add some amazing feature'`).
4.  Push to the branch (`git push origin feature/amazing-feature`).
5.  Open a Pull Request.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

*Designed and engineered by the Cortana Research & Development Center.*
