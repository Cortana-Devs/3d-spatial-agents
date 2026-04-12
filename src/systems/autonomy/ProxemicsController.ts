import * as THREE from 'three';
import type { MovementPersonalityProfile } from '../behavior/MovementPersonality';

export class ProxemicsController {
  /**
   * Calculates an arrival position offset to prevent clipping into the target entity
   * while respecting the agent's spatial personality preferences.
   */
  public static calculateArrivalPosition(
    baseTarget: THREE.Vector3,
    agentPosition: THREE.Vector3,
    personality: MovementPersonalityProfile,
    targetType: 'agent' | 'player' | 'object'
  ): THREE.Vector3 {
    // Distance offset applies primarily to social targets (agents/players)
    if (targetType === 'object') return baseTarget.clone();

    // Base personal space rule is ~1.2m
    const standoffDistance = 1.0 + personality.proxemicsOffset;
    
    // Calculate direction from baseTarget to agentPosition
    const direction = new THREE.Vector3().subVectors(agentPosition, baseTarget);
    direction.y = 0; // maintain 2D grounding
    
    // If agent is exactly on target (rare), pick a deterministic safe vector
    if (direction.lengthSq() < 0.001) {
        direction.set(1, 0, 0);
    }
    
    direction.normalize();
    return baseTarget.clone().add(direction.multiplyScalar(standoffDistance));
  }
}
