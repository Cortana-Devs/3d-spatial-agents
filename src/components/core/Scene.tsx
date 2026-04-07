"use client";

import React, { useRef, useEffect } from "react";
import { getPodDeployExitPosition } from "@/config/agentPods";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import "@/lib/bvh-setup";
import { AdaptiveEvents, Environment, BakeShadows } from "@react-three/drei";
import * as THREE from "three";
import SceneWorldRoot from "@/components/core/scene/SceneWorldRoot";
import Robot from "@/components/player/Player";
import Agent from "@/components/agent/Agent";
import YukaSystem from "@/components/core/YukaSystem";
import DebugCrosshair from "@/components/core/DebugCrosshair";
import ObstacleVisualizer from "@/components/world/debug/ObstacleVisualizer";
import { PlacingAreaMarkers } from "@/components/world/debug/PlacingAreaMarkers";
import ObjectHighlighter from "@/components/world/debug/ObjectHighlighter";
import FPSMonitor from "@/components/core/FPSMonitor";
import IntentVisualizer from "@/components/world/debug/IntentVisualizer";
import ScenarioManager from "@/components/core/ScenarioManager";
import { DynamicStatsIslandUI, DynamicStatsIslandStats } from "@/components/ui/DynamicStatsIsland";

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

  // Preallocate ALL reusable objects — eliminates ~420 GC allocations/sec
  const _robotHead = useRef(new THREE.Vector3());
  const _forward = useRef(new THREE.Vector3());
  const _idealPos = useRef(new THREE.Vector3());
  const _quat = useRef(new THREE.Quaternion());
  const _euler = useRef(new THREE.Euler(0, 0, 0, "YXZ"));
  const _offset = useRef(new THREE.Vector3());
  const _direction = useRef(new THREE.Vector3());

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

    // Head position (Pivot point) — zero allocations
    const robotHead = _robotHead.current;
    robotHead.copy(currentTarget.position);
    robotHead.y += 5.5;

    if (isInspecting) {
      const forward = _forward.current.set(0, 0, 1).applyQuaternion(
        currentTarget.quaternion,
      );
      const idealPos = _idealPos.current
        .copy(robotHead)
        .add(forward.multiplyScalar(8.0));
      idealPos.y += 1.5;

      camera.position.lerp(idealPos, 0.1);
      camera.lookAt(robotHead);
      return;
    }

    const quat = _quat.current;
    const euler = _euler.current;
    euler.set(
      cameraState.current.pitch,
      cameraState.current.yaw,
      0,
      "YXZ",
    );
    quat.setFromEuler(euler);

    // Define Offset (Right 2.5, Up 0.5, Back 12.0) — reuse ref
    const offset = _offset.current.set(2.5, 0.5, 12.0);
    offset.applyQuaternion(quat);

    // Ideal Position — reuse ref
    const idealPos = _idealPos.current.copy(robotHead).add(offset);

    // Collision Detection — reuse ref
    const direction = _direction.current.copy(idealPos).sub(robotHead);
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
  const activeResearchAgents = useGameStore((state) => state.activeResearchAgents);

  useEffect(() => {
    useGameStore.getState().initPods();
  }, []);

  const exit1 = getPodDeployExitPosition("pod-01");
  const exit2 = getPodDeployExitPosition("pod-02");
  const agent01Pos: [number, number, number] = exit1
    ? [exit1.x, exit1.y, exit1.z]
    : [18, 5.0, 52];
  const agent02Pos: [number, number, number] = exit2
    ? [exit2.x, exit2.y, exit2.z]
    : [-22, 5.0, 48];

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

        <Physics>
          {/* SceneWorldRoot dispatches to ResearchFacilityWorld (via sceneWorldConfig "facility" mode) */}
          <SceneWorldRoot />

          {/*
            Spawn on the interior ring floor (z=72 is safely inside the outer wall at r=95).
            Agents start nearby so they're visible on first load.
          */}
          <Robot groupRef={robotRef} initialPosition={[0, 5.0, 72]} />
          {/* Dynamic Research Agents */}
          {activeResearchAgents.map((agent) => (
            <Agent
              key={agent.id}
              playerRef={robotRef}
              initialPosition={agent.spawnPosition}
              id={agent.id}
              color={agent.color}
            />
          ))}

          <YukaSystem />
          <DebugCrosshair />
          <ObstacleVisualizer />
          <PlacingAreaMarkers playerRef={robotRef} />
          <ObjectHighlighter />
          <IntentVisualizer />
          <ScenarioManager />
          <CameraRig target={robotRef as React.RefObject<THREE.Group | null>} />
        </Physics>
        
        <FPSMonitor />
        <DynamicStatsIslandStats />
      </Canvas>
      <DynamicStatsIslandUI />
    </div>
  );
}
