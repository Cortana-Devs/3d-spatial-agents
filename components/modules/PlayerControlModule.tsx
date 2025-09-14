"use client";

import React, { useRef, useCallback, useMemo, useState } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { Vector3, Euler, Quaternion, MathUtils } from "three";
import { useModuleSystem } from "./ModuleManager";
import type { ModuleState } from "./ModuleManager";
import { useWorldStore } from "../../store/worldStore";
import { debugSimulantYPositioning } from "../../utils/debugLogger";

interface PlayerControlModuleProps {
  enableKeyboardControls?: boolean;
  enableMouseLook?: boolean;
  movementSpeed?: number;
  lookSensitivity?: number;
  smoothing?: number;
  enableCollision?: boolean;
}

interface MovementState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  sprint: boolean;
  crouch: boolean;
}

interface CameraState {
  yaw: number; // Horizontal rotation
  pitch: number; // Vertical rotation
  position: Vector3;
  velocity: Vector3;
  grounded: boolean;
}

const MOVEMENT_KEYS = {
  forward: ["KeyW", "ArrowUp"],
  backward: ["KeyS", "ArrowDown"],
  left: ["KeyA", "ArrowLeft"],
  right: ["KeyD", "ArrowRight"],
  up: ["Space"],
  down: ["KeyC", "ControlLeft"],
  sprint: ["ShiftLeft"],
  crouch: ["KeyZ"],
} as const;

export function PlayerControlModule({
  enableKeyboardControls = true,
  enableMouseLook = true,
  movementSpeed = 8.0,
  lookSensitivity = 0.002,
  smoothing = 0.1,
  enableCollision = true,
}: PlayerControlModuleProps) {
  const { camera, gl } = useThree();
  const { activeCamera, setCameraMode } = useWorldStore();

  // Player control-specific state (isolated from other modules)
  const [isControlsLocked, setIsControlsLocked] = useState(false);
  const [movementState, setMovementState] = useState<MovementState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
    sprint: false,
    crouch: false,
  });

  // Performance-optimized refs
  const cameraStateRef = useRef<CameraState>({
    yaw: 0,
    pitch: 0,
    position: new Vector3(10, 10, 10),
    velocity: new Vector3(),
    grounded: false,
  });

  // Debug log initial player position
  React.useEffect(() => {
    debugSimulantYPositioning.logDefaultPositioning(
      "player-character",
      { x: 10, y: 10, z: 10 },
      "PlayerControlModule initial position",
    );
  }, []);

  const mouseMovementRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastUpdateTimeRef = useRef<number>(performance.now());
  const keysRef = useRef<Set<string>>(new Set());
  const smoothedVelocityRef = useRef<Vector3>(new Vector3());

  // Register this module with performance isolation
  const { requestFrame, setEnabled, getStats } = useModuleSystem({
    id: "player-control",
    priority: 9, // Very high priority for responsive controls
    maxFrameTime: 4, // 4ms max per frame for controls
    targetFPS: 60, // Player controls need 60fps for smoothness
    canSkipFrames: false, // Never skip player input frames
  });

  // Movement speed calculation with modifiers
  const getMovementSpeed = useCallback(() => {
    let speed = movementSpeed;

    if (movementState.sprint) speed *= 2.0;
    if (movementState.crouch) speed *= 0.5;

    return speed;
  }, [movementSpeed, movementState.sprint, movementState.crouch]);

  // Collision detection (simplified)
  const checkCollision = useCallback(
    (newPosition: Vector3): Vector3 => {
      if (!enableCollision) return newPosition;

      // Prevent going below ground level
      const groundLevel = 0.5;
      if (newPosition.y < groundLevel) {
        const oldY = newPosition.y;
        newPosition.y = groundLevel;
        cameraStateRef.current.grounded = true;
        cameraStateRef.current.velocity.y = 0;

        // Debug log Y-level adjustment when hitting ground
        debugSimulantYPositioning.logYAdjustment(
          "player-character",
          oldY,
          groundLevel,
          "Ground collision - clamped to ground level",
        );
      } else {
        cameraStateRef.current.grounded = false;
      }

      // Simple world bounds
      const bounds = 100;
      newPosition.x = MathUtils.clamp(newPosition.x, -bounds, bounds);
      newPosition.z = MathUtils.clamp(newPosition.z, -bounds, bounds);

      const originalY = newPosition.y;
      newPosition.y = Math.max(newPosition.y, groundLevel);

      // Debug log Y clamping if it occurred
      if (Math.abs(originalY - newPosition.y) > 0.001) {
        debugSimulantYPositioning.logYAdjustment(
          "player-character",
          originalY,
          newPosition.y,
          "World bounds Y clamping to ground level",
        );
      }

      return newPosition;
    },
    [enableCollision],
  );

  // Update movement state from keyboard input
  const updateMovementFromKeys = useCallback(() => {
    const newState = { ...movementState };

    Object.entries(MOVEMENT_KEYS).forEach(([action, keys]) => {
      const isPressed = keys.some((key) => keysRef.current.has(key));
      const actionKey = action as keyof MovementState;
      newState[actionKey] = isPressed;
    });

    setMovementState(newState);
  }, [movementState]);

  // Apply camera rotation from mouse movement
  const applyCameraRotation = useCallback(
    (deltaTime: number) => {
      if (!enableMouseLook || !isControlsLocked) return;

      const cameraState = cameraStateRef.current;

      // Apply mouse movement to yaw and pitch
      cameraState.yaw -= mouseMovementRef.current.x * lookSensitivity;
      cameraState.pitch -= mouseMovementRef.current.y * lookSensitivity;

      // Clamp pitch to prevent gimbal lock
      cameraState.pitch = MathUtils.clamp(
        cameraState.pitch,
        -Math.PI / 2,
        Math.PI / 2,
      );

      // Apply rotation to camera
      const euler = new Euler(cameraState.pitch, cameraState.yaw, 0, "YXZ");
      camera.setRotationFromEuler(euler);

      // Reset mouse movement accumulator
      mouseMovementRef.current.x = 0;
      mouseMovementRef.current.y = 0;
    },
    [enableMouseLook, isControlsLocked, lookSensitivity, camera],
  );

  // Apply movement from keyboard input
  const applyMovement = useCallback(
    (deltaTime: number) => {
      if (!enableKeyboardControls) return;

      const cameraState = cameraStateRef.current;
      const speed = getMovementSpeed();
      const movementVector = new Vector3();

      // Calculate movement direction relative to camera orientation
      const forward = new Vector3();
      const right = new Vector3();

      camera.getWorldDirection(forward);
      right.crossVectors(forward, camera.up).normalize();

      // Flatten forward direction for ground movement (unless flying)
      if (cameraState.grounded && activeCamera !== "fly") {
        forward.y = 0;
        forward.normalize();
      }

      // Apply movement input
      if (movementState.forward) movementVector.add(forward);
      if (movementState.backward) movementVector.sub(forward);
      if (movementState.right) movementVector.add(right);
      if (movementState.left) movementVector.sub(right);
      if (
        movementState.up &&
        (activeCamera === "fly" || !cameraState.grounded)
      ) {
        movementVector.add(camera.up);
      }
      if (movementState.down && activeCamera === "fly") {
        movementVector.sub(camera.up);
      }

      // Normalize movement vector to prevent diagonal speed boost
      if (movementVector.length() > 0) {
        movementVector.normalize().multiplyScalar(speed * deltaTime);
      }

      // Apply gravity when not flying
      if (activeCamera !== "fly" && !cameraState.grounded) {
        cameraState.velocity.y -= 9.81 * deltaTime; // Gravity
      }

      // Add movement to velocity
      cameraState.velocity.add(movementVector);

      // Apply smoothing to horizontal movement
      smoothedVelocityRef.current.lerp(cameraState.velocity, smoothing);

      // Update position
      const newPosition = cameraState.position
        .clone()
        .add(smoothedVelocityRef.current.clone().multiplyScalar(deltaTime));

      // Apply collision detection
      const correctedPosition = checkCollision(newPosition);
      cameraState.position.copy(correctedPosition);

      // Update camera position
      camera.position.copy(cameraState.position);

      // Apply drag to velocity
      const drag = cameraState.grounded ? 0.9 : 0.98;
      cameraState.velocity.multiplyScalar(drag);

      // Stop very small velocities to prevent jitter
      if (cameraState.velocity.length() < 0.01) {
        cameraState.velocity.set(0, 0, 0);
      }
    },
    [
      enableKeyboardControls,
      getMovementSpeed,
      camera,
      activeCamera,
      movementState,
      smoothing,
      checkCollision,
    ],
  );

  // Main player control update loop (isolated)
  const playerControlUpdateLoop = useCallback(
    (deltaTime: number) => {
      const currentTime = performance.now();
      const frameTime = (currentTime - lastUpdateTimeRef.current) / 1000;
      lastUpdateTimeRef.current = currentTime;

      // Update movement state from keyboard
      updateMovementFromKeys();

      // Apply camera rotation
      applyCameraRotation(frameTime);

      // Apply movement
      applyMovement(frameTime);
    },
    [updateMovementFromKeys, applyCameraRotation, applyMovement],
  );

  // Keyboard event handlers
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Prevent default behavior for movement keys
    const isMovementKey = Object.values(MOVEMENT_KEYS)
      .flat()
      .includes(event.code);
    if (isMovementKey) {
      event.preventDefault();
    }

    keysRef.current.add(event.code);

    // Toggle pointer lock with Escape
    if (event.code === "Escape") {
      setIsControlsLocked(false);
      document.exitPointerLock();
    }
  }, []);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    keysRef.current.delete(event.code);
  }, []);

  // Mouse event handlers
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!isControlsLocked) return;

      mouseMovementRef.current.x += event.movementX;
      mouseMovementRef.current.y += event.movementY;
    },
    [isControlsLocked],
  );

  const handleClick = useCallback(() => {
    if (!isControlsLocked && enableMouseLook) {
      gl.domElement.requestPointerLock();
    }
  }, [isControlsLocked, enableMouseLook, gl]);

  const handlePointerLockChange = useCallback(() => {
    setIsControlsLocked(document.pointerLockElement === gl.domElement);
  }, [gl]);

  // Register update loop with module system
  React.useEffect(() => {
    requestFrame(playerControlUpdateLoop);
  }, [requestFrame, playerControlUpdateLoop]);

  // Event listeners
  React.useEffect(() => {
    if (!enableKeyboardControls && !enableMouseLook) return;

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    document.addEventListener("pointerlockchange", handlePointerLockChange);

    if (enableMouseLook) {
      document.addEventListener("mousemove", handleMouseMove);
      gl.domElement.addEventListener("click", handleClick);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      document.removeEventListener(
        "pointerlockchange",
        handlePointerLockChange,
      );

      if (enableMouseLook) {
        document.removeEventListener("mousemove", handleMouseMove);
        gl.domElement.removeEventListener("click", handleClick);
      }
    };
  }, [
    enableKeyboardControls,
    enableMouseLook,
    handleKeyDown,
    handleKeyUp,
    handleMouseMove,
    handleClick,
    handlePointerLockChange,
    gl,
  ]);

  // Initialize camera state
  React.useEffect(() => {
    const oldPos = cameraStateRef.current.position.clone();
    cameraStateRef.current.position.copy(camera.position);

    // Debug log camera position initialization
    debugSimulantYPositioning.logDefaultPositioning(
      "player-character",
      {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
      },
      "Camera position initialization",
    );
    lastUpdateTimeRef.current = performance.now();
  }, [camera]);

  // Performance monitoring
  const stats = getStats();
  React.useEffect(() => {
    if (process.env.NODE_ENV === "development" && stats) {
      if (stats.averageFrameTime > 6) {
        console.warn(
          "[PlayerControl] Performance warning - input lag detected",
        );
      }
    }
  }, [stats]);

  // Enable/disable based on camera mode
  React.useEffect(() => {
    const shouldEnable = activeCamera === "fly";
    setEnabled(shouldEnable);
  }, [activeCamera, setEnabled]);

  // Smooth camera transition when camera mode changes
  React.useEffect(() => {
    if (activeCamera === "fly") {
      // Reset velocity when entering fly mode
      cameraStateRef.current.velocity.set(0, 0, 0);
      cameraStateRef.current.grounded = false;
    }
  }, [activeCamera]);

  return (
    <group name="player-control-module">
      {/* Debug visualization */}
      {process.env.NODE_ENV === "development" && (
        <PlayerControlDebugOverlay
          isControlsLocked={isControlsLocked}
          movementState={movementState}
          cameraState={cameraStateRef.current}
          stats={stats}
        />
      )}

      {/* Controls instruction overlay */}
      {!isControlsLocked && enableMouseLook && <ControlsInstructionOverlay />}
    </group>
  );
}

// Debug overlay for development
function PlayerControlDebugOverlay({
  isControlsLocked,
  movementState,
  cameraState,
  stats,
}: {
  isControlsLocked: boolean;
  movementState: MovementState;
  cameraState: CameraState;
  stats: ModuleState | null;
}) {
  if (process.env.NODE_ENV !== "development") return null;

  return (
    <group name="player-control-debug">
      {/* Controls lock status indicator */}
      <mesh position={[0, 4, 0]}>
        <sphereGeometry args={[0.2]} />
        <meshBasicMaterial color={isControlsLocked ? "#00ff00" : "#ff8800"} />
      </mesh>

      {/* Movement indicators */}
      {movementState.forward && (
        <mesh position={[0, 3, -1]}>
          <sphereGeometry args={[0.1]} />
          <meshBasicMaterial color="#00ff00" />
        </mesh>
      )}
      {movementState.backward && (
        <mesh position={[0, 3, 1]}>
          <sphereGeometry args={[0.1]} />
          <meshBasicMaterial color="#00ff00" />
        </mesh>
      )}
      {movementState.left && (
        <mesh position={[-1, 3, 0]}>
          <sphereGeometry args={[0.1]} />
          <meshBasicMaterial color="#00ff00" />
        </mesh>
      )}
      {movementState.right && (
        <mesh position={[1, 3, 0]}>
          <sphereGeometry args={[0.1]} />
          <meshBasicMaterial color="#00ff00" />
        </mesh>
      )}

      {/* Ground status indicator */}
      <mesh position={[0, cameraState.grounded ? 2.5 : 2.8, 0]}>
        <sphereGeometry args={[0.05]} />
        <meshBasicMaterial
          color={cameraState.grounded ? "#8B4513" : "#87CEEB"}
        />
      </mesh>
    </group>
  );
}

// Controls instruction overlay
function ControlsInstructionOverlay() {
  return null; // Will be handled by UI components
}

export default PlayerControlModule;
