/**
 * Deterministic Random Number Generator for Island Generation
 *
 * Provides seedable, deterministic random number generation using a simple
 * Linear Congruential Generator (LCG) for consistent island generation results.
 */

export interface RNG {
  next(): number;
  nextInt(min: number, max: number): number;
  pick<T>(arr: T[], weights?: number[]): T;
  shuffleInPlace<T>(arr: T[]): void;
  seed(newSeed: number): void;
  clone(): RNG;
}

/**
 * Simple hash function to convert string seeds to numbers
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Create a deterministic RNG from a seed
 */
export function createDeterministicRNG(seed: number | string, suffix?: string): RNG {
  let currentSeed: number;

  if (typeof seed === 'string') {
    const fullSeed = suffix ? `${seed}:${suffix}` : seed;
    currentSeed = hashString(fullSeed);
  } else {
    currentSeed = seed;
  }

  // Ensure seed is positive and not zero
  if (currentSeed <= 0) {
    currentSeed = Math.abs(currentSeed) + 1;
  }

  // Linear Congruential Generator constants (from Numerical Recipes)
  const a = 1664525;
  const c = 1013904223;
  const m = 2 ** 32;

  const rng: RNG = {
    /**
     * Generate next random number in range [0, 1)
     */
    next(): number {
      currentSeed = (a * currentSeed + c) % m;
      return currentSeed / m;
    },

    /**
     * Generate random integer in range [min, max]
     */
    nextInt(min: number, max: number): number {
      if (min > max) {
        throw new Error(`Invalid range: min (${min}) > max (${max})`);
      }
      const range = max - min + 1;
      return min + Math.floor(rng.next() * range);
    },

    /**
     * Pick random element from array, optionally with weights
     */
    pick<T>(arr: T[], weights?: number[]): T {
      if (arr.length === 0) {
        throw new Error('Cannot pick from empty array');
      }

      if (!weights || weights.length !== arr.length) {
        // Uniform selection
        const index = Math.floor(rng.next() * arr.length);
        return arr[index];
      }

      // Weighted selection
      const totalWeight = weights.reduce((sum, w) => sum + (w || 0), 0);
      if (totalWeight <= 0) {
        throw new Error('Total weight must be positive');
      }

      let randomWeight = rng.next() * totalWeight;
      for (let i = 0; i < arr.length; i++) {
        randomWeight -= weights[i] || 0;
        if (randomWeight <= 0) {
          return arr[i];
        }
      }

      // Fallback (shouldn't happen with proper weights)
      return arr[arr.length - 1];
    },

    /**
     * Shuffle array in place using Fisher-Yates algorithm
     */
    shuffleInPlace<T>(arr: T[]): void {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rng.next() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    },

    /**
     * Reset the RNG with a new seed
     */
    seed(newSeed: number): void {
      currentSeed = newSeed > 0 ? newSeed : Math.abs(newSeed) + 1;
    },

    /**
     * Create a copy of this RNG with the same internal state
     */
    clone(): RNG {
      return createDeterministicRNG(currentSeed);
    }
  };

  return rng;
}

/**
 * Utility function to create multiple RNGs with different suffixes
 */
export function createSeededRNGs(baseSeed: number | string, suffixes: string[]): Map<string, RNG> {
  const rngs = new Map<string, RNG>();

  for (const suffix of suffixes) {
    rngs.set(suffix, createDeterministicRNG(baseSeed, suffix));
  }

  return rngs;
}

/**
 * Test determinism - useful for debugging
 */
export function testDeterminism(seed: number | string, iterations: number = 1000): boolean {
  const rng1 = createDeterministicRNG(seed);
  const rng2 = createDeterministicRNG(seed);

  for (let i = 0; i < iterations; i++) {
    if (rng1.next() !== rng2.next()) {
      return false;
    }
  }

  return true;
}

/**
 * Generate a sequence of random numbers for testing
 */
export function generateSequence(seed: number | string, count: number): number[] {
  const rng = createDeterministicRNG(seed);
  const sequence: number[] = [];

  for (let i = 0; i < count; i++) {
    sequence.push(rng.next());
  }

  return sequence;
}
