import React, { useRef, useState, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Html } from "@react-three/drei";

import { useGameStore, DebugTargetInfo } from "@/store/gameStore";

export default function DebugCrosshair() {
  const { camera, scene } = useThree();
  const [active, setActive] = useState(false);
  const [hitPoint, setHitPoint] = useState<THREE.Vector3 | null>(null);
  
  // Use store efficiently
  const setDebugTarget = useGameStore((state) => state.setDebugTarget);
  
  // Local ref to track last sent info and avoid store spam
  const lastDebugInfo = useRef<DebugTargetInfo | null>(null);

  const centerRef = useRef(new THREE.Vector2(0, 0));
  const raycaster = useRef(new THREE.Raycaster());

  // Toggle Key Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "`" || e.key === "~") {
        setActive((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Wireframe Toggle Logic
  useEffect(() => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Skip helpers and the debug marker itself
        if (child.userData.isDebug) return;

        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];

        materials.forEach((mat) => {
          if (
            mat instanceof THREE.MeshStandardMaterial ||
            mat instanceof THREE.MeshBasicMaterial
          ) {
            mat.wireframe = active;
          }
        });
      }
    });
  }, [active, scene]);

  useFrame(() => {
    if (!active) {
      if (lastDebugInfo.current) {
         setDebugTarget(null);
         lastDebugInfo.current = null;
      }
      if (hitPoint) setHitPoint(null);
      return;
    }

    // Raycast from center
    raycaster.current.setFromCamera(centerRef.current, camera);
    const intersects = raycaster.current.intersectObjects(scene.children, true);

    // Filter out helpers, non-visible, our own debug marker, AND the player (Robot)
    const hit = intersects.find((i) => {
      // Basic checks
      if (
        !i.object ||
        !(i.object instanceof THREE.Mesh) ||
        !i.object.visible ||
        i.object.userData.isDebug
      ) {
        return false;
      }

      // Check if this object belongs to the player (Robot)
      // Traverse up to find if any parent is named "Robot"
      let current: THREE.Object3D | null = i.object;
      while (current) {
        if (current.name === "Robot") return false;
        current = current.parent;
      }

      return true;
    });

    if (hit) {
      const mesh = hit.object as THREE.Mesh;
      const pos = hit.point;

      // Only update if position has changed significantly to avoid jitter/re-renders
      if (!hitPoint || hitPoint.distanceTo(pos) > 0.01) {
        setHitPoint(pos.clone());
      }

      // Find Semantic Object (traverse up)
      let semanticObj: THREE.Object3D = mesh;
      let curr: THREE.Object3D | null = mesh;
      while (curr) {
        if (curr.userData && curr.userData.type) {
          semanticObj = curr;
          break;
        }
        curr = curr.parent;
      }

      const data = semanticObj.userData || {};

      // Calculate dims
      let dims = "N/A";
      if (mesh.geometry) {
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
        const box = mesh.geometry.boundingBox;
        if (box) {
          const size = new THREE.Vector3();
          box.getSize(size);
          // Apply scale
          size.multiply(mesh.getWorldScale(new THREE.Vector3()));
          dims = `${size.x.toFixed(1)} x ${size.y.toFixed(1)} x ${size.z.toFixed(1)}`;
        }
      }

      const newInfo: DebugTargetInfo = {
        name: data.name || mesh.name || "Untitled Mesh",
        type: data.type,
        id: data.id,
        desc: data.description,
        pos: `[${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}]`,
        dims: dims,
      };

      // Only update debug info if values changed
      if (
        !lastDebugInfo.current ||
        lastDebugInfo.current.name !== newInfo.name ||
        lastDebugInfo.current.pos !== newInfo.pos ||
        lastDebugInfo.current.id !== newInfo.id
      ) {
        setDebugTarget(newInfo);
        lastDebugInfo.current = newInfo;
      }
    } else {
      if (lastDebugInfo.current) {
        setDebugTarget(null);
        lastDebugInfo.current = null;
      }
      if (hitPoint) setHitPoint(null);
    }
  });

  if (!active) return null;

  return (
    <>
      {/* 3D Reference Grid & Axes (Marked debug to skip wireframe) */}
      <gridHelper
        args={[1000, 100, "red", "teal"]}
        position={[0, 4.05, 0]}
        userData={{ isDebug: true }}
      />
      <axesHelper
        args={[20]}
        position={[0, 4.05, 0]}
        userData={{ isDebug: true }}
      />

      {/* 3D Target Marker (Sphere at hit point) */}
      {hitPoint && (
        <group
          position={hitPoint}
          userData={{ isDebug: true }}
          renderOrder={999}
        >
          <mesh renderOrder={999} userData={{ isDebug: true }}>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshBasicMaterial
              color="#00ff00"
              depthTest={false}
              depthWrite={false}
              transparent
              opacity={0.8}
            />
          </mesh>
        </group>
      )}

      {/* Central Crosshair Visualization */}
      <Html
        as="div"
        fullscreen
        style={{
          pointerEvents: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}
      >
        <div
          style={{
            width: "10px",
            height: "10px",
            border: "2px solid rgba(0,255,0,0.8)",
            borderRadius: "50%",
            backgroundColor: "rgba(0,0,0,0.1)",
          }}
        />
        {/* Helper Lines */}
        <div
          style={{
            position: "absolute",
            width: "30px",
            height: "1px",
            background: "rgba(0,255,0,0.5)",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "1px",
            height: "30px",
            background: "rgba(0,255,0,0.5)",
          }}
        />

        {/* Info Panel - Removed in favor of 3D Tooltip */}
        {/* Only keeping crosshair visuals */}
      </Html>
    </>
  );
}
