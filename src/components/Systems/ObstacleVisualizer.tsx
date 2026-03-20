"use client";

import React from "react";
import * as THREE from "three";
import { useGameStore } from "@/store/gameStore";

const COLOR_MAP: Record<string, string> = {
  wall: "#ef5350",     // --color-danger
  furniture: "#ffca28",  // Neon Amber
  cupboard: "#00e5ff",   // --color-primary (premium cyan)
};
const DEFAULT_COLOR = "#ffffff";

export default function ObstacleVisualizer() {
  const isDebugMode = useGameStore((s) => s.isDebugMode);
  const obstacles = useGameStore((s) => s.obstacles);

  if (!isDebugMode) return null;

  return (
    <group>
      {obstacles.map((obs, i) => {
        const color = COLOR_MAP[obs.type || ""] || DEFAULT_COLOR;

        // OBB (Box) obstacle
        if (obs.halfExtents) {
          return (
            <mesh
              key={`obs-${i}`}
              position={obs.position}
              rotation={[0, obs.rotation || 0, 0]}
              userData={{ isDebug: true }}
            >
              <boxGeometry
                args={[
                  obs.halfExtents.x * 2,
                  obs.halfExtents.y * 2,
                  obs.halfExtents.z * 2,
                ]}
              />
              <meshBasicMaterial
                color={color}
                wireframe
                transparent
                opacity={0.35}
                depthWrite={false}
              />
            </mesh>
          );
        }

        // Sphere obstacle (walls, trees, etc.)
        return (
          <mesh
            key={`obs-${i}`}
            position={obs.position}
            userData={{ isDebug: true }}
          >
            <sphereGeometry args={[obs.radius, 16, 12]} />
            <meshBasicMaterial
              color={color}
              wireframe
              transparent
              opacity={0.35}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}
