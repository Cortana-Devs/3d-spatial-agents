"use client";

import React, { useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { useGameStore } from "@/store/gameStore";

function AgentPath({ path, id }: { path: THREE.Vector3[]; id: string }) {
  const isDebugMode = useGameStore((state) => state.isDebugMode);
  const materialRef = React.useRef<any>(null);

  // Slightly elevate path to prevent z-fighting
  const points = useMemo(() => {
    return path.map((p) => new THREE.Vector3(p.x, p.y + 0.05, p.z));
  }, [path]);

  useFrame(({ clock }) => {
    if (materialRef.current) {
      // Fast, smooth flow for "smoke" effect
      materialRef.current.dashOffset = -clock.getElapsedTime() * 0.8;
      // Pulsing opacity for ethereal feel
      materialRef.current.opacity = 0.3 + Math.sin(clock.getElapsedTime() * 2) * 0.1;
    }
  });

  if (!isDebugMode || points.length < 2) return null;

  return (
    <Line
      points={points}
      color="#00f2ff"
      lineWidth={1.5}
      dashed
      dashScale={8}
      dashSize={0.6}
      gapSize={0.3}
      transparent
      depthWrite={false} // Prevents line z-fighting on overlaps
      renderOrder={100}
      ref={materialRef}
    />
  );
}

export default function IntentVisualizer() {
  const trajectories = useGameStore((state) => state.agentTrajectories);
  
  return (
    <group name="IntentVisualizer">
      {Object.entries(trajectories).map(([id, path]) => (
        <AgentPath key={id} id={id} path={path} />
      ))}
    </group>
  );
}
