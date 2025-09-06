// Frosted Glass Floor System - Main Entry Point
// Phase 6: Integration and Polish

// Core System Components
export {
  FloorSystemManager,
  useFloorSystem,
} from "../systems/integration/FloorSystemIntegrator";
export type {
  FloorSystemConfig,
  FloorSystemState,
} from "../systems/integration/FloorSystemIntegrator";

// Floor Components
export { FrostedGlassFloor } from "../components/floors/FrostedGlassFloor";

// Materials and Presets
export {
  MATERIAL_PRESETS,
  MaterialPresetManager,
} from "../presets/MaterialPresets";
export type { MaterialPreset } from "../types/materialTypes";

// Factory and Utilities
export { FloorFactory } from "../utils/floorFactory";

// Performance Systems
export { FloorLODManager } from "../systems/FloorLODManager";
export type { LODLevel } from "../systems/FloorLODManager";

export { TransparencyBatcher } from "../systems/TransparencyBatcher";
export type { BatchGroup } from "../systems/TransparencyBatcher";

export { PerformanceMonitor } from "../systems/PerformanceMonitor";
export type { PerformanceMetrics } from "../systems/PerformanceMonitor";

export { AdaptiveQualityManager } from "../systems/AdaptiveQuality";
export type { QualityPreset } from "../systems/AdaptiveQuality";

// AI Navigation System
export {
  TransparentNavMeshGenerator,
  TransparentPathfinder,
  TransparentSurfacePerception,
  FloorNavigationAnalyzer,
} from "./components/floors/ai";

export type {
  NavMeshNode,
  NavMeshEdge,
  NavMesh,
  PathfindingOptions,
  PathNode,
  PathResult,
  AINavigationProperties,
  SafetyLevel,
  AIPerceptionData,
  AIVisualCue,
  PerceptionContext,
} from "./components/floors/ai";

// UI Components
export { FloorControlPanel } from "../components/ui/FloorControlPanel";

// Types
export type { GlassType, FloorMetadata, Block } from "../types/floorTypes";

export type { FrostedGlassFloor } from "../types/floorTypes";

// Build Optimization
export { BuildOptimizer, optimizeForProduction } from "../build/BuildOptimizer";

// Constants
export { FLOOR_CONSTANTS } from "../config/floorConstants";

// Examples and Demos
export { CompleteFloorSystemDemo } from "../examples/CompleteFloorSystemDemo";

// Debug Tools
export { default as AdvancedDebugInterface } from "./debug/AdvancedDebugInterface";
export { default as PerformanceBenchmark } from "./debug/PerformanceBenchmark";
export { default as VisualTestFramework } from "./debug/VisualTestFramework";

// Version and build info
export const FLOOR_SYSTEM_VERSION = "1.0.0";
export const BUILD_DATE = new Date().toISOString();

// Import the config type properly
import type { FloorSystemConfig } from "../systems/integration/FloorSystemIntegrator";

// Default configurations
export const DEFAULT_FLOOR_SYSTEM_CONFIG: FloorSystemConfig = {
  maxFloors: 100,
  enableLOD: true,
  enableBatching: true,
  enableAINavigation: true,
  enableAdvancedEffects: true,
  enablePerformanceMonitoring: true,
  qualityPreset: "auto",
  debugMode: false,
};

export const RECOMMENDED_CONFIGS = {
  mobile: {
    maxFloors: 25,
    enableLOD: true,
    enableBatching: true,
    enableAINavigation: false,
    enableAdvancedEffects: false,
    enablePerformanceMonitoring: true,
    qualityPreset: "low",
    debugMode: false,
  } as FloorSystemConfig,

  desktop: {
    maxFloors: 100,
    enableLOD: true,
    enableBatching: true,
    enableAINavigation: true,
    enableAdvancedEffects: true,
    enablePerformanceMonitoring: true,
    qualityPreset: "auto",
    debugMode: false,
  } as FloorSystemConfig,

  highEnd: {
    maxFloors: 200,
    enableLOD: true,
    enableBatching: true,
    enableAINavigation: true,
    enableAdvancedEffects: true,
    enablePerformanceMonitoring: true,
    qualityPreset: "ultra",
    debugMode: false,
  } as FloorSystemConfig,
};
