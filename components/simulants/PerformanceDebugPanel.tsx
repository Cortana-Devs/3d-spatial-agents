/**
 * Performance Debug Panel
 * Shows real-time performance metrics and optimization controls
 */

"use client";

import React, { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import type { UsePerformanceOptimizationReturn } from "../../utils/usePerformanceOptimization";

interface PerformanceDebugPanelProps {
  performanceOptimization: UsePerformanceOptimizationReturn;
  className?: string;
  onClose?: () => void;
}

export default function PerformanceDebugPanel({
  performanceOptimization,
  className = "",
  onClose,
}: PerformanceDebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(1000);

  const { state } = performanceOptimization;

  // Auto-refresh performance data
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Force a re-render to update the display
      setIsExpanded((prev) => prev);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const handleQualityChange = (quality: "high" | "medium" | "low") => {
    performanceOptimization.setQuality(quality);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatNumber = (num: number, decimals: number = 1): string => {
    return num.toFixed(decimals);
  };

  const getQualityColor = (quality: string): string => {
    switch (quality) {
      case "high":
        return "text-green-400";
      case "medium":
        return "text-yellow-400";
      case "low":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const getPerformanceColor = (fps: number): string => {
    if (fps >= 55) return "text-green-400";
    if (fps >= 30) return "text-yellow-400";
    return "text-red-400";
  };

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <Card
      className={`fixed top-4 right-4 bg-black/90 text-white border-gray-700 ${className}`}
    >
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Performance Monitor</h3>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? "−" : "+"}
            </Button>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                ×
              </Button>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-400">FPS</div>
            <div
              className={`text-xl font-mono ${getPerformanceColor(state.frameRate)}`}
            >
              {formatNumber(state.frameRate)}
            </div>
          </div>
          <div>
            <div className="text-gray-400">Quality</div>
            <div
              className={`text-xl font-semibold ${getQualityColor(state.currentQuality.name)}`}
            >
              {state.currentQuality.name.toUpperCase()}
            </div>
          </div>
          <div>
            <div className="text-gray-400">Memory</div>
            <div
              className={`text-lg font-mono ${state.isMemoryPressureHigh ? "text-red-400" : "text-green-400"}`}
            >
              {formatBytes(state.memoryUsage)}
            </div>
          </div>
          <div>
            <div className="text-gray-400">Visible</div>
            <div className="text-lg font-mono text-blue-400">
              {state.visibleSimulants}/
              {state.visibleSimulants + state.culledSimulants}
            </div>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center space-x-4 text-sm">
          <div
            className={`flex items-center space-x-1 ${state.isPerformanceDegraded ? "text-red-400" : "text-green-400"}`}
          >
            <div
              className={`w-2 h-2 rounded-full ${state.isPerformanceDegraded ? "bg-red-400" : "bg-green-400"}`}
            />
            <span>{state.isPerformanceDegraded ? "Degraded" : "Good"}</span>
          </div>
          <div
            className={`flex items-center space-x-1 ${state.isMemoryPressureHigh ? "text-yellow-400" : "text-green-400"}`}
          >
            <div
              className={`w-2 h-2 rounded-full ${state.isMemoryPressureHigh ? "bg-yellow-400" : "bg-green-400"}`}
            />
            <span>Memory</span>
          </div>
        </div>

        {isExpanded && (
          <>
            <Separator className="bg-gray-700" />

            {/* Quality Controls */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-300">
                Quality Control
              </h4>
              <div className="flex space-x-2">
                {(["high", "medium", "low"] as const).map((quality) => (
                  <Button
                    key={quality}
                    variant={
                      state.currentQuality.name === quality
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() => handleQualityChange(quality)}
                    className="text-xs"
                  >
                    {quality.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>

            <Separator className="bg-gray-700" />

            {/* Detailed Stats */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-300">
                Detailed Metrics
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-gray-400">Active Animations</div>
                  <div className="font-mono">{state.activeAnimations}</div>
                </div>
                <div>
                  <div className="text-gray-400">Culled Simulants</div>
                  <div className="font-mono">{state.culledSimulants}</div>
                </div>
                <div>
                  <div className="text-gray-400">Max Distance</div>
                  <div className="font-mono">
                    {state.currentQuality.cullingDistance}u
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Update Rate</div>
                  <div className="font-mono">
                    {state.currentQuality.animationUpdateRate}Hz
                  </div>
                </div>
              </div>
            </div>

            <Separator className="bg-gray-700" />

            {/* Controls */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-300">Controls</h4>

              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-refresh"
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                />
                <Label htmlFor="auto-refresh" className="text-xs">
                  Auto Refresh
                </Label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={performanceOptimization.optimizeNow}
                  className="text-xs"
                >
                  Optimize Now
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={performanceOptimization.clearAnimationCache}
                  className="text-xs"
                >
                  Clear Cache
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={performanceOptimization.resetPerformanceCounters}
                  className="text-xs"
                >
                  Reset Counters
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={performanceOptimization.forceGarbageCollection}
                  className="text-xs"
                >
                  Force GC
                </Button>
              </div>
            </div>

            <Separator className="bg-gray-700" />

            {/* Performance Report */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-300">
                Performance Report
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const report = performanceOptimization.getPerformanceReport();
                  void import("@/utils/devLogger").then(({ devLog }) =>
                    devLog("📊 Performance Report:", report),
                  );
                }}
                className="text-xs w-full"
              >
                Log Report to Console
              </Button>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

export type { PerformanceDebugPanelProps };
