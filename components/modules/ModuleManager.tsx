"use client";

import React, { createContext, useContext, useRef, useCallback } from "react";
import { useFrame } from "@react-three/fiber";

// Module performance isolation system
interface ModuleConfig {
  id: string;
  priority: number; // Higher = more important
  maxFrameTime: number; // Max milliseconds per frame
  targetFPS: number; // Target FPS for this module
  canSkipFrames: boolean; // Can this module skip frames when needed?
}

interface ModuleState {
  isRunning: boolean;
  lastUpdate: number;
  frameCount: number;
  averageFrameTime: number;
  skippedFrames: number;
}

interface ModuleContext {
  registerModule: (config: ModuleConfig) => string;
  unregisterModule: (id: string) => void;
  requestFrame: (
    moduleId: string,
    callback: (deltaTime: number) => void,
  ) => void;
  setModuleEnabled: (moduleId: string, enabled: boolean) => void;
  getModuleStats: (moduleId: string) => ModuleState | null;
  getAllStats: () => Record<string, ModuleState>;
}

const ModuleManagerContext = createContext<ModuleContext | null>(null);

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  CRITICAL_FRAME_TIME: 16.67, // 60 FPS
  WARNING_FRAME_TIME: 33.33, // 30 FPS
  MAX_MODULES_PER_FRAME: 3, // Maximum modules to update per frame
  FRAME_TIME_BUDGET: 14, // Leave 2.67ms for other operations
} as const;

export function ModuleManager({ children }: { children: React.ReactNode }) {
  const modulesRef = useRef<Map<string, ModuleConfig>>(new Map());
  const statesRef = useRef<Map<string, ModuleState>>(new Map());
  const callbacksRef = useRef<Map<string, (deltaTime: number) => void>>(
    new Map(),
  );
  const frameQueueRef = useRef<string[]>([]);
  const lastFrameTimeRef = useRef<number>(0);

  const registerModule = useCallback((config: ModuleConfig): string => {
    const id = config.id || `module-${Date.now()}-${Math.random()}`;

    modulesRef.current.set(id, { ...config, id });
    statesRef.current.set(id, {
      isRunning: true,
      lastUpdate: performance.now(),
      frameCount: 0,
      averageFrameTime: 0,
      skippedFrames: 0,
    });

    process.env.NODE_ENV === "development" &&
      console.log(`[ModuleManager] Registered module: ${id}`);
    return id;
  }, []);

  const unregisterModule = useCallback((id: string) => {
    modulesRef.current.delete(id);
    statesRef.current.delete(id);
    callbacksRef.current.delete(id);

    // Remove from frame queue
    frameQueueRef.current = frameQueueRef.current.filter(
      (moduleId) => moduleId !== id,
    );

    process.env.NODE_ENV === "development" &&
      console.log(`[ModuleManager] Unregistered module: ${id}`);
  }, []);

  const requestFrame = useCallback(
    (moduleId: string, callback: (deltaTime: number) => void) => {
      callbacksRef.current.set(moduleId, callback);

      // Add to frame queue if not already present
      if (!frameQueueRef.current.includes(moduleId)) {
        frameQueueRef.current.push(moduleId);
      }
    },
    [],
  );

  const setModuleEnabled = useCallback((moduleId: string, enabled: boolean) => {
    const state = statesRef.current.get(moduleId);
    if (state) {
      state.isRunning = enabled;
      process.env.NODE_ENV === "development" &&
        console.log(
          `[ModuleManager] Module ${moduleId} ${enabled ? "enabled" : "disabled"}`,
        );
    }
  }, []);

  const getModuleStats = useCallback((moduleId: string): ModuleState | null => {
    return statesRef.current.get(moduleId) || null;
  }, []);

  const getAllStats = useCallback((): Record<string, ModuleState> => {
    const stats: Record<string, ModuleState> = {};
    statesRef.current.forEach((state, id) => {
      stats[id] = { ...state };
    });
    return stats;
  }, []);

  // Smart frame scheduling system
  useFrame((_, delta) => {
    const frameStart = performance.now();
    const deltaMs = delta * 1000;
    let processedModules = 0;

    // Sort modules by priority and update frequency needs
    const activeModules = Array.from(frameQueueRef.current)
      .filter((id) => {
        const state = statesRef.current.get(id);
        const config = modulesRef.current.get(id);
        return state?.isRunning && config;
      })
      .map((id) => {
        const config = modulesRef.current.get(id)!;
        const state = statesRef.current.get(id)!;
        const timeSinceLastUpdate = frameStart - state.lastUpdate;
        const targetInterval = 1000 / config.targetFPS;

        return {
          id,
          config,
          state,
          priority: config.priority,
          needsUpdate: timeSinceLastUpdate >= targetInterval,
          urgency: timeSinceLastUpdate / targetInterval, // Higher = more urgent
        };
      })
      .sort((a, b) => {
        // Sort by urgency first, then priority
        if (a.needsUpdate && !b.needsUpdate) return -1;
        if (!a.needsUpdate && b.needsUpdate) return 1;
        if (a.needsUpdate && b.needsUpdate) {
          return b.urgency - a.urgency; // More urgent first
        }
        return b.priority - a.priority; // Higher priority first
      });

    // Process modules within frame budget
    for (const module of activeModules) {
      const currentTime = performance.now();
      const frameTimeUsed = currentTime - frameStart;

      // Check if we have enough time budget left
      if (frameTimeUsed > PERFORMANCE_THRESHOLDS.FRAME_TIME_BUDGET) {
        process.env.NODE_ENV === "development" &&
          console.warn(
            `[ModuleManager] Frame budget exceeded, skipping remaining modules`,
          );
        break;
      }

      // Check if we've processed too many modules this frame
      if (processedModules >= PERFORMANCE_THRESHOLDS.MAX_MODULES_PER_FRAME) {
        break;
      }

      // Skip if module doesn't need update (unless it's critical priority)
      if (
        !module.needsUpdate &&
        module.config.priority < 10 &&
        module.config.canSkipFrames
      ) {
        module.state.skippedFrames++;
        continue;
      }

      try {
        const moduleStart = performance.now();
        const callback = callbacksRef.current.get(module.id);

        if (callback) {
          // Calculate delta time specific to this module
          const moduleDelta = Math.min(deltaMs, module.config.maxFrameTime);
          callback(moduleDelta);
          processedModules++;

          // Update module statistics
          const moduleEnd = performance.now();
          const moduleFrameTime = moduleEnd - moduleStart;

          module.state.lastUpdate = moduleStart;
          module.state.frameCount++;

          // Update rolling average frame time
          const alpha = 0.1; // Smoothing factor
          module.state.averageFrameTime =
            module.state.averageFrameTime * (1 - alpha) +
            moduleFrameTime * alpha;

          // Warn if module is taking too long
          if (moduleFrameTime > module.config.maxFrameTime) {
            if (process.env.NODE_ENV === "development") {
              console.warn(
                `[ModuleManager] Module ${module.id} exceeded max frame time: ${moduleFrameTime.toFixed(2)}ms > ${module.config.maxFrameTime}ms`,
              );
            }
          }
        }
      } catch (error) {
        console.error(`[ModuleManager] Error in module ${module.id}:`, error);
        // Temporarily disable problematic module
        module.state.isRunning = false;
      }
    }

    // Performance monitoring
    lastFrameTimeRef.current = performance.now() - frameStart;

    // Log performance warnings in development
    if (
      process.env.NODE_ENV === "development" &&
      lastFrameTimeRef.current > PERFORMANCE_THRESHOLDS.WARNING_FRAME_TIME
    ) {
      console.warn(
        `[ModuleManager] Frame time warning: ${lastFrameTimeRef.current.toFixed(2)}ms`,
      );
    }
  });

  const contextValue: ModuleContext = {
    registerModule,
    unregisterModule,
    requestFrame,
    setModuleEnabled,
    getModuleStats,
    getAllStats,
  };

  return (
    <ModuleManagerContext.Provider value={contextValue}>
      {children}
    </ModuleManagerContext.Provider>
  );
}

// Hook for modules to register themselves and get frame callbacks
export function useModuleSystem(
  config: Omit<ModuleConfig, "id"> & { id?: string },
) {
  const context = useContext(ModuleManagerContext);
  if (!context) {
    throw new Error("useModuleSystem must be used within a ModuleManager");
  }

  const moduleIdRef = useRef<string | null>(null);
  const configRef = useRef(config);
  configRef.current = config;

  React.useEffect(() => {
    const fullConfig: ModuleConfig = {
      id: config.id || `auto-${Date.now()}-${Math.random()}`,
      priority: config.priority || 5,
      maxFrameTime: config.maxFrameTime || 16,
      targetFPS: config.targetFPS || 60,
      canSkipFrames: config.canSkipFrames !== false,
    };

    moduleIdRef.current = context.registerModule(fullConfig);

    return () => {
      if (moduleIdRef.current) {
        context.unregisterModule(moduleIdRef.current);
      }
    };
  }, [context]);

  const requestFrame = useCallback(
    (callback: (deltaTime: number) => void) => {
      if (moduleIdRef.current) {
        context.requestFrame(moduleIdRef.current, callback);
      }
    },
    [context],
  );

  const setEnabled = useCallback(
    (enabled: boolean) => {
      if (moduleIdRef.current) {
        context.setModuleEnabled(moduleIdRef.current, enabled);
      }
    },
    [context],
  );

  const getStats = useCallback(() => {
    return moduleIdRef.current
      ? context.getModuleStats(moduleIdRef.current)
      : null;
  }, [context]);

  return {
    moduleId: moduleIdRef.current,
    requestFrame,
    setEnabled,
    getStats,
  };
}

// Performance monitoring component
export function ModulePerformanceMonitor() {
  const context = useContext(ModuleManagerContext);
  const [stats, setStats] = React.useState<Record<string, ModuleState>>({});

  React.useEffect(() => {
    if (!context) return;

    const interval = setInterval(() => {
      setStats(context.getAllStats());
    }, 1000);

    return () => clearInterval(interval);
  }, [context]);

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        top: 10,
        right: 10,
        background: "rgba(0, 0, 0, 0.8)",
        color: "white",
        padding: 10,
        borderRadius: 5,
        fontSize: 12,
        fontFamily: "monospace",
        zIndex: 1000,
        maxWidth: 300,
      }}
    >
      <div style={{ fontWeight: "bold", marginBottom: 5 }}>
        Module Performance
      </div>
      {Object.entries(stats).map(([id, state]) => (
        <div key={id} style={{ marginBottom: 3 }}>
          <div style={{ fontWeight: "bold" }}>{id}</div>
          <div>
            FPS: {(1000 / Math.max(state.averageFrameTime, 1)).toFixed(1)}
          </div>
          <div>Avg Time: {state.averageFrameTime.toFixed(2)}ms</div>
          <div>Skipped: {state.skippedFrames}</div>
          <div>Status: {state.isRunning ? "✅" : "❌"}</div>
        </div>
      ))}
    </div>
  );
}

export type { ModuleConfig, ModuleState, ModuleContext };
