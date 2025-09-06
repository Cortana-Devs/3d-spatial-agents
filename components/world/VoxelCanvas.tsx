"use client";

import React, {
  useRef,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Vector3,
  Vector2,
  Plane,
  Mesh,
  InstancedMesh,
  Object3D,
  Color,
  Frustum,
  Matrix4 as ThreeMatrix4,
  Points,
  BufferAttribute,
  InstancedBufferAttribute,
  PointsMaterial,
  AdditiveBlending,
} from "three";
import { useWorldStore } from "../../store/worldStore";
import {
  Block,
  BlockType,
  SelectionMode,
  BLOCK_DEFINITIONS,
  CameraMode,
} from "../../types";
import GridSystem from "./GridSystem";
import CameraController, { CAMERA_PRESETS } from "./CameraController";
import CameraControls from "./CameraControls";
import SimulantManager from "../simulants/SimulantManager";
import { SimpleSkybox } from "../skybox/EnhancedSkybox";
import {
  useIsolatedRender,
  useBlockPlacementRender,
  useAnimationRender,
  useBatchedUpdates,
  usePerformanceMonitor,
} from "../../hooks/performance/useIsolatedRender";
import {
  performanceManager,
  MODULE_CONFIGS,
} from "../../utils/performance/PerformanceManager";

// LOD Configuration for performance optimization
interface LODConfig {
  highDetail: number; // 0-30 units
  mediumDetail: number; // 30-60 units
  lowDetail: number; // 60+ units
}

const LOD_CONFIG: LODConfig = {
  highDetail: 30,
  mediumDetail: 60,
  lowDetail: 100,
};

// Particle system for block dissolution effects
interface ParticleSystemProps {
  position: Vector3;
  color: string;
  onComplete: () => void;
}

function ParticleSystem({ position, color, onComplete }: ParticleSystemProps) {
  const pointsRef = useRef<Points>(null);
  const particleCount = 20;

  const { positions, velocities, colors } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const colorObj = new Color(color);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      // Start at block center with slight random offset
      positions[i3] = position.x + (Math.random() - 0.5) * 0.5;
      positions[i3 + 1] = position.y + (Math.random() - 0.5) * 0.5;
      positions[i3 + 2] = position.z + (Math.random() - 0.5) * 0.5;

      // Random velocities
      velocities[i3] = (Math.random() - 0.5) * 2;
      velocities[i3 + 1] = Math.random() * 2 + 1; // Upward bias
      velocities[i3 + 2] = (Math.random() - 0.5) * 2;

      // Set particle color
      colors[i3] = colorObj.r;
      colors[i3 + 1] = colorObj.g;
      colors[i3 + 2] = colorObj.b;
    }

    return { positions, velocities, colors };
  }, [position, color]);

  const [startTime] = useState(Date.now());
  const duration = 1000; // 1 second

  useFrame(() => {
    if (!pointsRef.current) return;

    const elapsed = Date.now() - startTime;
    const progress = elapsed / duration;

    if (progress >= 1) {
      onComplete();
      return;
    }

    const positionAttribute = pointsRef.current.geometry.attributes
      .position as BufferAttribute;
    const positions = positionAttribute.array as Float32Array;

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      // Update positions based on velocity and gravity
      positions[i3] += velocities[i3] * 0.016; // ~60fps
      positions[i3 + 1] += velocities[i3 + 1] * 0.016 - 9.8 * 0.016 * progress; // Gravity
      positions[i3 + 2] += velocities[i3 + 2] * 0.016;

      // Slow down particles over time
      velocities[i3] *= 0.98;
      velocities[i3 + 1] *= 0.98;
      velocities[i3 + 2] *= 0.98;
    }

    positionAttribute.needsUpdate = true;

    // Fade out over time
    if (pointsRef.current.material instanceof PointsMaterial) {
      pointsRef.current.material.opacity = 1 - progress;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        vertexColors
        transparent
        opacity={1}
        blending={AdditiveBlending}
      />
    </points>
  );
}

// Optimized instanced block renderer with LOD and frustum culling
interface OptimizedBlockRendererProps {
  blocks: Array<{
    id: string;
    position: Vector3;
    type: BlockType;
    color: string;
    isHovered?: boolean;
    isSelected?: boolean;
  }>;
}

function OptimizedBlockRenderer({ blocks }: OptimizedBlockRendererProps) {
  const { camera } = useThree();
  const instancedMeshRefs = useRef<{ [key in BlockType]?: InstancedMesh }>({});

  // Group blocks by type for instanced rendering
  const blocksByType = useMemo(() => {
    const grouped: { [key in BlockType]?: typeof blocks } = {};

    blocks.forEach((block) => {
      if (!grouped[block.type]) {
        grouped[block.type] = [];
      }
      grouped[block.type]!.push(block);
    });

    return grouped;
  }, [blocks]);

  // Frustum culling calculation
  const visibleBlocks = useMemo(() => {
    const frustum = new Frustum();
    const cameraMatrix = new ThreeMatrix4();
    cameraMatrix.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    );
    frustum.setFromProjectionMatrix(cameraMatrix);

    const visible: { [key in BlockType]?: typeof blocks } = {};

    Object.entries(blocksByType).forEach(([type, typeBlocks]) => {
      if (!typeBlocks) return;

      visible[type as BlockType] = typeBlocks.filter((block) => {
        // Simple sphere-based frustum culling (more efficient than box)
        const distance = camera.position.distanceTo(block.position);

        // Skip blocks that are too far away
        if (distance > LOD_CONFIG.lowDetail) return false;

        // Check if block is in camera frustum
        return frustum.containsPoint(block.position);
      });
    });

    return visible;
  }, [blocksByType, camera]);

  // Update instanced meshes
  useFrame(() => {
    Object.entries(visibleBlocks).forEach(([type, typeBlocks]) => {
      if (!typeBlocks || typeBlocks.length === 0) return;

      const instancedMesh = instancedMeshRefs.current[type as BlockType];
      if (!instancedMesh) return;

      const tempObject = new Object3D();
      const tempColor = new Color();

      // Ensure we have the right count
      instancedMesh.count = typeBlocks.length;

      typeBlocks.forEach((block, index) => {
        const distance = camera.position.distanceTo(block.position);

        // LOD-based scaling - use consistent scaling
        let scale = 0.98; // Default scale
        if (distance > LOD_CONFIG.mediumDetail) {
          scale = 0.9; // Low detail
        } else if (distance > LOD_CONFIG.highDetail) {
          scale = 0.94; // Medium detail
        }

        // Apply hover effect
        if (block.isHovered) {
          scale *= 1.02; // Reduced hover effect to prevent artifacts
        }

        // Set position and scale
        tempObject.position.copy(block.position);
        tempObject.scale.setScalar(scale);
        tempObject.rotation.set(0, 0, 0); // Ensure no rotation artifacts
        tempObject.updateMatrix();

        instancedMesh.setMatrixAt(index, tempObject.matrix);

        // Set color with hover effect - use proper color handling
        if (block.isHovered) {
          tempColor.setHex(0xffffff);
        } else {
          tempColor.set(block.color);
        }

        if (instancedMesh.setColorAt) {
          instancedMesh.setColorAt(index, tempColor);
        }
      });

      // Mark for update
      instancedMesh.instanceMatrix.needsUpdate = true;
      if (instancedMesh.instanceColor) {
        instancedMesh.instanceColor.needsUpdate = true;
      }
    });
  });

  // Handle mouse interactions
  const handlePointerMove = useCallback(() => {
    // Simple raycasting for hover detection
    // This is a simplified version - in production you'd want more sophisticated raycasting
    // For now, we'll handle hover through the individual block components
  }, []);

  const handleClick = useCallback(() => {
    // Click handling is done through individual block components
  }, []);

  return (
    <group onPointerMove={handlePointerMove} onClick={handleClick}>
      {Object.entries(BLOCK_DEFINITIONS).map(([type, definition]) => {
        const typeBlocks = visibleBlocks[type as BlockType];
        if (!typeBlocks || typeBlocks.length === 0) return null;

        const maxInstances = Math.max(typeBlocks.length, 1);

        return (
          <instancedMesh
            key={type}
            ref={(ref) => {
              if (ref) {
                instancedMeshRefs.current[type as BlockType] = ref;
                // Initialize instance colors if not already done
                if (ref.instanceColor === null) {
                  const colors = new Float32Array(maxInstances * 3);
                  const color = new Color(definition.color);
                  for (let i = 0; i < maxInstances; i++) {
                    colors[i * 3] = color.r;
                    colors[i * 3 + 1] = color.g;
                    colors[i * 3 + 2] = color.b;
                  }
                  ref.instanceColor = new InstancedBufferAttribute(colors, 3);
                }
              }
            }}
            args={[undefined, undefined, maxInstances]}
          >
            <boxGeometry args={[0.98, 0.98, 0.98]} />
            <meshStandardMaterial
              color={definition.color}
              roughness={definition.roughness}
              metalness={definition.metalness}
              transparent={definition.transparency !== undefined}
              opacity={
                definition.transparency ? 1 - definition.transparency : 1
              }
              emissive={definition.emissive || "#000000"}
              emissiveIntensity={definition.emissiveIntensity || 0}
              vertexColors={true} // Enable vertex colors for per-instance coloring
              toneMapped={false} // Prevent tone mapping artifacts
              polygonOffset={true} // Prevent z-fighting
              polygonOffsetFactor={1}
              polygonOffsetUnits={1}
            />
          </instancedMesh>
        );
      })}
    </group>
  );
}

// Enhanced VoxelBlock component with selection and hover states
interface VoxelBlockProps {
  position: [number, number, number];
  type: BlockType;
  color: string;
  isHovered?: boolean;
  isSelected?: boolean;
  onSelect?: (position: Vector3) => void;
  onRemove?: (position: Vector3) => void;
}

function VoxelBlock({
  position,
  type,
  color,
  isHovered,
  isSelected,
  onSelect,
  onRemove,
}: VoxelBlockProps) {
  const meshRef = useRef<Mesh>(null);
  const [showParticles, setShowParticles] = useState(false);
  const { camera } = useThree();

  const distance = useMemo(() => {
    return camera.position.distanceTo(new Vector3(...position));
  }, [camera.position, position]);

  // LOD-based geometry selection
  const geometryArgs = useMemo((): [number, number, number] => {
    if (distance > LOD_CONFIG.mediumDetail) {
      return [0.9, 0.9, 0.9]; // Low detail
    } else if (distance > LOD_CONFIG.highDetail) {
      return [0.94, 0.94, 0.94]; // Medium detail
    }
    return [0.98, 0.98, 0.98]; // High detail
  }, [distance]);

  const handleClick = useCallback(
    (event: { stopPropagation: () => void }) => {
      event.stopPropagation();
      if (onSelect) {
        onSelect(new Vector3(...position));
      }
    },
    [position, onSelect],
  );

  const handleRightClick = useCallback(
    (event: { stopPropagation: () => void }) => {
      event.stopPropagation();
      // Note: React Three Fiber events don't have preventDefault

      if (onRemove) {
        setShowParticles(true);
        // Delay the actual removal to show particle effect
        setTimeout(() => {
          onRemove(new Vector3(...position));
        }, 100);
      }
    },
    [position, onRemove],
  );

  useFrame((state) => {
    if (meshRef.current) {
      // Hover animation
      if (isHovered) {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.02;
        meshRef.current.scale.setScalar(scale);
      } else if (isSelected) {
        // Selection pulse
        const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
        meshRef.current.scale.setScalar(scale);
      } else {
        meshRef.current.scale.setScalar(1);
      }
    }
  });

  const definition = BLOCK_DEFINITIONS[type];

  return (
    <>
      <mesh
        ref={meshRef}
        position={position}
        onClick={handleClick}
        onContextMenu={handleRightClick}
      >
        <boxGeometry args={geometryArgs} />
        <meshStandardMaterial
          color={isHovered ? "#ffffff" : isSelected ? "#00D4FF" : color}
          roughness={definition.roughness}
          metalness={definition.metalness}
          transparent={definition.transparency !== undefined}
          opacity={definition.transparency ? 1 - definition.transparency : 1}
          emissive={
            isHovered
              ? color
              : isSelected
                ? "#00D4FF"
                : definition.emissive || "#000000"
          }
          emissiveIntensity={
            isHovered
              ? 0.2
              : isSelected
                ? 0.15
                : definition.emissiveIntensity || 0
          }
          toneMapped={false} // Prevent tone mapping artifacts
          polygonOffset={true} // Prevent z-fighting
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>

      {showParticles && (
        <ParticleSystem
          position={new Vector3(...position)}
          color={color}
          onComplete={() => setShowParticles(false)}
        />
      )}
    </>
  );
}

// Ghost preview for block placement
interface GhostBlockProps {
  position: [number, number, number] | null;
  type: BlockType;
  color: string;
}

function GhostBlock({ position, type, color }: GhostBlockProps) {
  const meshRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle floating animation
      meshRef.current.position.y =
        (position?.[1] || 0) + Math.sin(state.clock.elapsedTime * 2) * 0.05;
    }
  });

  if (!position) return null;

  return (
    <mesh ref={meshRef} position={[position[0], position[1], position[2]]}>
      <boxGeometry args={[0.98, 0.98, 0.98]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={0.5}
        roughness={type === "stone" ? 0.8 : type === "leaf" ? 0.9 : 0.7}
        metalness={type === "stone" ? 0.1 : 0}
        emissive={color}
        emissiveIntensity={0.3}
      />
    </mesh>
  );
}

// Scene lighting setup with Axiom aesthetics
function SceneLighting() {
  return (
    <>
      {/* Ambient light for overall illumination - increased for better visibility */}
      <ambientLight intensity={0.6} color="#f0f0f0" />

      {/* Main directional light (sun) - positioned to avoid complete darkness */}
      <directionalLight
        position={[10, 15, 10]}
        intensity={0.8}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={50}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
      />

      {/* Fill light for softer shadows - reduced intensity */}
      <directionalLight
        position={[-5, 8, -5]}
        intensity={0.2}
        color="#4CAF50"
      />

      {/* Accent light with Axiom glow colors - reduced intensity */}
      <pointLight
        position={[0, 10, 0]}
        intensity={0.3}
        color="#00D4FF"
        distance={30}
        decay={1}
      />

      {/* Additional hemisphere light for better overall illumination */}
      <hemisphereLight args={["#87CEEB", "#362d1a", 0.4]} />
    </>
  );
}

// Click handler for placing blocks
function ClickHandler() {
  const { camera, raycaster } = useThree();
  const {
    addBlock,
    removeBlock,
    selectedBlockType,
    selectionMode,
    blockMap,
    worldLimits,
  } = useWorldStore();
  const [ghostPosition, setGhostPosition] = useState<
    [number, number, number] | null
  >(null);

  const handleClick = useCallback(
    (event: MouseEvent) => {
      // Only allow block placement in PLACE mode
      if (selectionMode !== SelectionMode.PLACE) return;

      // Update raycaster
      const mouse = new Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1,
      );

      raycaster.setFromCamera(mouse, camera);

      // Create an invisible ground plane for placement
      const groundPlane = new Plane(new Vector3(0, 1, 0), 0);
      const intersectionPoint = new Vector3();
      raycaster.ray.intersectPlane(groundPlane, intersectionPoint);

      if (intersectionPoint) {
        // Snap to grid
        const snappedPosition = new Vector3(
          Math.round(intersectionPoint.x),
          Math.max(0, Math.round(intersectionPoint.y)), // Prevent negative Y
          Math.round(intersectionPoint.z),
        );

        // Check if we can place a block here
        const positionKey = `${snappedPosition.x},${snappedPosition.y},${snappedPosition.z}`;
        const hasExistingBlock = blockMap.has(positionKey);
        const atLimit = blockMap.size >= worldLimits.maxBlocks;

        if (!hasExistingBlock && !atLimit) {
          addBlock(snappedPosition, selectedBlockType, "human");
        }
      }
    },
    [
      camera,
      raycaster,
      addBlock,
      selectedBlockType,
      selectionMode,
      blockMap,
      worldLimits,
    ],
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      // Only show ghost preview in PLACE mode
      if (selectionMode !== SelectionMode.PLACE) {
        setGhostPosition(null);
        return;
      }

      // Update raycaster for ghost preview
      const mouse = new Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1,
      );

      raycaster.setFromCamera(mouse, camera);

      // Create an invisible ground plane for preview
      const groundPlane = new Plane(new Vector3(0, 1, 0), 0);
      const intersectionPoint = new Vector3();
      raycaster.ray.intersectPlane(groundPlane, intersectionPoint);

      if (intersectionPoint) {
        // Snap to grid
        const snappedPosition: [number, number, number] = [
          Math.round(intersectionPoint.x),
          Math.max(0, Math.round(intersectionPoint.y)), // Prevent negative Y
          Math.round(intersectionPoint.z),
        ];

        // Check if position is valid for preview
        const positionKey = `${snappedPosition[0]},${snappedPosition[1]},${snappedPosition[2]}`;
        const hasExistingBlock = blockMap.has(positionKey);

        if (!hasExistingBlock) {
          setGhostPosition(snappedPosition);
        } else {
          setGhostPosition(null);
        }
      }
    },
    [camera, raycaster, selectionMode, blockMap],
  );

  // Handle right-click for block removal
  const handleRightClick = useCallback(
    (event: MouseEvent) => {
      event.preventDefault();

      // Update raycaster
      const mouse = new Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1,
      );

      raycaster.setFromCamera(mouse, camera);

      // Raycast against existing blocks
      const blocks = Array.from(blockMap.values());
      const intersections: Array<{ block: Block; distance: number }> = [];

      // Simple intersection test with block positions
      blocks.forEach((block) => {
        const blockPosition = new Vector3(
          block.position.x,
          block.position.y,
          block.position.z,
        );
        const distance = raycaster.ray.distanceToPoint(blockPosition);
        if (distance < 0.7) {
          // Within block bounds
          intersections.push({ block, distance });
        }
      });

      // Remove the closest block
      if (intersections.length > 0) {
        intersections.sort((a, b) => a.distance - b.distance);
        const closestBlock = intersections[0].block;
        const blockPosition = new Vector3(
          closestBlock.position.x,
          closestBlock.position.y,
          closestBlock.position.z,
        );
        removeBlock(blockPosition, "human");
      }
    },
    [camera, raycaster, blockMap, removeBlock],
  );

  // Add event listeners
  React.useEffect(() => {
    const canvas = document.querySelector("canvas");
    if (canvas) {
      canvas.addEventListener("click", handleClick);
      canvas.addEventListener("contextmenu", handleRightClick);
      canvas.addEventListener("mousemove", handleMouseMove);

      return () => {
        canvas.removeEventListener("click", handleClick);
        canvas.removeEventListener("contextmenu", handleRightClick);
        canvas.removeEventListener("mousemove", handleMouseMove);
      };
    }
  }, [handleClick, handleRightClick, handleMouseMove]);

  // Get block definition for ghost preview
  const blockDefinitions: Record<BlockType, { color: string }> = {
    [BlockType.STONE]: { color: "#666666" },
    [BlockType.LEAF]: { color: "#4CAF50" },
    [BlockType.WOOD]: { color: "#8D6E63" },
    [BlockType.FROSTED_GLASS]: { color: "#FFFFFF" },
    [BlockType.NUMBER_4]: { color: "#FF4081" },
  };

  // Safely get color with a fallback
  const blockColor = blockDefinitions[selectedBlockType]?.color || "#FF0000";

  return (
    <GhostBlock
      position={ghostPosition}
      type={selectedBlockType}
      color={blockColor}
    />
  );
}

// Main scene content with optimized rendering
function SceneContent({
  cameraMode,
  followTarget,
}: {
  cameraMode: CameraMode;
  followTarget?: string;
}) {
  const { blockMap, removeBlock, selectionMode, gridConfig } = useWorldStore();
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [hoveredBlockId] = useState<string | null>(null);
  const [useInstancedRendering, setUseInstancedRendering] = useState(true);

  const blocks = useMemo(() => {
    return Array.from(blockMap.values()).map((block) => ({
      id: block.id,
      position: new Vector3(
        block.position.x,
        block.position.y,
        block.position.z,
      ),
      type: block.type,
      color: block.color,
      isHovered: block.id === hoveredBlockId,
      isSelected: block.id === selectedBlockId,
    }));
  }, [blockMap, hoveredBlockId, selectedBlockId]);

  const handleBlockClick = useCallback(
    (blockId: string) => {
      // Only allow block selection in EMPTY mode
      if (selectionMode === SelectionMode.EMPTY) {
        setSelectedBlockId(selectedBlockId === blockId ? null : blockId);
      }
    },
    [selectedBlockId, selectionMode],
  );

  const handleBlockRemove = useCallback(
    (position: Vector3) => {
      removeBlock(position, "human");
      setSelectedBlockId(null);
    },
    [removeBlock],
  );

  // Switch between instanced and individual rendering based on block count
  useEffect(() => {
    setUseInstancedRendering(blocks.length > 50);
  }, [blocks.length]);

  return (
    <>
      <SceneLighting />

      {/* Enhanced skybox with flashing prevention */}
      <SimpleSkybox />

      {/* Multi-modal camera controller */}
      <CameraController
        mode={cameraMode}
        target={followTarget}
        enablePresets={true}
        enableDoubleClickFocus={true}
      />

      {/* Optimized block rendering */}
      {useInstancedRendering ? (
        <OptimizedBlockRenderer blocks={blocks} />
      ) : (
        // Individual block rendering for smaller counts or when precision is needed
        blocks.map((block) => (
          <VoxelBlock
            key={block.id}
            position={[block.position.x, block.position.y, block.position.z]}
            type={block.type}
            color={block.color}
            isHovered={block.isHovered}
            isSelected={block.isSelected}
            onSelect={() => handleBlockClick(block.id)}
            onRemove={handleBlockRemove}
          />
        ))
      )}

      {/* Intelligent grid system with spatial indexing */}
      <GridSystem config={gridConfig} />

      {/* AI Simulant System */}
      <SimulantManager
        enableAnimations={true}
        enableGridSnap={gridConfig.snapToGrid}
        maxSimulants={10}
        lodEnabled={true}
      />

      {/* Click handler and ghost preview */}
      <ClickHandler />
    </>
  );
}

// Isolated performance monitoring hook
function useIsolatedPerformanceMonitor() {
  const [fps, setFps] = useState(60);
  const [frameTime, setFrameTime] = useState(16.67);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  // Use isolated render to prevent interference
  useIsolatedRender(
    () => {
      frameCount.current++;
      const now = performance.now();

      if (now - lastTime.current >= 1000) {
        const currentFps =
          (frameCount.current * 1000) / (now - lastTime.current);
        setFps(Math.round(currentFps));
        setFrameTime(1000 / currentFps);

        frameCount.current = 0;
        lastTime.current = now;
      }
    },
    {
      moduleName: "performance-monitor",
      priority: 1,
      maxFrameTime: 0.5,
      updateFrequency: 60,
      canBeThrottled: true,
      dependencies: [],
    },
  );

  return { fps, frameTime };
}

// Performance stats display (development only)
function PerformanceStats() {
  const { fps, frameTime } = useIsolatedPerformanceMonitor();
  const { blockMap } = useWorldStore();
  const systemMetrics = usePerformanceMonitor().system;

  if (process.env.NODE_ENV !== "development") return null;

  return (
    <div className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded text-xs font-mono">
      <div>FPS: {fps}</div>
      <div>Frame Time: {frameTime.toFixed(2)}ms</div>
      <div>Blocks: {blockMap.size}</div>
      <div>Active Modules: {systemMetrics.activeLoops}</div>
      <div>Throttled: {systemMetrics.throttledModules}</div>
      <div>Budget: {systemMetrics.budgetUtilization.toFixed(1)}%</div>
    </div>
  );
}

// Main VoxelCanvas component with performance optimizations
interface VoxelCanvasProps {
  className?: string;
  enablePerformanceStats?: boolean;
  gridConfig?: Partial<import("./GridSystem").GridConfig>;
}

export default function VoxelCanvas({
  className = "",
  enablePerformanceStats = false,
}: VoxelCanvasProps) {
  const { blockMap, activeCamera, setCameraMode } = useWorldStore();
  const blockCount = blockMap.size;
  const [followTarget] = useState<string | undefined>();

  // Use activeCamera directly from store instead of local state
  const cameraMode = activeCamera as CameraMode;

  // Camera mode change handler
  const handleCameraModeChange = useCallback(
    (mode: CameraMode) => {
      setCameraMode(mode);
    },
    [setCameraMode],
  );

  // Camera preset application handler
  const handlePresetApply = useCallback(
    (presetName: keyof typeof CAMERA_PRESETS) => {
      // This will be handled by the CameraController component
      console.log("Applying preset:", presetName);
    },
    [],
  );

  // Block focus handler for double-click functionality
  const handleFocusOnBlock = useCallback(
    (blockId: string) => {
      const block = Array.from(blockMap.values()).find((b) => b.id === blockId);
      if (block) {
        const blockPosition = new Vector3(
          block.position.x,
          block.position.y,
          block.position.z,
        );
        console.log("Focusing on block at:", blockPosition);
        // The actual focusing will be handled by the CameraController
      }
    },
    [blockMap],
  );

  // Dynamic performance settings based on block count
  const performanceSettings = useMemo(() => {
    if (blockCount > 500) {
      return {
        shadows: false,
        antialias: false,
        dpr: [1, 1.5] as [number, number],
        performance: { min: 0.3, max: 0.8, debounce: 300 },
      };
    } else if (blockCount > 200) {
      return {
        shadows: true,
        antialias: false,
        dpr: [1, 2] as [number, number],
        performance: { min: 0.4, max: 0.9, debounce: 250 },
      };
    } else {
      return {
        shadows: true,
        antialias: true,
        dpr: [1, 2] as [number, number],
        performance: { min: 0.5, max: 1, debounce: 200 },
      };
    }
  }, [blockCount]);

  return (
    <div className={`w-full h-full relative ${className}`}>
      <Canvas
        shadows={performanceSettings.shadows}
        camera={{
          position: [10, 10, 10],
          fov: 60,
          near: 0.1,
          far: 200, // Reduced far plane for better performance
        }}
        gl={{
          antialias: performanceSettings.antialias,
          alpha: false,
          powerPreference: "high-performance",
          stencil: false,
          depth: true,
          logarithmicDepthBuffer: blockCount > 800, // For very large worlds
          preserveDrawingBuffer: false,
          premultipliedAlpha: false,
          failIfMajorPerformanceCaveat: false,
        }}
        dpr={performanceSettings.dpr}
        performance={performanceSettings.performance}
        frameloop="always" // Continuous rendering for smooth animations
      >
        <SceneContent cameraMode={cameraMode} followTarget={followTarget} />
      </Canvas>

      {/* Camera controls UI - hidden since moved into FloatingSidebar; keep for large screens if desired */}
      <div className="hidden">
        <CameraControls
          currentMode={cameraMode}
          onModeChange={handleCameraModeChange}
          onPresetApply={handlePresetApply}
          onFocusOnBlock={handleFocusOnBlock}
        />
      </div>

      {enablePerformanceStats && <PerformanceStats />}

      {/* Simulant Controls are now inside FloatingSidebar */}

      {/* Removed fly mode indicator; information available in sidebar */}
    </div>
  );
}
