"use client";

import React, {
  useMemo,
  useRef,
  useEffect,
  useCallback,
  useState,
} from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { BlockType } from "../../types/blocks";
import { Block } from "../../types";
import SeamlessGlassRenderer from "./SeamlessGlassRenderer";
import UltraOptimizedGlassRenderer, {
  UltraGlassUtils,
} from "./UltraOptimizedGlassRenderer";

// Device capability detection
interface DeviceCapabilities {
  type: "mobile" | "desktop" | "high-end";
  gpuTier: number; // 1-3 (low to high)
  memoryGB: number;
  cores: number;
  isWebGL2: boolean;
  maxTextureSize: number;
  hasFloat32Textures: boolean;
  hasInstancedArrays: boolean;
}

// Performance metrics tracking
interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  gpuMemory: number;
  renderCalls: number;
  triangles: number;
  adaptationRecommendation: "upgrade" | "maintain" | "downgrade";
}

interface AdaptiveGlassRendererProps {
  blocks: Map<string, Block>;
  glassBlockTypes?: BlockType[];
  forceRenderer?: "standard" | "ultra" | null;
  onPerformanceChange?: (metrics: PerformanceMetrics) => void;
}

// Smart device detection with comprehensive capabilities analysis
const detectDeviceCapabilities = (
  gl: WebGLRenderingContext | WebGL2RenderingContext,
): DeviceCapabilities => {
  // Validate WebGL context
  if (!gl || typeof gl.getParameter !== "function") {
    throw new Error(
      "Invalid WebGL context provided to detectDeviceCapabilities",
    );
  }

  const canvas = gl.canvas as HTMLCanvasElement;
  const navigator = window.navigator;

  // GPU tier detection using WebGL extensions and limits
  const getGPUTier = (): number => {
    try {
      const renderer = gl.getParameter(gl.RENDERER) as string;
      const vendor = gl.getParameter(gl.VENDOR) as string;
      const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
      const maxRenderBufferSize = gl.getParameter(
        gl.MAX_RENDERBUFFER_SIZE,
      ) as number;

      // High-end GPU indicators
      if (
        renderer.includes("RTX") ||
        renderer.includes("6800") ||
        renderer.includes("6900") ||
        renderer.includes("M1 Max") ||
        renderer.includes("M2") ||
        maxTextureSize >= 16384
      ) {
        return 3;
      }

      // Mid-range GPU indicators
      if (
        renderer.includes("GTX") ||
        renderer.includes("RX") ||
        renderer.includes("Iris") ||
        renderer.includes("M1") ||
        maxTextureSize >= 8192
      ) {
        return 2;
      }

      return 1; // Low-end
    } catch (error) {
      console.warn("Error detecting GPU tier:", error);
      return 1; // Default to low-end on error
    }
  };

  // Memory estimation (rough approximation)
  const getMemoryGB = (): number => {
    const memory =
      "deviceMemory" in navigator ? navigator.deviceMemory : undefined;
    if (memory) return memory;

    // Fallback estimation based on other factors
    const cores = navigator.hardwareConcurrency || 4;
    if (cores >= 8) return 8;
    if (cores >= 4) return 4;
    return 2;
  };

  // Device type classification
  const getDeviceType = (
    gpuTier: number,
    memoryGB: number,
    cores: number,
  ): DeviceCapabilities["type"] => {
    const isMobile =
      /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );

    if (isMobile) return "mobile";

    if (gpuTier >= 3 && memoryGB >= 8 && cores >= 8) {
      return "high-end";
    }

    return "desktop";
  };

  const gpuTier = getGPUTier();
  const memoryGB = getMemoryGB();
  const cores = navigator.hardwareConcurrency || 4;

  return {
    type: getDeviceType(gpuTier, memoryGB, cores),
    gpuTier,
    memoryGB,
    cores,
    isWebGL2: gl instanceof WebGL2RenderingContext,
    maxTextureSize:
      (gl.getParameter && gl.getParameter(gl.MAX_TEXTURE_SIZE)) || 2048,
    hasFloat32Textures: !!(
      gl.getExtension && gl.getExtension("OES_texture_float")
    ),
    hasInstancedArrays: !!(
      gl.getExtension && gl.getExtension("ANGLE_instanced_arrays")
    ),
  };
};

// Performance monitor with smart adaptation
class AdaptivePerformanceMonitor {
  private frameTimes: number[] = [];
  private renderMetrics: PerformanceMetrics[] = [];
  private lastFrameTime = 0;
  private adaptationCooldown = 0;
  private readonly maxSamples = 120; // 2 seconds at 60fps
  private readonly adaptationCooldownFrames = 300; // 5 seconds at 60fps

  update(
    additionalMetrics: Partial<PerformanceMetrics> = {},
  ): PerformanceMetrics {
    const now = performance.now();

    if (this.lastFrameTime > 0) {
      const frameTime = now - this.lastFrameTime;
      this.frameTimes.push(frameTime);

      if (this.frameTimes.length > this.maxSamples) {
        this.frameTimes.shift();
      }
    }

    this.lastFrameTime = now;

    // Calculate current metrics
    const avgFrameTime =
      this.frameTimes.length > 0
        ? this.frameTimes.reduce((a, b) => a + b) / this.frameTimes.length
        : 16.67;

    const fps = 1000 / avgFrameTime;

    // Memory usage estimation (if available)
    const memoryInfo = performance.memory;
    const memoryUsage = memoryInfo
      ? memoryInfo.usedJSHeapSize / 1024 / 1024
      : 0;

    const metrics: PerformanceMetrics = {
      fps,
      frameTime: avgFrameTime,
      memoryUsage,
      gpuMemory: 0, // Would need WebGL extension for accurate measurement
      renderCalls: 0,
      triangles: 0,
      adaptationRecommendation: this.getAdaptationRecommendation(fps),
      ...additionalMetrics,
    };

    this.renderMetrics.push(metrics);
    if (this.renderMetrics.length > 60) {
      // Keep last 60 samples
      this.renderMetrics.shift();
    }

    this.adaptationCooldown = Math.max(0, this.adaptationCooldown - 1);

    return metrics;
  }

  private getAdaptationRecommendation(
    currentFPS: number,
  ): PerformanceMetrics["adaptationRecommendation"] {
    if (this.adaptationCooldown > 0) return "maintain";

    // Calculate trend over recent samples
    const recentSamples = this.renderMetrics.slice(-30);
    if (recentSamples.length < 10) return "maintain";

    const avgRecentFPS =
      recentSamples.reduce((sum, m) => sum + m.fps, 0) / recentSamples.length;

    // Performance thresholds
    const targetFPS = 60;
    const minAcceptableFPS = 45;
    const excellentFPS = 90;

    if (avgRecentFPS < minAcceptableFPS) {
      this.adaptationCooldown = this.adaptationCooldownFrames;
      return "downgrade";
    }

    if (avgRecentFPS > excellentFPS && currentFPS > excellentFPS) {
      this.adaptationCooldown = this.adaptationCooldownFrames;
      return "upgrade";
    }

    return "maintain";
  }

  getStabilityScore(): number {
    if (this.frameTimes.length < 30) return 0.5;

    const mean =
      this.frameTimes.reduce((a, b) => a + b) / this.frameTimes.length;
    const variance =
      this.frameTimes.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) /
      this.frameTimes.length;
    const stdDev = Math.sqrt(variance);

    // Lower standard deviation = more stability (scale 0-1)
    return Math.max(0, Math.min(1, 1 - stdDev / mean));
  }

  shouldSwitchRenderer(): boolean {
    const recent = this.renderMetrics.slice(-10);
    if (recent.length < 5) return false;

    const recommendations = recent.map((m) => m.adaptationRecommendation);
    const upgradeCount = recommendations.filter((r) => r === "upgrade").length;
    const downgradeCount = recommendations.filter(
      (r) => r === "downgrade",
    ).length;

    // Switch if majority of recent frames recommend it
    return upgradeCount > 7 || downgradeCount > 7;
  }
}

export default function AdaptiveGlassRenderer({
  blocks,
  glassBlockTypes = [
    BlockType.FROSTED_GLASS,
    BlockType.NUMBER_6,
    BlockType.NUMBER_7,
  ],
  forceRenderer = null,
  onPerformanceChange,
}: AdaptiveGlassRendererProps) {
  const { gl: renderer } = useThree();
  const [activeRenderer, setActiveRenderer] = useState<"standard" | "ultra">(
    "standard",
  );
  const [deviceCapabilities, setDeviceCapabilities] =
    useState<DeviceCapabilities | null>(null);
  const performanceMonitor = useRef(new AdaptivePerformanceMonitor());
  const frameCounter = useRef(0);
  const lastSwitchTime = useRef(0);

  // Detect device capabilities on mount
  useEffect(() => {
    if (!renderer) return;

    const timer = setTimeout(() => {
      const gl = renderer.getContext();

      if (process.env.NODE_ENV === "development") {
        void import("@/utils/devLogger").then(({ devLog }) =>
          devLog("🔍 AdaptiveGlassRenderer: WebGL context check", {
            hasContext: !!gl,
            hasGetParameter: !!(gl && typeof gl.getParameter === "function"),
            hasCanvas: !!(gl && gl.canvas),
            contextType:
              gl instanceof WebGL2RenderingContext ? "WebGL2" : "WebGL1",
          }),
        );
      }

      if (gl && typeof gl.getParameter === "function" && gl.canvas) {
        try {
          const contextLost = gl.isContextLost && gl.isContextLost();
          if (contextLost) {
            console.warn("WebGL context is lost, using fallback settings");
            throw new Error("WebGL context lost");
          }

          const capabilities = detectDeviceCapabilities(gl);
          setDeviceCapabilities(capabilities);

          if (process.env.NODE_ENV === "development") {
            void import("@/utils/devLogger").then(({ devLog }) =>
              devLog(
                "✅ AdaptiveGlassRenderer: Device capabilities detected",
                capabilities,
              ),
            );
          }

          if (forceRenderer) {
            setActiveRenderer(forceRenderer);
          } else {
            if (capabilities.type === "high-end" && capabilities.gpuTier >= 3) {
              setActiveRenderer("ultra");
            } else if (
              capabilities.type === "mobile" ||
              capabilities.gpuTier === 1
            ) {
              setActiveRenderer("standard");
            } else {
              setActiveRenderer("standard");
            }
          }
        } catch (error) {
          console.error("Error detecting device capabilities:", error);
          setDeviceCapabilities({
            type: "desktop",
            gpuTier: 2,
            memoryGB: 4,
            cores: 4,
            isWebGL2: false,
            maxTextureSize: 2048,
            hasFloat32Textures: false,
            hasInstancedArrays: false,
          });
          setActiveRenderer("standard");
        }
      } else {
        console.warn("WebGL context not ready, using fallback settings");
        setDeviceCapabilities({
          type: "desktop",
          gpuTier: 2,
          memoryGB: 4,
          cores: 4,
          isWebGL2: false,
          maxTextureSize: 2048,
          hasFloat32Textures: false,
          hasInstancedArrays: false,
        });
        setActiveRenderer("standard");
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [renderer, forceRenderer]);

  // Filter glass blocks
  const glassBlocks = useMemo(() => {
    const filtered = new Map<string, Block>();
    blocks.forEach((block, key) => {
      if (glassBlockTypes.includes(block.type)) {
        filtered.set(key, block);
      }
    });

    if (process.env.NODE_ENV === "development") {
      void import("@/utils/devLogger").then(({ devLog }) =>
        devLog("🔮 AdaptiveGlassRenderer: Total blocks received:", blocks.size),
      );
    }
    if (process.env.NODE_ENV === "development") {
      void import("@/utils/devLogger").then(({ devLog }) =>
        devLog(
          "✨ AdaptiveGlassRenderer: Glass blocks to render:",
          filtered.size,
        ),
      );
    }

    if (filtered.size > 0) {
      const blockTypes = [
        ...new Set(Array.from(filtered.values()).map((b) => b.type)),
      ];
      if (process.env.NODE_ENV === "development") {
        void import("@/utils/devLogger").then(({ devLog }) =>
          devLog("🎨 AdaptiveGlassRenderer: Glass block types:", blockTypes),
        );
      }
    }

    return filtered;
  }, [blocks, glassBlockTypes]);

  // Performance monitoring and adaptive switching
  useFrame(() => {
    frameCounter.current++;

    // Update performance metrics every frame
    const metrics = performanceMonitor.current.update();

    // Call performance callback
    if (onPerformanceChange && frameCounter.current % 30 === 0) {
      onPerformanceChange(metrics);
    }

    // Check for renderer switching every 60 frames (1 second at 60fps)
    if (
      frameCounter.current % 60 === 0 &&
      !forceRenderer &&
      deviceCapabilities
    ) {
      const now = performance.now();
      const timeSinceLastSwitch = now - lastSwitchTime.current;

      // Prevent rapid switching (minimum 5 seconds between switches)
      if (timeSinceLastSwitch > 5000) {
        const shouldSwitch = performanceMonitor.current.shouldSwitchRenderer();
        const stabilityScore = performanceMonitor.current.getStabilityScore();

        if (shouldSwitch && stabilityScore > 0.3) {
          // Only switch if performance is somewhat stable
          const recommendation = metrics.adaptationRecommendation;

          if (
            recommendation === "upgrade" &&
            activeRenderer === "standard" &&
            deviceCapabilities.gpuTier >= 2
          ) {
            setActiveRenderer("ultra");
            lastSwitchTime.current = now;
            if (process.env.NODE_ENV === "development") {
              void import("@/utils/devLogger").then(({ devLog }) =>
                devLog(
                  "🚀 Adaptive Glass: Switching to UltraOptimized renderer for better quality",
                ),
              );
            }
          } else if (
            recommendation === "downgrade" &&
            activeRenderer === "ultra"
          ) {
            setActiveRenderer("standard");
            lastSwitchTime.current = now;
            if (process.env.NODE_ENV === "development") {
              void import("@/utils/devLogger").then(({ devLog }) =>
                devLog(
                  "⚡ Adaptive Glass: Switching to Standard renderer for better performance",
                ),
              );
            }
          }
        }
      }
    }
  });

  // Get optimal configuration for the active renderer
  const getRendererConfig = useCallback(() => {
    if (!deviceCapabilities) return {};

    return UltraGlassUtils.getOptimalConfig(deviceCapabilities.type);
  }, [deviceCapabilities]);

  // Render appropriate renderer based on current selection
  const renderActiveRenderer = () => {
    const config = getRendererConfig();

    if (process.env.NODE_ENV === "development") {
      void import("@/utils/devLogger").then(({ devLog }) =>
        devLog(
          `🎯 AdaptiveGlassRenderer: Using ${activeRenderer} renderer for ${glassBlocks.size} glass blocks`,
        ),
      );
    }

    if (activeRenderer === "ultra") {
      return (
        <UltraOptimizedGlassRenderer
          blocks={blocks}
          glassBlockTypes={glassBlockTypes}
          config={config}
        />
      );
    } else {
      return (
        <SeamlessGlassRenderer
          blocks={blocks}
          glassBlockTypes={glassBlockTypes}
          enableOptimization={true}
          maxClusterSize={deviceCapabilities?.type === "mobile" ? 250 : 1000}
        />
      );
    }
  };

  // Don't render until device capabilities are detected
  if (!deviceCapabilities) {
    return null;
  }

  return (
    <>
      {renderActiveRenderer()}

      {/* Debug info in development */}
      {process.env.NODE_ENV === "development" && (
        <mesh position={[10, 5, 0]} scale={0.1}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial
            color={activeRenderer === "ultra" ? "#00ff00" : "#ffff00"}
            transparent
            opacity={0.8}
          />
        </mesh>
      )}
    </>
  );
}

// Utility hooks for external components
export const useGlassPerformance = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [renderer, setRenderer] = useState<"standard" | "ultra">("standard");

  const handlePerformanceChange = useCallback(
    (newMetrics: PerformanceMetrics) => {
      setMetrics(newMetrics);
    },
    [],
  );

  return {
    metrics,
    activeRenderer: renderer,
    onPerformanceChange: handlePerformanceChange,
  };
};

// Performance utilities
export const AdaptiveGlassUtils = {
  // Get current device capabilities
  getDeviceInfo: (glRenderer: unknown) => {
    // Handle both THREE.js WebGLRenderer and raw WebGL context
    const gl =
      typeof glRenderer === "object" &&
      glRenderer !== null &&
      "getContext" in glRenderer &&
      typeof (glRenderer as { getContext: unknown }).getContext === "function"
        ? (
            glRenderer as {
              getContext: () => WebGLRenderingContext | WebGL2RenderingContext;
            }
          ).getContext()
        : (glRenderer as WebGLRenderingContext | WebGL2RenderingContext);
    return detectDeviceCapabilities(gl);
  },

  // Recommend optimal settings
  getRecommendedSettings: (deviceType: DeviceCapabilities["type"]) => {
    switch (deviceType) {
      case "mobile":
        return {
          renderer: "standard" as const,
          maxClusters: 5,
          enableAdaptiveQuality: true,
          targetFPS: 30,
        };
      case "desktop":
        return {
          renderer: "standard" as const,
          maxClusters: 10,
          enableAdaptiveQuality: true,
          targetFPS: 60,
        };
      case "high-end":
        return {
          renderer: "ultra" as const,
          maxClusters: 20,
          enableAdaptiveQuality: false,
          targetFPS: 120,
        };
    }
  },

  // Performance analysis
  analyzePerformance: (metrics: PerformanceMetrics[]) => {
    if (metrics.length === 0) return null;

    const avgFPS = metrics.reduce((sum, m) => sum + m.fps, 0) / metrics.length;
    const avgFrameTime =
      metrics.reduce((sum, m) => sum + m.frameTime, 0) / metrics.length;
    const maxMemory = Math.max(...metrics.map((m) => m.memoryUsage));

    return {
      averageFPS: avgFPS,
      averageFrameTime: avgFrameTime,
      memoryPeak: maxMemory,
      stability:
        1 -
        (Math.max(...metrics.map((m) => m.frameTime)) -
          Math.min(...metrics.map((m) => m.frameTime))) /
          avgFrameTime,
      recommendation:
        avgFPS < 45
          ? "reduce_quality"
          : avgFPS > 90
            ? "increase_quality"
            : "maintain",
    };
  },
};
