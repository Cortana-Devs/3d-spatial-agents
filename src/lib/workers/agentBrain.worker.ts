import * as THREE from "three";
import NavigationNetwork from "@/systems/NavigationNetwork";

// src/lib/workers/agentBrain.worker.ts
// Web Worker for offloading Agent Brain computations:
// 1. Pathfinding (A* on Navigation Grid / NavMesh)
// 2. Visibility & Line-of-Sight checks (BVH raycasting)
// 3. Heavy LLM String/JSON Parsing

export type AgentWorkerRequest =
  | { type: "INIT_NAV"; payload: { obstacles: any[] } }
  | {
      type: "FIND_PATH";
      id: string;
      payload: {
        start: { x: number; y: number; z: number };
        end: { x: number; y: number; z: number };
      };
    };

export type AgentWorkerResponse =
  | { type: "INIT_SUCCESS" }
  | {
      type: "PATH_RESULT";
      id: string;
      pathFound: boolean;
      path: { x: number; y: number; z: number }[];
      approachPos: { x: number; y: number; z: number };
      cornerAngles?: number[];
    }
  | { type: "ERROR"; error: string };

let isInitialized = false;

self.onmessage = async (event: MessageEvent<AgentWorkerRequest>) => {
  const { type, payload } = event.data;

  try {
    switch (type) {
      case "INIT_NAV":
        // Run the heavy rebuild grid in the worker thread
        NavigationNetwork.getInstance().rebuildGrid(payload.obstacles);
        isInitialized = true;
        postResponse({ type: "INIT_SUCCESS" });
        break;

      case "FIND_PATH":
        if (!isInitialized) {
          throw new Error("Navigation not initialized");
        }

        const startVec = new THREE.Vector3(
          payload.start.x,
          payload.start.y,
          payload.start.z,
        );
        const endVec = new THREE.Vector3(
          payload.end.x,
          payload.end.y,
          payload.end.z,
        );

        // Execute heavy A* Pathfinding here.
        const result = NavigationNetwork.getInstance().findPathDetailed(
          startVec,
          endVec,
        );

        postResponse({
          type: "PATH_RESULT",
          id: (event.data as any).id,
          pathFound: result.pathFound,
          path: result.path.map((p) => ({ x: p.x, y: p.y, z: p.z })),
          approachPos: {
            x: result.approachPos.x,
            y: result.approachPos.y,
            z: result.approachPos.z,
          },
          cornerAngles: result.cornerAngles,
        });
        break;

      default:
        console.warn(`[AgentBrain Worker] Unknown message type:`, type);
    }
  } catch (error) {
    console.error("[AgentBrain Worker] Error:", error);
    postResponse({ type: "ERROR", error: String(error) });
  }
};

function postResponse(message: AgentWorkerResponse) {
  self.postMessage(message);
}
