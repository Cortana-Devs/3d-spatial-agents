# Performance Bottleneck & Critical Issues Report

## Executive Summary
A systematic review of the `web-native-3d-office-assistant` 3D AI engine was conducted, specifically targeting frame-by-frame execution logic, physics routines, and state management. The review uncovered several **critical performance bottlenecks** that will profoundly degrade the frame rate (FPS) and cause severe stuttering as the scene complexity or the number of AI agents increases. 

The most urgent issue is **React state mutation occurring every frame**, which forces continuous React renders. The second major issue is **unoptimized recursive raycasting against complex geometry**.

---

## 🛑 1. CRITICAL: Per-Frame React State Updates
**Location:** [src/components/Entities/useRobotController.ts](file:///Users/chamaththiwanka/Desktop/0/Projects/web-native-3d-office-assistant/src/components/Entities/useRobotController.ts) (Inside `useFrame`)

### The Issue
Inside the `useFrame` loop (which runs at 60 to 144 FPS), the player controller rebuilds the interactive grid arrays, sorts nearby items, and updates the global Zustand state unconditionally:
```typescript
// Re-calculating and pushing arrays every frame
useGameStore.getState().setInteractionGrid(grid);
useGameStore.getState().setPlacingTargetPos(targetPos, targetType || undefined, targetId);
setPlayerPosition(mesh.position.clone());
```

### Why it's a Bottleneck
Zustand state updates force any React components subscribed to those state slices to re-render. Updating complex arrays (like `interactionGrid`) and object references 60 times a second creates immense garbage collection pressure and destroys the React render cycle, dropping the framerate significantly.

### Remediation
- **Throttling/Debouncing:** Grid calculations and state updates should be throttled to run maybe 2–5 times a second, not every frame.
- **Diffing:** Only call `setInteractionGrid` if the new grid is actually different from the previous one.
- **Transient Updates for Position:** For `setPlayerPosition`, do not store rapidly changing 3D positions in Zustand if they are only used visually. If needed by non-React systems, use a mutable ref instead of Zustand state.

---

## 🛑 2. CRITICAL: Heavy Recursive Raycasting
**Locations:** 
- [src/components/Entities/useYukaAI.ts](file:///Users/chamaththiwanka/Desktop/0/Projects/web-native-3d-office-assistant/src/components/Entities/useYukaAI.ts)
- [src/components/Entities/useRobotController.ts](file:///Users/chamaththiwanka/Desktop/0/Projects/web-native-3d-office-assistant/src/components/Entities/useRobotController.ts)

### The Issue
Both the player and AI agents use `THREE.Raycaster` with `.intersectObjects(collidableMeshes, true)`. 
- **AI Agents ([useYukaAI.ts](file:///Users/chamaththiwanka/Desktop/0/Projects/web-native-3d-office-assistant/src/components/Entities/useYukaAI.ts))**: Casts up to 3 forward-facing rays (wall avoidance) and 1 downward ray (ground detection) *per agent*. If you have 3 agents, that's 12 raycasts per frame.
- **Player ([useRobotController.ts](file:///Users/chamaththiwanka/Desktop/0/Projects/web-native-3d-office-assistant/src/components/Entities/useRobotController.ts))**: Casts 1 downward ray every frame.
- The `true` parameter forces Three.js to check every single child mesh and every triangle recursively.

### Why it's a Bottleneck
Testing rays against raw, complex level geometry (thousands of polygons) is computationally catastrophic. As the office environment grows, the CPU will choke on intersection math.

### Remediation
- **Use Dedicated Collision Meshes:** Avoid raycasting against high-poly rendered meshes. Create invisible, low-poly primitive shapes (boxes/planes) for walls and floors (`collidableMeshes`).
- **Use a NavMesh for Ground Tracking:** Instead of downward raycasts to find the floor height, sample the Y-height directly from the Navigation Mesh or use a hard-coded floor plane `y=0` if the office is flat.
- **Spatial Partitioning (Octree / BVH):** If mesh raycasting is unavoidable, use `three-mesh-bvh` to optimize raycast queries from $O(N)$ to $O(\log N)$.

---

## ⚠️ 3. SEVERE: O(N²) Collision & Nested Loops
**Location:** [src/components/Entities/useYukaAI.ts](file:///Users/chamaththiwanka/Desktop/0/Projects/web-native-3d-office-assistant/src/components/Entities/useYukaAI.ts)

### The Issue
Each AI agent iterates over every other agent to manually push them apart:
```typescript
for (const other of vehicles) {
    if (other !== vehicle) {
       // Squared distance calculations & overlap resolutions
    }
}
```
Currently, [AIManager](file:///Users/chamaththiwanka/Desktop/0/Projects/web-native-3d-office-assistant/src/components/Systems/AIManager.ts#4-51) uses YUKA's Separation Behavior alongside this hardcoded physics loop.

### Why it's a Bottleneck
While minor for 2 or 3 agents, this $O(N^2)$ loop scales terribly. If agent count increases to 10+, the sheer number of distance calculations grows exponentially.

### Remediation
- Rely exclusively on YUKA's built-in `SeparationBehavior` and spatial partitioning, rather than hardcoding physics steps. YUKA uses optimized cell spaces internally to prevent $O(N^2)$ checks if configured correctly.

---

## ⚠️ 4. SEVERE: Distance Sorting Every Frame
**Location:** [src/components/Entities/useRobotController.ts](file:///Users/chamaththiwanka/Desktop/0/Projects/web-native-3d-office-assistant/src/components/Entities/useRobotController.ts)

### The Issue
Sorting arrays of interactables and placing areas occurs inside `useFrame`:
```typescript
nearbyInteractables.sort((a, b) => a.position.distanceToSquared(robotPos) - b.position.distanceToSquared(robotPos));
nearbyPlacingAreas.sort(...)
```

### Why it's a Bottleneck
Sorting arrays continuously every frame generates unnecessary overhead, particularly because these objects only move slowly or are entirely static.

### Remediation
- Use a spatial hash grid for interactables.
- Run the proximity sort only when the player has moved a significant distance (e.g., >1 meter) from their last check point, or throttle it to 4 checks per second.

---

## ✅ 5. Systems Performing Well 
- **[ClientBrain.ts](file:///Users/chamaththiwanka/Desktop/0/Projects/web-native-3d-office-assistant/src/components/Systems/ClientBrain.ts)**: The AI LLM thinking loop is well-optimized. It uses a `RateLimiter` (5 per 60s) and operates asynchronously, meaning API calls to the LLM will not block the Three.js render thread.
- **[NavigationNetwork.ts](file:///Users/chamaththiwanka/Desktop/0/Projects/web-native-3d-office-assistant/src/components/Systems/NavigationNetwork.ts)**: The A* pathfinding implementation utilizes a small, pre-calculated 10-node graph. Because the graph size is negligible, pathfinding is almost instantaneous and does not hinder performance.
- **[AgentTaskQueue.ts](file:///Users/chamaththiwanka/Desktop/0/Projects/web-native-3d-office-assistant/src/components/Systems/AgentTaskQueue.ts)**: The task queue efficiently caches paths (`hasSetPath`) and only recalculates when necessary.

---

## Conclusion & Action Plan
If you plan to scale the office, add more agents, or deploy this on lower-end devices, **Issue #1 (Zustand updates)** and **Issue #2 (Raycasting)** must be addressed immediately. It is highly recommended to refactor [useRobotController.ts](file:///Users/chamaththiwanka/Desktop/0/Projects/web-native-3d-office-assistant/src/components/Entities/useRobotController.ts) to throttle state dispatches and implement `three-mesh-bvh` for your collidable meshes.
