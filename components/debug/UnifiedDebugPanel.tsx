"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { transparencySortingFix } from "../../utils/TransparencySortingFix";
import { useWorldStore } from "../../store/worldStore";
import { BlockType, CameraMode } from "../../types";

interface UnifiedDebugPanelProps {
  enabled?: boolean;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  cameraMode?: CameraMode;
  followTarget?: string;
}

interface DebugStats {
  fps: number;
  frameTime: number;
  transparency: {
    totalObjects: number;
    sortedObjects: number;
    avgDistance: number;
    renderOrderRange: { min: number; max: number };
  };
  gpu: {
    memoryUsage: number;
    drawCalls: number;
    triangles: number;
  };
  camera: {
    mode: CameraMode;
    position: [number, number, number];
    target: string | null;
    isTransitioning: boolean;
  };
  blocks: {
    total: number;
    transparent: number;
    visible: number;
  };
}

type TabType =
  | "overview"
  | "transparency"
  | "camera"
  | "performance"
  | "blocks";

export function UnifiedDebugPanel({
  enabled = false,
  position = "top-right",
  cameraMode = "OVERHEAD" as CameraMode,
  followTarget,
}: UnifiedDebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [stats, setStats] = useState<DebugStats | null>(null);
  const [isMinimized, setIsMinimized] = useState(true);
  const [realFps, setRealFps] = useState(60);
  const [frameTime, setFrameTime] = useState(16.67);

  const { blockMap } = useWorldStore();

  // Performance monitoring refs
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  // Keyboard shortcut (F3) to toggle debug panel
  useEffect(() => {
    if (!enabled) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === "F3") {
        event.preventDefault();
        setIsOpen((prev) => !prev);
        if (!isOpen) {
          setIsMinimized(false);
        }
      }
      // ESC to close panel
      if (event.key === "Escape" && isOpen) {
        event.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [enabled, isOpen]);

  // Real-time FPS monitoring
  useEffect(() => {
    if (!enabled) return;

    let animationFrameId: number;

    const measurePerformance = () => {
      frameCount.current++;
      const now = performance.now();

      if (now - lastTime.current >= 1000) {
        const currentFps = Math.round(
          (frameCount.current * 1000) / (now - lastTime.current),
        );
        const currentFrameTime = 1000 / currentFps;

        setRealFps(currentFps);
        setFrameTime(currentFrameTime);

        frameCount.current = 0;
        lastTime.current = now;
      }

      animationFrameId = requestAnimationFrame(measurePerformance);
    };

    animationFrameId = requestAnimationFrame(measurePerformance);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [enabled]);

  // Collect stats from various systems
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      try {
        // Get transparency stats
        const transparencyStats = transparencySortingFix.getStats();

        // Count blocks by type
        const blocks = Array.from(blockMap.values());
        const transparentBlocks = blocks.filter(
          (block) =>
            block.type === BlockType.NUMBER_7 ||
            block.type === BlockType.FROSTED_GLASS ||
            block.type === BlockType.NUMBER_6,
        );

        const newStats: DebugStats = {
          fps: realFps,
          frameTime: frameTime,
          transparency: {
            totalObjects: transparencyStats.totalTransparentObjects,
            sortedObjects: transparencyStats.sortedObjectsCount,
            avgDistance: transparencyStats.averageDistance,
            renderOrderRange: transparencyStats.renderOrderRange,
          },
          gpu: {
            memoryUsage: 0, // Would be filled by GPU monitor
            drawCalls: 0,
            triangles: blocks.length * 12, // Approximate
          },
          camera: {
            mode: cameraMode,
            position: [0, 0, 0], // Would be updated by camera bridge
            target: followTarget || null,
            isTransitioning: false, // Would be updated by camera system
          },
          blocks: {
            total: blocks.length,
            transparent: transparentBlocks.length,
            visible: Math.min(blocks.length, 1000), // Estimate based on culling
          },
        };

        setStats(newStats);
      } catch (error) {
        console.warn("UnifiedDebugPanel: Error updating stats:", error);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [enabled, blockMap, cameraMode, followTarget]);

  const positionClasses = {
    "top-left": "top-4 left-4",
    "top-right": "top-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "bottom-right": "bottom-4 right-4",
  };

  const handleToggle = useCallback(() => {
    if (!isOpen) {
      setIsOpen(true);
      setIsMinimized(false);
    } else {
      setIsOpen(false);
      setIsMinimized(true);
    }
  }, [isOpen]);

  const renderTabContent = () => {
    if (!stats) return <div className="text-gray-400">Loading...</div>;

    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-blue-900/30 p-2 rounded">
                <div className="text-blue-300 font-semibold">Performance</div>
                <div>
                  FPS: <span className="text-yellow-300">{stats.fps}</span>
                </div>
                <div>
                  Frame:{" "}
                  <span className="text-yellow-300">
                    {stats.frameTime.toFixed(1)}ms
                  </span>
                </div>
              </div>
              <div className="bg-green-900/30 p-2 rounded">
                <div className="text-green-300 font-semibold">Blocks</div>
                <div>
                  Total:{" "}
                  <span className="text-yellow-300">{stats.blocks.total}</span>
                </div>
                <div>
                  Transparent:{" "}
                  <span className="text-yellow-300">
                    {stats.blocks.transparent}
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-purple-900/30 p-2 rounded text-xs">
              <div className="text-purple-300 font-semibold">Camera</div>
              <div>
                Mode:{" "}
                <span className="text-yellow-300">{stats.camera.mode}</span>
              </div>
              <div>
                Target:{" "}
                <span className="text-yellow-300">
                  {stats.camera.target || "None"}
                </span>
              </div>
            </div>
            <div className="bg-orange-900/30 p-2 rounded text-xs">
              <div className="text-orange-300 font-semibold">Transparency</div>
              <div>
                Objects:{" "}
                <span className="text-yellow-300">
                  {stats.transparency.totalObjects}
                </span>
              </div>
              <div>
                Sorted:{" "}
                <span className="text-yellow-300">
                  {stats.transparency.sortedObjects}
                </span>
              </div>
            </div>
          </div>
        );

      case "transparency":
        return (
          <div className="space-y-3">
            <div className="text-orange-400 font-semibold">
              Transparency System
            </div>
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  Total Objects:{" "}
                  <span className="text-yellow-300">
                    {stats.transparency.totalObjects}
                  </span>
                </div>
                <div>
                  Sorted:{" "}
                  <span className="text-yellow-300">
                    {stats.transparency.sortedObjects}
                  </span>
                </div>
                <div>
                  Avg Distance:{" "}
                  <span className="text-yellow-300">
                    {stats.transparency.avgDistance.toFixed(1)}
                  </span>
                </div>
                <div>
                  Render Range:{" "}
                  <span className="text-cyan-300">
                    {stats.transparency.renderOrderRange.min}-
                    {stats.transparency.renderOrderRange.max}
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-gray-600">
                <div className="flex gap-2">
                  <button
                    onClick={() => transparencySortingFix.clear()}
                    className="px-2 py-1 bg-red-600/30 hover:bg-red-600/50 rounded text-[10px]"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => transparencySortingFix.enableDebugLogging()}
                    className="px-2 py-1 bg-blue-600/30 hover:bg-blue-600/50 rounded text-[10px]"
                  >
                    Debug Log
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case "camera":
        return (
          <div className="space-y-3">
            <div className="text-purple-400 font-semibold">Camera System</div>
            <div className="space-y-2 text-xs">
              <div>
                Current Mode:{" "}
                <span className="text-yellow-300">{stats.camera.mode}</span>
              </div>
              <div>
                Follow Target:{" "}
                <span className="text-yellow-300">
                  {stats.camera.target || "None"}
                </span>
              </div>
              <div>
                Position:{" "}
                <span className="text-cyan-300">
                  [{stats.camera.position.map((p) => p.toFixed(1)).join(", ")}]
                </span>
              </div>
              <div>
                Transitioning:
                <span
                  className={`ml-1 ${stats.camera.isTransitioning ? "text-red-400" : "text-green-400"}`}
                >
                  {stats.camera.isTransitioning ? "YES" : "NO"}
                </span>
              </div>
              <div className="pt-2 border-t border-gray-600">
                <div className="text-gray-400 text-[10px]">
                  Available Modes:
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {["OVERHEAD", "FIRST_PERSON", "FOLLOW", "ORBIT"].map(
                    (mode) => (
                      <span
                        key={mode}
                        className={`px-1 py-0.5 rounded text-[10px] ${
                          mode === stats.camera.mode
                            ? "bg-purple-600/50 text-white"
                            : "bg-gray-600/30 text-gray-300"
                        }`}
                      >
                        {mode}
                      </span>
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case "performance":
        return (
          <div className="space-y-3">
            <div className="text-blue-400 font-semibold">
              Performance Metrics
            </div>
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  FPS:{" "}
                  <span
                    className={`${stats.fps < 30 ? "text-red-400" : stats.fps < 50 ? "text-yellow-400" : "text-green-400"}`}
                  >
                    {stats.fps}
                  </span>
                </div>
                <div>
                  Frame Time:{" "}
                  <span className="text-yellow-300">
                    {stats.frameTime.toFixed(2)}ms
                  </span>
                </div>
                <div>
                  Memory:{" "}
                  <span className="text-cyan-300">
                    {stats.gpu.memoryUsage}MB
                  </span>
                </div>
                <div>
                  Draw Calls:{" "}
                  <span className="text-purple-300">{stats.gpu.drawCalls}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-gray-600">
                <div>
                  Triangles:{" "}
                  <span className="text-yellow-300">
                    {stats.gpu.triangles.toLocaleString()}
                  </span>
                </div>
                <div className="mt-1">
                  <div className="text-gray-400 text-[10px]">
                    Performance Status:
                  </div>
                  <div
                    className={`px-2 py-1 rounded text-[10px] ${
                      stats.fps >= 50
                        ? "bg-green-600/30"
                        : stats.fps >= 30
                          ? "bg-yellow-600/30"
                          : "bg-red-600/30"
                    }`}
                  >
                    {stats.fps >= 50
                      ? "Excellent"
                      : stats.fps >= 30
                        ? "Good"
                        : "Poor"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "blocks":
        return (
          <div className="space-y-3">
            <div className="text-green-400 font-semibold">Block Statistics</div>
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  Total Blocks:{" "}
                  <span className="text-yellow-300">{stats.blocks.total}</span>
                </div>
                <div>
                  Visible:{" "}
                  <span className="text-green-300">{stats.blocks.visible}</span>
                </div>
                <div>
                  Transparent:{" "}
                  <span className="text-blue-300">
                    {stats.blocks.transparent}
                  </span>
                </div>
                <div>
                  Culled:{" "}
                  <span className="text-red-300">
                    {stats.blocks.total - stats.blocks.visible}
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-gray-600">
                <div className="text-gray-400 text-[10px]">Block Types:</div>
                <div className="mt-1 space-y-1">
                  <div className="flex justify-between">
                    <span>Glass (NUMBER_7):</span>
                    <span className="text-blue-300">
                      {stats.blocks.transparent}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Regular:</span>
                    <span className="text-gray-300">
                      {stats.blocks.total - stats.blocks.transparent}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return <div>Unknown tab</div>;
    }
  };

  if (!enabled) return null;

  return (
    <>
      {/* Floating Toggle Button */}
      <div className={`fixed ${positionClasses[position]} z-[1000]`}>
        <button
          onClick={handleToggle}
          className={`
            w-12 h-12 rounded-full shadow-lg transition-all duration-300
            ${
              isOpen
                ? "bg-blue-600 hover:bg-blue-700 scale-110"
                : "bg-gray-800 hover:bg-gray-700 border-2 border-blue-500/50"
            }
            flex items-center justify-center text-white font-mono text-sm
            relative group
          `}
          title="Toggle Debug Panel (F3)"
        >
          {isOpen ? "✕" : "⚙️"}
          {!isOpen && (
            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              F3
            </div>
          )}
        </button>
      </div>

      {/* Main Debug Panel */}
      {isOpen && (
        <div
          className={`
            fixed ${positionClasses[position]} z-[999] mt-16
            bg-black/95 text-white rounded-lg border border-blue-500/30
            backdrop-blur-sm shadow-2xl transition-all duration-300
            ${isMinimized ? "w-80" : "w-96"}
          `}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-600">
            <div className="flex items-center gap-2">
              <span className="text-blue-400 font-bold">🔧 Debug Panel</span>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-400">Active</span>
              </div>
              <div className="text-xs text-gray-500 bg-gray-800 px-1 rounded">
                F3
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="px-2 py-1 bg-gray-600/30 hover:bg-gray-600/50 rounded text-xs"
                title={isMinimized ? "Expand" : "Minimize"}
              >
                {isMinimized ? "⇱" : "⇲"}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="px-2 py-1 bg-red-600/30 hover:bg-red-600/50 rounded text-xs"
                title="Close (ESC)"
              >
                ✕
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Tab Navigation */}
              <div className="flex border-b border-gray-600">
                {[
                  { id: "overview", label: "📊", title: "Overview" },
                  { id: "transparency", label: "🔍", title: "Transparency" },
                  { id: "camera", label: "📷", title: "Camera" },
                  { id: "performance", label: "⚡", title: "Performance" },
                  { id: "blocks", label: "🧱", title: "Blocks" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`
                      flex-1 p-2 text-xs font-mono transition-colors
                      ${
                        activeTab === tab.id
                          ? "bg-blue-600/30 text-blue-300 border-b-2 border-blue-400"
                          : "hover:bg-gray-600/30 text-gray-400"
                      }
                    `}
                    title={tab.title}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>{tab.label}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Content Area */}
              <div className="p-3 max-h-96 overflow-y-auto">
                {renderTabContent()}
              </div>
            </>
          )}

          {/* Quick Stats when minimized */}
          {isMinimized && stats && (
            <div className="p-2 text-xs">
              <div className="flex justify-between items-center">
                <span>
                  FPS: <span className="text-yellow-300">{stats.fps}</span>
                </span>
                <span>
                  Blocks:{" "}
                  <span className="text-green-300">{stats.blocks.total}</span>
                </span>
                <span>
                  Glass:{" "}
                  <span className="text-blue-300">
                    {stats.blocks.transparent}
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default UnifiedDebugPanel;
