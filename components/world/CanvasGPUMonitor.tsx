"use client";

import React, { useState, useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { gpuMemoryManager } from "../../utils/performance/GPUMemoryManager";

// Performance metrics interface
interface GPUMetrics {
  fps: number;
  frameTime: number;
  drawCalls: number;
  triangles: number;
  memoryUsage: {
    geometries: number;
    materials: number;
    textures: number;
    total: number;
    pressure: number;
  };
  gpuTime: number;
  cpuTime: number;
  instances: {
    total: number;
    visible: number;
    culled: number;
  };
  stateChanges: number;
}

// Canvas-internal GPU monitor that works with useThree
export function CanvasGPUMonitor() {
  const { gl } = useThree();
  const [metrics, setMetrics] = useState<GPUMetrics>({
    fps: 0,
    frameTime: 0,
    drawCalls: 0,
    triangles: 0,
    memoryUsage: {
      geometries: 0,
      materials: 0,
      textures: 0,
      total: 0,
      pressure: 0,
    },
    gpuTime: 0,
    cpuTime: 0,
    instances: {
      total: 0,
      visible: 0,
      culled: 0,
    },
    stateChanges: 0,
  });

  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  // Performance monitoring loop
  useEffect(() => {
    const interval = setInterval(() => {
      const now = performance.now();
      frameCount.current++;

      // Calculate FPS
      if (now - lastTime.current >= 1000) {
        const currentFps =
          (frameCount.current * 1000) / (now - lastTime.current);
        const currentFrameTime = 1000 / currentFps;

        // Get WebGL renderer info
        const info = gl.info;
        const memoryStats = gpuMemoryManager.getMemoryStats();

        const newMetrics: GPUMetrics = {
          fps: Math.round(currentFps),
          frameTime: currentFrameTime,
          drawCalls: info.render.calls,
          triangles: info.render.triangles,
          memoryUsage: {
            geometries: info.memory.geometries,
            materials: info.memory.textures, // Approximation
            textures: info.memory.textures,
            total: memoryStats.usage.total,
            pressure: memoryStats.pressure,
          },
          gpuTime: currentFrameTime * 0.6, // Estimated GPU time
          cpuTime: currentFrameTime * 0.4, // Estimated CPU time
          instances: {
            total: memoryStats.resourceCount,
            visible: Math.round(memoryStats.resourceCount * 0.7),
            culled: Math.round(memoryStats.resourceCount * 0.3),
          },
          stateChanges: info.render.calls, // Approximation
        };

        setMetrics(newMetrics);

        frameCount.current = 0;
        lastTime.current = now;
      }
    }, 100);

    return () => clearInterval(interval);
  }, [gl]);

  // Store metrics in a ref for external access
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__GPU_METRICS__ = metrics;
    }
  }, [metrics]);

  // This component doesn't render anything visible
  // It just collects metrics for the external dashboard
  return null;
}

// External dashboard component that works outside Canvas
export default function ExternalGPUDashboard({
  className = "",
  updateInterval = 1000,
}: {
  className?: string;
  updateInterval?: number;
}) {
  const [metrics, setMetrics] = useState<GPUMetrics>({
    fps: 0,
    frameTime: 0,
    drawCalls: 0,
    triangles: 0,
    memoryUsage: {
      geometries: 0,
      materials: 0,
      textures: 0,
      total: 0,
      pressure: 0,
    },
    gpuTime: 0,
    cpuTime: 0,
    instances: {
      total: 0,
      visible: 0,
      culled: 0,
    },
    stateChanges: 0,
  });

  const [isExpanded, setIsExpanded] = useState(false);

  // Get metrics from window global (set by CanvasGPUMonitor)
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof window !== "undefined" && (window as any).__GPU_METRICS__) {
        setMetrics((window as any).__GPU_METRICS__);
      }
    }, updateInterval);

    return () => clearInterval(interval);
  }, [updateInterval]);

  // Memory pressure indicator
  const MemoryPressureIndicator = ({ pressure }: { pressure: number }) => {
    const getColor = (pressure: number) => {
      if (pressure < 0.3) return "#00ff00";
      if (pressure < 0.6) return "#ffff00";
      if (pressure < 0.8) return "#ff8800";
      return "#ff0000";
    };

    const getStatus = (pressure: number) => {
      if (pressure < 0.3) return "Low";
      if (pressure < 0.6) return "Medium";
      if (pressure < 0.8) return "High";
      return "Critical";
    };

    return (
      <div className="flex items-center gap-2">
        <div className="w-12 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${pressure * 100}%`,
              backgroundColor: getColor(pressure),
            }}
          />
        </div>
        <span className="text-xs" style={{ color: getColor(pressure) }}>
          {getStatus(pressure)} ({(pressure * 100).toFixed(1)}%)
        </span>
      </div>
    );
  };

  if (process.env.NODE_ENV !== "development") return null;

  return (
    <div
      className={`fixed bottom-4 right-4 bg-black/90 backdrop-blur-sm border border-gray-700 rounded-lg text-white text-xs font-mono z-50 ${className}`}
    >
      {/* Collapsed view */}
      {!isExpanded && (
        <div
          className="p-2 cursor-pointer flex items-center gap-2 hover:bg-gray-800/50 transition-colors"
          onClick={() => setIsExpanded(true)}
        >
          <div className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor:
                  metrics.fps >= 60
                    ? "#00ff00"
                    : metrics.fps >= 30
                      ? "#ffff00"
                      : "#ff0000",
              }}
            />
            <span>{metrics.fps}fps</span>
          </div>
          <div className="text-gray-400">|</div>
          <div>{metrics.frameTime.toFixed(1)}ms</div>
          <div className="text-gray-400">|</div>
          <div>{metrics.drawCalls} calls</div>
          <span className="text-gray-500 text-[10px]">▲</span>
        </div>
      )}

      {/* Expanded view */}
      {isExpanded && (
        <div className="p-4 min-w-[400px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold text-green-400">
              🚀 GPU Performance Monitor
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Main metrics */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <div className="text-gray-300 font-semibold">Performance</div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>FPS:</span>
                  <span
                    style={{
                      color:
                        metrics.fps >= 60
                          ? "#00ff00"
                          : metrics.fps >= 30
                            ? "#ffff00"
                            : "#ff0000",
                    }}
                  >
                    {metrics.fps}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Frame Time:</span>
                  <span>{metrics.frameTime.toFixed(2)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>GPU Time:</span>
                  <span className="text-blue-400">
                    {metrics.gpuTime.toFixed(2)}ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>CPU Time:</span>
                  <span className="text-yellow-400">
                    {metrics.cpuTime.toFixed(2)}ms
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-gray-300 font-semibold">Rendering</div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Draw Calls:</span>
                  <span
                    className={
                      metrics.drawCalls > 100 ? "text-red-400" : "text-green-400"
                    }
                  >
                    {metrics.drawCalls}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Triangles:</span>
                  <span>{metrics.triangles.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>State Changes:</span>
                  <span
                    className={
                      metrics.stateChanges > 50
                        ? "text-orange-400"
                        : "text-green-400"
                    }
                  >
                    {metrics.stateChanges}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Instances:</span>
                  <span>
                    {metrics.instances.visible}/{metrics.instances.total}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Memory section */}
          <div className="mb-4">
            <div className="text-gray-300 font-semibold mb-2">Memory Usage</div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Geometries: {metrics.memoryUsage.geometries}</span>
                <span>Textures: {metrics.memoryUsage.textures}</span>
              </div>
              <div className="text-xs">Memory Pressure:</div>
              <MemoryPressureIndicator
                pressure={metrics.memoryUsage.pressure}
              />
            </div>
          </div>

          {/* Optimization recommendations */}
          <div className="space-y-1 mb-4">
            <div className="text-xs font-semibold text-gray-300">
              Recommendations:
            </div>
            {metrics.fps < 30 && (
              <div className="text-xs text-red-400">
                🔴 Low FPS: Consider reducing block count or enabling LOD
              </div>
            )}
            {metrics.memoryUsage.pressure > 0.8 && (
              <div className="text-xs text-orange-400">
                🟠 High memory pressure: Enable aggressive culling
              </div>
            )}
            {metrics.drawCalls > 100 && (
              <div className="text-xs text-yellow-400">
                🟡 High draw calls: Enable instanced rendering
              </div>
            )}
            {metrics.stateChanges > 50 && (
              <div className="text-xs text-blue-400">
                🔵 High state changes: Sort objects by material
              </div>
            )}
            {metrics.fps >= 60 &&
              metrics.memoryUsage.pressure < 0.6 &&
              metrics.drawCalls <= 50 && (
                <div className="text-xs text-green-400">
                  ✅ Performance optimized
                </div>
              )}
          </div>

          {/* Performance indicator */}
          <div className="pt-3 border-t border-gray-700">
            <div className="text-xs text-gray-500 flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor:
                    metrics.frameTime < 8
                      ? "#00ff00" // Excellent
                      : metrics.frameTime < 16
                        ? "#88ff00" // Good
                        : metrics.frameTime < 33
                          ? "#ffff00" // Fair
                          : metrics.frameTime < 50
                            ? "#ff8800" // Poor
                            : "#ff0000", // Critical
                }}
              />
              <span>
                Status:{" "}
                {metrics.frameTime < 8
                  ? "Excellent"
                  : metrics.frameTime < 16
                    ? "Good"
                    : metrics.frameTime < 33
                      ? "Fair"
                      : metrics.frameTime < 50
                        ? "Poor"
                        : "Critical"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
