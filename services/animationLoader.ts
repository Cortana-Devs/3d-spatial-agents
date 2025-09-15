/**
 * Animation Loader Service
 * ========================
 *
 * This service provides:
 * - Gender-aware animation loading with fallback resolution
 * - Intelligent caching with memory management
 * - Priority-based preloading system
 * - Progress tracking and error handling
 * - Integration with existing Three.js animation system
 */

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { AnimationClip, Cache } from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  AnimationRegistry,
  AvatarGender,
  AnimationResolutionOptions,
  resolveAnimationPath,
  getAnimationsByPriority,
  PRIORITY_TIERS,
} from "../types/animationRegistry";
import { ANIMATION_REGISTRY } from "../data/animationRegistry";
import { devLog, devWarn, devError } from "../utils/devLogger";

// Enable Three.js caching
Cache.enabled = true;

/**
 * Cached animation clip with metadata
 */
interface CachedAnimation {
  clip: AnimationClip;
  path: string;
  semanticKey: string;
  loadTime: number;
  lastAccessed: number;
  size: number;
  gender: AvatarGender;
}

/**
 * Loading state for progress tracking
 */
interface LoadingState {
  total: number;
  loaded: number;
  failed: number;
  currentItem?: string;
  errors: Array<{ path: string; error: string }>;
}

/**
 * Preload configuration
 */
interface PreloadConfig {
  maxPriority: number;
  gender: AvatarGender;
  concurrency: number;
  retryAttempts: number;
  retryDelay: number;
}

/**
 * Cache configuration
 */
interface CacheConfig {
  maxSize: number; // Maximum number of cached animations
  maxMemoryMB: number; // Maximum memory usage estimate
  maxAge: number; // Maximum age in milliseconds
  cleanupInterval: number; // Cleanup interval in milliseconds
}

/**
 * Animation loader service class
 */
export class AnimationLoaderService {
  private loader: GLTFLoader;
  private cache = new Map<string, CachedAnimation>();
  private loadingPromises = new Map<string, Promise<AnimationClip>>();
  private registry: AnimationRegistry;
  private cacheConfig: CacheConfig;
  private cleanupTimer?: NodeJS.Timeout;
  private loadingState: LoadingState = {
    total: 0,
    loaded: 0,
    failed: 0,
    errors: [],
  };

  // Progress callbacks
  private onProgress?: (state: LoadingState) => void;
  private onError?: (error: string, path: string) => void;
  private onComplete?: () => void;

  constructor(
    registry: AnimationRegistry = ANIMATION_REGISTRY,
    cacheConfig: Partial<CacheConfig> = {},
  ) {
    this.loader = new GLTFLoader();
    this.registry = registry;
    this.cacheConfig = {
      maxSize: 200,
      maxMemoryMB: 50,
      maxAge: 5 * 60 * 1000, // 5 minutes
      cleanupInterval: 60 * 1000, // 1 minute
      ...cacheConfig,
    };

    this.startCleanupTimer();
  }

  /**
   * Load a single animation by semantic key
   */
  async loadAnimation(
    semanticKey: string,
    gender: AvatarGender,
    options: AnimationResolutionOptions = {},
  ): Promise<AnimationClip | null> {
    const cacheKey = this.getCacheKey(semanticKey, gender);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      cached.lastAccessed = Date.now();
      return cached.clip;
    }

    // Check if already loading
    const existingPromise = this.loadingPromises.get(cacheKey);
    if (existingPromise) {
      return existingPromise;
    }

    // Resolve animation path
    const path = resolveAnimationPath(
      this.registry,
      semanticKey,
      gender,
      options,
    );
    if (!path) {
      const registryEntry = this.registry[semanticKey];
      const error = `No animation path found for key: ${semanticKey} (gender: ${gender}). Registry entry: ${JSON.stringify(registryEntry, null, 2)}`;
      devError(error);
      this.onError?.(error, semanticKey);
      return null;
    }

    devLog(`🔍 Resolved path for ${semanticKey} (${gender}): ${path}`);

    // Create loading promise
    const promise = this.loadAnimationFromPath(
      path,
      semanticKey,
      gender,
      cacheKey,
    );
    this.loadingPromises.set(cacheKey, promise);

    try {
      const clip = await promise;
      return clip;
    } finally {
      this.loadingPromises.delete(cacheKey);
    }
  }

  /**
   * Load animation from file path
   */
  private async loadAnimationFromPath(
    path: string,
    semanticKey: string,
    gender: AvatarGender,
    cacheKey: string,
  ): Promise<AnimationClip> {
    const startTime = performance.now();

    try {
      devLog(`🎬 Loading animation: ${semanticKey} for ${gender} from ${path}`);

      const gltf: GLTF = await new Promise((resolve, reject) => {
        this.loader.load(
          path,
          (loadedGltf) => {
            devLog(`✅ GLTF loaded successfully: ${path}`);
            resolve(loadedGltf);
          },
          (progress) => {
            // Optional progress logging for debugging
            if (progress.total > 0) {
              const percent = Math.round(
                (progress.loaded / progress.total) * 100,
              );
              devLog(`📥 Loading ${semanticKey}: ${percent}%`);
            }
          },
          (error) => {
            devError(`❌ Failed to load GLTF: ${path}`, error);
            reject(error);
          },
        );
      });

      if (!gltf.animations || gltf.animations.length === 0) {
        const errorMsg = `No animations found in GLTF: ${path}. GLTF contains: ${Object.keys(gltf).join(", ")}`;
        devError(errorMsg);
        throw new Error(errorMsg);
      }

      devLog(`🎭 Found ${gltf.animations.length} animations in ${path}`);

      // Use the first animation clip
      const clip = gltf.animations[0];
      if (!clip) {
        const errorMsg = `Animation clip is null: ${path}`;
        devError(errorMsg);
        throw new Error(errorMsg);
      }

      devLog(
        `🎵 Animation clip loaded: ${clip.name || "unnamed"} (${clip.duration.toFixed(2)}s)`,
      );

      // Estimate memory usage (rough calculation)
      const estimatedSize = this.estimateClipSize(clip);
      const loadTime = performance.now() - startTime;

      // Cache the animation
      const cachedAnimation: CachedAnimation = {
        clip,
        path,
        semanticKey,
        loadTime,
        lastAccessed: Date.now(),
        size: estimatedSize,
        gender,
      };

      this.cache.set(cacheKey, cachedAnimation);

      devLog(
        `✅ Loaded animation: ${semanticKey} (${loadTime.toFixed(2)}ms, ~${(estimatedSize / 1024).toFixed(1)}KB)`,
      );

      return clip;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      devError(`❌ Failed to load animation: ${semanticKey} - ${errorMsg}`);
      this.onError?.(errorMsg, path);
      throw error;
    }
  }

  /**
   * Preload animations by priority
   */
  async preloadAnimations(config: Partial<PreloadConfig> = {}): Promise<void> {
    const {
      maxPriority = PRIORITY_TIERS.MEDIUM,
      gender = "masculine",
      concurrency = 4,
      retryAttempts = 2,
      retryDelay = 1000,
    }: PreloadConfig = {
      maxPriority: PRIORITY_TIERS.MEDIUM,
      gender: "masculine",
      concurrency: 4,
      retryAttempts: 2,
      retryDelay: 1000,
      ...config,
    };

    const animations = getAnimationsByPriority(this.registry, maxPriority);

    this.loadingState = {
      total: animations.length,
      loaded: 0,
      failed: 0,
      errors: [],
    };

    devLog(
      `🚀 Starting preload of ${animations.length} animations (priority ≤ ${maxPriority}, gender: ${gender})`,
    );

    // Process animations in chunks
    const chunks = this.chunkArray(animations, concurrency);

    for (const chunk of chunks) {
      const promises = chunk.map(({ key }) =>
        this.loadWithRetry(key, gender, retryAttempts, retryDelay),
      );

      await Promise.allSettled(promises);
    }

    devLog(
      `🎯 Preload complete: ${this.loadingState.loaded}/${this.loadingState.total} loaded, ${this.loadingState.failed} failed`,
    );
    this.onComplete?.();
  }

  /**
   * Load animation with retry logic
   */
  private async loadWithRetry(
    semanticKey: string,
    gender: AvatarGender,
    retryAttempts: number,
    retryDelay: number,
  ): Promise<void> {
    this.loadingState.currentItem = semanticKey;

    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      try {
        await this.loadAnimation(semanticKey, gender, { strict: false });
        this.loadingState.loaded++;
        this.onProgress?.(this.loadingState);
        return;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);

        if (attempt === retryAttempts) {
          // Final attempt failed
          this.loadingState.failed++;
          this.loadingState.errors.push({ path: semanticKey, error: errorMsg });
          devWarn(
            `⚠️ Failed to load ${semanticKey} after ${retryAttempts + 1} attempts: ${errorMsg}`,
          );
        } else {
          // Retry after delay
          devWarn(
            `⏳ Retrying ${semanticKey} (attempt ${attempt + 2}/${retryAttempts + 1})`,
          );
          await this.delay(retryDelay);
        }
      }
    }

    this.onProgress?.(this.loadingState);
  }

  /**
   * Get cached animation
   */
  getCachedAnimation(
    semanticKey: string,
    gender: AvatarGender,
  ): AnimationClip | null {
    const cacheKey = this.getCacheKey(semanticKey, gender);
    const cached = this.cache.get(cacheKey);

    if (cached) {
      cached.lastAccessed = Date.now();
      return cached.clip;
    }

    return null;
  }

  /**
   * Check if animation is cached
   */
  isCached(semanticKey: string, gender: AvatarGender): boolean {
    const cacheKey = this.getCacheKey(semanticKey, gender);
    return this.cache.has(cacheKey);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const totalSize = Array.from(this.cache.values()).reduce(
      (sum, item) => sum + item.size,
      0,
    );
    const memoryMB = totalSize / (1024 * 1024);

    return {
      totalItems: this.cache.size,
      memoryUsageMB: memoryMB,
      maxSize: this.cacheConfig.maxSize,
      maxMemoryMB: this.cacheConfig.maxMemoryMB,
      utilizationPercent: (this.cache.size / this.cacheConfig.maxSize) * 100,
      memoryUtilizationPercent: (memoryMB / this.cacheConfig.maxMemoryMB) * 100,
    };
  }

  /**
   * Clear expired items from cache
   */
  private cleanupCache(): void {
    const now = Date.now();
    const expired: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (now - item.lastAccessed > this.cacheConfig.maxAge) {
        expired.push(key);
      }
    }

    // Remove expired items
    for (const key of expired) {
      this.cache.delete(key);
    }

    // Check memory/size limits
    this.enforceMemoryLimits();

    if (expired.length > 0) {
      devLog(`🧹 Cleaned up ${expired.length} expired animations from cache`);
    }
  }

  /**
   * Enforce memory and size limits
   */
  private enforceMemoryLimits(): void {
    const stats = this.getCacheStats();

    // Check size limit
    if (this.cache.size > this.cacheConfig.maxSize) {
      this.evictLeastRecentlyUsed(this.cache.size - this.cacheConfig.maxSize);
    }

    // Check memory limit
    if (stats.memoryUsageMB > this.cacheConfig.maxMemoryMB) {
      const targetReduction = Math.ceil(this.cache.size * 0.2); // Remove 20%
      this.evictLeastRecentlyUsed(targetReduction);
    }
  }

  /**
   * Evict least recently used items
   */
  private evictLeastRecentlyUsed(count: number): void {
    const items = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed)
      .slice(0, count);

    for (const [key] of items) {
      this.cache.delete(key);
    }

    devLog(`🗑️ Evicted ${count} least recently used animations`);
  }

  /**
   * Set progress callback
   */
  onLoadProgress(callback: (state: LoadingState) => void): void {
    this.onProgress = callback;
  }

  /**
   * Set error callback
   */
  onLoadError(callback: (error: string, path: string) => void): void {
    this.onError = callback;
  }

  /**
   * Set completion callback
   */
  onLoadComplete(callback: () => void): void {
    this.onComplete = callback;
  }

  /**
   * Get current loading state
   */
  getLoadingState(): LoadingState {
    return { ...this.loadingState };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    devLog("🧹 Animation cache cleared");
  }

  /**
   * Dispose service
   */
  dispose(): void {
    this.clearCache();
    this.loadingPromises.clear();

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    devLog("🗑️ Animation loader service disposed");
  }

  // ========================================================================
  // PRIVATE UTILITY METHODS
  // ========================================================================

  private getCacheKey(semanticKey: string, gender: AvatarGender): string {
    return `${semanticKey}:${gender}`;
  }

  private estimateClipSize(clip: AnimationClip): number {
    // Rough estimation based on tracks and keyframes
    let size = 0;

    for (const track of clip.tracks) {
      // Estimate: track name + times array + values array
      size += track.name.length * 2; // UTF-16
      size += track.times.length * 4; // Float32
      size += track.values.length * 4; // Float32
    }

    return size;
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupCache();
    }, this.cacheConfig.cleanupInterval);
  }
}

/**
 * Singleton instance
 */
let animationLoaderInstance: AnimationLoaderService | null = null;

/**
 * Get singleton animation loader instance
 */
export function getAnimationLoader(): AnimationLoaderService {
  if (!animationLoaderInstance) {
    animationLoaderInstance = new AnimationLoaderService();
  }
  return animationLoaderInstance;
}

/**
 * Initialize animation loader with custom config
 */
export function initializeAnimationLoader(
  registry?: AnimationRegistry,
  cacheConfig?: Partial<CacheConfig>,
): AnimationLoaderService {
  if (animationLoaderInstance) {
    animationLoaderInstance.dispose();
  }

  animationLoaderInstance = new AnimationLoaderService(registry, cacheConfig);
  return animationLoaderInstance;
}

/**
 * Dispose singleton instance
 */
export function disposeAnimationLoader(): void {
  if (animationLoaderInstance) {
    animationLoaderInstance.dispose();
    animationLoaderInstance = null;
  }
}

// Export types
export type { CachedAnimation, LoadingState, PreloadConfig, CacheConfig };
