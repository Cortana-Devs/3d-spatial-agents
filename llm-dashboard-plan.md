# Detachable LLM Testing Dashboard Plan

## Objective

Create a separate, detachable Next.js route (`/llm-test` or `/ai-dashboard`) that allows experimentation with the NLP parsing logic (`nlp-parser.ts`) without the overhead of loading the entire 3D office environment and Three.js dependencies.

## Key Understanding of Current Architecture

1. **Config & Keys**: Managed via `src/lib/groq.ts` using `GROQ_API_KEYS` supporting comma-separated keys and rotation.
2. **Server Actions**: LLM processing is offloaded to Next.js server actions in `src/app/actions.ts` (`parseNaturalCommand`, `generateAgentThought`, `generateReflection`).
3. **Current Flow**:
   - User types a query in `<CommandBar />`.
   - `buildWorldContext` gathers 3D live state from `InteractableRegistry` and `AgentTaskRegistry`.
   - `buildParserPrompt` concatenates this context with constraints to stay under token limits.
   - Server processes using Groq's `llama-3.1-8b-instant`.
   - `validateAndResolve` parses the JSON, falls back to empty slots, or returns an error.

## Step-by-Step Dashboard Architecture

### 1. New Route Structure

Extend the Next.js `src/app` directory with a standalone page:

```
src/app/llm-test/
  ├── page.tsx          # Main dashboard layout
  ├── layout.tsx        # Ensure minimal layout (raw HTML/CSS, no 3D wrappers)
  └── components/       # Custom mock UI components
      ├── WorldStateEditor.tsx   # JSON Editor for mock items/areas/agents
      ├── PromptPreviewer.tsx    # Live view of generated string prompt length
      └── ExecutionConsole.tsx   # Terminal-like log view of latency/responses
```

### 2. Mocking the World Context

Since `InteractableRegistry` requires a 3D Canvas context to be fully effective, the dashboard will use a **Mock State Manager** using classic React `useState`. We will provide editable JSON blocks for:

- **Items**: e.g., `["notebook-1|Notebook|item|A", "laptop-3|Laptop|prop|C"]`
- **Areas**: e.g., `["Office Desk A: desk-a-slot-0(E), desk-a-slot-1(O)"]`
- **Agents**: e.g., `["agent-alpha|IDLE"]`

### 3. Dashboard Features & Layout

**Left Panel - Environment State Editor (Inputs)**

- Textareas or JSON editors allowing developers to override the real-time context.
- Buttons to "Load Preset Contexts" (e.g., _Complex Scene, Scene with Carried Items, Scene with No Empty Slots_).

**Center Panel - The Simulator**

- Natural Language Input Field (the prompt).
- Live evaluation: As context is typed, we show the result of `buildParserPrompt()` and display a live token estimation (using character length heuristic).
- Trigger button: "Run NLP Simulation".

**Right Panel - Telemetry & Output (Outputs)**

- Real-time display of execution timeline.
  - Client Processing Time
  - Server Network Latency
  - Groq API Processing Time
- Raw String Output from the model.
- Validation Object Result from `validateAndResolve()` (shows us if the agent would correctly fallback or crash).

### 4. Code Segregation Principle

By running this at `/llm-test`, we achieve a totally separate module.

- It uses the exact same `actions.ts` and `nlp-parser.ts` pure string-formatting functions.
- It bypasses dependency coupling with `useGameStore` or Three.js physics elements.
- Extremely useful for rapid prompt engineering or testing larger context scaling before throwing it into the 3D loop.

## Next Steps

1. Approve this plan.
2. Next, we can scaffold the `/llm-test/page.tsx` and build out the HTML/CSS flexbox grid.
3. Hook up `actions.parseNaturalCommand` and run a literal simulation straight from the new URL.
