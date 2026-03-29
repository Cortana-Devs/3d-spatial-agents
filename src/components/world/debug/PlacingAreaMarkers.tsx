import React, { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { InteractableRegistry, PlacingArea } from "./InteractableRegistry";
import { useGameStore } from "@/store/gameStore";

const DETECTION_RADIUS = 8;
const CHECK_INTERVAL = 0.3; // seconds between registry queries

export function PlacingAreaMarkers({
  playerRef,
}: {
  playerRef: React.RefObject<THREE.Group | null>;
}) {
  const [visibleAreas, setVisibleAreas] = useState<PlacingArea[]>([]);
  const lastCheckRef = useRef(0);

  useFrame((state) => {
    if (!playerRef.current) return;
    const t = state.clock.elapsedTime;
    if (t - lastCheckRef.current < CHECK_INTERVAL) return;
    lastCheckRef.current = t;

    const areas = InteractableRegistry.getInstance().getNearbyPlacingAreas(
      playerRef.current.position,
      DETECTION_RADIUS,
    );

    // Update only if list changed
    const currentIds = visibleAreas.map((a) => a.id).join(",");
    const newIds = areas.map((a) => a.id).join(",");
    if (currentIds !== newIds) {
      setVisibleAreas(areas);
    }
  });

  return (
    <group>
      {/* 
      {visibleAreas.map((area) => (
        <AreaMarker key={area.id} area={area} />
      ))} 
      */}
      <PlacingTargetMarker />
    </group>
  );
}

// Reusable materials (created once)
const fillMaterial = new THREE.MeshBasicMaterial({
  color: new THREE.Color("#4ade80"),
  transparent: true,
  opacity: 0.15,
  depthWrite: false,
  side: THREE.DoubleSide,
});

const borderMaterial = new THREE.MeshBasicMaterial({
  color: new THREE.Color("#4ade80"),
  wireframe: true,
  transparent: true,
  opacity: 0.35,
});

function AreaMarker({ area }: { area: PlacingArea }) {
  const groupRef = useRef<THREE.Group>(null);
  const fillRef = useRef<THREE.Mesh>(null);

  const [w, h, d] = area.dimensions;

  useFrame((state) => {
    if (!groupRef.current) return;

    // Update position from registry (in case it was re-registered)
    groupRef.current.position.set(
      area.position.x,
      area.position.y + h / 2 + 0.02,
      area.position.z,
    );

    // Apply rotation from registry
    groupRef.current.quaternion.copy(area.rotation);
    // But we only want the Y-rotation (yaw), not pitch/tilt
    // So extract the euler, zero out X and Z, reapply
    const euler = new THREE.Euler().setFromQuaternion(area.rotation, "YXZ");
    groupRef.current.rotation.set(0, euler.y, 0);

    // Pulsing opacity animation
    if (fillRef.current) {
      const pulse = 0.15 + 0.1 * Math.sin(state.clock.elapsedTime * 3);
      (fillRef.current.material as THREE.MeshBasicMaterial).opacity = pulse;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Surface highlight plane (lies flat via rotation) */}
      <mesh
        ref={fillRef}
        rotation={[-Math.PI / 2, 0, 0]}
        material={fillMaterial}
      >
        <planeGeometry args={[w, d]} />
      </mesh>

      {/* Wireframe border rectangle */}
      <mesh position={[0, 0.01, 0]} material={borderMaterial}>
        <boxGeometry args={[w, 0.02, d]} />
      </mesh>

      {/* Corner indicator posts */}
      {[
        [-w / 2, d / 2],
        [w / 2, d / 2],
        [-w / 2, -d / 2],
        [w / 2, -d / 2],
      ].map(([cx, cz], i) => (
        <mesh key={i} position={[cx, 0.15, cz]}>
          <boxGeometry args={[0.15, 0.3, 0.15]} />
          <meshBasicMaterial color="#4ade80" transparent opacity={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function PlacingTargetMarker() {
  const pos = useGameStore((state) => state.placingTargetPos);
  const targetType = useGameStore((state) => state.placingTargetType);
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current || !pos) return;

    // Bobbing animation
    const yOffset = Math.sin(state.clock.elapsedTime * 5) * 0.1 + 0.5;
    groupRef.current.position.set(pos.x, pos.y + yOffset, pos.z);
    groupRef.current.rotation.y += 2 * 0.016;
  });

  if (!pos) return null;

  // New Logic: Only show this marker for SLOTS or general placement, NOT for Items
  if (targetType === "item") return null;

  return (
    <group ref={groupRef}>
      {/* Downward pointing cone/pyramid */}
      <mesh rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.2, 0.5, 4]} />
        <meshBasicMaterial color="#00e5ff" transparent opacity={0.7} />
      </mesh>
      {/* Shadow/Spot on surface */}
      <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.1, 0.15, 16]} />
        <meshBasicMaterial color="#00e5ff" side={THREE.DoubleSide} transparent opacity={0.5} />
      </mesh>
    </group>
  );
}
