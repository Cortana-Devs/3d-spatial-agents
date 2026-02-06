"use client";

import React, { useRef, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stats, AdaptiveEvents, Environment } from "@react-three/drei";
import * as THREE from "three";
import OfficeHub from "../World/OfficeHub";
import Robot from "../Entities/Robot";
import AIRobot from "../Entities/AIRobot";
import YukaSystem from "../Systems/YukaSystem";
import DebugCrosshair from "../Systems/DebugCrosshair";

import { useGameStore } from "@/store/gameStore";

function CameraRig({
  target,
}: {
  target: React.RefObject<THREE.Group | null>;
}) {
  const { camera, gl, scene } = useThree();
  const setCameraLocked = useGameStore((state) => state.setCameraLocked);
  const setDebugText = useGameStore((state) => state.setDebugText);

  const invertedMouse = useGameStore((state) => state.invertedMouse);
  const sensitivity = useGameStore((state) => state.sensitivity);

  const cameraState = useRef({ yaw: 0, pitch: 0 });

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      if (!document.pointerLockElement) return;

      // Apply sensitivity (base multiplier 0.002)
      const multiplier = 0.002 * sensitivity;

      cameraState.current.yaw -= event.movementX * multiplier;

      // Apply inverted mouse
      const pitchDelta = event.movementY * multiplier;
      cameraState.current.pitch -= invertedMouse ? -pitchDelta : pitchDelta;

      const limit = Math.PI / 2 - 0.1;
      cameraState.current.pitch = Math.max(
        -limit,
        Math.min(limit, cameraState.current.pitch),
      );
    };

    const onPointerLockChange = () => {
      const locked = document.pointerLockElement === gl.domElement;
      setCameraLocked(locked);
      if (locked) {
        setDebugText(
          "Locked! Controls: WASD/Space/Shift | Click: View | E: Sit/Stand",
        );
      } else {
        setDebugText("Click to Resume | WASD/Space/Shift | E: Sit/Stand");
      }
    };

    const onClick = () => {
      if (document.pointerLockElement !== gl.domElement) {
        try {
          gl.domElement.requestPointerLock();
        } catch (e) {
          console.warn("Pointer lock failed:", e);
        }
      }
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("pointerlockchange", onPointerLockChange);
    gl.domElement.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      gl.domElement.removeEventListener("click", onClick);
    };
  }, [gl, setCameraLocked, setDebugText, invertedMouse, sensitivity]);

  const raycaster = useRef(new THREE.Raycaster());

  useFrame(() => {
    if (!target.current) return;

    // Head position (Target for camera lookAt and Ray origin)
    const robotHead = target.current.position.clone().add(new THREE.Vector3(0, 6.0, 0));

    const baseCamDist = 20;
    const viewAngleOffset = 0;

    // Calculate Ideal Position relative to head
    const cx = baseCamDist * Math.sin(cameraState.current.yaw + viewAngleOffset);
    const cz = baseCamDist * Math.cos(cameraState.current.yaw + viewAngleOffset);
    const cy = baseCamDist * Math.sin(cameraState.current.pitch);

    const idealPos = new THREE.Vector3(
      robotHead.x - cx * Math.cos(cameraState.current.pitch),
      robotHead.y + cy,
      robotHead.z - cz * Math.cos(cameraState.current.pitch)
    );

    // Apply minimum height clamp to ideal position
    if (idealPos.y < 2.0) idealPos.y = 2.0;

    // Collision Detection
    const direction = idealPos.clone().sub(robotHead);
    const distanceToIdeal = direction.length();
    direction.normalize();

    raycaster.current.set(robotHead, direction);
    raycaster.current.far = distanceToIdeal;

    // Intersect scene to find obstacles
    const intersects = raycaster.current.intersectObjects(scene.children, true);

    let finalDist = distanceToIdeal;

    for (const hit of intersects) {
      // Skip the player itself
      let isPlayer = false;
      let obj: THREE.Object3D | null = hit.object;
      while (obj) {
        if (obj === target.current) {
          isPlayer = true;
          break;
        }
        obj = obj.parent;
      }

      if (isPlayer) continue;

      // Skip potential trigger volumes or non-physical items if identified (optional refinement)

      // Found a valid obstacle (Wall, Floor, Furniture)
      // Bring camera closer: hit.distance - cushion
      finalDist = Math.max(0.2, hit.distance - 0.5);
      break;
    }

    // Update Camera
    camera.position.copy(robotHead).add(direction.multiplyScalar(finalDist));
    camera.lookAt(robotHead);
  });

  return null;
}

export default function Scene() {
  const robotRef = useRef<THREE.Group>(null);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Canvas
        shadows
        dpr={[1, 1.5]}
        performance={{ min: 0.5 }}
        camera={{ position: [0, 10, -20], fov: 60 }}
        gl={{
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
      >
        <AdaptiveEvents />
        <color attach="background" args={["#202020"]} />

        {/* Simple ambient light to prevent pitch black shadows before lights load or in corners */}
        {/* <ambientLight intensity={0.2} /> */}
        <Environment preset="city" />

        <OfficeHub />

        <Robot groupRef={robotRef} initialPosition={[0, 5, 65]} />
        <AIRobot playerRef={robotRef} initialPosition={[10, 5, 10]} />
        <AIRobot playerRef={robotRef} initialPosition={[-10, 5, 20]} />

        <YukaSystem />
        <DebugCrosshair />

        <CameraRig target={robotRef as React.RefObject<THREE.Group | null>} />

        <Stats />
      </Canvas>
    </div>
  );
}
