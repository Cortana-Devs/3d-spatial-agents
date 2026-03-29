# 3D Spatial Agents

A web-native 3D research lab (Donut Lab) with AI-driven robot agents and player navigation, built with **Next.js**, **React Three Fiber**, **Yuka** steering, and **Groq**-powered agent reasoning.

---

## Quick overview

- Live 3D scene with zones, furniture, placing areas, and debug overlays.
- Player robot: third-person camera, WASD, pointer lock, interactions (sit, teleport, inventory).
- AI agents: YUKA vehicles, task queue, drives, sensory system, LLM decisions via Groq (`processAgentThought` in `src/lib/agent-brain.ts`).
- Zustand global state (split into slices under `src/store/`).

---

## Tech stack

- Next.js 16 (App Router), React 19, TypeScript
- three.js, @react-three/fiber, @react-three/drei
- Yuka, Zustand
- groq-sdk (agent brain), @google/genai (optional / other features)
- ESLint

---

## Getting started

### Prerequisites

- Node 18+
- pnpm (recommended)

### Install

```bash
pnpm install
```

### Environment

Create `.env.local` at the project root. For the agent LLM you typically need Groq keys (see `src/lib/groq.ts` for variable names such as `GROQ_API_KEY` / rotation keys).

### Run

```bash
pnpm dev
# http://localhost:3000
```

```bash
pnpm build && pnpm start
```

---

## Project structure (high level)

| Path | Role |
|------|------|
| `src/app/` | Next.js routes, server actions (`actions.ts`) |
| `src/components/` | React / R3F UI and world (no runtime singletons) |
| `src/systems/` | YUKA + game singletons (`InteractableRegistry`, `AgentTaskQueue`, …) |
| `src/lib/` | Agent brain, drives, tools, sensory, workers |
| `src/constants/` | Tunable numbers (world, agent, brain, task queue) |
| `src/types/` | Shared TypeScript types |
| `src/config/` | Static layouts, personalities, routines |
| `src/store/` | Zustand: `gameStore.ts` composes `*Store` slices |

Barrel files: `src/systems/index.ts`, `src/lib/index.ts`, `src/types/index.ts`, `src/constants/index.ts`, `src/config/index.ts`, etc.

---

## Controls

- Move: **WASD** · Jump: **Space** · Sprint: **Shift** · Interact: **E** · Menu: **Esc** · Pointer lock for camera

---

## Development notes

- Typecheck: `pnpm exec tsc --noEmit`
- Lint: `pnpm lint`
- Agent prompt + Groq execution: `src/lib/agent-brain.ts` (`processAgentThought`, retries, tools).

---

## License

See repository license (if any).
