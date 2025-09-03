"use client";

import React from "react";
import { useWorldStore } from "../../store/worldStore";
import { Button } from "../ui/button";

/**
 * Simple animation controls for testing T-pose and walking animations
 * This is a minimal implementation focused on the user's specific requirements
 */
export default function SimpleAnimationControls() {
  const { simulants, updateSimulant } = useWorldStore();

  const handleStartWalking = () => {
    // Update all simulants to walking state
    simulants.forEach((simulant) => {
      console.log(`🚶 Starting walk for simulant: ${simulant.id}`);
      updateSimulant(simulant.id, {
        lastAction: "walk forward",
        status: "active"
      });
    });
  };

  const handleStopWalking = () => {
    // Return all simulants to idle (T-pose) state
    simulants.forEach((simulant) => {
      console.log(`🧘 Stopping walk for simulant: ${simulant.id}`);
      updateSimulant(simulant.id, {
        lastAction: "standing idle",
        status: "idle"
      });
    });
  };

  const handleAddTestSimulant = () => {
    const { addSimulant } = useWorldStore.getState();
    const newSimulant = {
      id: `simulant-${Date.now()}`,
      name: `Test Simulant`,
      position: { x: 0, y: 0, z: 0 },
      status: "idle" as const,
      lastAction: "idle",
      conversationHistory: [],
      geminiSessionId: `session-${Date.now()}`
    };
    addSimulant(newSimulant);
  };

  return (
    <div className="floating-panel absolute top-6 left-64 md:left-80 p-3 md:p-4 space-y-3 z-20 hidden md:block">
      <h3 className="text-sm font-semibold text-axiom-neutral-800 dark:text-axiom-neutral-200">
        Animation Test Controls
      </h3>
      
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
      
      <div className="text-xs text-axiom-neutral-600 dark:text-axiom-neutral-400 pt-2 border-t">
        <p>Simulants: {simulants.size}</p>
        <p>Default: T-Pose (looping)</p>
        <p>Walking: M_Walk_001 (looping)</p>
      </div>
    </div>
  );
}
