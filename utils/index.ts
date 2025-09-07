import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Vector3 } from "three";
import { Block, BlockType, BlockDefinition } from "@/types";

// Export all block-related utilities
export * from "./blockValidation";
export * from "./blockFactory";
export * from "./blockIntegration";
export * from "../types/blocks";

// Export island generation utilities
export * from "./generation/islands/types";
export * from "./generation/islands/IslandGenerator";
export * from "./generation/islands/ArchipelagoGenerator";
export * from "./generation/islands/MassiveArchipelagoGenerator";
export * from "./generation/islands/MassiveArchipelagoPresets";
export * from "./generation/islands/integration";
export * from "./generation/islands/debug";
export * from "./generation/rng/DeterministicRNG";
export * from "./generation/noise/NoiseGenerator";

// Export animation utilities
export * from "./animationUtils";
export * from "./animationLoader";
export * from "./useExternalAnimations";
export * from "./useRPMAnimations";
export * from "./animationController";
export * from "./useAnimationController";

// Export performance optimization utilities
export * from "./performanceMonitor";
export * from "./animationMemoryManager";
export * from "./simulantCulling";
export * from "./usePerformanceOptimization";

// Utility function for merging Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Block type definitions with Axiom Design System aesthetics
export const blockDefinitions: Record<BlockType, BlockDefinition> = {
  stone: {
    color: "#666666",
    roughness: 0.8,
    metalness: 0.1,
    description: "Solid foundation material",
  },
  leaf: {
    color: "#4CAF50",
    roughness: 0.9,
    metalness: 0,
    transparency: 0.1,
    description: "Organic living material",
  },
  wood: {
    color: "#8D6E63",
    roughness: 0.7,
    metalness: 0,
    description: "Natural building material",
  },
};

// Spatial utility functions
export const spatialUtils = {
  // Convert Vector3 to position key for spatial hash map
  positionToKey: (
    position: Vector3 | { x: number; y: number; z: number },
  ): string => {
    return `${Math.round(position.x)},${Math.round(position.y)},${Math.round(position.z)}`;
  },

  // Convert position key back to coordinates
  keyToPosition: (key: string): { x: number; y: number; z: number } => {
    const [x, y, z] = key.split(",").map(Number);
    return { x, y, z };
  },

  // Calculate distance between two positions
  distance: (
    pos1: Vector3 | { x: number; y: number; z: number },
    pos2: Vector3 | { x: number; y: number; z: number },
  ): number => {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  },

  // Check if position is within bounds
  isValidPosition: (
    position: Vector3 | { x: number; y: number; z: number },
  ): boolean => {
    // Basic bounds checking - can be expanded based on world limits
    return (
      position.x >= -50 &&
      position.x <= 50 &&
      position.y >= 0 &&
      position.y <= 50 &&
      position.z >= -50 &&
      position.z <= 50
    );
  },

  // Get blocks within radius
  getBlocksInRadius: (
    blocks: Block[],
    center: Vector3 | { x: number; y: number; z: number },
    radius: number,
  ): Block[] => {
    return blocks.filter(
      (block) => spatialUtils.distance(block.position, center) <= radius,
    );
  },
};

// ID generation utilities
export const idUtils = {
  // Generate unique block ID
  generateBlockId: (): string => {
    return `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  // Generate unique simulant ID
  generateSimulantId: (): string => {
    return `simulant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  // Generate unique message ID
  generateMessageId: (): string => {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },
};

// Animation and timing utilities
export const animationUtils = {
  // Easing functions for smooth animations
  easeInOutCubic: (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
  },

  easeOutQuart: (t: number): number => {
    return 1 - --t * t * t * t;
  },

  // Lerp function for smooth interpolation
  lerp: (start: number, end: number, factor: number): number => {
    return start + (end - start) * factor;
  },

  // Vector3 lerp
  lerpVector3: (start: Vector3, end: Vector3, factor: number): Vector3 => {
    return new Vector3(
      animationUtils.lerp(start.x, end.x, factor),
      animationUtils.lerp(start.y, end.y, factor),
      animationUtils.lerp(start.z, end.z, factor),
    );
  },
};

// Performance utilities
export const performanceUtils = {
  // Debounce function for performance optimization
  debounce: <T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number,
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  // Throttle function for performance optimization
  throttle: <T extends (...args: unknown[]) => unknown>(
    func: T,
    limit: number,
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  // Check if device supports WebGL
  supportsWebGL: (): boolean => {
    try {
      const canvas = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && canvas.getContext("webgl"));
    } catch {
      return false;
    }
  },
};

// Color utilities for Axiom Design System
export const colorUtils = {
  // Convert hex to RGB
  hexToRgb: (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  },

  // Generate glow color based on block type using Axiom colors
  getGlowColor: (blockType: BlockType): string => {
    const glowMap: Record<BlockType, string> = {
      stone: "var(--color-axiom-glow-purple)", // Purple glow
      leaf: "var(--color-axiom-glow-green)", // Green glow
      wood: "var(--color-axiom-glow-amber)", // Amber glow
    };
    return glowMap[blockType];
  },

  // Get Axiom theme colors
  getAxiomColor: (colorName: string, shade?: number): string => {
    if (shade) {
      return `var(--color-axiom-${colorName}-${shade})`;
    }
    return `var(--color-axiom-${colorName})`;
  },
};
