# A Comparative Study of 2D vs 3D Generative Agents

(Group 9: Lasantha, Tishan, Chamath)

## Abstract

We compare how large language model (LLM) agents behave in 2D vs 3D browser environments. Inspired by Stanford’s Smallville, we focus on three behaviors: daily routines, information sharing, and simple group planning. We implement matched 2D (Pixi.js) and 3D (React Three Fiber) scenes with the same tasks and prompts, and evaluate GPT‑3.5 and Gemini 2.5 Pro. We measure behavioral outcomes (task success, coordination quality, memory use) and system outcomes (latency, frame rate, token cost). This study targets clarity and reproducibility on modest hardware. Results will show when 3D embodiment materially changes behaviors originally shown in 2D.

## 1. Introduction

LLM-driven agents can follow routines, remember events, and coordinate with others. Most classic demos (e.g., Smallville) ran in 2D worlds. Moving to 3D adds immersion and spatial complexity but also new costs and performance constraints in the browser. This project asks a simple question: given the same tasks and prompts, do agents behave differently in 3D than in 2D, and at what system cost?

### Problem

There is little controlled, apples-to-apples evidence comparing 2D and 3D embodiments for LLM agents under the same browser constraints.

### Goal and Contribution

- Provide a clean, reproducible comparison of 2D vs 3D agent behavior in the browser.
- Show how embodiment affects behavior and performance using matched tasks, prompts, and metrics.
- Release code, configs, and a short paper-style report suitable for undergrad research.

## 2. Research Questions

- RQ1: Does 3D embodiment change task success rates compared to 2D on matched tasks?
- RQ2: Does 3D affect coordination quality and the clarity of information propagation?
- RQ3: What are the system trade-offs (latency, FPS, token cost) between 2D and 3D?
- RQ4: Do results differ across LLMs (GPT‑3.5 vs Gemini 2.5 Pro)?

## 3. Related Work (Brief)

- Generative agents (Smallville) showed routines and emergent coordination in 2D text-driven settings.
- 3D embodied AI simulators (e.g., Habitat, iGibson) focus on navigation/manipulation but less on multi-agent social behavior in the browser.
- Multi-agent communication frameworks (e.g., CAMEL, MetaGPT) study protocols more than embodiment parity.

Gap: Few studies control for dimensionality (2D vs 3D) with matched prompts, tasks, and browser performance reporting.

## 4. Scope and Approach

- Environments: One small 2D town (Pixi.js) and one small 3D town (React Three Fiber) with equivalent locations and affordances.
- Agents: Perception → memory → planning → action loop with shared prompts and tools in both environments.
- Models: GPT‑3.5 (baseline) and Gemini 2.5 Pro (main comparator). Optional limited checks with Claude 4 Sonnet if budget allows.
- Constraints: Browser-based, TypeScript/Next.js, modest laptop.

## 5. Methodology

### 5.1 Parity Principles

- Task parity: Same scenario specs, tools (e.g., message sending), and success criteria.
- Prompt parity: Same prompts with light adapters (2D grid coords vs 3D vectors hidden behind an API).
- Perception parity: Text-first inputs; optional simple spatial maps.
- Reproducibility: Fixed random seeds, versioned configs, deterministic pathing (A* in 2D; navmesh in 3D).

### 5.2 Scenarios (mirrored in 2D and 3D)

1) Daily routines and schedules  
2) Information propagation and social memory updates  
3) Simple group planning (e.g., a small event)

### 5.3 Data Collected

- Agent messages, actions, paths, memory reads/writes
- Latencies, token usage, FPS, memory footprint

### 5.4 Metrics

- Behavioral: task success (%), coordination quality (rubric 0–10), plan optimality (edit distance to a simple ideal plan), memory precision/recall
- Systems: median latency, token cost, FPS, memory (MB)

### 5.5 Analysis

- Runs: 3 scenarios × 4 conditions × ~20 runs per scenario (≈ 240 runs total)
- Conditions: 2D+GPT‑3.5, 2D+Gemini 2.5 Pro, 3D+GPT‑3.5, 3D+Gemini 2.5 Pro
- Statistics: t‑tests/ANOVA where applicable with 95% confidence intervals; concise effect sizes
- Qualitative: brief review of dialogues for plausibility and coherence

## 6. Technology

- Language/Framework: TypeScript, Next.js, Vitest, ESLint
- 3D: Three.js with React Three Fiber; GLB assets (compressed when possible)
- LLMs: OpenAI (GPT‑3.5), Google (Gemini 2.5 Pro); optional Anthropic (Claude 4 Sonnet)
- Data/Backend: Supabase for logs and exports

## 7. Implementation Plan (6 Months)

- Phase 1 (Weeks 1–8): Build minimal 2D/3D scenes and a shared task API; demo + docs
- Phase 2 (Weeks 9–12): Integrate agents and the 4 conditions; configs + tests
- Phase 3 (Weeks 13–16): Instrument logging + basic optimizations; scripts for runs
- Phase 4 (Weeks 17–20): Run experiments and analyze results
- Phase 5 (Weeks 21–24): Write-up and release artifact (code + report)

## 8. Budget and Resources

- API costs: LKR 10,000 cap for main runs (GPT‑3.5 and Gemini 2.5 Pro); optional limited Claude 4 Sonnet if headroom remains
- Cloud: Supabase free tier
- Hardware: Existing laptop (16 GB RAM) and a smartphone for basic testing

## 9. Risks and Mitigations

- Task mismatch: Pilot tasks; revise specs before final runs
- API variability: Use budget caps; cache; run at off‑peak times
- 3D performance: Asset compression (Draco/KTX2), LODs, lightweight scenes
- Power/statistics: Target ~20 runs per scenario per condition; adjust if needed
- Reproducibility: Git, config versioning, seed logging

## 10. Ethics and Compliance

- No personal data; synthetic agents only; minimal risk
- Respect API terms (OpenAI, Google, Anthropic)
- Anonymize logs in exports; open‑source code under MIT where possible

## 11. Expected Outcomes

- A reproducible 2D vs 3D comparison with code, configs, and datasets
- Clear guidance on when 3D embodiment materially changes behavior or cost
- A short, undergrad‑level paper/report and a demo

## References

- Park, J. S., et al. (2023). Generative Agents: Interactive Simulacra of Human Behavior. ACM UIST.
- Savva, M., et al. (2019). Habitat: A Platform for Embodied AI Research. ICCV.
- Li, Y., et al. (2021). iGibson 2.0: Object-Centric Simulation for Robot Learning. CoRL.
- Puig, X., et al. (2018). VirtualHome: Simulating Household Activities via Programs. CVPR.
- Li, G., et al. (2023). CAMEL: Communicative Agents for "Mind" Exploration of Large Scale Language Model Society. NeurIPS.
- Hong, S., et al. (2023). MetaGPT: Meta Programming for Multi-Agent Collaborative Framework. arXiv.