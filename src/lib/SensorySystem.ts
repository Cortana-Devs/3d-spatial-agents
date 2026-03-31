import * as THREE from "three";
import type { NearbyEntity } from "@/types/agent";

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

/**
 * PerceptionInterrupt represents a stimulus that requires immediate sub-frame attention.
 */
export interface PerceptionInterrupt {
  type: "AUDIO_STARTLE" | "VISUAL_ALERT";
  position: THREE.Vector3;
  priority: number;
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
  private pendingInterrupt: PerceptionInterrupt | null = null;
  
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

  /** LoS raycasts issued in the last `update` (for dev probe). */
  public lastLosRaycastCount = 0;

  private static readonly MAX_LOS_RAYCASTS = 10;

  private _losCandidates: {
    raw: NearbyEntity;
    dist: number;
    ex: number;
    ey: number;
    ez: number;
  }[] = [];

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
    this._agentForward.set(0, 0, 1).applyQuaternion(agentQuat);
    const now = Date.now();
    this.lastLosRaycastCount = 0;

    // 0. Reset visibility for all memories (we'll re-set it for those we actually see this frame)
    for (const record of this.workingMemory.values()) {
      record.isVisible = false;
    }

    const cands = this._losCandidates;
    cands.length = 0;

    const typeRank = (t: string) =>
      t === "PLAYER" ? 0 : t === "AGENT" ? 1 : 2;

    // 1a. Distance + FOV — collect candidates for LoS (raycasts capped below)
    for (const raw of rawEntities) {
      if (!raw.id || !raw.position) continue;

      const ex = raw.position.x;
      const ey = raw.position.y;
      const ez = raw.position.z;
      this._toEntity.set(ex, ey, ez).sub(agentPos);
      const distance = this._toEntity.length();

      if (distance > this.visionRange) {
        const existing = this.workingMemory.get(raw.id);
        if (existing) existing.isVisible = false;
        continue;
      }

      const angle = this._agentForward.angleTo(this._toEntity);
      if (angle > this.visionFov / 2) {
        const existing = this.workingMemory.get(raw.id);
        if (existing) existing.isVisible = false;
        continue;
      }

      cands.push({ raw, dist: distance, ex, ey, ez });
    }

    cands.sort((a, b) => {
      const dr = typeRank(a.raw.type ?? "") - typeRank(b.raw.type ?? "");
      if (dr !== 0) return dr;
      return a.dist - b.dist;
    });

    // 1b. LoS with per-frame budget
    let losBudget = SensorySystem.MAX_LOS_RAYCASTS;
    for (const c of cands) {
      const { raw, dist, ex, ey, ez } = c;
      let isVisible = false;

      if (losBudget > 0) {
        losBudget--;
        this._toEntity.set(ex, ey, ez).sub(agentPos);
        this._direction.copy(this._toEntity).normalize();
        this._raycaster.set(agentPos, this._direction);
        this._raycaster.far = dist;
        const hits = this._raycaster.intersectObjects(collidableMeshes, true);
        this.lastLosRaycastCount++;
        if (hits.length === 0) {
          isVisible = true;
        }
      }

      if (isVisible) {
        this.workingMemory.set(raw.id!, {
          ...raw,
          lastSeen: now,
          lastKnownPosition: new THREE.Vector3(ex, ey, ez),
          isVisible: true,
        });
      } else {
        const existing = this.workingMemory.get(raw.id!);
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

  /** Latest perception snapshot without running a full update cycle. */
  public getWorkingMemory(): PerceptionRecord[] {
    return Array.from(this.workingMemory.values());
  }

  public recordNoise(event: HearingEvent, agentPos: THREE.Vector3) {
    if (event.emitterId === this.agentId) return;
    this.recentNoises.push(event);

    // If noise is very close/loud, inject an immediate interrupt
    const dist = agentPos.distanceTo(event.position);
    if (dist < event.loudness * 0.8) {
      if (!this.pendingInterrupt || this.pendingInterrupt.priority < event.loudness) {
        this.pendingInterrupt = {
          type: "AUDIO_STARTLE",
          position: event.position.clone(),
          priority: event.loudness,
          timestamp: event.timestamp
        };
      }
    }
  }

  public getPendingInterrupt(): PerceptionInterrupt | null {
    return this.pendingInterrupt;
  }

  public clearInterrupt() {
    this.pendingInterrupt = null;
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
