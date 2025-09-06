import { AnimationClip } from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

/**
 * Validation result for loaded GLTF assets
 */
export interface ValidationResult {
  isValid: boolean;
  hasAnimations: boolean;
  hasSkeleton: boolean;
  boneCount: number;
  errors: string[];
  warnings: string[];
}

/**
 * Metadata for animation clips with categorization
 */
export interface AnimationClipData {
  name: string;
  clip: AnimationClip;
  duration: number;
  looping: boolean;
  category: "locomotion" | "idle" | "action" | "expression";
  tags: string[];
}

/**
 * Asset metadata for cache management
 */
export interface AssetMetadata {
  path: string;
  size: number;
  loadTime: number;
  lastAccessed: number;
  referenceCount: number;
  isValid: boolean;
  errors: string[];
}

/**
 * Animation asset cache structure
 */
export interface AnimationAssetCache {
  avatars: Map<string, GLTF>;
  clips: Map<string, AnimationClip>;
  metadata: Map<string, AssetMetadata>;
  loadingPromises: Map<string, Promise<any>>;
}

/**
 * Cache configuration options
 */
export interface CacheConfig {
  maxCacheSize: number; // in bytes
  maxAge: number; // in milliseconds
  cleanupInterval: number; // in milliseconds
}

/**
 * Animation loader configuration
 */
export interface AnimationLoaderConfig {
  cache: CacheConfig;
  enableValidation: boolean;
  enableLogging: boolean;
  retryAttempts: number;
  retryDelay: number;
}

/**
 * Error types for animation loading
 */
export enum AnimationLoadError {
  FILE_NOT_FOUND = "FILE_NOT_FOUND",
  INVALID_FORMAT = "INVALID_FORMAT",
  CORRUPTED_FILE = "CORRUPTED_FILE",
  NO_ANIMATIONS = "NO_ANIMATIONS",
  NO_SKELETON = "NO_SKELETON",
  CACHE_FULL = "CACHE_FULL",
  NETWORK_ERROR = "NETWORK_ERROR",
}

/**
 * Animation loading error with context
 */
export interface AnimationError extends Error {
  type: AnimationLoadError;
  path: string;
  details?: any;
}

/**
 * Re-export types from animation hooks
 */
export type {
  UseRPMAnimationsOptions,
  AnimationManager,
  AnimationState as RPMAnimationState,
  PlayOptions,
  TransitionOptions,
} from "../utils/useRPMAnimations";

export type {
  AnimationState,
  AnimationControllerInterface,
  UseAnimationControllerOptions,
} from "../utils/useAnimationController";

export type {
  AnimationMapping,
  TransitionConfig as AnimationTransitionConfig,
  BlendAnimation,
  StateTransition,
} from "../utils/animationController";
