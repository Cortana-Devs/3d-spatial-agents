"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CubeTexture } from "three";
import { devWarn } from "@/utils/devLogger";
import {
  useSkyboxStore,
  useSkyboxCurrentPreset,
  useSkyboxIsTransitioning,
  useSkyboxPresets,
  useSkyboxError,
  useSkyboxConfig,
  useSkyboxPerformance,
} from "../../store/skyboxStore";
import {
  SkyboxPreset,
  TransitionConfig,
  SkyboxError,
  SkyboxErrorType,
  PerformanceMode,
} from "../../types/skybox";
import { skyboxTextureLoader } from "../../utils/skybox/TextureLoader";
import { skyboxPerformanceMonitor } from "../../utils/skybox/PerformanceMonitor";

export interface UseSkyboxOptions {
  autoLoad?: boolean;
  preloadAdjacent?: boolean;
  enablePerformanceMonitoring?: boolean;
  fallbackPreset?: string;
  onError?: (error: SkyboxError) => void;
  onLoadComplete?: (presetId: string) => void;
  onTransitionStart?: (fromPreset: string | null, toPreset: string) => void;
  onTransitionComplete?: (presetId: string) => void;
}

export interface UseSkyboxReturn {
  // State
  currentPreset: string | null;
  previousPreset: string | null;
  isTransitioning: boolean;
  transitionProgress: number;
  presets: Record<string, SkyboxPreset>;
  error: string | null;
  performance: ReturnType<typeof useSkyboxPerformance>;

  // Texture management
  currentTexture: CubeTexture | null;
  loadedTextures: Map<string, CubeTexture>;

  // Actions
  changePreset: (presetId: string, config?: TransitionConfig) => Promise<void>;
  preloadPreset: (presetId: string) => Promise<void>;
  addPreset: (preset: SkyboxPreset) => void;
  removePreset: (presetId: string) => void;
  duplicatePreset: (presetId: string, newName: string) => void;

  // Configuration
  setPerformanceMode: (mode: PerformanceMode) => void;
  updateTransitionDuration: (duration: number) => void;
  toggleAtmosphericEffects: () => void;

  // Utilities
  clearError: () => void;
  clearCache: () => void;
  optimizeCache: () => void;
  exportPresets: () => string;
  importPresets: (json: string) => void;

  // Status checks
  isPresetLoaded: (presetId: string) => boolean;
  isPresetLoading: (presetId: string) => boolean;
  getPresetLoadState: (presetId: string) => {
    isLoading: boolean;
    progress: number;
    error: string | null;
  };
}

/**
 * Main hook for skybox operations and management
 * Provides a comprehensive API for skybox functionality
 */
export function useSkybox(options: UseSkyboxOptions = {}): UseSkyboxReturn {
  const {
    autoLoad = false,
    preloadAdjacent = false,
    enablePerformanceMonitoring = true,
    fallbackPreset,
    onError,
    onLoadComplete,
    onTransitionStart,
    onTransitionComplete,
  } = options;

  // Store subscriptions
  const currentPreset = useSkyboxCurrentPreset();
  const isTransitioning = useSkyboxIsTransitioning();
  const presets = useSkyboxPresets();
  const error = useSkyboxError();
  const config = useSkyboxConfig();
  const performance = useSkyboxPerformance();

  // Store actions
  const {
    setCurrentPreset,
    preloadPreset: storePreloadPreset,
    addPreset: storeAddPreset,
    removePreset: storeRemovePreset,
    duplicatePreset: storeDuplicatePreset,
    setPerformanceMode: storeSetPerformanceMode,
    updateConfig,
    clearError: storeClearError,
    clearCache: storeClearCache,
    optimizeCache: storeOptimizeCache,
    exportPresets: storeExportPresets,
    importPresets: storeImportPresets,
    textureCache,
    loadStates,
    previousPreset,
    transitionProgress,
  } = useSkyboxStore();

  // Local state for enhanced functionality
  const [localError, setLocalError] = useState<string | null>(null);
  const previousPresetRef = useRef<string | null>(null);
  const isInitializedRef = useRef(false);

  // Get current texture
  const currentTexture = useMemo(() => {
    return currentPreset && textureCache.has(currentPreset)
      ? textureCache.get(currentPreset) || null
      : null;
  }, [currentPreset, textureCache]);

  // Enhanced error handling
  const handleError = useCallback(
    (err: SkyboxError | Error | string) => {
      const skyboxError =
        err instanceof SkyboxError
          ? err
          : new SkyboxError(
              SkyboxErrorType.UNKNOWN_ERROR,
              typeof err === "string" ? err : err.message,
              currentPreset || undefined,
              err instanceof Error ? err : undefined,
            );

      setLocalError(skyboxError.message);
      onError?.(skyboxError);

      // Try fallback if available
      if (fallbackPreset && fallbackPreset !== currentPreset) {
        devWarn("Attempting fallback to preset:", fallbackPreset);
        changePreset(fallbackPreset).catch((fallbackErr) => {
          console.error("Fallback also failed:", fallbackErr);
        });
      }
    },
    [currentPreset, fallbackPreset, onError],
  );

  // Enhanced preset change function
  const changePreset = useCallback(
    async (
      presetId: string,
      transitionConfig?: TransitionConfig,
    ): Promise<void> => {
      try {
        setLocalError(null);

        if (!presets[presetId]) {
          throw new SkyboxError(
            SkyboxErrorType.INVALID_PRESET,
            `Preset not found: ${presetId}`,
            presetId,
          );
        }

        // Notify transition start
        onTransitionStart?.(currentPreset, presetId);

        // Apply transition config if provided
        if (transitionConfig) {
          updateConfig({
            transitionDuration:
              transitionConfig.duration || config.transitionDuration,
          });
        }

        await setCurrentPreset(presetId);

        // Notify completion
        onLoadComplete?.(presetId);
        onTransitionComplete?.(presetId);

        // Preload adjacent presets if enabled
        if (preloadAdjacent) {
          preloadAdjacentPresets(presetId);
        }
      } catch (err) {
        handleError(err as Error);
        throw err;
      }
    },
    [
      presets,
      currentPreset,
      setCurrentPreset,
      updateConfig,
      config.transitionDuration,
      onTransitionStart,
      onLoadComplete,
      onTransitionComplete,
      handleError,
      preloadAdjacent,
    ],
  );

  // Preload adjacent presets for smoother transitions
  const preloadAdjacentPresets = useCallback(
    async (currentPresetId: string) => {
      const presetList = Object.keys(presets);
      const currentIndex = presetList.indexOf(currentPresetId);

      if (currentIndex === -1) return;

      const adjacentPresets = [
        presetList[currentIndex - 1], // Previous
        presetList[currentIndex + 1], // Next
      ].filter(Boolean);

      for (const presetId of adjacentPresets) {
        if (!textureCache.has(presetId)) {
          try {
            await storePreloadPreset(presetId);
          } catch (err) {
            devWarn(`Failed to preload adjacent preset ${presetId}:`, err);
          }
        }
      }
    },
    [presets, textureCache, storePreloadPreset],
  );

  // Enhanced preload function
  const preloadPreset = useCallback(
    async (presetId: string): Promise<void> => {
      try {
        if (!presets[presetId]) {
          throw new SkyboxError(
            SkyboxErrorType.INVALID_PRESET,
            `Preset not found: ${presetId}`,
            presetId,
          );
        }

        await storePreloadPreset(presetId);
      } catch (err) {
        handleError(err as Error);
        throw err;
      }
    },
    [presets, storePreloadPreset, handleError],
  );

  // Enhanced preset management
  const addPreset = useCallback(
    (preset: SkyboxPreset) => {
      try {
        storeAddPreset(preset);
      } catch (err) {
        handleError(err as Error);
      }
    },
    [storeAddPreset, handleError],
  );

  const removePreset = useCallback(
    (presetId: string) => {
      try {
        storeRemovePreset(presetId);
      } catch (err) {
        handleError(err as Error);
      }
    },
    [storeRemovePreset, handleError],
  );

  const duplicatePreset = useCallback(
    (presetId: string, newName: string) => {
      try {
        storeDuplicatePreset(presetId, newName);
      } catch (err) {
        handleError(err as Error);
      }
    },
    [storeDuplicatePreset, handleError],
  );

  // Configuration helpers
  const setPerformanceMode = useCallback(
    (mode: PerformanceMode) => {
      storeSetPerformanceMode(mode);
    },
    [storeSetPerformanceMode],
  );

  const updateTransitionDuration = useCallback(
    (duration: number) => {
      updateConfig({ transitionDuration: duration });
    },
    [updateConfig],
  );

  const toggleAtmosphericEffects = useCallback(() => {
    updateConfig({
      enableAtmosphericEffects: !config.enableAtmosphericEffects,
    });
  }, [updateConfig, config.enableAtmosphericEffects]);

  // Utility functions
  const clearError = useCallback(() => {
    setLocalError(null);
    storeClearError();
  }, [storeClearError]);

  const isPresetLoaded = useCallback(
    (presetId: string): boolean => {
      return textureCache.has(presetId);
    },
    [textureCache],
  );

  const isPresetLoading = useCallback(
    (presetId: string): boolean => {
      return loadStates[presetId]?.isLoading || false;
    },
    [loadStates],
  );

  const getPresetLoadState = useCallback(
    (presetId: string) => {
      return (
        loadStates[presetId] || {
          isLoading: false,
          progress: 0,
          error: null,
        }
      );
    },
    [loadStates],
  );

  // Auto-load functionality
  useEffect(() => {
    if (
      autoLoad &&
      !isInitializedRef.current &&
      Object.keys(presets).length > 0
    ) {
      const firstPresetId = Object.keys(presets)[0];
      if (firstPresetId && !currentPreset) {
        changePreset(firstPresetId).catch((err) => {
          devWarn("Auto-load failed:", err);
        });
      }
      isInitializedRef.current = true;
    }
  }, [autoLoad, presets, currentPreset, changePreset]);

  // Performance monitoring
  useEffect(() => {
    if (enablePerformanceMonitoring) {
      skyboxPerformanceMonitor.startMonitoring();
      return () => {
        skyboxPerformanceMonitor.stopMonitoring();
      };
    }
  }, [enablePerformanceMonitoring]);

  // Track preset changes for callbacks
  useEffect(() => {
    if (previousPresetRef.current !== currentPreset) {
      previousPresetRef.current = currentPreset;
    }
  }, [currentPreset]);

  return {
    // State
    currentPreset,
    previousPreset,
    isTransitioning,
    transitionProgress,
    presets,
    error: localError || error,
    performance,

    // Texture management
    currentTexture,
    loadedTextures: textureCache,

    // Actions
    changePreset,
    preloadPreset,
    addPreset,
    removePreset,
    duplicatePreset,

    // Configuration
    setPerformanceMode,
    updateTransitionDuration,
    toggleAtmosphericEffects,

    // Utilities
    clearError,
    clearCache: storeClearCache,
    optimizeCache: storeOptimizeCache,
    exportPresets: storeExportPresets,
    importPresets: storeImportPresets,

    // Status checks
    isPresetLoaded,
    isPresetLoading,
    getPresetLoadState,
  };
}

/**
 * Hook for skybox preset management
 * Focused on CRUD operations for presets
 */
export function useSkyboxPresetsManager() {
  const presets = useSkyboxPresets();
  const { addPreset, updatePreset, removePreset, duplicatePreset } =
    useSkyboxStore();

  const createPreset = useCallback(
    (preset: Omit<SkyboxPreset, "id" | "createdAt" | "updatedAt">) => {
      const now = new Date().toISOString();
      const fullPreset: SkyboxPreset = {
        ...preset,
        id: `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: now,
        updatedAt: now,
      };
      addPreset(fullPreset);
      return fullPreset;
    },
    [addPreset],
  );

  const updateExistingPreset = useCallback(
    (presetId: string, updates: Partial<SkyboxPreset>) => {
      updatePreset(presetId, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    },
    [updatePreset],
  );

  return {
    presets,
    createPreset,
    updatePreset: updateExistingPreset,
    removePreset,
    duplicatePreset,
    presetCount: Object.keys(presets).length,
  };
}

/**
 * Hook for skybox performance monitoring
 * Provides real-time performance metrics and optimization controls
 */
export function useSkyboxPerformanceMonitor() {
  const performance = useSkyboxPerformance();
  const { updatePerformanceMetrics, clearCache, optimizeCache } =
    useSkyboxStore();
  const [isHealthy, setIsHealthy] = useState(true);

  // Check performance health
  useEffect(() => {
    const healthy =
      performance.memoryUsage < 200 && // Less than 200MB
      performance.loadTime < 2000 && // Less than 2 seconds
      performance.frameImpact > -10; // Less than 10fps impact
    setIsHealthy(healthy);
  }, [performance]);

  const getHealthStatus = useCallback(() => {
    if (performance.memoryUsage > 400) return "critical";
    if (performance.memoryUsage > 200 || performance.frameImpact < -10)
      return "warning";
    return "healthy";
  }, [performance]);

  const getOptimizationSuggestions = useCallback(() => {
    const suggestions: string[] = [];

    if (performance.memoryUsage > 300) {
      suggestions.push("Consider clearing cache or reducing quality settings");
    }

    if (performance.loadTime > 3000) {
      suggestions.push(
        "Slow loading detected - check network connection or use lower quality presets",
      );
    }

    if (performance.frameImpact < -15) {
      suggestions.push(
        "Significant frame rate impact detected - consider performance mode",
      );
    }

    if (performance.cacheHitRate < 0.5) {
      suggestions.push(
        "Low cache efficiency - consider preloading frequently used presets",
      );
    }

    return suggestions;
  }, [performance]);

  return {
    performance,
    isHealthy,
    healthStatus: getHealthStatus(),
    optimizationSuggestions: getOptimizationSuggestions(),
    clearCache,
    optimizeCache,
  };
}

export default useSkybox;
