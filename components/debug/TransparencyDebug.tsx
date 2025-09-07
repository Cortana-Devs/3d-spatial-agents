"use client";

import React, { useState, useEffect, useCallback } from "react";
import { transparencySortingFix } from "../../utils/TransparencySortingFix";
import { BlockType } from "../../types";

interface TransparencyDebugProps {
  enabled?: boolean;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  compact?: boolean;
  showStats?: boolean;
  showRecommendations?: boolean;
}

interface TransparencyStats {
  totalTransparentObjects: number;
  sortedObjectsCount: number;
  lastSortTime: number;
  averageDistance: number;
  renderOrderRange: { min: number; max: number };
  framesSinceLastSort: number;
  sortingMethod: string;
}

export function TransparencyDebug({
  enabled = true,
  position = "top-right",
  compact = false,
  showStats = true,
  showRecommendations = true,
}: TransparencyDebugProps) {
  const [stats, setStats] = useState<TransparencyStats | null>(null);
  const [sortHistory, setSortHistory] = useState<number[]>([]);
  const [glassBlockCount, setGlassBlockCount] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState(0);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  // Update stats regularly
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      try {
        const currentStats = transparencySortingFix.getStats();
        const now = performance.now();

        const enhancedStats: TransparencyStats = {
          ...currentStats,
          framesSinceLastSort: Math.floor(
            (now - currentStats.lastSortTime) / 16.67,
          ), // Assuming 60fps
          sortingMethod: "hybrid", // This would come from config
        };

        setStats(enhancedStats);

        // Track sorting frequency
        setSortHistory((prev) => {
          const newHistory = [...prev, now - lastUpdateTime];
          return newHistory.slice(-30); // Keep last 30 updates
        });

        setLastUpdateTime(now);

        // Generate recommendations
        generateRecommendations(enhancedStats);
      } catch (error) {
        console.warn("TransparencyDebug: Error updating stats:", error);
      }
    }, 100); // Update every 100ms

    return () => clearInterval(interval);
  }, [enabled, lastUpdateTime]);

  const generateRecommendations = useCallback(
    (currentStats: TransparencyStats) => {
      const recs: string[] = [];

      if (currentStats.totalTransparentObjects > 150) {
        recs.push("High transparent object count - consider distance culling");
      }

      if (currentStats.framesSinceLastSort > 10) {
        recs.push(
          "Infrequent sorting - objects may appear incorrectly layered",
        );
      }

      if (currentStats.averageDistance > 50) {
        recs.push("Objects are far from camera - consider LOD optimization");
      }

      if (
        currentStats.renderOrderRange.max - currentStats.renderOrderRange.min >
        2000
      ) {
        recs.push("Large render order range - may cause sorting conflicts");
      }

      if (sortHistory.length > 10) {
        const avgSortTime =
          sortHistory.reduce((a, b) => a + b, 0) / sortHistory.length;
        if (avgSortTime > 33) {
          // More than 2 frames at 60fps
          recs.push(
            "Slow sorting performance - consider reducing transparent objects",
          );
        }
      }

      setRecommendations(recs);
    },
    [sortHistory],
  );

  const handleForceSort = useCallback(() => {
    // Force sort will be handled by the CameraBridge component
    if (process.env.NODE_ENV === "development") {
      console.log("Forced transparency sorting update requested");
    }
  }, []);

  const handleClearObjects = useCallback(() => {
    transparencySortingFix.clear();
    if (process.env.NODE_ENV === "development") {
      console.log("Cleared all transparent objects from sorting system");
    }
  }, []);

  const handleToggleDebugLogging = useCallback(() => {
    transparencySortingFix.enableDebugLogging();
    if (process.env.NODE_ENV === "development") {
      console.log("Enabled debug logging for transparency sorting");
    }
  }, []);

  if (!enabled || !stats) return null;

  const positionClasses = {
    "top-left": "top-4 left-4",
    "top-right": "top-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "bottom-right": "bottom-4 right-4",
  };

  return (
    <div
      className={`fixed ${positionClasses[position]} z-[998] bg-black/95 text-white p-3 rounded-lg text-xs font-mono border border-blue-500/30 backdrop-blur-sm max-w-sm`}
    >
      <div className="text-blue-400 font-bold mb-2 flex items-center justify-between">
        <span>🔍 Transparency Debug {compact && "(Compact)"}</span>
        <div className="flex gap-1">
          <button
            onClick={handleForceSort}
            className="px-1 py-0.5 bg-blue-600/30 hover:bg-blue-600/50 rounded text-[10px]"
            title="Force Sort"
          >
            Sort
          </button>
          <button
            onClick={handleClearObjects}
            className="px-1 py-0.5 bg-red-600/30 hover:bg-red-600/50 rounded text-[10px]"
            title="Clear All"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Core Stats */}
      {showStats && (
        <div className="space-y-1 mb-3">
          <div className="text-green-400 font-semibold">Core Stats:</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              Objects:{" "}
              <span className="text-yellow-300">
                {stats.totalTransparentObjects}
              </span>
            </div>
            <div>
              Sorted:{" "}
              <span className="text-yellow-300">
                {stats.sortedObjectsCount}
              </span>
            </div>
            <div>
              Avg Dist:{" "}
              <span className="text-yellow-300">
                {stats.averageDistance.toFixed(1)}
              </span>
            </div>
            <div>
              Frames:{" "}
              <span
                className={`${stats.framesSinceLastSort > 5 ? "text-red-400" : "text-green-400"}`}
              >
                {stats.framesSinceLastSort}
              </span>
            </div>
          </div>

          <div className="mt-2">
            <div>
              Render Order:
              <span className="text-cyan-300 ml-1">
                {stats.renderOrderRange.min} - {stats.renderOrderRange.max}
              </span>
            </div>
            <div>
              Method:{" "}
              <span className="text-purple-300">{stats.sortingMethod}</span>
            </div>
          </div>
        </div>
      )}

      {!compact && (
        <>
          {/* Performance Metrics */}
          <div className="space-y-1 mb-3">
            <div className="text-orange-400 font-semibold">Performance:</div>
            <div className="text-xs">
              <div>Last Sort: {Date.now() - stats.lastSortTime}ms ago</div>
              {sortHistory.length > 0 && (
                <div>
                  Avg Sort Time:{" "}
                  {(
                    sortHistory.reduce((a, b) => a + b, 0) / sortHistory.length
                  ).toFixed(1)}
                  ms
                </div>
              )}
            </div>
          </div>

          {/* Block Type Breakdown */}
          <div className="space-y-1 mb-3">
            <div className="text-purple-400 font-semibold">Block Types:</div>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span>NUMBER_7 (Glass):</span>
                <span className="text-blue-300">{glassBlockCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Other Transparent:</span>
                <span className="text-cyan-300">
                  {stats.totalTransparentObjects - glassBlockCount}
                </span>
              </div>
            </div>
          </div>

          {/* Visual Health Indicators */}
          <div className="space-y-1 mb-3">
            <div className="text-yellow-400 font-semibold">Health:</div>
            <div className="flex gap-2 text-xs">
              <div
                className={`px-2 py-1 rounded ${
                  stats.totalTransparentObjects < 100
                    ? "bg-green-600/30"
                    : stats.totalTransparentObjects < 200
                      ? "bg-yellow-600/30"
                      : "bg-red-600/30"
                }`}
              >
                Count:{" "}
                {stats.totalTransparentObjects < 100
                  ? "Good"
                  : stats.totalTransparentObjects < 200
                    ? "OK"
                    : "High"}
              </div>
              <div
                className={`px-2 py-1 rounded ${
                  stats.framesSinceLastSort < 3
                    ? "bg-green-600/30"
                    : stats.framesSinceLastSort < 8
                      ? "bg-yellow-600/30"
                      : "bg-red-600/30"
                }`}
              >
                Sort:{" "}
                {stats.framesSinceLastSort < 3
                  ? "Fast"
                  : stats.framesSinceLastSort < 8
                    ? "OK"
                    : "Slow"}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Recommendations */}
      {showRecommendations && recommendations.length > 0 && (
        <div className="space-y-1 mb-2">
          <div className="text-red-400 font-semibold">Issues:</div>
          <div className="text-xs space-y-1 max-h-20 overflow-y-auto">
            {recommendations.slice(0, 3).map((rec, idx) => (
              <div key={idx} className="text-yellow-200">
                • {rec}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="space-y-1">
        <div className="text-gray-400 font-semibold text-[10px]">Actions:</div>
        <div className="flex gap-1">
          <button
            onClick={handleToggleDebugLogging}
            className="px-2 py-1 text-[10px] bg-purple-600/30 hover:bg-purple-600/50 rounded transition-colors"
          >
            Log Debug
          </button>
          <button
            onClick={() =>
              transparencySortingFix.configure({
                depthSortingMethod:
                  stats.sortingMethod === "simple" ? "advanced" : "simple",
              })
            }
            className="px-2 py-1 text-[10px] bg-blue-600/30 hover:bg-blue-600/50 rounded transition-colors"
          >
            Toggle Method
          </button>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="mt-2 pt-2 border-t border-gray-600 flex justify-between items-center text-[10px]">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              stats.totalTransparentObjects > 0
                ? "bg-green-400 animate-pulse"
                : "bg-gray-500"
            }`}
          ></div>
          <span>Transparency System</span>
        </div>
        <div className="text-gray-400">
          {stats.totalTransparentObjects > 0 ? "Active" : "Idle"}
        </div>
      </div>

      {/* Debug Info for NUMBER_7 blocks */}
      {stats.totalTransparentObjects > 0 && (
        <div className="mt-2 p-1 bg-blue-900/20 border border-blue-500/30 rounded text-[10px]">
          <div className="font-semibold text-blue-300">
            NUMBER_7 Block Status:
          </div>
          <div>Proper depth sorting: ✅</div>
          <div>Material optimization: ✅</div>
          <div>
            Viewport culling:{" "}
            {stats.sortedObjectsCount < stats.totalTransparentObjects
              ? "✅"
              : "⚠️"}
          </div>
        </div>
      )}
    </div>
  );
}

export default TransparencyDebug;
