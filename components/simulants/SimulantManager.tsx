"use client";

import React, { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import { useWorldStore } from "../../store/worldStore";
import ReadyPlayerMeSimulant from "./ReadyPlayerMeSimulant";
import SimpleAnimatedAvatar from "./SimpleAnimatedAvatar";
import BasicAnimationTest from "./BasicAnimationTest";
import ExternalAnimationTest from "./ExternalAnimationTest";
import { AISimulant } from "../../types";
import { debugSimulantYPositioning } from "../../utils/debugLogger";
import { Y_LEVEL_CONSTANTS } from "../../config/yLevelConstants";
import { useActiveAvatarModel } from "@/src/hooks/useActiveAvatarModel";

// Simulant manager configuration
interface SimulantManagerProps {
  enableAnimations?: boolean;
  enableGridSnap?: boolean;
  maxSimulants?: number;
  lodEnabled?: boolean;
}

// Performance optimization settings
const PERFORMANCE_CONFIG = {
  maxSimulants: 50,
  lodDistances: {
    high: 15, // Full detail
    medium: 30, // Reduced animations
    low: 50, // Static poses only
    cull: 100, // Don't render
  },
  updateFrequency: {
    high: 60, // Every frame
    medium: 30, // 30 FPS
    low: 15, // 15 FPS
  },
} as const;

/* -------------------------------------------------------------------------- */
/*                       Lightweight Female Avatar Renderer                   */
/* -------------------------------------------------------------------------- */
const FemaleStaticAvatar: React.FC<{
  simulant: AISimulant;
  scale?: number;
}> = ({ simulant, scale = 0.8 }) => {
  // Load & clone female model once per component instance to avoid skeleton conflicts
  const gltf = useGLTF("/models/c-girl.glb");
  const cloned = React.useMemo(
    () => SkeletonUtils.clone(gltf.scene),
    [gltf.scene],
  );

  return (
    <group
      position={[simulant.position.x, simulant.position.y, simulant.position.z]}
    >
      <primitive object={cloned} scale={[scale, scale, scale]} />
    </group>
  );
};

// Preload female model (safe no-op on SSR)
if (typeof window !== "undefined") {
  try {
    // @ts-ignore preload side-effect only
    useGLTF.preload("/models/c-girl.glb");
  } catch {
    /* ignore */
  }
}

export default function SimulantManager({
  enableAnimations = true,
  enableGridSnap = true,
  maxSimulants = PERFORMANCE_CONFIG.maxSimulants,
}: SimulantManagerProps) {
  const { simulants, updateSimulant } = useWorldStore();
  // Active avatar model state (switches GLB path when female selected)
  const { isFemale } = useActiveAvatarModel();

  // Convert Map to Array and apply performance limits
  const activeSimulants = useMemo(() => {
    const simulantArray = Array.from(simulants.values());

    // Limit number of simulants for performance
    const limitedSimulants = simulantArray.slice(0, maxSimulants);

    // Sort by status priority (active first, then idle, then disconnected)
    return limitedSimulants.sort((a, b) => {
      const statusPriority = { active: 3, idle: 2, disconnected: 1 };
      return statusPriority[b.status] - statusPriority[a.status];
    });
  }, [simulants, maxSimulants]);

  // Performance monitoring
  const performanceStats = useMemo(() => {
    const stats = {
      total: simulants.size,
      active: 0,
      idle: 0,
      disconnected: 0,
      rendered: activeSimulants.length,
    };

    simulants.forEach((simulant) => {
      stats[simulant.status]++;
    });

    return stats;
  }, [simulants, activeSimulants]);

  // Debug info (development only)
  React.useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      // void import("@/utils/devLogger").then(({ devLog }) =>
      //   devLog("Simulant Manager Stats:", performanceStats),
      // );

      // Debug Y-level positioning for all active simulants
      // activeSimulants.forEach((simulant) => {
      //   debugSimulantYPositioning.logDefaultPositioning(
      //     simulant.id,
      //     simulant.position,
      //     "Active simulant rendering",
      //   );
      // });

      // Validate and auto-correct simulant Y positioning
      activeSimulants.forEach((simulant) => {
        const isProperlyPositioned =
          Math.abs(
            simulant.position.y - Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL,
          ) < 0.1;
        if (!isProperlyPositioned) {
          const correctedPosition = {
            ...simulant.position,
            y: Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL,
          };

          // debugSimulantYPositioning.logYAdjustment(
          //   simulant.id,
          //   simulant.position.y,
          //   correctedPosition.y,
          //   "Auto-correction: simulant Y positioning fixed to ground level",
          // );

          // Update the simulant position in the store
          updateSimulant(simulant.id, { position: correctedPosition });
        }
      });
    }
  }, [performanceStats, activeSimulants, updateSimulant]);

  return (
    <group name="simulant-manager">
      {/* Debug Components (temporarily disabled to prevent infinite loops) */}
      {false && process.env.NODE_ENV === "development" && (
        <>
          <ExternalAnimationTest />
          <BasicAnimationTest />
        </>
      )}

      {/* Render active simulants - dynamic avatar based on global selection */}
      {activeSimulants.map((simulant) =>
        isFemale ? (
          <FemaleStaticAvatar
            key={`simulant-${simulant.id}`}
            simulant={simulant}
            scale={0.8}
          />
        ) : (
          <SimpleAnimatedAvatar
            key={`simulant-${simulant.id}`}
            simulant={simulant}
            scale={0.8}
          />
        ),
      )}

      {/* Performance warning indicator (development only) */}
      {process.env.NODE_ENV === "development" &&
        simulants.size > maxSimulants && (
          <mesh position={[0, 5, 0]}>
            <sphereGeometry args={[0.2]} />
            <meshBasicMaterial color="#FF6B6B" />
          </mesh>
        )}
    </group>
  );
}

// Utility functions for simulant management
export const SimulantUtils = {
  // Create a test simulant for development
  createTestSimulant: (
    id: string,
    position: { x: number; y: number; z: number },
  ): AISimulant => {
    // Debug log the test simulant creation with Y positioning
    debugSimulantYPositioning.logSpawnPositioning(
      id,
      position,
      "Test simulant creation",
    );

    return {
      id,
      name: `Simulant-${id}`,
      position,
      status: "active",
      lastAction: "standing idle",
      conversationHistory: [],
      geminiSessionId: `session-${id}`,
    };
  },

  // Calculate optimal simulant positions to avoid overlap
  calculateSpawnPositions: (
    count: number,
    centerX = 0,
    centerZ = 0,
    radius = 5,
  ) => {
    const positions = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const position = {
        x: centerX + Math.cos(angle) * radius,
        y: Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL, // Ground level Y positioning - above floor blocks at Y=0
        z: centerZ + Math.sin(angle) * radius,
      };

      // Debug log the calculated spawn position
      debugSimulantYPositioning.logDefaultPositioning(
        `calculated-${i}`,
        position,
        `Calculated spawn position ${i + 1} of ${count} in circular formation`,
      );

      positions.push(position);
    }
    return positions;
  },

  // Get simulant performance level based on distance from camera
  getPerformanceLevel: (
    simulantPosition: { x: number; y: number; z: number },
    cameraPosition: { x: number; y: number; z: number },
  ) => {
    const distance = Math.sqrt(
      Math.pow(simulantPosition.x - cameraPosition.x, 2) +
        Math.pow(simulantPosition.y - cameraPosition.y, 2) +
        Math.pow(simulantPosition.z - cameraPosition.z, 2),
    );

    if (distance <= PERFORMANCE_CONFIG.lodDistances.high) return "high";
    if (distance <= PERFORMANCE_CONFIG.lodDistances.medium) return "medium";
    if (distance <= PERFORMANCE_CONFIG.lodDistances.low) return "low";
    return "cull";
  },
};

export type { SimulantManagerProps };
export { PERFORMANCE_CONFIG };
