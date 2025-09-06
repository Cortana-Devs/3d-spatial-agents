"use client";

import React, { useState } from "react";
import { Suspense } from "react";
import ModularVoxelCanvas from "../../components/world/ModularVoxelCanvas";
import { useWorldStore } from "../../store/worldStore";
import { Vector3 } from "three";
import { BlockType } from "../../types";

export default function ModularTestPage() {
  const [performancePreset, setPerformancePreset] = useState<
    "AUTO" | "HIGH_PERFORMANCE" | "BALANCED" | "LOW_END"
  >("AUTO");
  const [enabledModules, setEnabledModules] = useState({
    animations: true,
    blockPlacement: true,
    playerControls: true,
    skybox: true,
  });

  const { addBlock, simulants, addSimulant } = useWorldStore();

  // Add some test blocks
  const addTestBlocks = () => {
    const blocks = [
      { pos: new Vector3(0, 0, 0), type: BlockType.STONE },
      { pos: new Vector3(1, 0, 0), type: BlockType.WOOD },
      { pos: new Vector3(2, 0, 0), type: BlockType.LEAF },
      { pos: new Vector3(0, 1, 0), type: BlockType.STONE },
      { pos: new Vector3(1, 1, 0), type: BlockType.WOOD },
      { pos: new Vector3(0, 0, 1), type: BlockType.LEAF },
    ];

    blocks.forEach(({ pos, type }) => {
      addBlock(pos, type, "human");
    });
  };

  // Add test simulants
  const addTestSimulants = () => {
    for (let i = 0; i < 5; i++) {
      const simulant = {
        id: `test-simulant-${i}`,
        name: `TestBot ${i + 1}`,
        position: {
          x: (i - 2) * 3,
          y: 0,
          z: 5,
        },
        status: "active" as const,
        lastAction: i % 2 === 0 ? "walking around" : "standing idle",
        conversationHistory: [],
        geminiSessionId: `test-session-${i}`,
      };
      addSimulant(simulant);
    }
  };

  const toggleModule = (module: keyof typeof enabledModules) => {
    setEnabledModules((prev) => ({
      ...prev,
      [module]: !prev[module],
    }));
  };

  return (
    <div className="w-full h-screen bg-gray-900 text-white relative">
      {/* Control Panel */}
      <div className="absolute top-4 left-4 z-20 bg-black bg-opacity-80 p-4 rounded-lg min-w-[300px]">
        <h2 className="text-lg font-bold mb-4">🔧 Modular Performance Test</h2>

        {/* Performance Preset */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold mb-2">Performance Preset:</h3>
          <div className="space-y-2">
            {(["AUTO", "HIGH_PERFORMANCE", "BALANCED", "LOW_END"] as const).map(
              (preset) => (
                <label key={preset} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="preset"
                    checked={performancePreset === preset}
                    onChange={() => setPerformancePreset(preset)}
                    className="form-radio"
                  />
                  <span className="text-xs">{preset}</span>
                </label>
              ),
            )}
          </div>
        </div>

        {/* Module Controls */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold mb-2">Enabled Modules:</h3>
          <div className="space-y-2">
            {Object.entries(enabledModules).map(([module, enabled]) => (
              <label key={module} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={() =>
                    toggleModule(module as keyof typeof enabledModules)
                  }
                  className="form-checkbox"
                />
                <span className="text-xs capitalize">{module}</span>
                <div
                  className={`w-2 h-2 rounded-full ${
                    enabled ? "bg-green-400" : "bg-gray-500"
                  }`}
                />
              </label>
            ))}
          </div>
        </div>

        {/* Test Actions */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold mb-2">Test Actions:</h3>
          <div className="space-y-2">
            <button
              onClick={addTestBlocks}
              className="w-full bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-xs"
            >
              Add Test Blocks
            </button>
            <button
              onClick={addTestSimulants}
              className="w-full bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-xs"
            >
              Add Test Simulants ({simulants.size})
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="text-xs text-gray-300 space-y-1">
          <p>• Click to place blocks</p>
          <p>• Right-click to remove blocks</p>
          <p>• WASD to move (if player controls enabled)</p>
          <p>• Click canvas to lock mouse (fly mode)</p>
          <p>• Performance stats show in top-right</p>
        </div>
      </div>

      {/* Info Panel */}
      <div className="absolute bottom-4 left-4 z-20 bg-black bg-opacity-80 p-3 rounded text-xs">
        <div className="space-y-1">
          <p>
            <strong>Purpose:</strong> Test module isolation & performance
          </p>
          <p>
            <strong>Expected:</strong> No lag between systems
          </p>
          <p>
            <strong>Watch for:</strong> Animation + Block placement conflicts
          </p>
        </div>
      </div>

      {/* Performance Warning */}
      {performancePreset === "LOW_END" && (
        <div className="absolute top-20 right-4 z-20 bg-yellow-900 bg-opacity-90 text-yellow-200 p-3 rounded text-xs">
          ⚠️ Low-end mode active - some features disabled for performance
        </div>
      )}

      {/* Modular Canvas */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center w-full h-full">
            <div className="text-white text-lg">Loading Modular System...</div>
          </div>
        }
      >
        <ModularVoxelCanvas
          className="w-full h-full"
          enablePerformanceStats={true}
          performancePreset={performancePreset}
          moduleConfig={{
            enableAnimations: enabledModules.animations,
            enableBlockPlacement: enabledModules.blockPlacement,
            enablePlayerControls: enabledModules.playerControls,
            enableSkybox: enabledModules.skybox,
          }}
        />
      </Suspense>

      {/* Development Notes */}
      {process.env.NODE_ENV === "development" && (
        <div className="absolute bottom-4 right-4 z-20 bg-purple-900 bg-opacity-80 p-2 rounded text-xs max-w-xs">
          <p>
            <strong>Dev Notes:</strong>
          </p>
          <p>• Each module runs in isolated performance context</p>
          <p>• Animation updates don&apos;t affect block placement</p>
          <p>• Block operations don&apos;t slow down animations</p>
          <p>• Module stats show individual frame times</p>
        </div>
      )}
    </div>
  );
}
