"use client";

import React, { useMemo } from "react";
import { useWorldStore } from "../../store/worldStore";
import ReadyPlayerMeSimulant from "./ReadyPlayerMeSimulant";
import { AISimulant } from "../../types";

// Simulant manager configuration
interface SimulantManagerProps {
  enableAnimations?: boolean;
  enableGridSnap?: boolean;
  maxSimulants?: number;
  lodEnabled?: boolean;
}

// Performance optimization settings
const PERFORMANCE_CONFIG = {
  maxSimulants: 10,
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

export default function SimulantManager({
  enableAnimations = true,
  enableGridSnap = true,
  maxSimulants = PERFORMANCE_CONFIG.maxSimulants,
}: SimulantManagerProps) {
  const { simulants } = useWorldStore();

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
      console.log("Simulant Manager Stats:", performanceStats);
    }
  }, [performanceStats]);

  return (
    <group name="simulant-manager">
      {/* Render active simulants */}
      {activeSimulants.map((simulant) => (
        <ReadyPlayerMeSimulant
          key={simulant.id}
          simulant={simulant}
          enableAnimations={enableAnimations}
          enableGridSnap={enableGridSnap}
          scale={0.8} // Slightly smaller than blocks for better proportion
        />
      ))}

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
  ): AISimulant => ({
    id,
    name: `Simulant-${id}`,
    position,
    status: "active",
    lastAction: "Exploring the voxel world",
    conversationHistory: [],
    geminiSessionId: `session-${id}`,
  }),

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
      positions.push({
        x: centerX + Math.cos(angle) * radius,
        y: 0,
        z: centerZ + Math.sin(angle) * radius,
      });
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
