import { AnimationClip, Object3D, SkinnedMesh, Skeleton } from "three";
import {
  GLTFLoader,
  type GLTF,
} from "three/examples/jsm/loaders/GLTFLoader.js";
import { devLog, devWarn, devError } from "@/utils/devLogger";
import {
  AnimationAssetCache,
  AnimationClipData,
  type AnimationError,
  AnimationLoadError,
  AnimationLoaderConfig,
  AssetMetadata,
  CacheConfig,
  ValidationResult,
} from "../types/animations";
import {
  categorizeAnimation,
  createCacheKey,
  estimateAssetSize,
  extractClipName,
  formatFileSize,
  generateAnimationTags,
  shouldAnimationLoop,
} from "./animationUtils";

/**
 * Default configuration for animation loader
 */
const DEFAULT_CONFIG: AnimationLoaderConfig = {
  cache: {
    maxCacheSize: 100 * 1024 * 1024, // 100MB
    maxAge: 5 * 60 * 1000, // 5 minutes
    cleanupInterval: 60 * 1000, // 1 minute
  },
  enableValidation: true,
  enableLogging: true,
  retryAttempts: 3,
  retryDelay: 1000,
};

/**
 * AnimationLoader class for loading and managing GLTF animation assets
 * Provides caching, validation, and error handling for Ready Player Me animations
 */
export class AnimationLoader {
  private cache: AnimationAssetCache;
  private config: AnimationLoaderConfig;
  private gltfLoader: GLTFLoader;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private currentCacheSize: number = 0;

  constructor(config: Partial<AnimationLoaderConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.gltfLoader = new GLTFLoader();

    this.cache = {
      avatars: new Map(),
      clips: new Map(),
      metadata: new Map(),
      loadingPromises: new Map(),
    };

    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Load avatar GLTF with caching and validation
   */
  async loadAvatarGLTF(path: string): Promise<GLTF> {
    const cacheKey = createCacheKey(path);

    // Check cache first
    const cached = this.getCachedAvatar(path);
    if (cached) {
      this.updateAccessTime(cacheKey);
      return cached;
    }

    // Check if already loading
    const loadingPromise = this.cache.loadingPromises.get(cacheKey);
    if (loadingPromise) {
      return loadingPromise;
    }

    // Start loading
    const promise = this.loadGLTFWithRetry(path);
    this.cache.loadingPromises.set(cacheKey, promise);

    try {
      const gltf = await promise;

      // Validate the loaded GLTF
      if (this.config.enableValidation) {
        const validation = this.validateGLTF(gltf);
        if (!validation.isValid) {
          throw createAnimationError(
            `Invalid avatar GLTF: ${validation.errors.join(", ")}`,
            AnimationLoadError.INVALID_FORMAT,
            path,
          );
        }
      }

      // Cache the result
      this.cacheAvatar(path, gltf);

      if (this.config.enableLogging) {
        devLog(`✅ Loaded avatar GLTF: ${path}`);
      }

      return gltf;
    } catch (error) {
      this.handleLoadError(error as Error, path);
      throw error;
    } finally {
      this.cache.loadingPromises.delete(cacheKey);
    }
  }

  /**
   * Load multiple animation clips from GLB files
   */
  async loadAnimationClips(
    paths: string[],
  ): Promise<Map<string, AnimationClip>> {
    const clipMap = new Map<string, AnimationClip>();
    const loadPromises = paths.map(async (path) => {
      try {
        const clip = await this.loadSingleAnimationClip(path);
        if (clip) {
          const clipName = extractClipName(path);
          clipMap.set(clipName, clip);
        }
      } catch (error) {
        if (this.config.enableLogging) {
          devWarn(`⚠️ Failed to load animation from ${path}:`, error);
        }
      }
    });

    await Promise.allSettled(loadPromises);

    if (this.config.enableLogging) {
      devLog(`✅ Loaded ${clipMap.size}/${paths.length} animation clips`);
    }

    return clipMap;
  }

  /**
   * Load animation clips with metadata
   */
  async loadAnimationClipsWithMetadata(
    paths: string[],
  ): Promise<Map<string, AnimationClipData>> {
    const clipDataMap = new Map<string, AnimationClipData>();

    for (const path of paths) {
      try {
        const clip = await this.loadSingleAnimationClip(path);
        if (clip) {
          const name = extractClipName(path);
          const category = categorizeAnimation(name);
          const tags = generateAnimationTags(name, category);
          const looping = shouldAnimationLoop(name, category);

          clipDataMap.set(name, {
            name,
            clip,
            duration: clip.duration,
            looping,
            category,
            tags,
          });
        }
      } catch (error) {
        if (this.config.enableLogging) {
          devWarn(`⚠️ Failed to load animation from ${path}:`, error);
        }
      }
    }

    return clipDataMap;
  }

  /**
   * Load single animation clip from GLB file
   */
  private async loadSingleAnimationClip(
    path: string,
  ): Promise<AnimationClip | null> {
    const cacheKey = createCacheKey(path);

    // Check cache first
    const cached = this.getCachedClip(extractClipName(path));
    if (cached) {
      this.updateAccessTime(cacheKey);
      return cached;
    }

    // Check if already loading
    const loadingPromise = this.cache.loadingPromises.get(cacheKey);
    if (loadingPromise) {
      return loadingPromise;
    }

    // Start loading
    const promise = this.loadGLTFWithRetry(path);
    this.cache.loadingPromises.set(cacheKey, promise);

    try {
      const gltf = await promise;

      if (!gltf.animations || gltf.animations.length === 0) {
        if (this.config.enableLogging) {
          devWarn(`⚠️ No animations found in ${path}`);
        }
        return null;
      }

      const clip = gltf.animations[0]; // Use first animation

      // Cache the clip
      this.cacheClip(path, clip);

      return clip;
    } catch (error) {
      this.handleLoadError(error as Error, path);
      return null;
    } finally {
      this.cache.loadingPromises.delete(cacheKey);
    }
  }

  /**
   * Load GLTF with retry logic
   */
  private async loadGLTFWithRetry(path: string): Promise<GLTF> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        return await new Promise<GLTF>((resolve, reject) => {
          this.gltfLoader.load(
            path,
            resolve,
            undefined, // onProgress
            reject,
          );
        });
      } catch (error) {
        lastError = error as Error;

        if (attempt < this.config.retryAttempts - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, this.config.retryDelay),
          );
        }
      }
    }

    throw (
      lastError ||
      new Error(
        `Failed to load ${path} after ${this.config.retryAttempts} attempts`,
      )
    );
  }

  /**
   * Validate GLTF asset
   */
  validateGLTF(gltf: GLTF): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      hasAnimations: false,
      hasSkeleton: false,
      boneCount: 0,
      errors: [],
      warnings: [],
    };

    // Check if GLTF has a scene
    if (!gltf.scene) {
      result.errors.push("GLTF has no scene");
      result.isValid = false;
    }

    // Check for animations
    if (gltf.animations && gltf.animations.length > 0) {
      result.hasAnimations = true;
    } else {
      result.warnings.push("GLTF has no animations");
    }

    // Check for skeleton
    let skeletonFound = false;
    let maxBoneCount = 0;

    gltf.scene?.traverse((child: Object3D) => {
      if (child instanceof SkinnedMesh) {
        skeletonFound = true;
        if (child.skeleton) {
          maxBoneCount = Math.max(maxBoneCount, child.skeleton.bones.length);
        }
      }
    });

    result.hasSkeleton = skeletonFound;
    result.boneCount = maxBoneCount;

    if (!skeletonFound) {
      result.warnings.push(
        "GLTF has no skeleton (not suitable for character animation)",
      );
    }

    // Validate bone count for RPM compatibility
    if (maxBoneCount > 0 && maxBoneCount < 50) {
      result.warnings.push(
        `Low bone count (${maxBoneCount}) - may not be compatible with RPM`,
      );
    }

    return result;
  }

  /**
   * Get cached avatar GLTF
   */
  getCachedAvatar(path: string): GLTF | null {
    const cacheKey = createCacheKey(path);
    return this.cache.avatars.get(cacheKey) || null;
  }

  /**
   * Get cached animation clip
   */
  getCachedClip(name: string): AnimationClip | null {
    return this.cache.clips.get(name) || null;
  }

  /**
   * Cache avatar GLTF
   */
  private cacheAvatar(path: string, gltf: GLTF): void {
    const cacheKey = createCacheKey(path);
    const size = estimateAssetSize(gltf);

    // Check cache size limits
    if (this.currentCacheSize + size > this.config.cache.maxCacheSize) {
      this.evictOldestAssets(size);
    }

    this.cache.avatars.set(cacheKey, gltf);
    this.cache.metadata.set(cacheKey, {
      path,
      size,
      loadTime: Date.now(),
      lastAccessed: Date.now(),
      referenceCount: 1,
      isValid: true,
      errors: [],
    });

    this.currentCacheSize += size;
  }

  /**
   * Cache animation clip
   */
  private cacheClip(path: string, clip: AnimationClip): void {
    const name = extractClipName(path);
    const cacheKey = createCacheKey(path);

    // Estimate clip size (rough approximation)
    const size = clip.tracks.reduce((total, track) => {
      return total + (track.times.length + track.values.length) * 4;
    }, 0);

    // Check cache size limits
    if (this.currentCacheSize + size > this.config.cache.maxCacheSize) {
      this.evictOldestAssets(size);
    }

    this.cache.clips.set(name, clip);
    this.cache.metadata.set(cacheKey, {
      path,
      size,
      loadTime: Date.now(),
      lastAccessed: Date.now(),
      referenceCount: 1,
      isValid: true,
      errors: [],
    });

    this.currentCacheSize += size;
  }

  /**
   * Update access time for cached asset
   */
  private updateAccessTime(cacheKey: string): void {
    const metadata = this.cache.metadata.get(cacheKey);
    if (metadata) {
      metadata.lastAccessed = Date.now();
      metadata.referenceCount++;
    }
  }

  /**
   * Evict oldest assets to make room
   */
  private evictOldestAssets(requiredSize: number): void {
    const sortedMetadata = Array.from(this.cache.metadata.entries()).sort(
      ([, a], [, b]) => a.lastAccessed - b.lastAccessed,
    );

    let freedSize = 0;
    for (const [cacheKey, metadata] of sortedMetadata) {
      if (freedSize >= requiredSize) break;

      this.removeAsset(cacheKey);
      freedSize += metadata.size;
    }
  }

  /**
   * Remove asset from cache
   */
  private removeAsset(cacheKey: string): void {
    const metadata = this.cache.metadata.get(cacheKey);
    if (!metadata) return;

    // Remove from appropriate cache
    this.cache.avatars.delete(cacheKey);

    // Remove clip by name
    const clipName = extractClipName(metadata.path);
    this.cache.clips.delete(clipName);

    // Remove metadata
    this.cache.metadata.delete(cacheKey);

    // Update cache size
    this.currentCacheSize -= metadata.size;

    if (this.config.enableLogging) {
      devLog(
        `🗑️ Evicted asset: ${metadata.path} (${formatFileSize(metadata.size)})`,
      );
    }
  }

  /**
   * Clear entire cache
   */
  clearCache(): void {
    this.cache.avatars.clear();
    this.cache.clips.clear();
    this.cache.metadata.clear();
    this.cache.loadingPromises.clear();
    this.currentCacheSize = 0;

    if (this.config.enableLogging) {
      devLog("🗑️ Animation cache cleared");
    }
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.config.cache.cleanupInterval);
  }

  /**
   * Cleanup old and unused assets
   */
  private cleanup(): void {
    const now = Date.now();
    const toRemove: string[] = [];

    for (const [cacheKey, metadata] of this.cache.metadata) {
      if (
        now - metadata.lastAccessed > this.config.cache.maxAge &&
        metadata.referenceCount === 0
      ) {
        toRemove.push(cacheKey);
      }
    }

    for (const cacheKey of toRemove) {
      this.removeAsset(cacheKey);
    }

    if (toRemove.length > 0 && this.config.enableLogging) {
      devLog(`🧹 Cleaned up ${toRemove.length} old animation assets`);
    }
  }

  /**
   * Handle loading errors
   */
  handleLoadError(error: Error, assetPath: string): void {
    const animationError = (error as any).type
      ? (error as AnimationError)
      : createAnimationError(
          `Failed to load animation asset: ${error.message}`,
          AnimationLoadError.NETWORK_ERROR,
          assetPath,
        );

    if (this.config.enableLogging) {
      devError(`❌ Animation load error for ${assetPath}:`, animationError);
    }

    // Store error in metadata if we have a cache entry
    const cacheKey = createCacheKey(assetPath);
    const metadata = this.cache.metadata.get(cacheKey);
    if (metadata) {
      metadata.isValid = false;
      metadata.errors.push(animationError.message);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      avatarCount: this.cache.avatars.size,
      clipCount: this.cache.clips.size,
      totalSize: this.currentCacheSize,
      formattedSize: formatFileSize(this.currentCacheSize),
      maxSize: this.config.cache.maxCacheSize,
      formattedMaxSize: formatFileSize(this.config.cache.maxCacheSize),
      utilizationPercent:
        (this.currentCacheSize / this.config.cache.maxCacheSize) * 100,
    };
  }

  /**
   * Dispose of the loader and cleanup resources
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.clearCache();
  }
}

/**
 * Create AnimationError with proper typing
 */
function createAnimationError(
  message: string,
  type: AnimationLoadError,
  path: string,
): AnimationError {
  const error = new Error(message) as AnimationError;
  error.type = type;
  error.path = path;
  return error;
}

// Export singleton instance for global use
export const animationLoader = new AnimationLoader();
