import * as THREE from 'three';
import type { MovementPersonalityProfile } from './MovementPersonality';

export type IdleMicroBehavior =
  | 'weight_shift'    // pelvis sway ±2°, 1.5s
  | 'head_glance'     // gaze wander override, 0.8s
  | 'position_drift'  // sub-step 0.2m, 2s
  | 'breath_pause'    // chest expand/contract, 1.2s cycle
  | 'hand_clasp'      // arms fold, 2s hold
  ;

export interface JointRefs {
  pelvis?: THREE.Group;
  spine?: THREE.Group;
  head?: THREE.Group;
}

export class IdleBehaviorSystem {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private activeBehavior: IdleMicroBehavior | null = null;
  private behaviorTimer = 0;
  private seed: number;

  private currentOffsets = {
    pelvisX: 0, pelvisZ: 0,
    spineX: 0,
    headY: 0,
  };
  
  private targetOffsets = {
    pelvisX: 0, pelvisZ: 0,
    spineX: 0,
    headY: 0,
  };

  constructor(agentId: string) {
    // Generate simple deterministic seed from agent ID string
    let hash = 0;
    for (let i = 0; i < agentId.length; i++) {
        hash = (hash << 5) - hash + agentId.charCodeAt(i);
        hash |= 0;
    }
    this.seed = Math.abs(hash);
  }

  // Simple xorshift deterministic RNG within 0-1
  private random(): number {
    this.seed ^= this.seed << 13;
    this.seed ^= this.seed >> 17;
    this.seed ^= this.seed << 5;
    return Math.abs(this.seed % 100000) / 100000;
  }

  public start(personality: MovementPersonalityProfile): void {
    if (this.intervalId !== null) return;
    
    // Interval based on idle frequency
    const tickMs = 3000 / personality.idleFrequency;
    this.intervalId = setInterval(() => this.tick(), tickMs);
  }

  public stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.activeBehavior = null;
    this.behaviorTimer = 0;
    
    // Target zero offsets to ease out
    this.targetOffsets = { pelvisX: 0, pelvisZ: 0, spineX: 0, headY: 0 };
  }

  private tick(): void {
    // If a behavior is still holding, skip
    if (this.behaviorTimer > 0) return;

    const roll = this.random();
    if (roll < 0.3) {
      this.activeBehavior = 'weight_shift';
      this.behaviorTimer = 1.5;
      this.targetOffsets.pelvisX = (this.random() - 0.5) * 0.05; 
      this.targetOffsets.pelvisZ = (this.random() - 0.5) * 0.05;
      this.targetOffsets.spineX = 0;
      this.targetOffsets.headY = 0;
    } else if (roll < 0.6) {
      this.activeBehavior = 'breath_pause';
      this.behaviorTimer = 1.2;
      this.targetOffsets.spineX = 0.03 + this.random() * 0.02; // Slight bend forward/expand
      this.targetOffsets.pelvisX = 0;
      this.targetOffsets.pelvisZ = 0;
      this.targetOffsets.headY = 0;
    } else if (roll < 0.8) {
      this.activeBehavior = 'head_glance';
      this.behaviorTimer = 0.8;
      this.targetOffsets.headY = (this.random() - 0.5) * 0.3; // Slight yaw
      this.targetOffsets.spineX = 0;
      this.targetOffsets.pelvisX = 0;
      this.targetOffsets.pelvisZ = 0;
    } else {
      this.activeBehavior = null;
      this.behaviorTimer = 1.0;
      this.targetOffsets.pelvisX = 0;
      this.targetOffsets.pelvisZ = 0;
      this.targetOffsets.spineX = 0;
      this.targetOffsets.headY = 0;
    }
  }

  /** 
   * Updates the internal state and returns postural noise (offsets).
   * Does NOT touch joint refs directly to prevent accumulation bugs.
   */
  public getPosturalOffsets(
    delta: number,
    phase: string // e.g. from AgentTaskQueue.getCurrentPhase()
  ): { pelvisX: number; pelvisZ: number; spineX: number; headY: number } {
    // Only apply behaviors in strictly idle/dwelling phases
    if (!['IDLE', 'COMPLETED', 'GAZING', 'DWELLING'].includes(phase)) {
      this.stop();
    }

    if (this.behaviorTimer > 0) {
      this.behaviorTimer -= delta;
      if (this.behaviorTimer <= 0) {
        // Behavior ended, reset targets to neutral
        this.activeBehavior = null;
        this.targetOffsets = { pelvisX: 0, pelvisZ: 0, spineX: 0, headY: 0 };
      }
    }

    // Ease current offsets to target offsets (lerp)
    const lerpRate = 5 * delta;
    this.currentOffsets.pelvisX += (this.targetOffsets.pelvisX - this.currentOffsets.pelvisX) * lerpRate;
    this.currentOffsets.pelvisZ += (this.targetOffsets.pelvisZ - this.currentOffsets.pelvisZ) * lerpRate;
    this.currentOffsets.spineX += (this.targetOffsets.spineX - this.currentOffsets.spineX) * lerpRate;
    this.currentOffsets.headY += (this.targetOffsets.headY - this.currentOffsets.headY) * lerpRate;

    return { ...this.currentOffsets };
  }
}
