import { devWarn, devError } from "@/utils/devLogger";
import {
  CubeTextureLoader,
  CubeTexture,
  LoadingManager,
  TextureLoader,
} from "three";
import {
  SkyboxPreset,
  SkyboxError,
  SkyboxErrorType,
  TextureLoaderEvents,
  SKYBOX_ASSETS,
  PERFORMANCE_TARGETS,
} from "../../types/skybox";

export class SkyboxTextureLoader {
  private cubeLoader: CubeTextureLoader;
  private textureLoader: TextureLoader;
  private cache = new Map<string, CubeTexture>();
  private loadingPromises = new Map<string, Promise<CubeTexture>>();
  private loadingManager: LoadingManager;
  private memoryUsage = 0; // Track memory usage in MB

  constructor() {
    this.loadingManager = new LoadingManager();
    this.cubeLoader = new CubeTextureLoader(this.loadingManager);
    this.textureLoader = new TextureLoader(this.loadingManager);

    // Configure loading manager for better error handling
    this.loadingManager.onError = (url) => {
      devError(`Failed to load texture from URL: ${url}`);
    };
  }

  /**
   * Load cube texture with comprehensive error handling and caching
   * Following Three.js CubeTextureLoader patterns for error handling
   */
  async loadCubeTexture(
    preset: SkyboxPreset,
    events?: TextureLoaderEvents,
  ): Promise<CubeTexture> {
    const cacheKey = this.getCacheKey(preset);

    // Return cached texture if available
    if (this.cache.has(cacheKey)) {
      this.updateCacheAccess(cacheKey);
      events?.onLoadComplete?.(preset.id, this.cache.get(cacheKey)!);
      return this.cache.get(cacheKey)!;
    }

    // Return existing loading promise if texture is currently being loaded
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey)!;
    }

    // Create new loading promise
    const loadingPromise = this.loadTextureInternal(preset, events);
    this.loadingPromises.set(cacheKey, loadingPromise);

    try {
      const texture = await loadingPromise;
      this.loadingPromises.delete(cacheKey);
      return texture;
    } catch (error) {
      this.loadingPromises.delete(cacheKey);
      throw error;
    }
  }

  /**
   * Internal texture loading implementation
   */
  private async loadTextureInternal(
    preset: SkyboxPreset,
    events?: TextureLoaderEvents,
  ): Promise<CubeTexture> {
    const cacheKey = this.getCacheKey(preset);
    const urls = this.buildTextureUrls(preset.assetPath);
    const startTime = performance.now();

    events?.onLoadStart?.(preset.id);

    return new Promise((resolve, reject) => {
      // Check memory limits before loading
      if (
        this.memoryUsage + preset.performance.memoryUsage >
        PERFORMANCE_TARGETS.textureLoading.maxMemoryUsage * 2
      ) {
        const error = new SkyboxError(
          SkyboxErrorType.MEMORY_LIMIT_EXCEEDED,
          `Memory limit exceeded. Current: ${this.memoryUsage}MB, Requested: ${preset.performance.memoryUsage}MB`,
          preset.id,
        );
        events?.onLoadError?.(preset.id, error);
        reject(error);
        return;
      }

      const loadedCount = 0;
      const totalCount = urls.length;

      this.cubeLoader.load(
        urls,
        (texture) => {
          const loadTime = performance.now() - startTime;

          // Validate load time performance
          if (loadTime > PERFORMANCE_TARGETS.textureLoading.maxLoadTime) {
            devWarn(
              `Skybox load time exceeded target: ${loadTime}ms > ${PERFORMANCE_TARGETS.textureLoading.maxLoadTime}ms`,
            );
          }

          // Configure texture properties for optimal performance
          this.configureTexture(texture, preset);

          // Cache the texture
          this.cache.set(cacheKey, texture);
          this.memoryUsage += preset.performance.memoryUsage;
          this.initializeCacheMetadata(
            cacheKey,
            preset.performance.memoryUsage,
          );

          events?.onLoadComplete?.(preset.id, texture);
          resolve(texture);
        },
        (progress) => {
          // Calculate overall progress
          const progressPercent = progress.loaded / progress.total;
          events?.onLoadProgress?.(preset.id, progressPercent);
        },
        (error) => {
          const loadTime = performance.now() - startTime;
          devError(
            `Failed to load skybox texture for preset ${preset.id}:`,
            error,
          );

          const skyboxError = new SkyboxError(
            SkyboxErrorType.TEXTURE_LOAD_FAILED,
            `Failed to load skybox texture: ${error.message || "Unknown error"}`,
            preset.id,
            error,
          );

          events?.onLoadError?.(preset.id, skyboxError);
          reject(skyboxError);
        },
      );
    });
  }

  /**
   * Configure texture properties following Three.js best practices
   */
  private configureTexture(texture: CubeTexture, preset: SkyboxPreset): void {
    // Enable proper color management as per Three.js r150+ docs
    texture.colorSpace = "srgb";

    // Apply tint if specified
    if (
      (preset.tint && preset.tint.r !== 1) ||
      preset.tint.g !== 1 ||
      preset.tint.b !== 1
    ) {
      // Note: Tinting is typically handled in the material or scene background
      // Store tint info in userData for renderer to use
      texture.userData.tint = preset.tint;
    }

    // Store preset metadata
    texture.userData.presetId = preset.id;
    texture.userData.intensity = preset.intensity;
    texture.userData.loadTime = Date.now();
  }

  /**
   * Build texture URLs following Three.js standard naming convention
   * Supports both standard naming (px, nx, py, ny, pz, nz) and numbered format (1-6)
   */
  private buildTextureUrls(assetPath: string): string[] {
    const urls: string[] = [];

    // Check if assetPath suggests numbered format
    const isNumberedFormat =
      assetPath.includes("default") || assetPath.includes("numbered");

    if (isNumberedFormat) {
      // Use numbered format: 1.jpg - 6.jpg
      // Order matches Three.js cube map order: +X, -X, +Y, -Y, +Z, -Z
      for (let i = 1; i <= 6; i++) {
        urls.push(`${assetPath}${i}.jpg`);
      }
    } else {
      // Use standard Three.js naming convention
      for (const face of SKYBOX_ASSETS.naming) {
        // Try different formats in order of preference
        const formats = [".webp", ".jpg", ".png", ".avif"];
        const url = `${assetPath}${face}${formats[0]}`; // Default to WebP

        // For now, assume WebP. In production, you might want to detect format support
        urls.push(url);
      }
    }

    return urls;
  }

  /**
   * Generate cache key for texture
   */
  private getCacheKey(preset: SkyboxPreset): string {
    // Include relevant properties that affect texture loading
    return `${preset.id}-${preset.assetPath}-${preset.performance.quality}`;
  }

  /**
   * Initialize cache metadata for memory tracking
   */
  private initializeCacheMetadata(cacheKey: string, memorySize: number): void {
    // This would integrate with a cache metadata system
    // For now, we'll keep it simple
  }

  /**
   * Update cache access time for LRU eviction
   */
  private updateCacheAccess(cacheKey: string): void {
    const texture = this.cache.get(cacheKey);
    if (texture) {
      texture.userData.lastAccessed = Date.now();
      texture.userData.accessCount = (texture.userData.accessCount || 0) + 1;
    }
  }

  /**
   * Memory management following React Three Fiber best practices
   */
  dispose(textureId: string): void {
    for (const [cacheKey, texture] of this.cache.entries()) {
      if (texture.userData.presetId === textureId) {
        texture.dispose();
        this.memoryUsage -= texture.userData.memorySize || 0;
        this.cache.delete(cacheKey);
        break;
      }
    }
  }

  /**
   * Clear all cached textures
   */
  clearCache(): void {
    this.cache.forEach((texture) => {
      texture.dispose();
    });
    this.cache.clear();
    this.memoryUsage = 0;
  }

  /**
   * Optimize cache by removing least recently used textures
   */
  optimizeCache(maxSizeBytes?: number): void {
    const maxSize =
      maxSizeBytes ||
      PERFORMANCE_TARGETS.textureLoading.maxMemoryUsage * 1024 * 1024;

    if (this.memoryUsage <= maxSize) return;

    // Convert to array and sort by last accessed time
    const cacheEntries = Array.from(this.cache.entries())
      .map(([key, texture]) => ({
        key,
        texture,
        lastAccessed: texture.userData.lastAccessed || 0,
        memorySize: texture.userData.memorySize || 0,
      }))
      .sort((a, b) => a.lastAccessed - b.lastAccessed); // Oldest first

    // Remove oldest textures until under memory limit
    let currentMemory = this.memoryUsage;
    for (const entry of cacheEntries) {
      if (currentMemory <= maxSize) break;

      entry.texture.dispose();
      this.cache.delete(entry.key);
      currentMemory -= entry.memorySize;
    }

    this.memoryUsage = currentMemory;
  }

  /**
   * Get current cache statistics
   */
  getCacheStats(): {
    size: number;
    memoryUsage: number;
    hitRate: number;
  } {
    let totalAccess = 0;
    let totalHits = 0;

    this.cache.forEach((texture) => {
      const accessCount = texture.userData.accessCount || 0;
      totalAccess += accessCount;
      if (accessCount > 1) totalHits += accessCount - 1; // First access is not a hit
    });

    return {
      size: this.cache.size,
      memoryUsage: this.memoryUsage,
      hitRate: totalAccess > 0 ? totalHits / totalAccess : 0,
    };
  }

  /**
   * Preload multiple textures for performance
   */
  async preloadTextures(
    presets: SkyboxPreset[],
    events?: TextureLoaderEvents,
  ): Promise<Map<string, CubeTexture | Error>> {
    const results = new Map<string, CubeTexture | Error>();
    const maxConcurrent = PERFORMANCE_TARGETS.textureLoading.concurrentLoads;

    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < presets.length; i += maxConcurrent) {
      const batch = presets.slice(i, i + maxConcurrent);
      const promises = batch.map(async (preset) => {
        try {
          const texture = await this.loadCubeTexture(preset, events);
          return { presetId: preset.id, result: texture };
        } catch (error) {
          return { presetId: preset.id, result: error as Error };
        }
      });

      const batchResults = await Promise.allSettled(promises);
      batchResults.forEach((result) => {
        if (result.status === "fulfilled") {
          results.set(result.value.presetId, result.value.result);
        }
      });
    }

    return results;
  }

  /**
   * Validate texture URLs before loading
   */
  async validateTextureUrls(assetPath: string): Promise<boolean> {
    const urls = this.buildTextureUrls(assetPath);

    try {
      // Check if at least one texture file exists
      const checkPromises = urls.slice(0, 1).map(
        (
          url, // Check just the first one for performance
        ) => fetch(url, { method: "HEAD" }).then((response) => response.ok),
      );

      const results = await Promise.allSettled(checkPromises);
      return results.some(
        (result) => result.status === "fulfilled" && result.value,
      );
    } catch {
      return false;
    }
  }

  /**
   * Get loading progress for all active loads
   */
  getLoadingProgress(): Map<string, number> {
    // This would track progress for each loading texture
    // Implementation depends on how you want to expose loading states
    return new Map();
  }

  /**
   * Cleanup method to be called on component unmount
   */
  destroy(): void {
    this.clearCache();
    this.loadingPromises.clear();
    this.loadingManager.onError = undefined;
  }
}

// Export singleton instance
export const skyboxTextureLoader = new SkyboxTextureLoader();

// Export class for custom instances
export { SkyboxTextureLoader as SkyboxTextureLoaderClass };
