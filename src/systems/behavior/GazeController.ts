import * as THREE from 'three';
import * as YUKA from 'yuka';
import type { PerceptionRecord } from '@/lib/SensorySystem';
import type { MovementPersonalityProfile } from './MovementPersonality';
import { ConversationBus } from './ConversationBus';

export type GazePriority =
  | 'conversation_partner'
  | 'entering_agent'
  | 'player_near'
  | 'audio_startle'
  | 'movement_direction'
  | 'idle_wander';

export class GazeController {
  private currentTarget = new THREE.Vector3();
  private targetPriority: number = 0;
  private gazeTimer: number = 0;
  private wanderSeed: number;

  private dummy = new THREE.Object3D();
  private euler = new THREE.Euler(0, 0, 0, 'YXZ');
  private parentInvertQuat = new THREE.Quaternion();
  
  // Variables to decouple explicit force target from resolving priority
  private forcedTarget: THREE.Vector3 | null = null;
  private forcedTargetTimer: number = 0;

  constructor(private agentId: string) {
    let hash = 0;
    for (let i = 0; i < agentId.length; i++) {
        hash = (hash << 5) - hash + agentId.charCodeAt(i);
        hash |= 0;
    }
    this.wanderSeed = Math.abs(hash);
  }

  // Pre-action look override triggered by DeliberationLayer and IdleBehaviorSystem
  public forceTarget(position: {x: number, y: number, z: number}, durationMs: number) {
    if (!this.forcedTarget) {
      this.forcedTarget = new THREE.Vector3();
    }
    this.forcedTarget.set(position.x, position.y, position.z);
    this.forcedTargetTimer = durationMs / 1000.0;
  }

  private simpleNoise2D(x: number, y: number): number {
    // Very cheap pseudo-noise for idle wander
    const n = x * 12.9898 + y * 78.233;
    return (Math.sin(n) * 43758.5453) % 1;
  }

  public resolveTarget(
    cachedPerception: PerceptionRecord[],
    conversationPartnerId: string | null,
    vehicleVelocity: YUKA.Vector3,
    vehiclePosition: YUKA.Vector3,
    playerPosition: THREE.Vector3,
    personality: MovementPersonalityProfile,
    delta: number
  ): void {
    if (this.forcedTargetTimer > 0) {
      this.forcedTargetTimer -= delta;
      this.currentTarget.copy(this.forcedTarget!);
      this.targetPriority = 1000; // Absolute max priority overriding all
      return;
    }

    // Decay current priority timer
    if (this.gazeTimer > 0) {
      this.gazeTimer -= delta;
      if (this.gazeTimer <= 0) {
        this.targetPriority = 0; // reset allowing new targets to win easily
      }
    }

    const now = Date.now();
    const speedSq = vehicleVelocity.x * vehicleVelocity.x + vehicleVelocity.z * vehicleVelocity.z;

    // Evaluate priorities (highest to lowest). If we find a match and its priority >= current priority, switch to it.
    let selectedPriority = 0;
    let newTarget = new THREE.Vector3();

    // 0. Active Speaker (Priority 150)
    const activeSpeakerId = ConversationBus.getInstance().getActiveSpeaker();
    if (activeSpeakerId && activeSpeakerId !== this.agentId) {
      const speaker = cachedPerception.find(p => p.id === activeSpeakerId);
      if (speaker) {
        selectedPriority = 150;
        newTarget.copy(speaker.lastKnownPosition);
      }
    }

    // 1. Conversation Partner (Priority 100)
    if (conversationPartnerId) {
      // Find partner in perception
      const partner = cachedPerception.find(p => p.id === conversationPartnerId);
      if (partner) {
        selectedPriority = 100;
        newTarget.copy(partner.lastKnownPosition);
      }
    }

    // 2. Entering Agent (Priority 80)
    if (selectedPriority < 80) {
      const enteringAgent = cachedPerception.find(p => p.id !== conversationPartnerId && p.type === 'AGENT' && (now - p.lastSeen) < 1500);
      if (enteringAgent) {
        selectedPriority = 80;
        newTarget.copy(enteringAgent.lastKnownPosition);
        // Give it 2s hold
        if (this.targetPriority < 80) this.gazeTimer = 2.0; 
      }
    }

    // 3. Player Near (Priority 70)
    if (selectedPriority < 70) {
      const vPos = new THREE.Vector3(vehiclePosition.x, vehiclePosition.y, vehiclePosition.z);
      if (vPos.distanceToSquared(playerPosition) < 64) {
        selectedPriority = 70;
        newTarget.copy(playerPosition);
      }
    }

    // 4. Movement Direction (Priority 30)
    if (selectedPriority < 30 && speedSq > 0.1) {
      selectedPriority = 30;
      // Look 5m ahead of velocity
      const velocityVec = new THREE.Vector3(vehicleVelocity.x, vehicleVelocity.y, vehicleVelocity.z).normalize().multiplyScalar(5);
      newTarget.set(vehiclePosition.x + velocityVec.x, vehiclePosition.y + velocityVec.y, vehiclePosition.z + velocityVec.z);
    }

    // 5. Idle Wander (Priority 10)
    if (selectedPriority < 10) {
      selectedPriority = 10;
      const t = Date.now() / 1000.0 * personality.gazeWanderRate;
      const noiseX = (this.simpleNoise2D(t, this.wanderSeed) - 0.5) * 6;
      const noiseZ = (this.simpleNoise2D(t + 100, this.wanderSeed) - 0.5) * 6;
      
      newTarget.set(vehiclePosition.x + noiseX, vehiclePosition.y, vehiclePosition.z + noiseZ);
    }

    // Update state if we found a better/equal priority
    if (selectedPriority >= this.targetPriority || this.targetPriority === 0) {
      this.currentTarget.copy(newTarget);
      this.targetPriority = selectedPriority;
    }
  }

  public getTargetQuaternion(
    headWorldPos: THREE.Vector3,
    parentWorldQuat: THREE.Quaternion,
    out: THREE.Quaternion
  ): void {
    // Use target priority: if it's idle wander it might be random, but usually target is updated.
    this.dummy.position.copy(headWorldPos);
    this.dummy.lookAt(this.currentTarget);
    
    // Convert to local space of the parent
    this.parentInvertQuat.copy(parentWorldQuat).invert();
    out.copy(this.parentInvertQuat.multiply(this.dummy.quaternion));

    // Clamp limits
    this.euler.setFromQuaternion(out, 'YXZ');
    
    const normalizeAngle = (angle: number) => {
      let a = angle % (2 * Math.PI);
      if (a > Math.PI) a -= 2 * Math.PI;
      if (a < -Math.PI) a += 2 * Math.PI;
      return a;
    };
    
    this.euler.x = THREE.MathUtils.clamp(normalizeAngle(this.euler.x), -0.6, 0.6);
    this.euler.y = THREE.MathUtils.clamp(normalizeAngle(this.euler.y), -1.2, 1.2);
    this.euler.z = 0;
    
    out.setFromEuler(this.euler);
  }
}
