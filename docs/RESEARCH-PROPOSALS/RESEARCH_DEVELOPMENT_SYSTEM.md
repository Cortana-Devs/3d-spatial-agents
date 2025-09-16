# Research Proposal: Development and Evaluation of a Web-Native 3D Virtual Office Assistant for Structured Productivity Tasks

(Group Hastih, Dulitha & Nethmi)

## Abstract

This research proposes the design, implementation, and evaluation of a web-native 3D virtual office assistant capable of perceiving, navigating, and executing structured productivity tasks, such as document creation, report compilation, and workflow automation, within interactive environments built using React Three Fiber and Three.js. Targeting high-performance, cross-platform deployment, the system addresses the gap in integrating spatial reasoning with productivity workflows under real-time constraints on commodity devices. Through a developmental and experimental approach, the project will deliver a modular agent architecture, optimized rendering pipelines, and rigorous quantitative evaluations demonstrating ≥90% task accuracy and ≥50 FPS on midrange hardware. This work holds significant potential for industry applications in business process outsourcing (BPO), remote work, and digital operations, particularly in Sri Lanka's growing service sector. The project is feasible within a 6-month undergraduate timeline, with milestones aligned to iterative development and testing.

## Introduction

### Background and Motivation

The rapid advancement of web technologies has enabled immersive 3D experiences directly in browsers, leveraging frameworks like Three.js and React Three Fiber for rendering complex scenes. Concurrently, embodied AI systems have emerged as powerful tools for simulating intelligent agents in virtual environments, combining spatial navigation, object interaction, and task planning. However, current implementations often prioritize either robotic simulations or language-based agents, lacking seamless integration for productivity-oriented tasks in web-native settings.

This research focuses on a virtual office assistant domain, where agents perform document-centric workflows—such as structuring information from data sources, compiling reports, organizing files, and triggering exports—in a 3D workspace. This domain is particularly relevant to Sri Lanka's economy, where BPO and digital back-office operations contribute significantly to GDP, with sectors like finance, healthcare administration, and legal processing relying on efficient document management. By automating these tasks in immersive web environments, the proposed system can reduce manual labor, enhance productivity, and enable scalable training simulations.

The motivation stems from societal needs for accessible automation tools. Beneficiaries include software teams in remote work setups, service providers in BPO firms, and educational institutions prototyping interaction models. Ultimately, this addresses real-world challenges in bridging knowledge-intensive workflows with spatially grounded actions, fostering reliable productivity gains on commodity hardware without requiring specialized equipment.

### Research Problem Statement

Existing web-based 3D virtual agents exhibit limitations in integrating spatial reasoning (e.g., navigation and object interaction) with structured productivity workflows (e.g., document and report processes) while maintaining real-time performance on typical browsers and mobile devices. This results in fragmented systems that either excel in rendering but lack task intelligence or handle language tasks without grounded 3D interactions. The proposed research aims to develop and evaluate a system that achieves robust task execution with quantifiable accuracy, efficiency, and responsiveness, thereby filling this interdisciplinary gap.

## Literature Review

The field of embodied AI has seen substantial progress through simulators that enable agents to interact with virtual environments. For instance, Habitat provides a platform for training embodied agents in photorealistic 3D simulations, focusing on navigation and manipulation tasks. Similarly, benchmarks like BEHAVIOR-1K introduce long-horizon household activities, emphasizing complex manipulation skills in simulated settings. Comprehensive surveys map these simulators to research tasks, highlighting their role in advancing embodied intelligence. However, these platforms primarily target robotics and offline simulations, with limited emphasis on web-native deployment or productivity workflows like document management.

In parallel, LLM-driven agents have revolutionized browser-based automation. AgentOccam demonstrates a baseline for LLM-based web agents by refining observation and action spaces for task completion. ScribeAgent fine-tunes open-source LLMs for enhanced web navigation, showcasing improvements in sequential action prediction. Surveys on web agents explore architectures for next-generation AI systems capable of daily tasks. Yet, these agents often operate in 2D interfaces, lacking integration with 3D spatial reasoning essential for immersive environments.

Performance optimization in WebGL and Three.js is critical for real-time 3D applications. Techniques such as depth-based fragment culling and texture compression enhance rendering efficiency. Guides on building efficient Three.js scenes emphasize tools like React Three Fiber for maintaining quality under performance constraints. Despite these advances, few studies jointly evaluate agent task quality (e.g., accuracy in workflows) and interactive performance (e.g., FPS stability) in web-deployed 3D settings for productivity tasks.

This research addresses these gaps by combining web-native 3D rendering with embodied agent capabilities for office workflows, introducing novel metrics for joint task and performance evaluation. It builds on existing literature while innovating in cross-platform, real-time deployment tailored to resource-constrained contexts like Sri Lanka.

## Research Objectives

### Main Objective

To design, implement, and experimentally evaluate a web-native 3D virtual office assistant that integrates spatial reasoning, task planning, and document/report workflows, achieving measurable performance and accuracy on commodity hardware.

### Specific Objectives

1. Design and implement a modular agent architecture incorporating perception, navigation, interaction, and planning subsystems in TypeScript using React Three Fiber and Three.js, completed within 8 weeks.
2. Integrate robust navigation via transparent navmeshes and pathfinding algorithms, attaining ≥95% waypoint reachability across three environment types within 4 weeks.
3. Develop document/report workflow execution with backend persistence using Supabase, reaching ≥90% task accuracy on predefined benchmarks within 4 weeks.
4. Optimize rendering and asset pipelines (e.g., GLB with Draco/KTX2 compression) to maintain ≥50 FPS median on midrange laptops and ≥30 FPS on modern smartphones within 3 weeks.
5. Conduct controlled experiments comparing baseline heuristic agents to the full system, demonstrating statistically significant improvements (p < 0.05) in task completion time and success rate within 3 weeks.

## Methodology

### Research Design and Approach

This is a developmental and experimental research design, involving the construction of a production-grade browser-deployed 3D agent prototype followed by empirical evaluation. The approach includes:

- Architecting agent subsystems for perception (scene understanding), navigation (pathfinding), interaction (object affordances), and planning (behavior trees or finite state machines, with optional LLM integration).
- Implementing environments and tasks leveraging existing modules for floor, world, and animation.
- Instrumenting telemetry for metrics collection.
- Executing controlled experiments to analyze performance.

### Technology Stack and Tools

- **Programming Languages:** TypeScript.
- **3D Frameworks:** Three.js, React Three Fiber, @react-three/drei.
- **AI Components:** Behavior Trees/Finite State Machines; A* pathfinding; optional LLM API for advanced planning.
- **Development Tools:** Next.js, Vitest for testing, ESLint, PostCSS/Tailwind CSS, Supabase SDK for backend.
- **Hardware:** Midrange laptop (e.g., 16 GB RAM, Apple Silicon equivalent); modern smartphone for cross-platform testing.

### Data Collection and Analysis

Data will include task success/failure rates, completion times (seconds), path efficiency (% over optimal), collision counts (#/minute), FPS (median/p5), memory usage (MB), and CPU/GPU frame times (ms). Collection occurs via in-app telemetry hooks, JSON logs, and Supabase tables. Success is measured against thresholds (e.g., ≥90% accuracy, FPS targets) and baseline comparisons using statistical tests (t-test or Mann-Whitney U, with effect sizes and 95% confidence intervals). Analysis will employ Python scripts for data processing, ensuring reproducibility.

### Experimental Design

- **Control Groups:** Heuristic agent without navmesh/planner; unoptimized rendering (no compression/preloading).
- **Independent Variables:** Navmesh resolution, obstacle density, animation complexity, asset compression levels, device type (mobile vs. desktop).
- **Dependent Variables:** Task accuracy, completion time, FPS, memory usage.
- **Scenarios:** Three scenes of escalating complexity (simple office, cluttered workspace, multi-room setup) with scripted tasks (e.g., compile report from data sources).
- **Validation:** Train-tune/held-out split; n ≥ 30 runs per condition; user studies for UX (e.g., perceived responsiveness via Likert scales).

Human-agent interaction will be assessed through pilot tests, focusing on intuitive controls and feedback loops.

## Implementation Plan

### Phase Breakdown and Timeline

The project spans 6 months, aligned with undergraduate constraints:

- **Phase 1 (Months 1-2):** Agent scaffolding, perception, basic navigation, GLB pipeline.
- **Phase 2 (Months 2-3):** Interaction system, workflow executor, Supabase integration.
- **Phase 3 (Months 3-4):** Optimization (LOD, instancing, compression), mobile testing.
- **Phase 4 (Months 4-5):** Experiment setup, telemetry dashboards, comparisons.
- **Phase 5 (Months 5-6):** Refinements, ablations, final write-up.

### Key Milestones and Deliverables

1. Navigable agent demo (Month 2: code + video).
2. Workflow integration (Month 3: pipeline + scripts).
3. Optimized build (Month 4: report + benchmarks).
4. Experimental results (Month 5: plots + data).
5. Final report (Month 6: proposal + appendices).

## Resources and Requirements

### Technical Resources

- **Software:** Node.js, Next.js, Three.js ecosystem, Supabase, glTF tools (e.g., gltfpack, Blender).
- **Hardware:** Laptop (16 GB RAM); smartphone.
- **Cloud/APIs:** Supabase (free tier); optional LLM API.
- **Estimated Budget:** LKR 50,000 (cloud credits: LKR 20,000; hardware upgrades: LKR 20,000; software licenses: LKR 10,000). No major costs beyond developer time.

### Human Resources

- Supervisor guidance on methodology and write-up.
- Optional HCI expert for UX consultation.
- Peers for code reviews and testing.

### Ethical Considerations

No human subjects beyond pilot testers; data is synthetic and anonymized. Ethical approval is minimal risk—seek institutional confirmation. Adhere to permissive licenses for assets; ensure IP compliance.

## Risk Assessment and Mitigation

- **Risk 1: Mobile Performance Issues.** Mitigation: Prioritize optimizations (Draco/KTX2, LODs); fallback to reduced features.
- **Risk 2: Planner Instability.** Mitigation: Begin with deterministic FSM/BT; layer LLM optionally.
- **Risk 3: Backend Failures.** Mitigation: Offline caching, robust error handling, minimal dependencies.
- **Risk 4: Timeline Delays.** Mitigation: Weekly check-ins; buffer in phases.

## Expected Outcomes and Impact

### Academic Contributions

- Publications: Workshop paper on web-embodied agents; technical report on benchmarking.
- Presentations: Local AI/HCI conferences; university symposium.
- Thesis Chapters: Background, Design, Methodology, Results, Discussion.

### Practical Applications

- Industry: Automation in BPO dashboards; workflow simulations.
- Commercial: SaaS for virtual workspaces.
- Social: Productivity boosts in developing economies using affordable devices.

### Future Directions

- Multi-agent systems; NLP instructions; AR/WebXR integration.
- Scalability: Scene streaming; cloud planning.
- Extensions: ERP integrations; advanced analytics.

## References

(Note: Full references derived from cited sources; formatted per APA standards.)

- Duan, Y., et al. (2022). A Survey of Embodied AI: From Simulators to Research Tasks. arXiv:2103.04918.
- Gao, R., et al. (2024). A Comprehensive Survey on Embodied AI. arXiv:2407.06886.
- Savva, M., et al. (2019). Habitat: A Platform for Embodied AI Research. Proceedings of the IEEE/CVF International Conference on Computer Vision.
- Li, A., et al. (2023). BEHAVIOR-1K: A Benchmark for Embodied AI with 1,000 Everyday Activities. Proceedings of Machine Learning Research.
- Ning, L., et al. (2025). A Survey of WebAgents: Towards Next-Generation AI Agents. arXiv:2503.23350.
- Wang, Z., et al. (2024). AgentOccam: A Simple Yet Strong Baseline for LLM-Based Web Agents. arXiv:2410.13825.
- Patel, R., et al. (2024). ScribeAgent: Fine-Tuning Open-Source LLMs for Enhanced Web Navigation. Carnegie Mellon University Blog.
- Primozic, C. (2022). Speeding Up Three.JS with Depth-Based Fragment Culling. Personal Blog.
- MoldStud. (2024). Mastering WebGL Optimization Techniques for ThreeJs. MoldStud Articles.
- Codrops. (2025). Building Efficient Three.js Scenes: Optimize Performance While Maintaining Quality. Codrops.