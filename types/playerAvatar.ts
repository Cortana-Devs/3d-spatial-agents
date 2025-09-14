import { Vector3, Euler, AnimationMixer, AnimationAction } from "three";

// Player Avatar State Model
export interface PlayerAvatarState {
  // Model Configuration
  modelUrl: string;
  characterId: string;
  isLoaded: boolean;
  loadingProgress: number;

  // Visual State
  isVisible: boolean;
  renderLOD: "high" | "medium" | "low";
  currentAnimation: string;
  animationBlendWeight: number;

  // Transform State
  position: Vector3;
  rotation: Euler;
  scale: Vector3;

  // Animation State
  animationMixer: AnimationMixer | null;
  currentAnimations: Map<string, AnimationAction>;
  transitionState: AnimationTransition | null;

  // Performance State
  lastUpdateTime: number;
  frameSkipCount: number;
  memoryUsage: number;
}

export interface AnimationTransition {
  from: string;
  to: string;
  duration: number;
  startTime: number;
  easing: "linear" | "easeIn" | "easeOut" | "easeInOut" | "bounce";
}

// Movement Animation States
export type MovementAnimationState =
  | "idle"
  | "walking"
  | "running"
  | "jumping"
  | "falling"
  | "landing";

export interface MovementState {
  velocity: Vector3;
  speed: number;
  isGrounded: boolean;
  direction: Vector3;
  animationState: MovementAnimationState;
}

// Animation Management
export interface AnimationBlend {
  fromAction: AnimationAction;
  toAction: AnimationAction;
  duration: number;
  startTime: number;
  easing: EasingFunction;
  isActive: boolean;
}

export type EasingFunction =
  | "linear"
  | "easeInOut"
  | "easeIn"
  | "easeOut"
  | "bounce";

export interface MovementAnimationController {
  // Animation Actions
  idle: AnimationAction;
  walk: AnimationAction;
  run: AnimationAction;
  jump: AnimationAction;
  land: AnimationAction;

  // State Management
  currentState: MovementAnimationState;
  transitionToState(newState: MovementAnimationState, duration?: number): void;

  // Movement Integration
  updateFromMovement(movementState: MovementState, velocity: Vector3): void;
  calculateAnimationSpeed(velocity: Vector3): number;
}

// Performance Metrics
export interface AvatarPerformanceMetrics {
  // Rendering Performance
  averageFPS: number;
  frameTimeP99: number;
  renderTime: number;

  // Memory Metrics
  memoryUsage: number;
  textureMemory: number;
  geometryMemory: number;

  // Animation Performance
  animationUpdateTime: number;
  blendCalculationTime: number;
  activeAnimations: number;

  // System Integration
  moduleUpdateTime: number;
  stateSyncTime: number;
  networkBandwidth: number;
}

// LOD System
export interface AvatarLODController {
  updateLOD(
    cameraDistance: number,
    performanceMetrics: AvatarPerformanceMetrics,
  ): void;
  getCurrentLOD(): "high" | "medium" | "low";

  // LOD Configuration
  lodDistances: {
    high: number; // 0-10 units
    medium: number; // 10-25 units
    low: number; // 25+ units
  };

  // Performance Thresholds
  performanceThresholds: {
    frameRate: number;
    memoryUsage: number;
    renderTime: number;
  };
}

// Memory Management
export interface MemoryReport {
  currentUsage: number;
  maxUsage: number;
  utilizationPercent: number;
  recommendedActions: string[];
}

export interface AvatarMemoryManager {
  trackMemoryUsage(component: string, size: number): void;
  cleanupUnusedAssets(): void;
  getMemoryReport(): MemoryReport;
}

// Main Player Avatar Manager Interface
export interface PlayerAvatarManager {
  // Core Management
  loadAvatar(modelUrl: string): Promise<PlayerAvatarState>;
  unloadAvatar(): void;
  updateAvatarTransform(position: Vector3, rotation: Euler): void;

  // Animation Control
  playAnimation(name: string, loop?: boolean): void;
  transitionToAnimation(name: string, duration?: number): void;
  blendAnimations(primary: string, secondary: string, weight: number): void;

  // Visibility Management
  setVisible(visible: boolean): void;
  setLOD(level: "high" | "medium" | "low"): void;

  // State Management
  getAvatarState(): PlayerAvatarState;
  saveAvatarState(): void;
  restoreAvatarState(state: PlayerAvatarState): void;

  // Performance Monitoring
  getPerformanceMetrics(): AvatarPerformanceMetrics;
  optimizeForPerformance(): void;
}

// Animation Loader Extension for Player Avatars
export interface PlayerAvatarLoader {
  loadPlayerAvatar(modelUrl: string): Promise<any>; // GLTF type
  processPlayerModel(gltf: any): void;
  validatePlayerModel(gltf: any): boolean;
}

// Integration with existing systems
export interface AvatarControllerIntegration {
  // Sync with PlayerControlModule
  syncAvatarWithController(deltaTime: number): void;
  updateMovementAnimations(): void;
  calculateAvatarPosition(controllerPosition: Vector3): Vector3;
  getAvatarRotation(): Euler;

  // Performance isolation
  canSkipFrame(): boolean;
  shouldReduceLOD(): boolean;
  getFrameBudget(): number;
}

// Configuration
export interface PlayerAvatarConfig {
  // Model settings
  defaultModelUrl: string;
  preloadModels: string[];

  // Performance settings
  maxMemoryUsage: number; // bytes
  targetFrameRate: number;
  maxInputLatency: number; // ms

  // Animation settings
  defaultBlendTime: number;
  animationFrameRate: number;
  enableBlending: boolean;

  // LOD settings
  lodEnabled: boolean;
  lodDistances: AvatarLODController["lodDistances"];

  // Visibility settings
  hideInFirstPerson: boolean;
  fadeDistance: number;
  cullDistance: number;
}

// Events
export interface AvatarEvent {
  type: "loaded" | "unloaded" | "animation-changed" | "lod-changed" | "error";
  timestamp: number;
  data?: any;
}

export type AvatarEventHandler = (event: AvatarEvent) => void;

// Export all types
