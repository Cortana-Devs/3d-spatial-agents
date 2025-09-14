"use client";

import React, { useState, useCallback } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Separator } from "../ui/separator";
import { Plus, Minus, Play, Pause, RotateCcw, Users } from "lucide-react";
import { useWorldStore } from "../../store/worldStore";
import { SimulantUtils } from "./SimulantManager";
import { AISimulant } from "../../types";
import { Y_LEVEL_CONSTANTS } from "../../config/yLevelConstants";
import { devWarn } from "@/utils/devLogger";


// Simulant control panel for testing and management
interface SimulantControlsProps {
  className?: string;
  maxSimulants?: number;
}

// Predefined simulant personalities for testing
const SIMULANT_PRESETS = [
  {
    name: "Builder",
    personality: "Loves creating structures and organizing blocks",
    defaultAction: "Looking for the perfect spot to build",
  },
  {
    name: "Explorer",
    personality: "Curious about the world and loves to wander",
    defaultAction: "Exploring the voxel landscape",
  },
  {
    name: "Thinker",
    personality: "Contemplative and analytical, studies patterns",
    defaultAction: "Analyzing the world structure",
  },
  {
    name: "Social",
    personality: "Enjoys communicating and interacting with others",
    defaultAction: "Looking for someone to chat with",
  },
] as const;

export default function SimulantControls({
  className = "",
  maxSimulants = 10,
}: SimulantControlsProps) {
  const { simulants, addSimulant, removeSimulant, updateSimulant } =
    useWorldStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(0);

  // Get simulant statistics
  const simulantStats = React.useMemo(() => {
    const stats = { total: 0, active: 0, idle: 0, disconnected: 0 };
    simulants.forEach((simulant) => {
      stats.total++;
      stats[simulant.status]++;
    });
    return stats;
  }, [simulants]);

  // Create a new test simulant
  const handleAddSimulant = useCallback(() => {
    if (simulants.size >= maxSimulants) {
      devWarn(`Maximum simulants reached: ${maxSimulants}`);
      return;
    }

    const preset = SIMULANT_PRESETS[selectedPreset];
    const simulantId = `simulant-${Date.now()}`;

    // Calculate spawn position to avoid overlap
    const spawnPositions = SimulantUtils.calculateSpawnPositions(
      simulants.size + 1,
      0, // Center X
      0, // Center Z
      3 + simulants.size * 0.5, // Expanding radius
    );

    const spawnPosition = spawnPositions[simulants.size] ||
      spawnPositions[0] || {
        x: 0,
        y: Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL,
        z: 0,
      };

    const newSimulant: AISimulant = {
      id: simulantId,
      name: `${preset.name}-${simulants.size + 1}`,
      position: spawnPosition,
      status: "active",
      lastAction: preset.defaultAction,
      conversationHistory: [],
      geminiSessionId: `session-${simulantId}`,
    };

    addSimulant(newSimulant);

    // Cycle to next preset for variety
    setSelectedPreset((prev) => (prev + 1) % SIMULANT_PRESETS.length);
  }, [simulants.size, maxSimulants, selectedPreset, addSimulant]);

  // Remove the most recently added simulant
  const handleRemoveSimulant = useCallback(() => {
    if (simulants.size === 0) return;

    const simulantArray = Array.from(simulants.values());
    const lastSimulant = simulantArray[simulantArray.length - 1];
    if (lastSimulant) {
      removeSimulant(lastSimulant.id);
    }
  }, [simulants, removeSimulant]);

  // Toggle all simulants between active and idle
  const handleToggleAllSimulants = useCallback(() => {
    const hasActiveSimulants = Array.from(simulants.values()).some(
      (s) => s.status === "active",
    );
    const newStatus = hasActiveSimulants ? "idle" : "active";

    simulants.forEach((simulant) => {
      updateSimulant(simulant.id, { status: newStatus });
    });
  }, [simulants, updateSimulant]);

  // Clear all simulants
  const handleClearSimulants = useCallback(() => {
    simulants.forEach((simulant) => {
      removeSimulant(simulant.id);
    });
  }, [simulants, removeSimulant]);

  // Simulate random actions for testing
  const handleRandomActions = useCallback(() => {
    const actions = [
      "Building a tower",
      "Exploring the area",
      "Thinking about life",
      "Looking for friends",
      "Analyzing patterns",
      "Creating art",
      "Resting peacefully",
      "Planning next move",
    ];

    simulants.forEach((simulant) => {
      const randomAction = actions[Math.floor(Math.random() * actions.length)];
      updateSimulant(simulant.id, { lastAction: randomAction });
    });
  }, [simulants, updateSimulant]);

  return (
    <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
      <Card className="bg-black/20 backdrop-blur-md border-white/10 text-white">
        {/* Main toggle button */}
        <div className="p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full justify-between text-white hover:bg-white/10"
          >
            <div className="flex items-center gap-2">
              <Users size={16} />
              <span className="text-sm font-medium">Simulants</span>
              <span className="text-xs bg-blue-500 text-white px-1 rounded">
                {simulantStats.total}
              </span>
            </div>
            <span className="text-xs text-white/60">
              {simulantStats.active}A {simulantStats.idle}I
            </span>
          </Button>
        </div>

        {/* Expanded controls */}
        {isExpanded && (
          <>
            <Separator className="bg-white/10" />
            <div className="p-3 space-y-3">
              {/* Statistics */}
              <div className="text-xs text-white/60">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    Total: {simulantStats.total}/{maxSimulants}
                  </div>
                  <div>Active: {simulantStats.active}</div>
                  <div>Idle: {simulantStats.idle}</div>
                  <div>Offline: {simulantStats.disconnected}</div>
                </div>
              </div>

              <Separator className="bg-white/10" />

              {/* Add/Remove Controls */}
              <div className="space-y-2">
                <div className="text-xs text-white/60 mb-2">
                  Manage Simulants
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleAddSimulant}
                    disabled={simulants.size >= maxSimulants}
                    className="flex-1 text-green-300 hover:bg-green-500/20"
                  >
                    <Plus size={12} className="mr-1" />
                    Add
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveSimulant}
                    disabled={simulants.size === 0}
                    className="flex-1 text-red-300 hover:bg-red-500/20"
                  >
                    <Minus size={12} className="mr-1" />
                    Remove
                  </Button>
                </div>

                {/* Preset selector */}
                <div className="text-xs text-white/60">
                  Next: {SIMULANT_PRESETS[selectedPreset].name}
                </div>
              </div>

              <Separator className="bg-white/10" />

              {/* Action Controls */}
              <div className="space-y-2">
                <div className="text-xs text-white/60 mb-2">Actions</div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleAllSimulants}
                  disabled={simulants.size === 0}
                  className="w-full text-blue-300 hover:bg-blue-500/20"
                >
                  {simulantStats.active > 0 ? (
                    <>
                      <Pause size={12} className="mr-1" />
                      Pause All
                    </>
                  ) : (
                    <>
                      <Play size={12} className="mr-1" />
                      Activate All
                    </>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRandomActions}
                  disabled={simulants.size === 0}
                  className="w-full text-yellow-300 hover:bg-yellow-500/20"
                >
                  <RotateCcw size={12} className="mr-1" />
                  Random Actions
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSimulants}
                  disabled={simulants.size === 0}
                  className="w-full text-red-300 hover:bg-red-500/20"
                >
                  Clear All
                </Button>
              </div>

              {/* Instructions */}
              <div className="text-xs text-white/40 pt-2 border-t border-white/10">
                <div>• Add simulants to test AI behavior</div>
                <div>• Watch them interact with the voxel world</div>
                <div>• Use camera follow mode to track them</div>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

export type { SimulantControlsProps };
export { SIMULANT_PRESETS };
