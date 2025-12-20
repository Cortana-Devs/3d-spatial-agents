# web-native-3d-office-assistant 🔧🟦

A web-native, 3D office world with AI-driven robot agents and player-controlled navigation built with Next.js + React Three Fiber (R3F). This project demonstrates a blend of real-time 3D rendering, steering behaviors (via Yuka), and LLM-powered agent reasoning (Google Gemini / @google/genai).

---

## 🚀 Quick Overview

- Live 3D scene with terrain, water, hubs, bridges, lighting, and interactive portals.
- Player avatar (robot) with third-person camera, WASD movement, pointer-lock controls, and simple interactions (sit, teleport).
- AI agents (robots) driven by Yuka for steering and Google Gemini for high-level decisions.
- Rate-limited agent orchestration and a simple key rotation strategy for API reliability.

---

## 🧰 Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- three.js, @react-three/fiber (R3F), @react-three/drei
- Yuka (steering behaviors)
- Zustand (state management)
- @google/genai (Gemini client)
- ESLint

---

## ⚙️ Getting Started

### Prerequisites

- Node 18+ (or compatible)
- pnpm (recommended) or npm
- A Google Gemini API key (set as `GEMINI_API_KEY` or `GEMINI_API_KEYS`)

### Install

```bash
pnpm install
```

### Environment

Create a `.env.local` at project root (not committed). Example:

```
GEMINI_API_KEY=your_gemini_api_key_here
# or comma-separated keys for rotation
GEMINI_API_KEYS=key1,key2
```

> Tip: The project supports multiple keys via `GEMINI_API_KEYS` and will rotate keys when rate-limits are detected.

### Run (development)

```bash
pnpm dev
# then open http://localhost:3000
```

### Build / Start

```bash
pnpm build
pnpm start
```

---

## 🧪 Scripts & Utilities

- `pnpm dev` — Run Next.js in development mode
- `pnpm build` / `pnpm start` — Production build and serve
- `scripts/simulate_agency.ts` — Local script to test agent behavior & the rate limiter (uses `processAgentThought` and `RateLimiter`). Run with tsx or node if you transpile:

```bash
pnpm exec tsx scripts/simulate_agency.ts
```

---

## 🧭 Project Structure (high level)

- `src/app` — Next.js entry (pages/layouts)
- `src/components` — R3F scene pieces, Entities, Systems, and UI
  - `Core/Scene.tsx` — Composes the world and systems
  - `Entities/` — `Robot`, `AIRobot`, controllers and hooks
  - `Systems/` — `YukaSystem`, `TimeSystem`, `ZoneController`, etc.
- `src/lib` — Agent & Gemini helpers, rate limiter
  - `agent-core.ts` — Builds agent prompt, handles Gemini calls
  - `gemini.ts` — Key manager & client helpers
  - `rateLimiter.ts` — Token-bucket limiter (used in scripts/tests)
- `src/store` — `gameStore.ts` (zustand for global state)
- `scripts/` — Utilities (like `simulate_agency.ts`)

---

## 🤖 AI Agents & Behavior

- Agents run a loop that collects a concise **AgentContext** (position, nearby entities, behavior) and ask Gemini to produce a JSON action (e.g., `MOVE_TO`, `FOLLOW`, `WANDER`, `WAIT`).
- Responses are parsed and mapped to Yuka steering targets for motion.
- `src/lib/gemini.ts` manages API clients and supports rotating keys when rate limiting is detected.
- `src/lib/agent-core.ts` contains the prompt template and retry logic for robustness.

---

## 🎮 Controls & UX

- Movement: **WASD**
- Jump: **Space**
- Sprint: **Shift**
- Interact / Sit: **E**
- Menu: **Esc**
- Click to lock pointer and control the camera (third-person)

---

## ⚠️ Notes & Known Limitations

- Gemini usage requires valid API keys; without keys, agent features will not function.
- Some agent animation bindings are work-in-progress (see `AIRobot` comments about animation vs. Yuka integration).
- This is a demo / prototype — collision, networking, and persistence are intentionally minimal.

---

## 🛠 Development Notes

- Code is TypeScript-first; follow existing patterns (hooks for controllers & systems).
- Linting via ESLint. Run `pnpm exec eslint .` to check.
- If you update Gemini integration, add safe guards for rate limits and errors (see `agent-core.ts`).

---

## 📈 Roadmap (Ideas)

- Improved agent animation blending with Yuka-driven motion
- Networking/multiplayer sync for players & agents
- Better state reconciliation and server-side agent ticks
- Configurable environment presets & scenario editor

---

## Contributing ✅

1. Open an issue describing the change/bug
2. Create a branch and submit a PR with tests where appropriate
3. Keep changes small and well-documented in PR descriptions

---

## License

This project is MIT licensed — adapt as necessary.

---

If you'd like, I can: add badges (build/testing), a demo GIF, or expand sections like development workflow or architecture diagrams. Would you like me to include any of those now? 💡