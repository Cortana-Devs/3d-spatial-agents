/**
 * Noise Generation Module for Island Generation
 *
 * Provides Simplex noise and Fractional Brownian Motion (FBM) for creating
 * organic coastlines and terrain features in procedurally generated islands.
 */

import { RNG } from '../rng/DeterministicRNG';

/**
 * 2D Vector interface for noise calculations
 */
interface Vec2 {
  x: number;
  y: number;
}

/**
 * Gradient vectors for 2D Simplex noise
 */
const GRAD2 = [
  { x: 1, y: 1 }, { x: -1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: -1 },
  { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 1, y: 0 }, { x: -1, y: 0 },
  { x: 0, y: 1 }, { x: 0, y: -1 }, { x: 0, y: 1 }, { x: 0, y: -1 }
];

/**
 * Permutation table for Simplex noise
 */
class PermutationTable {
  private perm: number[];
  private permMod12: number[];

  constructor(rng: RNG) {
    // Generate permutation table
    this.perm = new Array(512);
    this.permMod12 = new Array(512);

    // Create base permutation array
    const p = Array.from({ length: 256 }, (_, i) => i);
    rng.shuffleInPlace(p);

    // Duplicate and extend for wraparound
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
      this.permMod12[i] = this.perm[i] % 12;
    }
  }

  get(index: number): number {
    return this.perm[index & 511];
  }

  getMod12(index: number): number {
    return this.permMod12[index & 511];
  }
}

/**
 * 2D Simplex Noise Generator
 */
export class SimplexNoise2D {
  private permTable: PermutationTable;

  // Skewing and unskewing factors for 2D
  private static readonly F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
  private static readonly G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

  constructor(rng: RNG) {
    this.permTable = new PermutationTable(rng);
  }

  /**
   * Generate 2D Simplex noise value at given coordinates
   * @param x X coordinate
   * @param y Y coordinate
   * @returns Noise value in range [-1, 1]
   */
  noise(x: number, y: number): number {
    let n0, n1, n2; // Noise contributions from the three corners

    // Skew the input space to determine which simplex cell we're in
    const s = (x + y) * SimplexNoise2D.F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const t = (i + j) * SimplexNoise2D.G2;
    const X0 = i - t; // Unskew the cell origin back to (x,y) space
    const Y0 = j - t;
    const x0 = x - X0; // The x,y distances from the cell origin
    const y0 = y - Y0;

    // For the 2D case, the simplex shape is an equilateral triangle.
    // Determine which simplex we are in.
    let i1, j1; // Offsets for second (middle) corner of simplex in (i,j) coords
    if (x0 > y0) {
      i1 = 1; j1 = 0; // lower triangle, XY order: (0,0)->(1,0)->(1,1)
    } else {
      i1 = 0; j1 = 1; // upper triangle, YX order: (0,0)->(0,1)->(1,1)
    }

    // A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and
    // a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where
    // c = (3-sqrt(3))/6
    const x1 = x0 - i1 + SimplexNoise2D.G2; // Offsets for middle corner in (x,y) unskewed coords
    const y1 = y0 - j1 + SimplexNoise2D.G2;
    const x2 = x0 - 1.0 + 2.0 * SimplexNoise2D.G2; // Offsets for last corner in (x,y) unskewed coords
    const y2 = y0 - 1.0 + 2.0 * SimplexNoise2D.G2;

    // Work out the hashed gradient indices of the three simplex corners
    const ii = i & 255;
    const jj = j & 255;
    const gi0 = this.permTable.getMod12(ii + this.permTable.get(jj));
    const gi1 = this.permTable.getMod12(ii + i1 + this.permTable.get(jj + j1));
    const gi2 = this.permTable.getMod12(ii + 1 + this.permTable.get(jj + 1));

    // Calculate the contribution from the three corners
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 < 0) {
      n0 = 0.0;
    } else {
      t0 *= t0;
      n0 = t0 * t0 * this.dot(GRAD2[gi0], x0, y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 < 0) {
      n1 = 0.0;
    } else {
      t1 *= t1;
      n1 = t1 * t1 * this.dot(GRAD2[gi1], x1, y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 < 0) {
      n2 = 0.0;
    } else {
      t2 *= t2;
      n2 = t2 * t2 * this.dot(GRAD2[gi2], x2, y2);
    }

    // Add contributions from each corner to get the final noise value.
    // The result is scaled to return values in the interval [-1,1].
    return 70.0 * (n0 + n1 + n2);
  }

  /**
   * Dot product between gradient vector and distance vector
   */
  private dot(grad: Vec2, x: number, y: number): number {
    return grad.x * x + grad.y * y;
  }
}

/**
 * Fractional Brownian Motion (FBM) noise configuration
 */
export interface FBMConfig {
  octaves: number;        // Number of noise octaves (1-8 recommended)
  frequency: number;      // Base frequency
  amplitude: number;      // Base amplitude
  lacunarity: number;     // Frequency multiplier per octave (default: 2.0)
  gain: number;          // Amplitude multiplier per octave (default: 0.5)
}

/**
 * FBM Noise Generator using Simplex noise
 */
export class FBMNoise {
  private simplex: SimplexNoise2D;

  constructor(rng: RNG) {
    this.simplex = new SimplexNoise2D(rng);
  }

  /**
   * Generate FBM noise at given coordinates
   * @param x X coordinate
   * @param y Y coordinate
   * @param config FBM configuration
   * @returns Noise value (range depends on config)
   */
  noise(x: number, y: number, config: FBMConfig): number {
    let value = 0;
    let freq = config.frequency;
    let amp = config.amplitude;
    let maxValue = 0; // Used for normalizing result to [-1,1]

    for (let i = 0; i < config.octaves; i++) {
      value += this.simplex.noise(x * freq, y * freq) * amp;
      maxValue += amp;

      freq *= config.lacunarity || 2.0;
      amp *= config.gain || 0.5;
    }

    return value / maxValue; // Normalize to [-1, 1]
  }

  /**
   * Generate ridged FBM noise (good for mountain ridges)
   */
  ridgedNoise(x: number, y: number, config: FBMConfig): number {
    let value = 0;
    let freq = config.frequency;
    let amp = config.amplitude;
    let maxValue = 0;

    for (let i = 0; i < config.octaves; i++) {
      const n = Math.abs(this.simplex.noise(x * freq, y * freq));
      value += (1 - n) * amp; // Invert and use absolute value
      maxValue += amp;

      freq *= config.lacunarity || 2.0;
      amp *= config.gain || 0.5;
    }

    return value / maxValue;
  }

  /**
   * Generate billowy FBM noise (good for clouds/organic shapes)
   */
  billowyNoise(x: number, y: number, config: FBMConfig): number {
    let value = 0;
    let freq = config.frequency;
    let amp = config.amplitude;
    let maxValue = 0;

    for (let i = 0; i < config.octaves; i++) {
      const n = Math.abs(this.simplex.noise(x * freq, y * freq));
      value += n * amp;
      maxValue += amp;

      freq *= config.lacunarity || 2.0;
      amp *= config.gain || 0.5;
    }

    return value / maxValue;
  }
}

/**
 * Utility functions for noise operations
 */
export class NoiseUtils {
  /**
   * Smooth step function for smooth interpolation
   */
  static smoothstep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  /**
   * Linear interpolation
   */
  static lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  /**
   * Clamp value between min and max
   */
  static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Remap value from one range to another
   */
  static remap(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
    const t = (value - inMin) / (inMax - inMin);
    return outMin + t * (outMax - outMin);
  }

  /**
   * Apply turbulence to noise (add multiple octaves of absolute noise)
   */
  static turbulence(noise: FBMNoise, x: number, y: number, config: FBMConfig): number {
    let value = 0;
    let freq = config.frequency;
    let amp = config.amplitude;

    for (let i = 0; i < config.octaves; i++) {
      value += Math.abs(noise.noise(x * freq, y * freq, { ...config, octaves: 1 })) * amp;
      freq *= config.lacunarity || 2.0;
      amp *= config.gain || 0.5;
    }

    return value;
  }

  /**
   * Create a radial falloff mask (circular gradient from center)
   */
  static radialFalloff(x: number, y: number, centerX: number, centerY: number, radius: number): number {
    const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
    return Math.max(0, Math.min(1, 1 - distance / radius));
  }

  /**
   * Create an elliptical falloff mask
   */
  static ellipticalFalloff(x: number, y: number, centerX: number, centerY: number, radiusX: number, radiusY: number): number {
    const dx = (x - centerX) / radiusX;
    const dy = (y - centerY) / radiusY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return Math.max(0, Math.min(1, 1 - distance));
  }
}

/**
 * Create a noise generator from an RNG
 */
export function createNoiseGenerator(rng: RNG): {
  simplex: SimplexNoise2D;
  fbm: FBMNoise;
} {
  return {
    simplex: new SimplexNoise2D(rng),
    fbm: new FBMNoise(rng)
  };
}
