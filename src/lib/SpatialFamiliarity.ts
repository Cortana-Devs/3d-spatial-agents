import * as THREE from "three";

/**
 * SpatialFamiliarity tracks an agent's individual "boredom" or familiarity with the world.
 * Each agent maintains their own map. As an agent spends time in a cell, their familiarity increases.
 * High familiarity dampens the attraction of the global InterestMap, preventing agents from
 * clustering indefinitely in the same "hot spot."
 */
export class SpatialFamiliarity {
  private gridSize: number = 20; // 20x20 grid (low res)
  private resolution: number = 10; // 10 meters per cell (world is ~200m)
  private offset: number = 100;

  private familiarity: Float32Array;

  constructor() {
    this.familiarity = new Float32Array(this.gridSize * this.gridSize);
  }

  private getIndex(x: number, z: number): number {
    const gx = Math.floor((x + this.offset) / this.resolution);
    const gz = Math.floor((z + this.offset) / this.resolution);
    
    if (gx < 0 || gx >= this.gridSize || gz < 0 || gz >= this.gridSize) return -1;
    return gz * this.gridSize + gx;
  }

  public visit(position: THREE.Vector3, deltaSec: number) {
    const idx = this.getIndex(position.x, position.z);
    if (idx !== -1) {
      // Familiarity rises as we spend time here. 
      // 0.2 means it takes ~5 seconds to reach 1.0 familiarity if stationary.
      this.familiarity[idx] = Math.min(1.0, this.familiarity[idx] + deltaSec * 0.2);
    }
  }

  public decay(deltaSec: number) {
    // Familiarity decays slowly (agent "forgets" or regains interest over time)
    // 0.016 means it takes ~60 seconds to fully forget a cell.
    const amount = deltaSec * 0.016;
    for (let i = 0; i < this.familiarity.length; i++) {
        if (this.familiarity[i] > 0) {
            this.familiarity[i] = Math.max(0, this.familiarity[i] - amount);
        }
    }
  }

  /**
   * Returns a multiplier [0.2 - 1.0] to apply to global interest.
   * A value of 0.2 means the agent is very familiar with the area and finds it 80% less interesting.
   */
  public getInterestDampening(position: THREE.Vector3): number {
    const idx = this.getIndex(position.x, position.z);
    if (idx === -1) return 1.0;
    
    const fam = this.familiarity[idx];
    // Dampen interest by up to 80% based on familiarity.
    return 1.0 - (fam * 0.8);
  }
}
