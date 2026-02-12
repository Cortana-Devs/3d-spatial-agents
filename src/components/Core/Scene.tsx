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
import { PlacingAreaMarkers } from "../Systems/PlacingAreaMarkers";

import { useGameStore } from "@/store/gameStore";

function CameraRig({
  target,
}: {
  target: React.RefObject<THREE.Group | null>;
}) {
  const { camera, gl, scene } = useThree();
  const setCameraLocked = useGameStore((state) => state.setCameraLocked);
  const setDebugText = useGameStore((state) => state.setDebugText);
  const inspectedAgentId = useGameStore((state) => state.inspectedAgentId);

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
    let currentTarget = target.current;
    let isInspecting = false;

    if (inspectedAgentId) {
      const agent = scene.children.find(
        (c) => c.userData?.id === inspectedAgentId,
      );
      if (agent) {
        currentTarget = agent as THREE.Group;
        isInspecting = true;
      }
    }

    if (!currentTarget) return;

    // Head position (Pivot point)
    const robotHead = currentTarget.position
      .clone()
      .add(new THREE.Vector3(0, 5.5, 0));

    if (isInspecting) {
      // Zoom Logic (Inspector Mode)
      // Position camera slightly in front and above the agent
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(
        currentTarget.quaternion,
      );
      const idealPos = robotHead
        .clone()
        .add(forward.multiplyScalar(8.0))
        .add(new THREE.Vector3(0, 1.5, 0));

      camera.position.lerp(idealPos, 0.1);
      camera.lookAt(robotHead);
      return;
    }

    // Calculate Rotation from Yaw/Pitch
    // Z- is forward in standard Three.js camera space when rotation is 0,
    // but our orbit controls usually treat Z+ or Z- as start.
    // Let's assume standard Euler YXZ order for FPS/TPS cameras.
    const quat = new THREE.Quaternion();
    quat.setFromEuler(
      new THREE.Euler(
        cameraState.current.pitch,
        cameraState.current.yaw,
        0,
        "YXZ",
      ),
    );

    // Define Offset (Right 2.5, Up 0.5, Back 8.0)
    // Adjust these values to tune the "Over-the-shoulder" feel
    const offset = new THREE.Vector3(2.5, 0.5, 12.0);
    offset.applyQuaternion(quat);

    // Ideal Position
    const idealPos = robotHead.clone().add(offset);

    // Collision Detection
    // Raycast from head to idealPos to prevent clipping through walls
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
        if (obj === target.current || obj.name === "Robot") {
          isPlayer = true;
          break;
        }
        obj = obj.parent;
      }

      if (isPlayer) continue;

      // Found a valid obstacle
      // Bring camera closer: hit.distance - cushion
      finalDist = Math.max(0.5, hit.distance - 0.5);
      break;
    }

    // Update Camera Position
    camera.position.copy(robotHead).add(direction.multiplyScalar(finalDist));

    // Update Camera Rotation
    // In standard TPS, camera looks parallel to the "forward" direction defined by yaw/pitch
    // We can just set the quaternion we calculated earlier
    camera.setRotationFromQuaternion(quat);
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
        <PlacingAreaMarkers playerRef={robotRef} />

        <CameraRig target={robotRef as React.RefObject<THREE.Group | null>} />

        <Stats />
      </Canvas>
    </div>
  );
}
