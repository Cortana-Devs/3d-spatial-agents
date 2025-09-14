"use client";

// Module System Core
export {
  ModuleManager,
  useModuleSystem,
  ModulePerformanceMonitor,
} from "./ModuleManager";
export type { ModuleConfig, ModuleState, ModuleContext } from "./ModuleManager";

// Individual Modules
export { default as AnimationModule } from "./AnimationModule";
export { default as BlockPlacementModule } from "./BlockPlacementModule";
export { default as PlayerControlModule } from "./PlayerControlModule";
export { default as SkyboxModule } from "./SkyboxModule";

// Module Types
export interface ModuleSystemProps {
  enableAnimations?: boolean;
  enableBlockPlacement?: boolean;
  enablePlayerControls?: boolean;
  enableSkybox?: boolean;
  enablePerformanceMonitoring?: boolean;
}

// Performance Configuration
export const PERFORMANCE_PRESETS = {
  HIGH_PERFORMANCE: {
    animations: {
      maxSimulants: 30,
      animationQuality: "high" as const,
      maxAnimationsPerFrame: 8,
    },
    blockPlacement: {
      debounceMs: 8,
      maxRaycastsPerFrame: 3,
      enableBatching: true,
    },
    playerControls: {
      targetFPS: 60,
      smoothing: 0.05,
    },
  },
  BALANCED: {
    animations: {
      maxSimulants: 20,
      animationQuality: "medium" as const,
      maxAnimationsPerFrame: 5,
    },
    blockPlacement: {
      debounceMs: 16,
      maxRaycastsPerFrame: 2,
      enableBatching: true,
    },
    playerControls: {
      targetFPS: 60,
      smoothing: 0.1,
    },
  },
  LOW_END: {
    animations: {
      maxSimulants: 10,
      animationQuality: "low" as const,
      maxAnimationsPerFrame: 3,
    },
    blockPlacement: {
      debounceMs: 33,
      maxRaycastsPerFrame: 1,
      enableBatching: true,
    },
    playerControls: {
      targetFPS: 30,
      smoothing: 0.2,
    },
  },
} as const;

// Utility functions
export const ModuleUtils = {
  // Detect performance tier based on device capabilities
  detectPerformanceTier: (): keyof typeof PERFORMANCE_PRESETS => {
    if (typeof window === "undefined") return "BALANCED";

    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");

    if (!gl) return "LOW_END";

    // Basic GPU detection
    const renderer = gl.getParameter(gl.RENDERER) || "";
    const vendor = gl.getParameter(gl.VENDOR) || "";

    // High-end indicators
    if (
      renderer.includes("RTX") ||
      renderer.includes("RX 6") ||
      renderer.includes("RX 7")
    ) {
      return "HIGH_PERFORMANCE";
    }

    // Low-end indicators
    if (
      renderer.includes("Intel") ||
      renderer.includes("Mali") ||
      renderer.includes("Adreno")
    ) {
      return "LOW_END";
    }

    // Check memory
    const memory = navigator.deviceMemory;
    if (memory && memory < 4) return "LOW_END";
    if (memory && memory >= 8) return "HIGH_PERFORMANCE";

    return "BALANCED";
  },

  // Get recommended settings based on current performance
  getRecommendedSettings: (
    performanceTier?: keyof typeof PERFORMANCE_PRESETS,
  ) => {
    const tier = performanceTier || ModuleUtils.detectPerformanceTier();
    return PERFORMANCE_PRESETS[tier];
  },

  // Monitor frame rate and suggest performance adjustments
  createPerformanceMonitor: () => {
    let frames = 0;
    let lastTime = performance.now();
    let averageFPS = 60;

    return {
      update: () => {
        frames++;
        const currentTime = performance.now();

        if (currentTime - lastTime >= 1000) {
          averageFPS = (frames * 1000) / (currentTime - lastTime);
          frames = 0;
          lastTime = currentTime;
        }

        return averageFPS;
      },

      getRecommendation: () => {
        if (averageFPS < 25) return "LOW_END";
        if (averageFPS > 55) return "HIGH_PERFORMANCE";
        return "BALANCED";
      },
    };
  },
};
