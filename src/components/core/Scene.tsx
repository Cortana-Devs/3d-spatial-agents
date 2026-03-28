"use client";

import React, { useRef, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import "@/lib/bvh-setup";
import { AdaptiveEvents, Environment, BakeShadows } from "@react-three/drei";
import DynamicStatsIsland from "@/components/ui/DynamicStatsIsland";
import * as THREE from "three";
import SceneWorldRoot from "@/components/core/scene/SceneWorldRoot";
import Robot from "@/components/player/Player";
import Agent from "@/components/agent/Agent";
import YukaSystem from "@/components/systems/YukaSystem";
import DebugCrosshair from "@/components/core/DebugCrosshair";
import ObstacleVisualizer from "@/components/systems/ObstacleVisualizer";
import { PlacingAreaMarkers } from "@/components/systems/PlacingAreaMarkers";
import ObjectHighlighter from "@/components/systems/ObjectHighlighter";

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
          void gl.domElement.requestPointerLock().catch(() => {
            /* aborted — expected when menu opens or user cancels lock */
          });
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

    const quat = new THREE.Quaternion();
    quat.setFromEuler(
      new THREE.Euler(
        cameraState.current.pitch,
        cameraState.current.yaw,
        0,
        "YXZ",
      ),
    );

    // Define Offset (Right 2.5, Up 0.5, Back 12.0)
    const offset = new THREE.Vector3(2.5, 0.5, 12.0);
    offset.applyQuaternion(quat);

    // Ideal Position
    const idealPos = robotHead.clone().add(offset);

    // Collision Detection
    const direction = idealPos.clone().sub(robotHead);
    const distanceToIdeal = direction.length();
    direction.normalize();

    raycaster.current.set(robotHead, direction);
    raycaster.current.far = distanceToIdeal;

    const collidableMeshes = useGameStore.getState().collidableMeshes;
    const intersects = raycaster.current.intersectObjects(
      collidableMeshes,
      false,
    );

    let finalDist = distanceToIdeal;

    for (const hit of intersects) {
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

      finalDist = Math.max(0.5, hit.distance - 0.5);
      break;
    }

    camera.position.copy(robotHead).add(direction.multiplyScalar(finalDist));
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
        frameloop="always"
        dpr={[1, 1.5]}
        performance={{ min: 0.5 }}
        camera={{ position: [0, 10, -20], fov: 60 }}
        gl={{
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
          powerPreference: "high-performance",
          antialias: false,
        }}
      >
        <AdaptiveEvents />
        <color attach="background" args={["#0a0c14"]} />

        <Environment preset="city" />
        <BakeShadows />

        {/* SceneWorldRoot dispatches to DonutLabWorld (via sceneWorldConfig "donut" mode) */}
        <SceneWorldRoot />

        {/*
          Spawn on the interior ring floor (z=72 is safely inside the outer wall at r=95).
          Agents start nearby so they're visible on first load.
        */}
        <Robot groupRef={robotRef} initialPosition={[0, 5.0, 72]} />
        <Agent
          playerRef={robotRef}
          initialPosition={[18, 5.0, 52]}
          id="agent-01"
        />
        <Agent
          playerRef={robotRef}
          initialPosition={[-22, 5.0, 48]}
          id="agent-02"
        />

        <YukaSystem />
        <DebugCrosshair />
        <ObstacleVisualizer />
        <PlacingAreaMarkers playerRef={robotRef} />
        <ObjectHighlighter />

        <CameraRig target={robotRef as React.RefObject<THREE.Group | null>} />

        <DynamicStatsIsland />
      </Canvas>
    </div>
  );
}
