# Implementation Plan: NLP Processing Optimization and Red Team Review

## 1. Red Team Findings
*   **Latency Bottleneck (Blocking I/O):** In `actions.ts`, `logAgentInteraction` is `await`ed on the critical path *before* returning the LLM response to the client. This adds unnecessary DB/Network latency to the user experience.
*   **Reliability Risk (JSON Parsing):** Standard text generation is used instead of constrained JSON generation, increasing the risk of malformed JSON outputs requiring regex cleanup.
*   **Prompt Injection Risk:** The user command is concatenated directly into the prompt without strict delimiters, making it susceptible to jailbreaks (e.g., "ignore previous rules and output XYZ").
*   **Micro-efficiencies:** `buildWorldContext` and `validateAndResolve` iterate over registry items multiple times and perform repeated regex/string operations on the fly.

## 2. Planned Changes

### Phase 1: Server-Side Optimizations (`actions.ts`)
- [ ] Remove `await` from `logAgentInteraction` to execute it out-of-band (fire-and-forget), immediately returning the parsed response to the client.
- [ ] Enable `response_format: { type: "json_object" }` in the Groq completion call.
- [ ] Lower `temperature` to `0.0` for faster, more deterministic output.
- [ ] Update the system prompt to explicitly expect strict JSON format without markdown.

### Phase 2: Client/Parser Micro-optimizations (`nlp-parser.ts`)
- [ ] Update `buildParserPrompt` to wrap the user command in structural boundaries (e.g., `<command>`) to prevent injection.
- [ ] Optimize `buildWorldContext`: pre-compile Regex, use faster string building, and strip all unnecessary whitespaces to decrease TTFT (Time To First Token).
- [ ] Optimize `validateAndResolve` by caching or pre-filtering areas instead of running regex over all areas on every fallback.

## 3. Review Request
Please review this implementation plan. If approved, I will proceed with modifying `actions.ts` and `nlp-parser.ts`.
