"use client";

import React from "react";
import { useWorldStore } from "../../store/worldStore";
import { Button } from "../ui/button";
import { devLog } from "@/utils/devLogger";
import { Y_LEVEL_CONSTANTS } from "../../config/yLevelConstants";
import {
  FloatingPanel,
  FloatingPanelHeader,
  FloatingPanelDivider,
} from "../ui/FloatingPanel";
import { Text } from "../ui/Text";

/**
 * Simple animation controls for testing T-pose and walking animations
 * This is a minimal implementation focused on the user's specific requirements
 */
export default function SimpleAnimationControls() {
  const { simulants, updateSimulant } = useWorldStore();

  const handleStartWalking = () => {
    // Update all simulants to walking state
    simulants.forEach((simulant) => {
      devLog(`🚶 Starting walk for simulant: ${simulant.id}`);
      updateSimulant(simulant.id, {
        lastAction: "walk forward",
        status: "active",
      });
    });
  };

  const handleStopWalking = () => {
    // Return all simulants to idle (T-pose) state
    simulants.forEach((simulant) => {
      devLog(`🧘 Stopping walk for simulant: ${simulant.id}`);
      updateSimulant(simulant.id, {
        lastAction: "standing idle",
        status: "idle",
      });
    });
  };

  const handleAddTestSimulant = () => {
    const { addSimulant } = useWorldStore.getState();
    const newSimulant = {
      id: `simulant-${Date.now()}`,
      name: `Test Simulant`,
      position: { x: 0, y: Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL, z: 0 },
      status: "idle" as const,
      lastAction: "idle",
      conversationHistory: [],
      geminiSessionId: `session-${Date.now()}`,
    };
    addSimulant(newSimulant);
  };

  return (
    <FloatingPanel
      size="sm"
      className="absolute top-6 left-64 md:left-80 z-20 hidden md:block"
    >
      <FloatingPanelHeader>Animation Test Controls</FloatingPanelHeader>

      <div className="space-y-2">
        <Button
          onClick={handleAddTestSimulant}
          variant="outline"
          size="sm"
          className="w-full text-xs"
        >
          Add Test Simulant
        </Button>

        <Button
          onClick={handleStartWalking}
          variant="default"
          size="sm"
          className="w-full text-xs"
        >
          Start Walking
        </Button>

        <Button
          onClick={handleStopWalking}
          variant="outline"
          size="sm"
          className="w-full text-xs"
        >
          Return to T-Pose
        </Button>
      </div>

      <FloatingPanelDivider className="pt-2" />
      <div className="space-y-1">
        <Text variant="secondary" as="p">
          Simulants: {simulants.size}
        </Text>
        <Text variant="secondary" as="p">
          Default: T-Pose (looping)
        </Text>
        <Text variant="secondary" as="p">
          Walking: M_Walk_001 (looping)
        </Text>
      </div>
    </FloatingPanel>
  );
}
