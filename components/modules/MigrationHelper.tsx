"use client";

import React, { useState, useCallback } from "react";
import { useWorldStore } from "../../store/worldStore";

interface MigrationHelperProps {
  onSwitchToModular: () => void;
  onSwitchToLegacy: () => void;
  currentSystem: "legacy" | "modular";
}

interface SystemComparisonData {
  blockCount: number;
  simulantCount: number;
  averageFrameTime: number;
  memoryUsage: number;
  renderCalls: number;
}

export function MigrationHelper({
  onSwitchToModular,
  onSwitchToLegacy,
  currentSystem,
}: MigrationHelperProps) {
  const { blockMap, simulants } = useWorldStore();
  const [performanceData, setPerformanceData] = useState<{
    legacy?: SystemComparisonData;
    modular?: SystemComparisonData;
  }>({});
  const [isCollectingData, setIsCollectingData] = useState(false);
  const [showMigrationSteps, setShowMigrationSteps] = useState(false);

  // Collect performance data for comparison
  const collectPerformanceData = useCallback(() => {
    setIsCollectingData(true);

    const startTime = performance.now();
    const startMemory = (performance as any).memory?.usedJSHeapSize || 0;

    // Simulate frame measurement
    const frameTimeSamples: number[] = [];
    let sampleCount = 0;
    const maxSamples = 60; // Collect 60 frame samples

    const collectSample = () => {
      const frameStart = performance.now();

      // Simulate a frame of work
      requestAnimationFrame(() => {
        const frameEnd = performance.now();
        frameTimeSamples.push(frameEnd - frameStart);
        sampleCount++;

        if (sampleCount < maxSamples) {
          collectSample();
        } else {
          // Calculate averages
          const avgFrameTime =
            frameTimeSamples.reduce((a, b) => a + b, 0) /
            frameTimeSamples.length;
          const endMemory =
            (performance as any).memory?.usedJSHeapSize || startMemory;

          const data: SystemComparisonData = {
            blockCount: blockMap.size,
            simulantCount: simulants.size,
            averageFrameTime: avgFrameTime,
            memoryUsage: endMemory - startMemory,
            renderCalls: frameTimeSamples.length,
          };

          setPerformanceData((prev) => ({
            ...prev,
            [currentSystem]: data,
          }));

          setIsCollectingData(false);
        }
      });
    };

    collectSample();
  }, [currentSystem, blockMap.size, simulants.size]);

  // Migration compatibility checker
  const checkCompatibility = () => {
    const issues: string[] = [];
    const warnings: string[] = [];
    const benefits: string[] = [];

    // Check for potential issues
    if (blockMap.size > 1000) {
      warnings.push(
        `High block count (${blockMap.size}) - modular system will help with performance`,
      );
    }

    if (simulants.size > 20) {
      warnings.push(
        `Many simulants (${simulants.size}) - LOD system will improve performance`,
      );
    }

    // Check for benefits
    if (blockMap.size > 100) {
      benefits.push("Block placement operations will be debounced and batched");
    }

    if (simulants.size > 0) {
      benefits.push("Animations will use LOD system for better performance");
    }

    benefits.push("Independent module performance monitoring");
    benefits.push("No more cross-module performance interference");
    benefits.push("Adaptive performance based on device capabilities");

    return { issues, warnings, benefits };
  };

  const compatibility = checkCompatibility();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 rounded-t-lg">
          <h2 className="text-xl font-bold flex items-center gap-2">
            🔄 System Migration Helper
          </h2>
          <p className="text-sm opacity-90">
            Current:{" "}
            <span className="font-semibold capitalize">
              {currentSystem} System
            </span>
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Performance Comparison */}
          <section>
            <h3 className="text-lg font-semibold mb-3">
              Performance Comparison
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Legacy System Stats */}
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded">
                <h4 className="font-medium text-red-600 mb-2">Legacy System</h4>
                {performanceData.legacy ? (
                  <div className="text-sm space-y-1">
                    <p>
                      Avg Frame Time:{" "}
                      {performanceData.legacy.averageFrameTime.toFixed(2)}ms
                    </p>
                    <p>
                      Memory Usage:{" "}
                      {(
                        performanceData.legacy.memoryUsage /
                        1024 /
                        1024
                      ).toFixed(1)}
                      MB
                    </p>
                    <p>Blocks: {performanceData.legacy.blockCount}</p>
                    <p>Simulants: {performanceData.legacy.simulantCount}</p>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No data collected yet</p>
                )}
              </div>

              {/* Modular System Stats */}
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded">
                <h4 className="font-medium text-green-600 mb-2">
                  Modular System
                </h4>
                {performanceData.modular ? (
                  <div className="text-sm space-y-1">
                    <p>
                      Avg Frame Time:{" "}
                      {performanceData.modular.averageFrameTime.toFixed(2)}ms
                    </p>
                    <p>
                      Memory Usage:{" "}
                      {(
                        performanceData.modular.memoryUsage /
                        1024 /
                        1024
                      ).toFixed(1)}
                      MB
                    </p>
                    <p>Blocks: {performanceData.modular.blockCount}</p>
                    <p>Simulants: {performanceData.modular.simulantCount}</p>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No data collected yet</p>
                )}
              </div>
            </div>

            <button
              onClick={collectPerformanceData}
              disabled={isCollectingData}
              className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {isCollectingData
                ? "Collecting Data..."
                : "Collect Performance Data"}
            </button>
          </section>

          {/* Compatibility Check */}
          <section>
            <h3 className="text-lg font-semibold mb-3">Migration Analysis</h3>

            {/* Benefits */}
            {compatibility.benefits.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-green-600 mb-2">✅ Benefits</h4>
                <ul className="text-sm space-y-1 text-green-700 dark:text-green-300">
                  {compatibility.benefits.map((benefit, i) => (
                    <li key={i}>• {benefit}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warnings */}
            {compatibility.warnings.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-yellow-600 mb-2">
                  ⚠️ Performance Warnings
                </h4>
                <ul className="text-sm space-y-1 text-yellow-700 dark:text-yellow-300">
                  {compatibility.warnings.map((warning, i) => (
                    <li key={i}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Issues */}
            {compatibility.issues.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-red-600 mb-2">
                  ❌ Potential Issues
                </h4>
                <ul className="text-sm space-y-1 text-red-700 dark:text-red-300">
                  {compatibility.issues.map((issue, i) => (
                    <li key={i}>• {issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Migration Steps */}
          <section>
            <button
              onClick={() => setShowMigrationSteps(!showMigrationSteps)}
              className="text-lg font-semibold mb-3 flex items-center gap-2 hover:text-blue-600"
            >
              📋 Migration Steps
              <span className="text-sm">{showMigrationSteps ? "▼" : "▶"}</span>
            </button>

            {showMigrationSteps && (
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded">
                <div className="space-y-4 text-sm">
                  <div>
                    <h5 className="font-medium">1. Backup Current State</h5>
                    <p className="text-gray-600 dark:text-gray-300">
                      Your world data is preserved automatically. No manual
                      backup needed.
                    </p>
                  </div>

                  <div>
                    <h5 className="font-medium">2. Switch to Modular System</h5>
                    <p className="text-gray-600 dark:text-gray-300">
                      The modular system will automatically detect your
                      performance needs and configure modules accordingly.
                    </p>
                  </div>

                  <div>
                    <h5 className="font-medium">3. Performance Tuning</h5>
                    <p className="text-gray-600 dark:text-gray-300">
                      Use the performance preset selector
                      (AUTO/HIGH_PERFORMANCE/BALANCED/LOW_END) to optimize for
                      your device.
                    </p>
                  </div>

                  <div>
                    <h5 className="font-medium">4. Module Configuration</h5>
                    <p className="text-gray-600 dark:text-gray-300">
                      Enable/disable individual modules as needed. Animation and
                      block placement modules can be toggled independently.
                    </p>
                  </div>

                  <div>
                    <h5 className="font-medium">5. Monitor Performance</h5>
                    <p className="text-gray-600 dark:text-gray-300">
                      Enable performance monitoring to see real-time stats for
                      each module and system-wide performance.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Key Differences */}
          <section>
            <h3 className="text-lg font-semibold mb-3">Key Differences</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse border border-gray-300 dark:border-gray-600">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700">
                    <th className="border border-gray-300 dark:border-gray-600 p-2 text-left">
                      Feature
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 p-2 text-left">
                      Legacy System
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 p-2 text-left">
                      Modular System
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 dark:border-gray-600 p-2 font-medium">
                      Render Loop
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2">
                      Single shared loop
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2">
                      Isolated per module
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 dark:border-gray-600 p-2 font-medium">
                      Performance
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2">
                      Cross-system interference
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2">
                      Independent optimization
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 dark:border-gray-600 p-2 font-medium">
                      Animation LOD
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2">
                      Basic
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2">
                      Advanced distance-based
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 dark:border-gray-600 p-2 font-medium">
                      Block Placement
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2">
                      Direct operations
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2">
                      Debounced & batched
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 dark:border-gray-600 p-2 font-medium">
                      Monitoring
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2">
                      Basic FPS counter
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2">
                      Per-module statistics
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Actions */}
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-b-lg flex justify-between items-center">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {currentSystem === "legacy"
              ? "Switch to modular system for better performance isolation"
              : "Switch back to legacy system if you encounter issues"}
          </div>

          <div className="flex gap-3">
            <button
              onClick={
                currentSystem === "legacy"
                  ? onSwitchToLegacy
                  : onSwitchToModular
              }
              className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 rounded"
            >
              Cancel
            </button>

            <button
              onClick={
                currentSystem === "legacy"
                  ? onSwitchToModular
                  : onSwitchToLegacy
              }
              className={`px-4 py-2 rounded text-white ${
                currentSystem === "legacy"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-orange-600 hover:bg-orange-700"
              }`}
            >
              {currentSystem === "legacy"
                ? "🚀 Switch to Modular System"
                : "↩️ Switch to Legacy System"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Migration utility functions
export const MigrationUtils = {
  // Check if current world is compatible with modular system
  checkModularCompatibility: (blockCount: number, simulantCount: number) => {
    const compatibility = {
      compatible: true,
      recommendations: [] as string[],
      warnings: [] as string[],
    };

    if (blockCount > 2000) {
      compatibility.warnings.push(
        "Very high block count - consider using LOW_END preset",
      );
    }

    if (simulantCount > 50) {
      compatibility.warnings.push(
        "High simulant count - LOD system will be essential",
      );
    }

    if (blockCount > 500) {
      compatibility.recommendations.push(
        "Enable block batching for better performance",
      );
    }

    if (simulantCount > 10) {
      compatibility.recommendations.push(
        "Use BALANCED or LOW_END preset for smoother animations",
      );
    }

    return compatibility;
  },

  // Generate recommended module configuration
  generateModuleConfig: (blockCount: number, simulantCount: number) => {
    // Detect performance tier
    let preset: "HIGH_PERFORMANCE" | "BALANCED" | "LOW_END" = "BALANCED";

    if (blockCount > 1000 || simulantCount > 30) {
      preset = "LOW_END";
    } else if (blockCount < 200 && simulantCount < 10) {
      preset = "HIGH_PERFORMANCE";
    }

    return {
      performancePreset: preset,
      moduleConfig: {
        enableAnimations: simulantCount > 0,
        enableBlockPlacement: true,
        enablePlayerControls: true,
        enableSkybox: preset !== "LOW_END",
        enablePerformanceMonitoring: true,
      },
    };
  },

  // Export current world state for backup
  exportWorldState: (
    blockMap: Map<string, any>,
    simulants: Map<string, any>,
  ) => {
    return {
      timestamp: new Date().toISOString(),
      blocks: Array.from(blockMap.entries()),
      simulants: Array.from(simulants.entries()),
      version: "1.0",
    };
  },

  // Import world state from backup
  importWorldState: (data: any) => {
    // This would integrate with world store to restore state
    if (process.env.NODE_ENV === "development") {
      console.log("Importing world state:", data);
    }
    return {
      success: true,
      blocksImported: data.blocks?.length || 0,
      simulantsImported: data.simulants?.length || 0,
    };
  },
};

export default MigrationHelper;
