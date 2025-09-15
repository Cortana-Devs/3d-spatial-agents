/**
 * Avatar System Index
 * Feature: F01-FEMALE-AVATAR
 *
 * Central export point for the avatar system components.
 * Provides easy imports for all avatar-related functionality.
 */

// Female Avatar Core Components
export {
  loadAndNormalizeFemaleAvatar,
  debugFemaleAssetMetadata,
  summarizeFemaleAsset,
  disposeNormalizedAsset,
  hasLoadedFemaleAvatar,
  type NormalizedAvatarAsset,
  SkeletonMismatchError,
} from './female/assetNormalization';

export {
  FEMALE_ANIMATIONS,
  loadFemaleAnimation,
  getFemaleAnimationsByCategory,
  debugFemaleAnimationCache,
  warmFemaleAnimationBaseline,
  isFemaleAnimationLoaded,
  getFemaleAnimationDef,
  listFemaleAnimationIds,
  resetFemaleAnimationCache,
  type AnimationDef,
  type AnimationCategory,
  AnimationNotFoundError,
  AnimationLoadError,
} from './female/animationRegistry';

export {
  FemaleAvatarRuntime,
  createFemaleAvatarRuntime,
  type AvatarRuntimeHandle,
  type AvatarDebugInfo,
  type AvatarId,
  type FemaleAvatarRuntimeOptions,
} from './female/femaleRuntimeAdapter';

// State Management
export {
  AvatarStateMachine,
  createDefaultFemaleStateMachine,
  type AvatarAnimState,
  type StateMachineConfig,
} from './state/avatarStateMachine';

// Performance & Monitoring
export {
  PerfProbe,
  getGlobalAvatarPerfProbe,
  logPerfSample,
  endAndLog,
  debugDumpPerfSamples,
  type PerfSample,
} from './perf/perfProbes';

export {
  AvatarLogTag,
  logAvatar,
  enableAvatarDebug,
  disableAvatarDebug,
  isAvatarDebugEnabled,
  getRecentAvatarLogs,
  subscribeAvatarLogs,
  clearAvatarLogBuffer,
  summarizeAvatarLogs,
  avatarLog,
  type AvatarLogRecord,
  type AvatarLogSubscriber,
} from './logging/avatarLogger';

// Fallback & Error Handling
export {
  guardedLoadFemale,
  isRecoverableLoadError,
  onFemaleLoadFailure,
  type FallbackResult,
  type GuardedLoadOptions,
  type GuardedLoadReturn,
} from './fallback/femaleFallbackGuard';

// Event System
export {
  getAvatarEventBus,
  debugAvatarEventListeners,
  summarizeAvatarEventStats,
  type AvatarEventMap,
} from './events/avatarEvents';

// Re-export types for convenience
export type {
  AvatarId,
  AvatarRuntimeHandle,
  AvatarDebugInfo,
  AnimationCategory,
  AnimationDef,
  AvatarAnimState,
  StateMachineConfig,
  PerfSample,
  AvatarLogRecord,
  AvatarLogSubscriber,
  FallbackResult,
  AvatarEventMap,
} from './female/femaleRuntimeAdapter';

// Version information
export const AVATAR_SYSTEM_VERSION = '1.0.0';
export const FEATURE_ID = 'F01-FEMALE-AVATAR';

// Default configurations for easy setup
export const DEFAULT_AVATAR_CONFIG = {
  blendMs: 250,
  enableMetrics: true,
  timeoutMs: 5000,
  enableDebug: false,
} as const;

// Quick setup utilities
export function createDefaultFemaleAvatarSetup(options?: {
  blendMs?: number;
  enableMetrics?: boolean;
  enableDebug?: boolean;
}) {
  const config = { ...DEFAULT_AVATAR_CONFIG, ...options };

  if (config.enableDebug) {
    enableAvatarDebug();
  }

  const runtime = createFemaleAvatarRuntime({
    blendMs: config.blendMs,
    enableMetrics: config.enableMetrics,
  });

  const stateMachine = createDefaultFemaleStateMachine(runtime);

  return {
    runtime,
    stateMachine,
    perfProbe: getGlobalAvatarPerfProbe(),
    eventBus: getAvatarEventBus(),
    config,
  };
}

// Development utilities
export const devUtils = {
  testFemaleRuntime: () => import('./female/femaleRuntimeAdapter').then(m => m.__devValidateFemaleRuntime),
  testStateMachine: () => import('./state/avatarStateMachine').then(m => m.__devTestFemaleStateMachine),
  testEventBus: () => import('./events/avatarEvents').then(m => m.__devTestAvatarEvents),
  testLogger: () => import('./logging/avatarLogger').then(m => m.__devTestAvatarLogger),
  testFallback: () => import('./fallback/femaleFallbackGuard').then(m => m.__devTestFemaleFallback),
  testPerf: () => import('./perf/perfProbes').then(m => m.__devSelfTestProbe),
};

// Expose development utilities globally in debug mode
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).avatarDevUtils = devUtils;
}
