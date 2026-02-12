import React, { useRef, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { InteractableRegistry, PlacingArea } from "./InteractableRegistry";

export function PlacingAreaMarkers({
  playerRef,
}: {
  playerRef: React.RefObject<THREE.Group | null>;
}) {
  const [visibleAreas, setVisibleAreas] = useState<PlacingArea[]>([]);

  useFrame((state) => {
    if (!playerRef.current) return;
    // Check every 0.5s (30 frames approx) to avoid heavy registry queries
    if (state.clock.elapsedTime % 0.5 < 0.05) {
      const areas = InteractableRegistry.getInstance().getNearbyPlacingAreas(
        playerRef.current.position,
        8,
      );
      // Simple shallow comparison or just set it
      if (
        areas.length !== visibleAreas.length ||
        areas[0]?.id !== visibleAreas[0]?.id
      ) {
        setVisibleAreas(areas);
      }
    }
  });

  return (
    <group>
      {visibleAreas.map((area) => (
        <AreaMarker key={area.id} area={area} />
      ))}
    </group>
  );
}

function AreaMarker({ area }: { area: PlacingArea }) {
  const [w, h, d] = area.dimensions || [1, 1, 1];

  // Position: Center of the surface
  // Area position is center of mesh. Top surface is y + h/2.
  const pos = useMemo(() => {
    return new THREE.Vector3(
      area.position.x,
      area.position.y + h / 2 + 0.01,
      area.position.z,
    );
  }, [area.position, h]);

  return (
    <group position={pos}>
      {/* 1. Filled Glowing Plane (Base) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <meshBasicMaterial
          color="#00aa00"
          transparent
          opacity={0.15}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 2. Wireframe Box Border (Slightly raised) */}
      <mesh position={[0, 0.01, 0]}>
        <boxGeometry args={[w, 0.02, d]} />
        <meshBasicMaterial
          color="#00ff00"
          wireframe
          transparent
          opacity={0.3}
        />
      </mesh>
    </group>
  );
}
