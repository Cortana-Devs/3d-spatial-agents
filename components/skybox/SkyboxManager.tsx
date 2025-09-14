"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useRef, useCallback, useMemo } from "react";
import { CubeTexture } from "three";
import {
  useSkyboxStore,
  useSkyboxCurrentPreset,
  useSkyboxIsTransitioning,
} from "../../store/skyboxStore";
import {
  SkyboxManagerProps,
  SkyboxError,
  SkyboxErrorType,
} from "../../types/skybox";
import SkyboxRenderer from "./SkyboxRenderer";
import { skyboxTextureLoader } from "../../utils/skybox/TextureLoader";
import { skyboxPerformanceMonitor } from "../../utils/skybox/PerformanceMonitor";
import { devLog } from "@/utils/devLogger";

/**
 * SkyboxManager - Main coordination component for skybox system
 * Following React Three Fiber patterns from official docs
 */
export function SkyboxManager({
  currentSkybox,
  transitionDuration = 1000,
  enableAtmosphericEffects = true,
  performanceMode = "balanced",
  fallbackTexture,
  onLoadComplete,
  onLoadError,
  onTransitionStart,
  onTransitionComplete,
}: SkyboxManagerProps) {
  const { scene } = useThree();
  const loaderRef = useRef(skyboxTextureLoader);
  const currentTextureRef = useRef<CubeTexture | null>(null);
  const isInitializedRef = useRef(false);

  // Store subscriptions
  const storeCurrentPreset = useSkyboxCurrentPreset();
  const isTransitioning = useSkyboxIsTransitioning();
  const {
    setCurrentPreset,
    updateConfig,
    setPerformanceMode,
    setError,
    clearError,
    presets,
    textureCache,
    performance,
  } = useSkyboxStore();

  // Initialize store configuration
  useEffect(() => {
    if (!isInitializedRef.current) {
      updateConfig({
        transitionDuration,
        enableAtmosphericEffects,
        performanceMode,
      });

      setPerformanceMode(performanceMode);
      isInitializedRef.current = true;

      devLog("SkyboxManager initialized with config:", {
        transitionDuration,
        enableAtmosphericEffects,
        performanceMode,
      });
    }
  }, [
    transitionDuration,
    enableAtmosphericEffects,
    performanceMode,
    updateConfig,
    setPerformanceMode,
  ]);

  // Handle skybox changes
  useEffect(() => {
    if (currentSkybox && currentSkybox !== storeCurrentPreset) {
      handleSkyboxChange(currentSkybox);
    }
  }, [currentSkybox, storeCurrentPreset]);

  // Handle skybox change with proper error handling and callbacks
  const handleSkyboxChange = useCallback(
    async (presetId: string) => {
      try {
        clearError();

        const preset = presets[presetId];
        if (!preset) {
          const error = new SkyboxError(
            SkyboxErrorType.INVALID_PRESET,
            `Preset not found: ${presetId}`,
            presetId,
          );

          setError(error.message);
          onLoadError?.(error);

          // Try fallback texture if available
          if (fallbackTexture) {
            currentTextureRef.current = fallbackTexture;
            onLoadComplete?.();
          }

          return;
        }

        // Notify transition start
        onTransitionStart?.(storeCurrentPreset, presetId);

        // Record performance metrics
        const startTime = performance.now();

        try {
          await setCurrentPreset(presetId);

          const loadTime = performance.now() - startTime;
          skyboxPerformanceMonitor.recordLoadTime(
            presetId,
            loadTime,
            preset.performance.quality,
          );

          // Update current texture reference
          const loadedTexture = textureCache.get(presetId);
          if (loadedTexture) {
            currentTextureRef.current = loadedTexture;
          }

          onLoadComplete?.();
          onTransitionComplete?.(presetId);

          devLog(`Skybox transition completed: ${presetId} in ${loadTime}ms`);
        } catch (transitionError) {
          const error =
            transitionError instanceof Error
              ? transitionError
              : new Error("Transition failed");

          devError("Skybox transition failed:", error);
          setError(error.message);
          onLoadError?.(error);

          // Try fallback texture
          if (fallbackTexture && !currentTextureRef.current) {
            currentTextureRef.current = fallbackTexture;
            devLog("Using fallback texture due to load failure");
          }
        }
      } catch (error) {
        const skyboxError =
          error instanceof SkyboxError
            ? error
            : new SkyboxError(
                SkyboxErrorType.UNKNOWN_ERROR,
                error instanceof Error
                  ? error.message
                  : "Unknown error occurred",
                presetId,
                error instanceof Error ? error : undefined,
              );

        devError("SkyboxManager error:", skyboxError);
        setError(skyboxError.message);
        onLoadError?.(skyboxError);
      }
    },
    [
      presets,
      textureCache,
      storeCurrentPreset,
      setCurrentPreset,
      setError,
      clearError,
      onLoadComplete,
      onLoadError,
      onTransitionStart,
      onTransitionComplete,
      fallbackTexture,
    ],
  );

  // Get current texture for rendering
  const currentTexture = useMemo(() => {
    if (storeCurrentPreset && textureCache.has(storeCurrentPreset)) {
      return textureCache.get(storeCurrentPreset) || null;
    }

    return currentTextureRef.current || fallbackTexture || null;
  }, [storeCurrentPreset, textureCache, fallbackTexture]);

  // Get current preset data for rendering configuration
  const currentPresetData = useMemo(() => {
    return storeCurrentPreset ? presets[storeCurrentPreset] : null;
  }, [storeCurrentPreset, presets]);

  // Performance monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      const stats = skyboxTextureLoader.getCacheStats();
      skyboxPerformanceMonitor.updateMemoryUsage(stats.memoryUsage);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cancel any ongoing transitions
      if (isTransitioning) {
        devLog("Cancelling skybox transition on unmount");
      }

      // Clean up references
      currentTextureRef.current = null;
      isInitializedRef.current = false;
    };
  }, [isTransitioning]);

  // Error boundary fallback
  const handleRenderError = useCallback(
    (error: Error) => {
      devError("SkyboxRenderer error:", error);
      setError(`Render error: ${error.message}`);
      onLoadError?.(error);

      // Use fallback texture if available
      if (fallbackTexture) {
        currentTextureRef.current = fallbackTexture;
      }
    },
    [setError, onLoadError, fallbackTexture],
  );

  // Development debugging
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      devLog("SkyboxManager render state:", {
        currentSkybox,
        storeCurrentPreset,
        isTransitioning,
        hasCurrentTexture: !!currentTexture,
        hasPresetData: !!currentPresetData,
        cacheSize: textureCache.size,
        memoryUsage: performance.memoryUsage,
      });
    }
  }, [
    currentSkybox,
    storeCurrentPreset,
    isTransitioning,
    currentTexture,
    currentPresetData,
    textureCache.size,
    performance.memoryUsage,
  ]);

  // Render the skybox if we have a texture
  if (!currentTexture) {
    return null;
  }

  try {
    return (
      <SkyboxRenderer
        texture={currentTexture}
        intensity={currentPresetData?.intensity || 1}
        rotation={currentPresetData?.rotationSpeed || 0}
        tint={currentPresetData?.tint}
        backgroundBlurriness={enableAtmosphericEffects ? 0.1 : 0}
        environmentIntensity={currentPresetData?.intensity || 1}
      />
    );
  } catch (error) {
    handleRenderError(
      error instanceof Error ? error : new Error("Render failed"),
    );
    return null;
  }
}

// Default props for better development experience
SkyboxManager.defaultProps = {
  transitionDuration: 1000,
  enableAtmosphericEffects: true,
  performanceMode: "balanced",
} as const;

export default SkyboxManager;
