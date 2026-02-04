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
  const { camera, gl } = useThree();
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

  useFrame(() => {
    if (!target.current) return;
    const robotPos = target.current.position
      .clone()
      .add(new THREE.Vector3(0, 6.0, 0)); // Head height approx

    const camDist = 20;
    const viewAngleOffset = 0; // Fixed to third person back view

    const cx = camDist * Math.sin(cameraState.current.yaw + viewAngleOffset);
    const cz = camDist * Math.cos(cameraState.current.yaw + viewAngleOffset);
    const cy = camDist * Math.sin(cameraState.current.pitch);

    camera.position.x = robotPos.x - cx * Math.cos(cameraState.current.pitch); // eslint-disable-line react-hooks/immutability
    camera.position.z = robotPos.z - cz * Math.cos(cameraState.current.pitch); // eslint-disable-line react-hooks/immutability
    camera.position.y = robotPos.y + cy; // eslint-disable-line react-hooks/immutability
    if (camera.position.y < 2.0) camera.position.y = 2.0; // eslint-disable-line react-hooks/immutability

    camera.lookAt(robotPos);
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

        <Robot groupRef={robotRef} initialPosition={[0, 5, 50]} />
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
