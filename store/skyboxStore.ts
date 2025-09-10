import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { subscribeWithSelector } from "zustand/middleware";
import { CubeTexture, Color, Vector3 } from "three";
import {
  SkyboxState,
  SkyboxActions,
  SkyboxPreset,
  SkyboxLoadState,
  SkyboxPerformanceMetrics,
  DEFAULT_SKYBOX_CONFIG,
  DEFAULT_ATMOSPHERIC_SETTINGS,
  TransitionConfig,
  SkyboxError,
  SkyboxErrorType,
} from "../types/skybox";
import { skyboxTextureLoader } from "../utils/skybox/TextureLoader";
import { skyboxTransitionManager } from "../utils/skybox/TransitionManager";
import { skyboxPerformanceMonitor } from "../utils/skybox/PerformanceMonitor";

// Initial state
const initialState: Omit<SkyboxState, keyof SkyboxActions> = {
  currentPreset: null,
  previousPreset: null,
  isTransitioning: false,
  transitionProgress: 0,
  presets: {},
  loadStates: {},
  config: { ...DEFAULT_SKYBOX_CONFIG },
  performance: {
    memoryUsage: 0,
    loadTime: 0,
    frameImpact: 0,
    textureResolution: "0x0",
    compressionRatio: 1.0,
    cacheHitRate: 0,
  },
  error: null,
  fallbackPreset: null,
  textureCache: new Map<string, CubeTexture>(),
  cacheMetadata: new Map<
    string,
    {
      lastAccessed: number;
      accessCount: number;
      memorySize: number;
    }
  >(),
};

// Create store with proper typing
export const useSkyboxStore = create<SkyboxState & SkyboxActions>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          ...initialState,

          // Preset management
          setCurrentPreset: async (presetId: string) => {
            const state = get();
            const preset = state.presets[presetId];

            if (!preset) {
              set((draft) => {
                draft.error = `Preset not found: ${presetId}`;
              });
              return;
            }

            try {
              set((draft) => {
                draft.error = null;
                draft.loadStates[presetId] = {
                  isLoading: true,
                  progress: 0,
                  error: null,
                  loadStartTime: performance.now(),
                  loadEndTime: null,
                };
              });

              // Load texture
              const startTime = performance.now();
              const texture = await skyboxTextureLoader.loadCubeTexture(
                preset,
                {
                  onLoadStart: (id) => {
                    set((draft) => {
                      if (draft.loadStates[id]) {
                        draft.loadStates[id].isLoading = true;
                        draft.loadStates[id].loadStartTime = performance.now();
                      }
                    });
                  },
                  onLoadProgress: (id, progress) => {
                    set((draft) => {
                      if (draft.loadStates[id]) {
                        draft.loadStates[id].progress = progress;
                      }
                    });
                  },
                  onLoadComplete: (id, loadedTexture) => {
                    const loadTime = performance.now() - startTime;
                    skyboxPerformanceMonitor.recordLoadTime(
                      id,
                      loadTime,
                      "2048x2048",
                    );

                    set((draft) => {
                      draft.loadStates[id] = {
                        isLoading: false,
                        progress: 1,
                        error: null,
                        loadStartTime:
                          draft.loadStates[id]?.loadStartTime ||
                          performance.now(),
                        loadEndTime: performance.now(),
                      };
                      // Avoid mutating Map drafts directly under immer to prevent TS draft type conflicts
                      const newTextureCache: any = new Map<any, any>(
                        draft.textureCache as any,
                      );
                      (newTextureCache as any).set(id, loadedTexture as any);
                      draft.textureCache = newTextureCache as any;

                      const newCacheMetadata = new Map(draft.cacheMetadata);
                      newCacheMetadata.set(id, {
                        lastAccessed: Date.now(),
                        accessCount: 1,
                        memorySize: preset.performance.memoryUsage,
                      });
                      draft.cacheMetadata = newCacheMetadata;
                    });
                  },
                  onLoadError: (id, error) => {
                    set((draft) => {
                      draft.loadStates[id] = {
                        isLoading: false,
                        progress: 0,
                        error: error.message,
                        loadStartTime:
                          draft.loadStates[id]?.loadStartTime ||
                          performance.now(),
                        loadEndTime: performance.now(),
                      };
                      draft.error = `Failed to load preset ${id}: ${error.message}`;
                    });
                  },
                },
              );

              // Perform transition
              const currentTexture = state.currentPreset
                ? state.textureCache.get(state.currentPreset) || null
                : null;

              await skyboxTransitionManager.transitionTo(
                currentTexture,
                texture,
                { duration: state.config.transitionDuration },
                {
                  onProgress: (progress, from, to, blendFactor) => {
                    set((draft) => {
                      draft.transitionProgress = progress;
                      draft.isTransitioning = progress < 1;
                    });
                  },
                  onComplete: () => {
                    set((draft) => {
                      draft.previousPreset = draft.currentPreset;
                      draft.currentPreset = presetId;
                      draft.isTransitioning = false;
                      draft.transitionProgress = 0;
                    });
                  },
                  onError: (error) => {
                    set((draft) => {
                      draft.error = `Transition failed: ${error.message}`;
                      draft.isTransitioning = false;
                      draft.transitionProgress = 0;
                    });
                  },
                },
              );
            } catch (error) {
              set((draft) => {
                draft.error =
                  error instanceof Error
                    ? error.message
                    : "Unknown error occurred";
                draft.loadStates[presetId] = {
                  isLoading: false,
                  progress: 0,
                  error:
                    error instanceof Error ? error.message : "Unknown error",
                  loadStartTime:
                    draft.loadStates[presetId]?.loadStartTime ||
                    performance.now(),
                  loadEndTime: performance.now(),
                };
              });
            }
          },

          addPreset: (preset: SkyboxPreset) => {
            set((draft) => {
              draft.presets[preset.id] = preset;
              draft.error = null;
            });
          },

          updatePreset: (presetId: string, updates: Partial<SkyboxPreset>) => {
            set((draft) => {
              if (draft.presets[presetId]) {
                Object.assign(draft.presets[presetId], updates, {
                  updatedAt: new Date().toISOString(),
                });
              }
            });
          },

          removePreset: (presetId: string) => {
            set((draft) => {
              // Clean up resources
              const texture = draft.textureCache.get(presetId);
              if (texture) {
                texture.dispose();
                draft.textureCache.delete(presetId);
              }
              draft.cacheMetadata.delete(presetId);

              delete draft.presets[presetId];
              delete draft.loadStates[presetId];

              if (draft.currentPreset === presetId) {
                draft.currentPreset = null;
              }

              if (draft.fallbackPreset === presetId) {
                draft.fallbackPreset = null;
              }
            });
          },

          duplicatePreset: (presetId: string, newName: string) => {
            const state = get();
            const originalPreset = state.presets[presetId];

            if (originalPreset) {
              const newId = `${presetId}_copy_${Date.now()}`;
              const duplicatedPreset: SkyboxPreset = {
                ...originalPreset,
                id: newId,
                name: newName,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };

              set((draft) => {
                draft.presets[newId] = duplicatedPreset;
              });
            }
          },

          // Configuration
          updateConfig: (config: Partial<typeof DEFAULT_SKYBOX_CONFIG>) => {
            set((draft) => {
              Object.assign(draft.config, config);
            });
          },

          setPerformanceMode: (mode) => {
            set((draft) => {
              draft.config.performanceMode = mode;

              // Adjust settings based on performance mode
              switch (mode) {
                case "performance":
                  draft.config.compressionEnabled = true;
                  draft.config.maxCacheSize = 64;
                  break;
                case "balanced":
                  draft.config.compressionEnabled = true;
                  draft.config.maxCacheSize = 128;
                  break;
                case "quality":
                  draft.config.compressionEnabled = false;
                  draft.config.maxCacheSize = 256;
                  break;
              }
            });
          },

          // Loading and transitions
          preloadPreset: async (presetId: string) => {
            const state = get();
            const preset = state.presets[presetId];

            if (!preset) {
              throw new SkyboxError(
                SkyboxErrorType.INVALID_PRESET,
                `Preset not found: ${presetId}`,
                presetId,
              );
            }

            // Check if already cached
            if (state.textureCache.has(presetId)) {
              return;
            }

            try {
              await skyboxTextureLoader.loadCubeTexture(preset);
            } catch (error) {
              set((draft) => {
                draft.error =
                  error instanceof Error ? error.message : "Preload failed";
              });
              throw error;
            }
          },

          transitionTo: async (presetId: string, config?: TransitionConfig) => {
            await get().setCurrentPreset(presetId);
          },

          cancelTransition: () => {
            skyboxTransitionManager.cancelTransition();
            set((draft) => {
              draft.isTransitioning = false;
              draft.transitionProgress = 0;
            });
          },

          // Error handling
          setError: (error: string | null) => {
            set((draft) => {
              draft.error = error;
            });
          },

          clearError: () => {
            set((draft) => {
              draft.error = null;
            });
          },

          setFallbackPreset: (presetId: string) => {
            set((draft) => {
              draft.fallbackPreset = presetId;
            });
          },

          // Performance and monitoring
          updatePerformanceMetrics: (
            metrics: Partial<SkyboxPerformanceMetrics>,
          ) => {
            set((draft) => {
              Object.assign(draft.performance, metrics);
            });
          },

          clearCache: () => {
            const state = get();

            // Dispose of all textures
            state.textureCache.forEach((texture) => {
              texture.dispose();
            });

            set((draft) => {
              draft.textureCache.clear();
              draft.cacheMetadata.clear();
              draft.performance.memoryUsage = 0;
            });

            skyboxTextureLoader.clearCache();
          },

          optimizeCache: () => {
            const state = get();
            const maxSize = state.config.maxCacheSize * 1024 * 1024; // Convert to bytes

            skyboxTextureLoader.optimizeCache(maxSize);

            // Update store state
            const stats = skyboxTextureLoader.getCacheStats();
            set((draft) => {
              draft.performance.memoryUsage = stats.memoryUsage;
              draft.performance.cacheHitRate = stats.hitRate;
            });
          },

          // Utility actions
          reset: () => {
            const state = get();

            // Clean up resources
            state.textureCache.forEach((texture) => {
              texture.dispose();
            });

            skyboxTransitionManager.cancelTransition();
            skyboxTextureLoader.clearCache();

            set(() => ({ ...initialState }));
          },

          exportPresets: (): string => {
            const state = get();
            const exportData = {
              version: "1.0",
              timestamp: new Date().toISOString(),
              presets: Object.values(state.presets).map((preset) => ({
                ...preset,
                // Convert Three.js objects to serializable format
                tint: {
                  r: preset.tint.r,
                  g: preset.tint.g,
                  b: preset.tint.b,
                },
                atmosphericSettings: {
                  ...preset.atmosphericSettings,
                  fogColor: {
                    r: preset.atmosphericSettings.fogColor.r,
                    g: preset.atmosphericSettings.fogColor.g,
                    b: preset.atmosphericSettings.fogColor.b,
                  },
                  windDirection: {
                    x: preset.atmosphericSettings.windDirection.x,
                    y: preset.atmosphericSettings.windDirection.y,
                    z: preset.atmosphericSettings.windDirection.z,
                  },
                },
              })),
            };

            return JSON.stringify(exportData, null, 2);
          },

          importPresets: (presetsJson: string) => {
            try {
              const importData = JSON.parse(presetsJson);

              if (!importData.presets || !Array.isArray(importData.presets)) {
                throw new Error("Invalid preset data format");
              }

              set((draft) => {
                importData.presets.forEach((presetData: any) => {
                  // Reconstruct Three.js objects
                  const preset: SkyboxPreset = {
                    ...presetData,
                    tint: new Color(
                      presetData.tint.r,
                      presetData.tint.g,
                      presetData.tint.b,
                    ),
                    atmosphericSettings: {
                      ...presetData.atmosphericSettings,
                      fogColor: new Color(
                        presetData.atmosphericSettings.fogColor.r,
                        presetData.atmosphericSettings.fogColor.g,
                        presetData.atmosphericSettings.fogColor.b,
                      ),
                      windDirection: new Vector3(
                        presetData.atmosphericSettings.windDirection.x,
                        presetData.atmosphericSettings.windDirection.y,
                        presetData.atmosphericSettings.windDirection.z,
                      ),
                    },
                  };

                  draft.presets[preset.id] = preset;
                });

                draft.error = null;
              });
            } catch (error) {
              set((draft) => {
                draft.error =
                  error instanceof Error
                    ? error.message
                    : "Failed to import presets";
              });
            }
          },
        })),
      ),
      {
        name: "skybox-store",
        version: 1,
        partialize: (state) => ({
          currentPreset: state.currentPreset,
          presets: state.presets,
          config: state.config,
          fallbackPreset: state.fallbackPreset,
        }),
      },
    ),
    {
      name: "SkyboxStore",
      enabled: process.env.NODE_ENV === "development",
    },
  ),
);

// Selector hooks for optimized subscriptions
export const useSkyboxCurrentPreset = () =>
  useSkyboxStore((state) => state.currentPreset);

export const useSkyboxIsTransitioning = () =>
  useSkyboxStore((state) => state.isTransitioning);

export const useSkyboxPresets = () => useSkyboxStore((state) => state.presets);

export const useSkyboxPerformance = () =>
  useSkyboxStore((state) => state.performance);

export const useSkyboxError = () => useSkyboxStore((state) => state.error);

export const useSkyboxConfig = () => useSkyboxStore((state) => state.config);

// Initialize performance monitoring when store is created (client-side only)
if (typeof window !== "undefined") {
  skyboxPerformanceMonitor.startMonitoring();
}
