"use client";

import React from "react";
import * as THREE from "three";
import { useGameStore } from "@/store/gameStore";

const COLOR_MAP: Record<string, string> = {
  wall: "#ff4444",
  furniture: "#ffcc00",
  cupboard: "#00ffff",
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
