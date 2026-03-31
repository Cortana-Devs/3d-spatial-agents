"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useGameStore } from "@/store/gameStore";
import { 
  SCENARIO_B_PROPAGATION, 
  SCENARIO_C_COLLABORATION 
} from "@/config/ResearchEvaluationScenarios";

export default function ScenarioManager() {
  const activeScenarioId = useGameStore((state) => state.activeScenarioId);
  const setAgentScenarioContext = useGameStore((state) => state.setAgentScenarioContext);
  const addInteractables = useGameStore((state) => state.addInteractables);
  const removeInteractables = useGameStore((state) => state.removeInteractables);
  const addObstacles = useGameStore((state) => state.addObstacles);
  const removeObstacles = useGameStore((state) => state.removeObstacles);

  const scenarioInitialized = useRef<string | null>(null);

  useEffect(() => {
    if (scenarioInitialized.current === activeScenarioId) return;
    
    // Cleanup previous scenario artifacts
    if (scenarioInitialized.current === SCENARIO_C_COLLABORATION.id) {
       removeInteractables(["heavy-crate-01"]);
       removeObstacles([{ id: "heavy-crate-01-obs" } as any]);
    }
    // Clear all scenario contexts
    setAgentScenarioContext("agent-01", "");

    // Initialize New Scenario
    if (activeScenarioId === SCENARIO_B_PROPAGATION.id) {
      setAgentScenarioContext(
        "agent-01", 
        "CRITICAL DISCOVERY: You have just noticed a cascading error in the server racks of the Data Analysis sector. You must inform other researchers immediately to prevent data loss."
      );
    } 
    else if (activeScenarioId === SCENARIO_C_COLLABORATION.id) {
      const cratePos = new THREE.Vector3(45, 0, 5); // Center Garden area
      
      addInteractables([{
        id: "heavy-crate-01",
        type: "generic",
        name: "Heavy Research Crate",
        description: "A large, heavy crate that requires collaborative handling.",
        position: cratePos.clone(),
        rotation: new THREE.Quaternion(),
        label: "COLLABORATIVE TASK"
      }]);

      addObstacles([{
        position: cratePos.clone(),
        halfExtents: new THREE.Vector3(1, 1, 1),
        type: "furniture"
      }]);
    }

    scenarioInitialized.current = activeScenarioId;

  }, [activeScenarioId, setAgentScenarioContext, addInteractables, removeInteractables, addObstacles, removeObstacles]);

  return null; // Headless logic component
}
