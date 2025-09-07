"use client";

import React, { useRef, useCallback, useMemo, useState } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { CubeTextureLoader, Scene, CubeTexture, Texture } from "three";
import { useModuleSystem } from "./ModuleManager";
import type { ModuleState } from "./ModuleManager";

interface SkyboxModuleProps {
  skyboxPath?: string;
  enableDynamicSkybox?: boolean;
  transitionDuration?: number;
  enableTimeOfDay?: boolean;
  updateFrequency?: number;
}

interface SkyboxState {
  isLoaded: boolean;
  isLoading: boolean;
  currentSkybox: string;
  error: string | null;
  loadProgress: number;
}

const DEFAULT_SKYBOX_FACES = [
  "1.jpg", // positive x
  "2.jpg", // negative x
  "3.jpg", // positive y
  "4.jpg", // negative y
  "5.jpg", // positive z
  "6.jpg", // negative z
];

export function SkyboxModule({
  skyboxPath = "/skyboxes/default/",
  enableDynamicSkybox = false,
  transitionDuration = 2000,
  enableTimeOfDay = false,
  updateFrequency = 1, // Hz - very low frequency for skybox updates
}: SkyboxModuleProps) {
  const { scene } = useThree();

  // Skybox-specific state (isolated from other modules)
  const [skyboxState, setSkyboxState] = useState<SkyboxState>({
    isLoaded: false,
    isLoading: false,
    currentSkybox: skyboxPath,
    error: null,
    loadProgress: 0,
  });

  // Performance-optimized refs
  const cubeTextureRef = useRef<CubeTexture | null>(null);
  const loaderRef = useRef<CubeTextureLoader>(new CubeTextureLoader());
  const lastUpdateRef = useRef<number>(0);
  const transitionStartRef = useRef<number>(0);
  const previousTextureRef = useRef<Texture | null>(null);

  // Register this module with performance isolation
  const { requestFrame, setEnabled, getStats } = useModuleSystem({
    id: "skybox-system",
    priority: 2, // Low priority - skybox updates are not time-critical
    maxFrameTime: 2, // Very low frame time budget for skybox
    targetFPS: updateFrequency, // Very low update frequency
    canSkipFrames: true, // Can easily skip frames
  });

  // Load skybox texture with progress tracking
  const loadSkyboxTexture = useCallback(
    async (path: string): Promise<CubeTexture> => {
      return new Promise((resolve, reject) => {
        setSkyboxState((prev) => ({
          ...prev,
          isLoading: true,
          error: null,
          loadProgress: 0,
        }));

        const faces = DEFAULT_SKYBOX_FACES.map((face) => path + face);

        // Create loader with progress tracking
        const loader = new CubeTextureLoader();

        // Setup progress tracking
        let loadedCount = 0;
        const totalCount = faces.length;

        const texture = loader.load(
          faces,
          // onLoad
          (cubeTexture) => {
            setSkyboxState((prev) => ({
              ...prev,
              isLoaded: true,
              isLoading: false,
              loadProgress: 100,
              currentSkybox: path,
            }));
            resolve(cubeTexture);
          },
          // onProgress
          (progress) => {
            loadedCount++;
            const progressPercent = (loadedCount / totalCount) * 100;
            setSkyboxState((prev) => ({
              ...prev,
              loadProgress: progressPercent,
            }));
          },
          // onError
          (error) => {
            console.error("[SkyboxModule] Failed to load skybox:", error);
            setSkyboxState((prev) => ({
              ...prev,
              isLoading: false,
              error: `Failed to load skybox: ${error}`,
              loadProgress: 0,
            }));
            reject(error);
          },
        );
      });
    },
    [],
  );

  // Apply skybox to scene
  const applySkyboxToScene = useCallback(
    (texture: CubeTexture) => {
      if (!texture || !scene) return;

      try {
        // Store previous texture for cleanup
        if (scene.background && scene.background !== texture) {
          previousTextureRef.current = scene.background as Texture;
        }

        // Apply new skybox
        scene.background = texture;
        cubeTextureRef.current = texture;

        // Cleanup previous texture after a delay to allow for transitions
        if (previousTextureRef.current && enableDynamicSkybox) {
          setTimeout(() => {
            if (
              previousTextureRef.current &&
              previousTextureRef.current.dispose
            ) {
              previousTextureRef.current.dispose();
              previousTextureRef.current = null;
            }
          }, transitionDuration);
        }
      } catch (error) {
        console.error("[SkyboxModule] Error applying skybox to scene:", error);
        setSkyboxState((prev) => ({
          ...prev,
          error: `Error applying skybox: ${error}`,
        }));
      }
    },
    [scene, enableDynamicSkybox, transitionDuration],
  );

  // Initialize skybox loading
  React.useEffect(() => {
    let isMounted = true;

    const initializeSkybox = async () => {
      try {
        const texture = await loadSkyboxTexture(skyboxPath);
        if (isMounted) {
          applySkyboxToScene(texture);
        }
      } catch (error) {
        console.error("[SkyboxModule] Skybox initialization failed:", error);
      }
    };

    initializeSkybox();

    return () => {
      isMounted = false;
    };
  }, [skyboxPath, loadSkyboxTexture, applySkyboxToScene]);

  // Time of day skybox switching (if enabled)
  const timeOfDayUpdate = useCallback(() => {
    if (!enableTimeOfDay) return;

    const now = new Date();
    const hours = now.getHours();

    let timeBasedSkybox = skyboxPath;

    if (hours >= 6 && hours < 12) {
      timeBasedSkybox = "/skyboxes/morning/";
    } else if (hours >= 12 && hours < 18) {
      timeBasedSkybox = "/skyboxes/day/";
    } else if (hours >= 18 && hours < 22) {
      timeBasedSkybox = "/skyboxes/evening/";
    } else {
      timeBasedSkybox = "/skyboxes/night/";
    }

    // Only switch if different from current
    if (
      timeBasedSkybox !== skyboxState.currentSkybox &&
      !skyboxState.isLoading
    ) {
      loadSkyboxTexture(timeBasedSkybox)
        .then(applySkyboxToScene)
        .catch((error) =>
          console.error(
            "[SkyboxModule] Time of day skybox switch failed:",
            error,
          ),
        );
    }
  }, [
    enableTimeOfDay,
    skyboxPath,
    skyboxState.currentSkybox,
    skyboxState.isLoading,
    loadSkyboxTexture,
    applySkyboxToScene,
  ]);

  // Main skybox update loop (very infrequent)
  const skyboxUpdateLoop = useCallback(
    (deltaTime: number) => {
      const currentTime = performance.now();
      const timeSinceLastUpdate = currentTime - lastUpdateRef.current;
      const updateInterval = 1000 / updateFrequency;

      // Only update at the specified frequency (very low for skybox)
      if (timeSinceLastUpdate < updateInterval) {
        return;
      }

      lastUpdateRef.current = currentTime;

      // Perform time of day updates
      timeOfDayUpdate();
    },
    [updateFrequency, timeOfDayUpdate],
  );

  // Register update loop with module system
  React.useEffect(() => {
    requestFrame(skyboxUpdateLoop);
  }, [requestFrame, skyboxUpdateLoop]);

  // Performance monitoring
  const stats = getStats();
  React.useEffect(() => {
    if (process.env.NODE_ENV === "development" && stats) {
      // Skybox should have very minimal performance impact
      if (stats.averageFrameTime > 1) {
        console.warn("[SkyboxModule] Unexpected performance impact detected");
      }
    }
  }, [stats]);

  // Enable/disable based on whether skybox features are needed
  React.useEffect(() => {
    const shouldEnable =
      enableDynamicSkybox || enableTimeOfDay || !skyboxState.isLoaded;
    setEnabled(shouldEnable);
  }, [enableDynamicSkybox, enableTimeOfDay, skyboxState.isLoaded, setEnabled]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (cubeTextureRef.current && cubeTextureRef.current.dispose) {
        cubeTextureRef.current.dispose();
      }
      if (previousTextureRef.current && previousTextureRef.current.dispose) {
        previousTextureRef.current.dispose();
      }

      // Reset scene background
      if (scene) {
        scene.background = null;
      }
    };
  }, [scene]);

  // Export skybox control functions for external use
  const skyboxControls = useMemo(
    () => ({
      switchSkybox: async (newPath: string) => {
        if (skyboxState.isLoading) {
          console.warn(
            "[SkyboxModule] Skybox switch ignored - already loading",
          );
          return false;
        }

        try {
          const texture = await loadSkyboxTexture(newPath);
          applySkyboxToScene(texture);
          return true;
        } catch (error) {
          console.error("[SkyboxModule] Manual skybox switch failed:", error);
          return false;
        }
      },
      getCurrentSkybox: () => skyboxState.currentSkybox,
      isLoading: () => skyboxState.isLoading,
      getLoadProgress: () => skyboxState.loadProgress,
    }),
    [skyboxState, loadSkyboxTexture, applySkyboxToScene],
  );

  return (
    <group name="skybox-module">
      {/* Debug visualization */}
      {process.env.NODE_ENV === "development" && (
        <SkyboxDebugOverlay state={skyboxState} stats={stats} />
      )}

      {/* Loading indicator */}
      {skyboxState.isLoading && (
        <SkyboxLoadingIndicator progress={skyboxState.loadProgress} />
      )}
    </group>
  );
}

// Debug overlay for development
function SkyboxDebugOverlay({
  state,
  stats,
}: {
  state: SkyboxState;
  stats: ModuleState | null;
}) {
  if (process.env.NODE_ENV !== "development") return null;

  return (
    <group name="skybox-debug">
      {/* Status indicator */}
      <mesh position={[-5, 4, 0]}>
        <sphereGeometry args={[0.2]} />
        <meshBasicMaterial
          color={
            state.error
              ? "#ff0000"
              : state.isLoading
                ? "#ffaa00"
                : state.isLoaded
                  ? "#00ff00"
                  : "#666666"
          }
        />
      </mesh>

      {/* Loading progress indicator */}
      {state.isLoading && state.loadProgress > 0 && (
        <mesh
          position={[-5, 3.5, 0]}
          scale={[state.loadProgress / 100, 0.1, 0.1]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#00aaff" />
        </mesh>
      )}
    </group>
  );
}

// Loading indicator component
function SkyboxLoadingIndicator({ progress }: { progress: number }) {
  return (
    <group name="skybox-loading">
      {/* Minimal loading visualization */}
      <mesh position={[0, 5, 0]}>
        <sphereGeometry args={[0.1]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.3 + Math.sin(Date.now() * 0.005) * 0.2}
        />
      </mesh>
    </group>
  );
}

export default SkyboxModule;
