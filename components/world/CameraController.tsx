"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Vector3, Euler, MathUtils } from "three";
import * as THREE from "three";
import { useWorldStore } from "../../store/worldStore";
import { CameraMode, CameraState } from "../../types";

// Camera configuration constants
const CAMERA_CONFIG = {
  orbit: {
    dampingFactor: 0.05,
    rotateSpeed: 0.5,
    zoomSpeed: 0.8,
    panSpeed: 0.8,
    maxPolarAngle: Math.PI * 0.75,
    minDistance: 3,
    maxDistance: 100,
  },
  fly: {
    moveSpeed: 15,
    lookSpeed: 0.003,
    momentum: 0.85, // Reduced for more responsive stopping
    acceleration: 0.2, // Increased for faster acceleration
    maxSpeed: 25,
    minSpeed: 0.05, // Lower threshold for stopping
  },
  cinematic: {
    transitionDuration: 2000, // 2 seconds
    easeFunction: "easeInOutCubic",
  },
  followSimulant: {
    followDistance: 8,
    followHeight: 5,
    smoothness: 0.05,
    lookAhead: 2,
  },
} as const;

// Easing functions for smooth transitions
const easingFunctions = {
  easeInOutCubic: (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  },
  easeOutQuart: (t: number): number => {
    return 1 - Math.pow(1 - t, 4);
  },
  linear: (t: number): number => t,
};

// Camera preset positions
const CAMERA_PRESETS = {
  overview: {
    position: new Vector3(15, 15, 15),
    target: new Vector3(0, 0, 0),
    fov: 60,
  },
  closeup: {
    position: new Vector3(5, 5, 5),
    target: new Vector3(0, 0, 0),
    fov: 45,
  },
  topDown: {
    position: new Vector3(0, 20, 0),
    target: new Vector3(0, 0, 0),
    fov: 75,
  },
  side: {
    position: new Vector3(20, 5, 0),
    target: new Vector3(0, 0, 0),
    fov: 60,
  },
} as const;

// Fly mode controls state
interface FlyControls {
  keys: {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
  };
  velocity: Vector3;
  mouseMovement: { x: number; y: number };
  isPointerLocked: boolean;
}

// Camera transition state
interface CameraTransition {
  isTransitioning: boolean;
  startTime: number;
  duration: number;
  startPosition: Vector3;
  startTarget: Vector3;
  startFov: number;
  endPosition: Vector3;
  endTarget: Vector3;
  endFov: number;
  easing: keyof typeof easingFunctions;
}

interface CameraControllerProps {
  mode: CameraMode;
  onModeChange?: (mode: CameraMode) => void;
  target?: Vector3 | string; // Vector3 for position, string for simulant ID
  enablePresets?: boolean;
  enableDoubleClickFocus?: boolean;
}

export default function CameraController({
  mode,
  target,
  enableDoubleClickFocus = true,
}: CameraControllerProps) {
  const { camera, gl } = useThree();
  const orbitControlsRef = useRef<React.ElementRef<typeof OrbitControls>>(null);
  const { simulants } = useWorldStore();

  // Fly mode controls state
  const flyControls = useRef<FlyControls>({
    keys: {
      forward: false,
      backward: false,
      left: false,
      right: false,
      up: false,
      down: false,
    },
    velocity: new Vector3(0, 0, 0),
    mouseMovement: { x: 0, y: 0 },
    isPointerLocked: false,
  });

  // Camera transition state
  const transition = useRef<CameraTransition>({
    isTransitioning: false,
    startTime: 0,
    duration: 0,
    startPosition: new Vector3(),
    startTarget: new Vector3(),
    startFov: 60,
    endPosition: new Vector3(),
    endTarget: new Vector3(),
    endFov: 60,
    easing: "easeInOutCubic",
  });

  // Camera state persistence
  const cameraState = useRef<CameraState>({
    position: new Vector3(10, 10, 10),
    target: new Vector3(0, 0, 0),
    fov: 60,
  });

  // Store previous mode for smooth transitions
  const previousMode = useRef<CameraMode>(mode);

  // Keyboard event handlers for fly mode
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (mode !== "fly") return;

      // Prevent default behavior for movement keys
      if (['KeyW', 'KeyS', 'KeyA', 'KeyD', 'Space', 'ShiftLeft'].includes(event.code)) {
        event.preventDefault();
      }

      switch (event.code) {
        case "KeyW":
          flyControls.current.keys.forward = true;
          break;
        case "KeyS":
          flyControls.current.keys.backward = true;
          break;
        case "KeyA":
          flyControls.current.keys.left = true;
          break;
        case "KeyD":
          flyControls.current.keys.right = true;
          break;
        case "Space":
          flyControls.current.keys.up = true;
          break;
        case "ShiftLeft":
        case "ShiftRight":
          flyControls.current.keys.down = true;
          break;
      }
    },
    [mode],
  );

  const handleKeyUp = useCallback(
    (event: KeyboardEvent) => {
      if (mode !== "fly") return;

      switch (event.code) {
        case "KeyW":
          flyControls.current.keys.forward = false;
          break;
        case "KeyS":
          flyControls.current.keys.backward = false;
          break;
        case "KeyA":
          flyControls.current.keys.left = false;
          break;
        case "KeyD":
          flyControls.current.keys.right = false;
          break;
        case "Space":
          flyControls.current.keys.up = false;
          break;
        case "ShiftLeft":
        case "ShiftRight":
          flyControls.current.keys.down = false;
          break;
      }
    },
    [mode],
  );

  // Mouse movement handler for fly mode
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (mode !== "fly" || !flyControls.current.isPointerLocked) return;

      flyControls.current.mouseMovement.x += event.movementX;
      flyControls.current.mouseMovement.y += event.movementY;
    },
    [mode],
  );

  // Pointer lock handlers for fly mode
  const handlePointerLockChange = useCallback(() => {
    flyControls.current.isPointerLocked =
      document.pointerLockElement === gl.domElement;
    
    // Reset mouse movement when pointer lock changes
    flyControls.current.mouseMovement.x = 0;
    flyControls.current.mouseMovement.y = 0;
  }, [gl.domElement]);

  const requestPointerLock = useCallback(() => {
    if (mode === "fly" && !flyControls.current.isPointerLocked) {
      gl.domElement.requestPointerLock();
    }
  }, [mode, gl.domElement]);

  // Double-click handler for block focusing
  const handleDoubleClick = useCallback(
    (event: MouseEvent) => {
      if (!enableDoubleClickFocus) return;

      // Implementation for double-click block focusing will be added
      // This would involve raycasting to find the clicked block and focusing on it
      console.log("Double-click focus not yet implemented", event);
    },
    [enableDoubleClickFocus],
  );

  // Camera transition function
  const startTransition = useCallback(
    (
      endPosition: Vector3,
      endTarget: Vector3,
      endFov: number = (camera as THREE.PerspectiveCamera).fov || 60,
      duration: number = CAMERA_CONFIG.cinematic.transitionDuration,
      easing: keyof typeof easingFunctions = "easeInOutCubic",
    ) => {
      transition.current = {
        isTransitioning: true,
        startTime: Date.now(),
        duration,
        startPosition: camera.position.clone(),
        startTarget:
          orbitControlsRef.current?.target?.clone() || new Vector3(0, 0, 0),
        startFov: (camera as THREE.PerspectiveCamera).fov || 60,
        endPosition: endPosition.clone(),
        endTarget: endTarget.clone(),
        endFov,
        easing,
      };
    },
    [camera],
  );

  // Mode change handler with smooth transitions
  useEffect(() => {
    if (previousMode.current !== mode) {
      // Save current camera state
      cameraState.current = {
        position: camera.position.clone(),
        target:
          orbitControlsRef.current?.target?.clone() || new Vector3(0, 0, 0),
        fov: (camera as THREE.PerspectiveCamera).fov || 60,
      };

      // Handle mode-specific transitions
      switch (mode) {
        case "orbit":
          if (orbitControlsRef.current) {
            orbitControlsRef.current.enabled = true;
          }
          break;

        case "fly":
          if (orbitControlsRef.current) {
            orbitControlsRef.current.enabled = false;
          }
          // Initialize fly mode velocity
          flyControls.current.velocity.set(0, 0, 0);
          break;

        case "cinematic":
          if (orbitControlsRef.current) {
            orbitControlsRef.current.enabled = false;
          }
          // Start cinematic transition to overview position
          startTransition(
            CAMERA_PRESETS.overview.position,
            CAMERA_PRESETS.overview.target,
            CAMERA_PRESETS.overview.fov,
          );
          break;

        case "follow-simulant":
          if (orbitControlsRef.current) {
            orbitControlsRef.current.enabled = false;
          }
          break;
      }

      previousMode.current = mode;
    }
  }, [mode, camera, startTransition]);

  // Fly camera update function
  const updateFlyCamera = useCallback(
    (delta: number) => {
      const controls = flyControls.current;
      const config = CAMERA_CONFIG.fly;

      // Handle mouse look
      if (controls.isPointerLocked) {
        const euler = new Euler(0, 0, 0, "YXZ");
        euler.setFromQuaternion(camera.quaternion);

        euler.y -= controls.mouseMovement.x * config.lookSpeed;
        euler.x -= controls.mouseMovement.y * config.lookSpeed;
        euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));

        camera.quaternion.setFromEuler(euler);

        // Reset mouse movement
        controls.mouseMovement.x = 0;
        controls.mouseMovement.y = 0;
      }

      // Handle movement
      const direction = new Vector3();
      const right = new Vector3();
      const up = new Vector3(0, 1, 0);

      camera.getWorldDirection(direction);
      right.crossVectors(direction, up).normalize();

      const acceleration = new Vector3();

      if (controls.keys.forward) acceleration.add(direction);
      if (controls.keys.backward) acceleration.sub(direction);
      if (controls.keys.right) acceleration.add(right);
      if (controls.keys.left) acceleration.sub(right);
      if (controls.keys.up) acceleration.add(up);
      if (controls.keys.down) acceleration.sub(up);

      // Apply acceleration
      if (acceleration.length() > 0) {
        acceleration.normalize().multiplyScalar(config.acceleration);
        controls.velocity.add(acceleration);
      }

      // Apply momentum/friction
      controls.velocity.multiplyScalar(config.momentum);

      // Clamp velocity
      const speed = controls.velocity.length();
      if (speed > config.maxSpeed) {
        controls.velocity.normalize().multiplyScalar(config.maxSpeed);
      } else if (speed < config.minSpeed && speed > 0.01) {
        controls.velocity.set(0, 0, 0);
      }

      // Apply movement with frame rate independence
      const movement = controls.velocity
        .clone()
        .multiplyScalar(Math.min(delta, 1/30) * config.moveSpeed); // Cap delta to prevent large jumps
      camera.position.add(movement);
    },
    [camera],
  );

  // Follow simulant camera update function
  const updateFollowSimulantCamera = useCallback(() => {
    if (typeof target !== "string") return;

    const simulant = simulants.get(target);
    if (!simulant) return;

    const config = CAMERA_CONFIG.followSimulant;
    const simulantPos = new Vector3(
      simulant.position.x,
      simulant.position.y,
      simulant.position.z,
    );

    // Calculate desired camera position
    const offset = new Vector3(0, config.followHeight, -config.followDistance);
    const desiredPosition = simulantPos.clone().add(offset);

    // Smooth camera movement
    camera.position.lerp(desiredPosition, config.smoothness);

    // Look at simulant with slight look-ahead
    const lookTarget = simulantPos.clone();
    lookTarget.y += 1; // Look slightly above the simulant
    camera.lookAt(lookTarget);
  }, [camera, simulants, target]);

  // Event listeners setup
  useEffect(() => {
    const canvas = gl.domElement;

    // Keyboard events for fly mode - attach to document for better capture
    document.addEventListener("keydown", handleKeyDown, { passive: false });
    document.addEventListener("keyup", handleKeyUp, { passive: false });

    // Mouse events for fly mode
    document.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("click", requestPointerLock);
    canvas.addEventListener("dblclick", handleDoubleClick);

    // Pointer lock events
    document.addEventListener("pointerlockchange", handlePointerLockChange);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      document.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("click", requestPointerLock);
      canvas.removeEventListener("dblclick", handleDoubleClick);
      document.removeEventListener(
        "pointerlockchange",
        handlePointerLockChange,
      );
    };
  }, [
    gl.domElement,
    handleKeyDown,
    handleKeyUp,
    handleMouseMove,
    requestPointerLock,
    handleDoubleClick,
    handlePointerLockChange,
  ]);

  // Main camera update loop
  useFrame((_state, delta) => {
    const now = Date.now();

    // Handle camera transitions
    if (transition.current.isTransitioning) {
      const elapsed = now - transition.current.startTime;
      const progress = Math.min(elapsed / transition.current.duration, 1);
      const easedProgress =
        easingFunctions[transition.current.easing](progress);

      // Interpolate position
      camera.position.lerpVectors(
        transition.current.startPosition,
        transition.current.endPosition,
        easedProgress,
      );

      // Interpolate target (for orbit controls)
      if (orbitControlsRef.current) {
        orbitControlsRef.current.target.lerpVectors(
          transition.current.startTarget,
          transition.current.endTarget,
          easedProgress,
        );
      }

      // Interpolate FOV
      if ("fov" in camera) {
        (camera as THREE.PerspectiveCamera).fov = MathUtils.lerp(
          transition.current.startFov,
          transition.current.endFov,
          easedProgress,
        );
      }
      camera.updateProjectionMatrix();

      // End transition
      if (progress >= 1) {
        transition.current.isTransitioning = false;
      }

      return; // Skip other camera updates during transition
    }

    // Mode-specific camera updates
    switch (mode) {
      case "fly":
        updateFlyCamera(delta);
        break;

      case "follow-simulant":
        updateFollowSimulantCamera();
        break;

      case "cinematic":
        // Cinematic mode is handled by transitions
        break;

      case "orbit":
      default:
        // Orbit mode is handled by OrbitControls
        break;
    }
  });

  // Preset application function (for future use)
  // const applyPreset = useCallback(
  //   (presetName: keyof typeof CAMERA_PRESETS) => {
  //     const preset = CAMERA_PRESETS[presetName];
  //     startTransition(preset.position, preset.target, preset.fov);
  //   },
  //   [startTransition],
  // );

  // Focus on block function (for future use)
  // const focusOnBlock = useCallback(
  //   (blockPosition: Vector3) => {
  //     const focusDistance = 5;
  //     const focusPosition = blockPosition
  //       .clone()
  //       .add(new Vector3(focusDistance, focusDistance, focusDistance));
  //     startTransition(focusPosition, blockPosition, 45, 1000);
  //   },
  //   [startTransition],
  // );

  // Render orbit controls only in orbit mode
  if (mode === "orbit") {
    return (
      <OrbitControls
        ref={orbitControlsRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        dampingFactor={CAMERA_CONFIG.orbit.dampingFactor}
        enableDamping={true}
        rotateSpeed={CAMERA_CONFIG.orbit.rotateSpeed}
        zoomSpeed={CAMERA_CONFIG.orbit.zoomSpeed}
        panSpeed={CAMERA_CONFIG.orbit.panSpeed}
        maxPolarAngle={CAMERA_CONFIG.orbit.maxPolarAngle}
        minDistance={CAMERA_CONFIG.orbit.minDistance}
        maxDistance={CAMERA_CONFIG.orbit.maxDistance}
        target={[0, 0, 0]}
      />
    );
  }

  // For other modes, return null as camera updates are handled in useFrame
  return null;
}

// Export utility functions and types
export { CAMERA_PRESETS, CAMERA_CONFIG };
export type { CameraControllerProps, FlyControls, CameraTransition };
