import * as THREE from "three";
import type { AgentWorkerRequest, AgentWorkerResponse } from "./agentBrain.worker";

type PromiseCallbacks = {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
};

export class AgentBrainClient {
  private static instance: AgentBrainClient;
  private worker: Worker | null = null;
  private callbacks = new Map<string, PromiseCallbacks>();
  private messageIdCounter = 0;

  private constructor() {
    if (typeof window !== "undefined") {
      this.worker = new Worker(new URL("./agentBrain.worker.ts", import.meta.url), {
        type: "module",
      });

      this.worker.onmessage = this.handleMessage.bind(this);
      this.worker.onerror = (err) => {
        console.error("[AgentBrainClient] Worker error:", err);
      };
    }
  }

  public static getInstance(): AgentBrainClient {
    if (!AgentBrainClient.instance) {
      AgentBrainClient.instance = new AgentBrainClient();
    }
    return AgentBrainClient.instance;
  }

  private generateId(): string {
    return `req_${Date.now()}_${this.messageIdCounter++}`;
  }

  private handleMessage(event: MessageEvent<AgentWorkerResponse>) {
    const data = event.data;

    switch (data.type) {
      case "INIT_SUCCESS":
        // Initialization complete
        break;
      case "ERROR":
        console.error("[AgentBrainClient] Error from worker:", data.error);
        break;
      case "PATH_RESULT":
      case "VISIBILITY_RESULT": {
        const cbs = this.callbacks.get(data.id);
        if (cbs) {
          cbs.resolve(data);
          this.callbacks.delete(data.id);
        }
        break;
      }
      default:
        console.warn("[AgentBrainClient] Unhandled message:", data);
    }
  }

  /**
   * Initializes or updates the Navigation Grid in the background worker.
   */
  public initNav(obstacles: any[]): void {
    if (!this.worker) return;
    const req: AgentWorkerRequest = {
      type: "INIT_NAV",
      payload: { obstacles },
    };
    this.worker.postMessage(req);
  }

  /**
   * Asynchronously finds a path using A* inside the web worker.
   */
  public async findPathDetailed(
    start: THREE.Vector3,
    end: THREE.Vector3
  ): Promise<{ pathFound: boolean; path: THREE.Vector3[]; approachPos: THREE.Vector3 }> {
    if (!this.worker) {
      // Fallback if worker is unavailable
      return {
        pathFound: false,
        path: [],
        approachPos: end.clone(),
      };
    }

    const id = this.generateId();

    const promise = new Promise<any>((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
    });

    const req: AgentWorkerRequest = {
      type: "FIND_PATH",
      id,
      payload: {
        start: { x: start.x, y: start.y, z: start.z },
        end: { x: end.x, y: end.y, z: end.z },
      },
    };

    this.worker.postMessage(req);

    const result = await promise;

    if (result.type === "PATH_RESULT") {
      return {
        pathFound: result.pathFound,
        path: result.path.map((p: any) => new THREE.Vector3(p.x, p.y, p.z)),
        approachPos: new THREE.Vector3(
          result.approachPos.x,
          result.approachPos.y,
          result.approachPos.z
        ),
      };
    }

    throw new Error("Invalid response type");
  }
}
