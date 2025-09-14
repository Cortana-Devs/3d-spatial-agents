"use client";

import React, { useRef, useCallback, useMemo } from "react";
import { Vector3, Vector2, Raycaster, Plane } from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { devWarn, devError } from "@/utils/devLogger";
import { useModuleSystem } from "./ModuleManager";
import type { ModuleState } from "./ModuleManager";
import { useWorldStore } from "../../store/worldStore";
import { SelectionMode, BlockType, BLOCK_DEFINITIONS } from "../../types";

interface BlockPlacementModuleProps {
  enableGhostPreview?: boolean;
  maxRaycastsPerFrame?: number;
  debounceMs?: number;
  enableBatching?: boolean;
}

interface PlacementOperation {
  type: "place" | "remove";
  position: Vector3;
  blockType: BlockType;
  timestamp: number;
}

interface RaycastResult {
  hit: boolean;
  position: Vector3 | null;
  normal: Vector3 | null;
  distance: number;
  timestamp: number;
}

export function BlockPlacementModule({
  enableGhostPreview = true,
  maxRaycastsPerFrame = 2,
  debounceMs = 16, // ~60fps
  enableBatching = true,
}: BlockPlacementModuleProps) {
  const { camera, raycaster } = useThree();
  const {
    addBlock,
    removeBlock,
    selectedBlockType,
    selectionMode,
    blockMap,
    worldLimits,
  } = useWorldStore();

  // Block placement-specific state (isolated from other modules)
  const [ghostPosition, setGhostPosition] = useState<Vector3 | null>(null);
  const [isPlacementActive, setIsPlacementActive] = useState(false);

  // Performance-optimized refs
  const mousePositionRef = useRef<Vector2>(new Vector2());
  const lastRaycastRef = useRef<RaycastResult | null>(null);
  const lastRaycastTimeRef = useRef<number>(0);
  const pendingOperationsRef = useRef<PlacementOperation[]>([]);
  const groundPlaneRef = useRef<Plane>(new Plane(new Vector3(0, 1, 0), 0));
  const raycastCountRef = useRef<number>(0);

  // Register this module with performance isolation
  const { requestFrame, setEnabled, getStats } = useModuleSystem({
    id: "block-placement",
    priority: 6, // Medium-high priority
    maxFrameTime: 6, // 6ms max per frame for block operations
    targetFPS: 30, // Block placement doesn't need 60fps
    canSkipFrames: true, // Can skip frames under heavy load
  });

  // Debounced raycast function
  const performRaycast = useCallback(
    (force = false): RaycastResult | null => {
      const now = performance.now();

      // Skip if debounce period hasn't passed and not forced
      if (!force && now - lastRaycastTimeRef.current < debounceMs) {
        return lastRaycastRef.current;
      }

      // Limit raycasts per frame
      if (raycastCountRef.current >= maxRaycastsPerFrame && !force) {
        return lastRaycastRef.current;
      }

      try {
        raycaster.setFromCamera(mousePositionRef.current, camera);

        const intersectionPoint = new Vector3();
        const hit = raycaster.ray.intersectPlane(
          groundPlaneRef.current,
          intersectionPoint,
        );

        const result: RaycastResult = {
          hit: !!hit,
          position: hit ? intersectionPoint.clone() : null,
          normal: hit ? groundPlaneRef.current.normal.clone() : null,
          distance: hit
            ? camera.position.distanceTo(intersectionPoint)
            : Infinity,
          timestamp: now,
        };

        lastRaycastRef.current = result;
        lastRaycastTimeRef.current = now;
        raycastCountRef.current++;

        return result;
      } catch (error) {
        devWarn("[BlockPlacement] Raycast error:", error);
        return null;
      }
    },
    [camera, raycaster, debounceMs, maxRaycastsPerFrame],
  );

  // Snap position to grid
  const snapToGrid = useCallback((position: Vector3): Vector3 => {
    return new Vector3(
      Math.round(position.x),
      Math.max(0, Math.round(position.y)), // Prevent negative Y
      Math.round(position.z),
    );
  }, []);

  // Check if position is valid for block placement
  const isValidPosition = useCallback(
    (position: Vector3): boolean => {
      const positionKey = `${position.x},${position.y},${position.z}`;
      const hasExistingBlock = blockMap.has(positionKey);
      const atLimit = blockMap.size >= worldLimits.maxBlocks;

      return !hasExistingBlock && !atLimit;
    },
    [blockMap, worldLimits],
  );

  // Batched operations processor
  const processPendingOperations = useCallback(() => {
    if (!enableBatching || pendingOperationsRef.current.length === 0) {
      return;
    }

    const operations = [...pendingOperationsRef.current];
    pendingOperationsRef.current = [];

    // Group operations by type and position to avoid duplicates
    const uniqueOperations = new Map<string, PlacementOperation>();

    operations.forEach((op) => {
      const key = `${op.type}-${op.position.x}-${op.position.y}-${op.position.z}`;
      const existing = uniqueOperations.get(key);

      // Keep the most recent operation for each position
      if (!existing || op.timestamp > existing.timestamp) {
        uniqueOperations.set(key, op);
      }
    });

    // Execute unique operations
    uniqueOperations.forEach((op) => {
      try {
        if (op.type === "place") {
          addBlock(op.position, op.blockType, "human");
        } else if (op.type === "remove") {
          removeBlock(op.position, "human");
        }
      } catch (error) {
        devError("[BlockPlacement] Operation error:", error);
      }
    });
  }, [enableBatching, addBlock, removeBlock]);

  // Main block placement update loop (isolated)
  const blockPlacementUpdateLoop = useCallback(
    (deltaTime: number) => {
      raycastCountRef.current = 0; // Reset raycast counter for this frame

      // Only process if in placement mode
      if (selectionMode !== SelectionMode.PLACE) {
        setGhostPosition(null);
        setIsPlacementActive(false);
        return;
      }

      setIsPlacementActive(true);

      // Perform raycast with debouncing
      const raycastResult = performRaycast();

      // Update ghost preview
      if (enableGhostPreview && raycastResult?.hit && raycastResult.position) {
        const snappedPosition = snapToGrid(raycastResult.position);

        if (isValidPosition(snappedPosition)) {
          setGhostPosition(snappedPosition);
        } else {
          setGhostPosition(null);
        }
      } else {
        setGhostPosition(null);
      }

      // Process any pending operations
      processPendingOperations();
    },
    [
      selectionMode,
      performRaycast,
      enableGhostPreview,
      snapToGrid,
      isValidPosition,
      processPendingOperations,
    ],
  );

  // Mouse event handlers (debounced and throttled)
  const handleMouseMove = useCallback((event: MouseEvent) => {
    // Update mouse position (lightweight operation)
    mousePositionRef.current.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1,
    );
  }, []);

  const handleClick = useCallback(
    (event: MouseEvent) => {
      event.preventDefault();

      // Only process clicks in placement mode
      if (selectionMode !== SelectionMode.PLACE) return;

      // Force an immediate raycast for click precision
      const raycastResult = performRaycast(true);

      if (raycastResult?.hit && raycastResult.position) {
        const snappedPosition = snapToGrid(raycastResult.position);

        if (isValidPosition(snappedPosition)) {
          const operation: PlacementOperation = {
            type: "place",
            position: snappedPosition,
            blockType: selectedBlockType as BlockType,
            timestamp: performance.now(),
          };

          if (enableBatching) {
            pendingOperationsRef.current.push(operation);
          } else {
            // Immediate placement
            addBlock(snappedPosition, selectedBlockType, "human");
          }
        }
      }
    },
    [
      selectionMode,
      performRaycast,
      snapToGrid,
      isValidPosition,
      selectedBlockType,
      enableBatching,
      addBlock,
    ],
  );

  const handleRightClick = useCallback(
    (event: MouseEvent) => {
      event.preventDefault();

      // Force raycast for precise removal
      const raycastResult = performRaycast(true);

      if (raycastResult?.hit && raycastResult.position) {
        const snappedPosition = snapToGrid(raycastResult.position);
        const positionKey = `${snappedPosition.x},${snappedPosition.y},${snappedPosition.z}`;

        if (blockMap.has(positionKey)) {
          const operation: PlacementOperation = {
            type: "remove",
            position: snappedPosition,
            blockType: BlockType.STONE, // Dummy value for remove operations
            timestamp: performance.now(),
          };

          if (enableBatching) {
            pendingOperationsRef.current.push(operation);
          } else {
            // Immediate removal
            removeBlock(snappedPosition, "human");
          }
        }
      }
    },
    [performRaycast, snapToGrid, blockMap, enableBatching, removeBlock],
  );

  // Register update loop with module system
  React.useEffect(() => {
    requestFrame(blockPlacementUpdateLoop);
  }, [requestFrame, blockPlacementUpdateLoop]);

  // Event listener management
  React.useEffect(() => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;

    // Use passive listeners for better performance
    canvas.addEventListener("mousemove", handleMouseMove, { passive: true });
    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("contextmenu", handleRightClick);

    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("click", handleClick);
      canvas.removeEventListener("contextmenu", handleRightClick);
    };
  }, [handleMouseMove, handleClick, handleRightClick]);

  // Performance monitoring and auto-adjustment
  const stats = getStats();
  React.useEffect(() => {
    if (process.env.NODE_ENV === "development" && stats) {
      if (stats.averageFrameTime > 8) {
        devWarn(
          "[BlockPlacement] Performance warning - consider increasing debounce or reducing raycast frequency",
        );
      }
    }
  }, [stats]);

  // Enable/disable based on selection mode
  React.useEffect(() => {
    const shouldEnable = selectionMode === SelectionMode.PLACE;
    setEnabled(shouldEnable);
  }, [selectionMode, setEnabled]);

  // Block definitions for ghost preview
  const blockDefinitions = BLOCK_DEFINITIONS;

  return (
    <group name="block-placement-module">
      {/* Ghost block preview */}
      {enableGhostPreview && ghostPosition && isPlacementActive && (
        <GhostBlock
          position={ghostPosition}
          blockType={selectedBlockType}
          color={blockDefinitions[selectedBlockType]?.color || "#cccccc"}
        />
      )}

      {/* Debug visualization */}
      {process.env.NODE_ENV === "development" && (
        <BlockPlacementDebugOverlay
          isActive={isPlacementActive}
          ghostPosition={ghostPosition}
          pendingOperations={pendingOperationsRef.current.length}
          stats={stats}
        />
      )}
    </group>
  );
}

// Ghost block component for placement preview
function GhostBlock({
  position,
  blockType,
  color,
}: {
  position: Vector3;
  blockType: string;
  color: string;
}) {
  return (
    <mesh position={[position.x, position.y, position.z]}>
      <boxGeometry args={[0.95, 0.95, 0.95]} />
      <meshBasicMaterial color={color} transparent opacity={0.5} wireframe />
    </mesh>
  );
}

// Debug overlay for development
function BlockPlacementDebugOverlay({
  isActive,
  ghostPosition,
  pendingOperations,
  stats,
}: {
  isActive: boolean;
  ghostPosition: Vector3 | null;
  pendingOperations: number;
  stats: ModuleState | null;
}) {
  if (process.env.NODE_ENV !== "development") return null;

  return (
    <group name="block-placement-debug">
      {/* Status indicator */}
      <mesh position={[5, 3, 0]}>
        <sphereGeometry args={[0.2]} />
        <meshBasicMaterial
          color={
            isActive ? (stats?.isRunning ? "#00ff00" : "#ffaa00") : "#666666"
          }
        />
      </mesh>

      {/* Ghost position indicator */}
      {ghostPosition && (
        <mesh
          position={[ghostPosition.x, ghostPosition.y + 0.6, ghostPosition.z]}
        >
          <sphereGeometry args={[0.1]} />
          <meshBasicMaterial color="#ff00ff" />
        </mesh>
      )}

      {/* Pending operations indicator */}
      {pendingOperations > 0 && (
        <mesh position={[5, 2.5, 0]}>
          <sphereGeometry args={[0.1]} />
          <meshBasicMaterial color="#ff8800" />
        </mesh>
      )}
    </group>
  );
}

export default BlockPlacementModule;
