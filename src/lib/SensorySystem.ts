import * as THREE from "three";
import { NearbyEntity } from "./agent-core";

/**
 * PerceptionRecord extends the basic NearbyEntity with temporal data.
 * This allows agents to "remember" where someone was even if they look away for a few seconds.
 */
export interface PerceptionRecord extends NearbyEntity {
  lastSeen: number;
  lastKnownPosition: THREE.Vector3;
  isVisible: boolean;
}

/**
 * HearingEvent represents a sound emitted in the 3D world.
 */
export interface HearingEvent {
  emitterId: string;
  position: THREE.Vector3;
  loudness: number; // Radius of audibility in meters
  type: "footstep" | "speech" | "crash" | "interact";
  content?: string;
  timestamp: number;
}

type HearingCallback = (event: HearingEvent) => void;

/**
 * Global bus for environmental sounds.
 * Any system (player, agent, physics) can emit sounds here.
 */
export class HearingBus {
  private static listeners: Set<HearingCallback> = new Set();

  static subscribe(callback: HearingCallback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  static emit(event: Omit<HearingEvent, "timestamp">) {
    const fullEvent: HearingEvent = { ...event, timestamp: Date.now() };
    this.listeners.forEach((cb) => cb(fullEvent));
  }
}

/**
 * SensorySystem manages the local "Subconscious" perception for a single agent.
 * It processes raw world data into a filtered "Perception working memory".
 */
export class SensorySystem {
  private agentId: string;
  private workingMemory: Map<string, PerceptionRecord> = new Map();
  private recentNoises: HearingEvent[] = [];
  
  // Configuration
  private visionFov: number = Math.PI * 0.7; // ~126 degrees
  private visionRange: number = 30;
  private memoryDurationMs: number = 10000; // 10 seconds of persistence
  private noiseMemoryDurationMs: number = 5000;

  // Reusable THREE objects for performance
  private _raycaster = new THREE.Raycaster();
  private _direction = new THREE.Vector3();
  private _toEntity = new THREE.Vector3();
  private _agentForward = new THREE.Vector3();

  constructor(agentId: string) {
    this.agentId = agentId;
    this._raycaster.layers.set(1); // Only collide with world geometry
  }

  /**
   * Update the agent's perception. 
   * Returns the list of currently visible entities + recently remembered ones.
   */
  public update(
    agentPos: THREE.Vector3,
    agentQuat: THREE.Quaternion,
    rawEntities: NearbyEntity[],
    collidableMeshes: THREE.Object3D[]
  ): PerceptionRecord[] {
    const now = Date.now();
    this._agentForward.set(0, 0, 1).applyQuaternion(agentQuat);

    // 1. Process Vision
    for (const raw of rawEntities) {
      if (!raw.id || !raw.position) continue;

      const entityPos = new THREE.Vector3(raw.position.x, raw.position.y, raw.position.z);
      this._toEntity.copy(entityPos).sub(agentPos);
      const distance = this._toEntity.length();

      let isVisible = false;

      // Distance check
      if (distance <= this.visionRange) {
        // FOV check
        const angle = this._agentForward.angleTo(this._toEntity);
        if (angle <= this.visionFov / 2) {
          // Line of Sight (LoS) check
          this._direction.copy(this._toEntity).normalize();
          this._raycaster.set(agentPos, this._direction);
          this._raycaster.far = distance;

          const hits = this._raycaster.intersectObjects(collidableMeshes, true);
          // If no hits, or the first hit is the object itself (or very close to it)
          if (hits.length === 0) {
            isVisible = true;
          }
        }
      }

      // Update or create memory record
      if (isVisible) {
        this.workingMemory.set(raw.id, {
          ...raw,
          lastSeen: now,
          lastKnownPosition: entityPos.clone(),
          isVisible: true,
        });
      } else {
        // If it was previously in memory, mark it as not visible but keep it
        const existing = this.workingMemory.get(raw.id);
        if (existing) {
          existing.isVisible = false;
        }
      }
    }

    // 2. Cleanup stale memories
    for (const [id, record] of this.workingMemory.entries()) {
      if (now - record.lastSeen > this.memoryDurationMs) {
        this.workingMemory.delete(id);
      }
    }

    // 3. Process Noises
    this.recentNoises = this.recentNoises.filter(n => now - n.timestamp < this.noiseMemoryDurationMs);

    return Array.from(this.workingMemory.values());
  }

  public recordNoise(event: HearingEvent) {
    if (event.emitterId === this.agentId) return;
    this.recentNoises.push(event);
  }

  public getRecentNoises(): HearingEvent[] {
    return this.recentNoises;
  }

  /**
   * Helper to get the highest priority stimulus for attention.
   * Priority: Visible Player > Visible Agent > Recent Noise > Remembered Entity.
   */
  public getAttentionTarget(): THREE.Vector3 | null {
    const records = Array.from(this.workingMemory.values());
    
    // 1. Visible Player
    const player = records.find(r => r.type === "PLAYER" && r.isVisible);
    if (player && player.position) return new THREE.Vector3(player.position.x, player.position.y, player.position.z);

    // 2. Visible Agent
    const agent = records.find(r => r.type === "AGENT" && r.isVisible);
    if (agent && agent.position) return new THREE.Vector3(agent.position.x, agent.position.y, agent.position.z);

    // 3. Most recent loud noise
    if (this.recentNoises.length > 0) {
      const loudest = this.recentNoises.sort((a, b) => b.loudness - a.loudness)[0];
      return loudest.position;
    }

    return null;
  }
}
