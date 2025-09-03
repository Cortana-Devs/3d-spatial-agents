"use client";

import React, { useRef, useMemo, useCallback, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  Vector3,
  Vector2,
  Plane,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  Color,
  DoubleSide,
  AdditiveBlending,
} from "three";
import { useWorldStore } from "../../store/worldStore";

// Grid configuration interface
export interface GridConfig {
  size: number; // Grid size (number of cells)
  cellSize: number; // Size of each cell
  opacity: number; // Base opacity (0-1)
  visibility: boolean; // Show/hide grid
  fadeDistance: number; // Distance at which grid starts fading
  fadeStrength: number; // How quickly grid fades
  rippleEnabled: boolean; // Enable interaction ripples
  snapToGrid: boolean; // Enable snap-to-grid functionality
  showSnapIndicators: boolean; // Show visual snap indicators
}

// Default grid configuration
const DEFAULT_GRID_CONFIG: GridConfig = {
  size: 50,
  cellSize: 1,
  opacity: 0.3,
  visibility: true,
  fadeDistance: 30,
  fadeStrength: 1,
  rippleEnabled: false, // Disabled by default to reduce distraction
  snapToGrid: true,
  showSnapIndicators: true,
};

// Shader for animated grid with distance-based fading
const gridVertexShader = `
  uniform float time;
  uniform float fadeDistance;
  uniform float fadeStrength;

  varying vec2 vUv;
  varying float vDistance;
  varying float vFade;

  void main() {
    vUv = uv;

    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vDistance = distance(worldPosition.xyz, cameraPosition);

    // Calculate fade based on distance
    vFade = 1.0 - smoothstep(0.0, fadeDistance, vDistance * fadeStrength);
    vFade = max(0.0, vFade);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const gridFragmentShader = `
  uniform float time;
  uniform float opacity;
  uniform vec3 gridColor;
  uniform vec3 accentColor;
  uniform float cellSize;
  uniform vec2 rippleCenter;
  uniform float rippleTime;
  uniform float rippleStrength;

  varying vec2 vUv;
  varying float vDistance;
  varying float vFade;

  void main() {
    vec2 grid = abs(fract(vUv * cellSize) - 0.5) / fwidth(vUv * cellSize);
    float line = min(grid.x, grid.y);

    // Main grid lines
    float gridStrength = 1.0 - min(line, 1.0);

    // Major grid lines every 5 units
    vec2 majorGrid = abs(fract(vUv * cellSize / 5.0) - 0.5) / fwidth(vUv * cellSize / 5.0);
    float majorLine = min(majorGrid.x, majorGrid.y);
    float majorGridStrength = 1.0 - min(majorLine, 1.0);

    // Combine grid lines - increased visibility
    float finalGrid = max(gridStrength * 0.8, majorGridStrength);

    // Add subtle animation
    float pulse = sin(time * 2.0) * 0.1 + 0.9;
    finalGrid *= pulse;

    // Add subtle ripple effect (much more gentle)
    if (rippleStrength > 0.0) {
      float rippleDistance = distance(vUv, rippleCenter);
      float ripple = sin(rippleDistance * 10.0 - rippleTime * 5.0) *
                    exp(-rippleDistance * 8.0) *
                    exp(-rippleTime * 3.0);
      finalGrid += ripple * rippleStrength * 0.1; // Reduced from 0.3 to 0.1
    }

    // Mix colors based on intensity
    vec3 color = mix(gridColor, accentColor, majorGridStrength);

    // Apply distance fade
    float finalOpacity = opacity * vFade * finalGrid;

    gl_FragColor = vec4(color, finalOpacity);
  }
`;

// Ripple effect for interactions
interface RippleEffect {
  center: Vector2;
  startTime: number;
  duration: number;
  strength: number;
}

// Snap indicator component
interface SnapIndicatorProps {
  position: Vector3 | null;
  visible: boolean;
}

function SnapIndicator({ position, visible }: SnapIndicatorProps) {
  const meshRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (meshRef.current && visible && position) {
      // Gentle pulsing animation
      const scale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.1;
      meshRef.current.scale.setScalar(scale);

      // Update position
      meshRef.current.position.copy(position);
      meshRef.current.position.y += 0.01; // Slightly above grid
    }
  });

  if (!visible || !position) return null;

  return (
    <mesh ref={meshRef} position={[position.x, position.y, position.z]}>
      <ringGeometry args={[0.4, 0.5, 16]} />
      <meshBasicMaterial
        color="#00D4FF"
        transparent
        opacity={0.6}
        side={DoubleSide}
      />
    </mesh>
  );
}

// Main grid system component
interface GridSystemProps {
  config?: Partial<GridConfig>;
  onSnapPosition?: (position: Vector3) => void;
}

export default function GridSystem({
  config = {},
  onSnapPosition,
}: GridSystemProps) {
  const { camera, raycaster } = useThree();
  const gridRef = useRef<Mesh>(null);
  const materialRef = useRef<ShaderMaterial>(null);
  const { selectionMode, gridConfig: storeGridConfig } = useWorldStore();

  // Merge store config with prop overrides
  const gridConfig = useMemo(
    () => ({
      ...storeGridConfig,
      ...config,
    }),
    [storeGridConfig, config],
  );

  // Ripple effects state
  const [ripples, setRipples] = React.useState<RippleEffect[]>([]);
  const [snapPosition, setSnapPosition] = React.useState<Vector3 | null>(null);

  // Grid geometry
  const geometry = useMemo(() => {
    const size = gridConfig.size * gridConfig.cellSize;
    return new PlaneGeometry(size, size, 1, 1);
  }, [gridConfig.size, gridConfig.cellSize]);

  // Shader material with uniforms
  const material = useMemo(() => {
    return new ShaderMaterial({
      vertexShader: gridVertexShader,
      fragmentShader: gridFragmentShader,
      uniforms: {
        time: { value: 0 },
        opacity: { value: gridConfig.opacity },
        fadeDistance: { value: gridConfig.fadeDistance },
        fadeStrength: { value: gridConfig.fadeStrength },
        gridColor: { value: new Color("#888888") }, // Lighter gray for better visibility
        accentColor: { value: new Color("#00D4FF") },
        cellSize: { value: gridConfig.size },
        cameraPosition: { value: camera.position },
        rippleCenter: { value: new Vector2(0.5, 0.5) },
        rippleTime: { value: 0 },
        rippleStrength: { value: 0 },
      },
      transparent: true,
      side: DoubleSide,
      blending: AdditiveBlending,
      depthWrite: false,
    });
  }, [gridConfig, camera.position]);

  // Update material uniforms
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
      materialRef.current.uniforms.cameraPosition.value.copy(camera.position);

      // Update ripple effects
      const currentTime = state.clock.elapsedTime;
      let activeRipple: RippleEffect | null = null;

      // Find the most recent active ripple
      for (const ripple of ripples) {
        const elapsed = currentTime - ripple.startTime;
        if (elapsed < ripple.duration) {
          activeRipple = ripple;
          break;
        }
      }

      if (activeRipple) {
        const elapsed = currentTime - activeRipple.startTime;
        materialRef.current.uniforms.rippleCenter.value.copy(
          activeRipple.center,
        );
        materialRef.current.uniforms.rippleTime.value = elapsed;
        materialRef.current.uniforms.rippleStrength.value =
          activeRipple.strength;
      } else {
        materialRef.current.uniforms.rippleStrength.value = 0;
      }

      // Clean up old ripples
      setRipples((prev) =>
        prev.filter(
          (ripple) => currentTime - ripple.startTime < ripple.duration,
        ),
      );
    }
  });

  // Snap-to-grid functionality
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!gridConfig.snapToGrid || !gridConfig.showSnapIndicators) {
        setSnapPosition(null);
        return;
      }

      // Only show snap indicators in place mode
      if (selectionMode !== "place") {
        setSnapPosition(null);
        return;
      }

      // Calculate mouse position in normalized device coordinates
      const mouse = new Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1,
      );

      raycaster.setFromCamera(mouse, camera);

      // Intersect with grid plane
      const gridPlane = new Plane(new Vector3(0, 1, 0), 0);
      const intersectionPoint = new Vector3();
      const intersected = raycaster.ray.intersectPlane(
        gridPlane,
        intersectionPoint,
      );

      if (intersected) {
        // Snap to grid
        const snappedPosition = new Vector3(
          Math.round(intersectionPoint.x / gridConfig.cellSize) *
            gridConfig.cellSize,
          0,
          Math.round(intersectionPoint.z / gridConfig.cellSize) *
            gridConfig.cellSize,
        );

        setSnapPosition(snappedPosition);

        // Notify parent component
        if (onSnapPosition) {
          onSnapPosition(snappedPosition);
        }
      }
    },
    [camera, raycaster, gridConfig, selectionMode, onSnapPosition],
  );

  // Handle click for ripple effects
  const handleClick = useCallback(
    (event: MouseEvent) => {
      if (!gridConfig.rippleEnabled) return;

      // Calculate mouse position in normalized device coordinates
      const mouse = new Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1,
      );

      raycaster.setFromCamera(mouse, camera);

      // Intersect with grid plane
      const gridPlane = new Plane(new Vector3(0, 1, 0), 0);
      const intersectionPoint = new Vector3();
      const intersected = raycaster.ray.intersectPlane(
        gridPlane,
        intersectionPoint,
      );

      if (intersected) {
        // Convert world position to UV coordinates
        const size = gridConfig.size * gridConfig.cellSize;
        const uvX = (intersectionPoint.x + size / 2) / size;
        const uvZ = (intersectionPoint.z + size / 2) / size;

        // Create subtle ripple effect
        const newRipple: RippleEffect = {
          center: new Vector2(uvX, uvZ),
          startTime: performance.now() / 1000,
          duration: 1.5, // Reduced duration
          strength: 0.5, // Reduced strength
        };

        setRipples((prev) => [...prev, newRipple]);
      }
    },
    [camera, raycaster, gridConfig],
  );

  // Add event listeners
  useEffect(() => {
    const canvas = document.querySelector("canvas");
    if (canvas) {
      canvas.addEventListener("mousemove", handleMouseMove);
      canvas.addEventListener("click", handleClick);

      return () => {
        canvas.removeEventListener("mousemove", handleMouseMove);
        canvas.removeEventListener("click", handleClick);
      };
    }
  }, [handleMouseMove, handleClick]);

  // Update material reference
  useEffect(() => {
    if (gridRef.current?.material) {
      materialRef.current = gridRef.current.material as ShaderMaterial;
    }
  }, []);

  // Debug logging
  React.useEffect(() => {
    console.log("Grid Config:", gridConfig);
  }, [gridConfig]);

  if (!gridConfig.visibility) {
    console.log("Grid not visible - visibility is false");
    return null;
  }



  return (
    <group>
      {/* Debug helper - visible cube to confirm grid system is rendering */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.1, 0.1, 0.1]} />
        <meshBasicMaterial color="red" />
      </mesh>

      {/* Main grid */}
      <mesh
        ref={gridRef}
        geometry={geometry}
        material={material}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.001, 0]} // Slightly below y=0 to avoid z-fighting
      />

      {/* Fallback simple grid using basic material */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
      >
        <planeGeometry args={[50, 50]} />
        <meshBasicMaterial 
          color="#888888" 
          transparent 
          opacity={0.2} 
          wireframe={true}
        />
      </mesh>

      {/* Snap indicator */}
      <SnapIndicator
        position={snapPosition}
        visible={gridConfig.showSnapIndicators && selectionMode === "place"}
      />
    </group>
  );
}

// Grid configuration hook for easy access
export function useGridConfig() {
  const [config, setConfig] = React.useState<GridConfig>(DEFAULT_GRID_CONFIG);

  const updateConfig = useCallback((updates: Partial<GridConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  return { config, updateConfig };
}

// Utility functions for grid operations
export const GridUtils = {
  // Snap position to grid
  snapToGrid: (position: Vector3, cellSize: number = 1): Vector3 => {
    return new Vector3(
      Math.round(position.x / cellSize) * cellSize,
      Math.round(position.y / cellSize) * cellSize,
      Math.round(position.z / cellSize) * cellSize,
    );
  },

  // Check if position is on grid
  isOnGrid: (position: Vector3, cellSize: number = 1): boolean => {
    const snapped = GridUtils.snapToGrid(position, cellSize);
    return position.distanceTo(snapped) < 0.001;
  },

  // Get grid cell coordinates
  getGridCell: (position: Vector3, cellSize: number = 1): Vector3 => {
    return new Vector3(
      Math.floor(position.x / cellSize),
      Math.floor(position.y / cellSize),
      Math.floor(position.z / cellSize),
    );
  },

  // Get world position from grid cell
  gridCellToWorld: (cell: Vector3, cellSize: number = 1): Vector3 => {
    return new Vector3(cell.x * cellSize, cell.y * cellSize, cell.z * cellSize);
  },
};
