"use client";

import React, { useRef, useMemo, useEffect, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  InstancedMesh,
  Matrix4,
  Vector3,
  Color,
  BufferGeometry,
  BufferAttribute,
  Material,
  Frustum,
  Matrix4 as ThreeMatrix4,
  Box3,
  Sphere,
  InstancedBufferAttribute,
  ShaderMaterial,
  UniformsUtils,
  DoubleSide,
  FrontSide,
  AdditiveBlending,
  MeshBasicMaterial,
  MeshStandardMaterial,
  MeshPhysicalMaterial,
} from "three";
import { Block, BlockType, BLOCK_DEFINITIONS } from "../../types";
import {
  GPU_OPTIMIZED_SHADERS,
  ShaderUtils,
  ShaderProfiler,
} from "../../utils/GPUOptimizedShaders";
import { gpuMemoryManager } from "../../utils/performance/GPUMemoryManager";
import {
  transparencyOptimizer,
  TransparencyUtils,
} from "../../utils/performance/TransparencyOptimizer";
import {
  transparencySortingFix,
  TransparencyFixUtils,
} from "../../utils/TransparencySortingFix";

// GPU Performance Configuration
// Mobile device detection utility
const detectMobileDevice = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobile =
    /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
      userAgent,
    );
  const isTablet =
    /ipad|tablet/.test(userAgent) || (isMobile && window.innerWidth > 768);

  // GPU detection for performance tier
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
  let performanceTier: "low" | "mid" | "high" = "mid";

  if (gl) {
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    if (debugInfo) {
      const renderer = gl
        .getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
        .toLowerCase();
      const lowEndGPUs = [
        "adreno 4",
        "adreno 5",
        "mali-4",
        "mali-t6",
        "powervr sgx",
      ];
      const highEndGPUs = [
        "adreno 6",
        "adreno 7",
        "mali-g7",
        "apple a1",
        "apple m1",
      ];

      if (lowEndGPUs.some((gpu) => renderer.includes(gpu)))
        performanceTier = "low";
      else if (highEndGPUs.some((gpu) => renderer.includes(gpu)))
        performanceTier = "high";
    }
  }

  // Memory-based adjustment
  if ("deviceMemory" in navigator && (navigator as any).deviceMemory <= 2) {
    performanceTier = "low";
  }

  return { isMobile, isTablet, performanceTier };
};

const device = detectMobileDevice();

// Adaptive configuration based on device capabilities
const GPU_CONFIG = {
  // Base configuration
  MAX_INSTANCES: device.isMobile
    ? device.performanceTier === "low"
      ? 5000
      : device.performanceTier === "mid"
        ? 15000
        : 25000
    : 50000,
  FRUSTUM_CULLING: true,
  OCCLUSION_CULLING: !device.isMobile || device.performanceTier === "high",
  LOD_DISTANCES: device.isMobile
    ? device.performanceTier === "low"
      ? [15, 35, 60]
      : [20, 50, 100]
    : [25, 75, 150],
  BATCH_SIZE: device.isMobile ? 200 : 2000,
  MEMORY_POOL_SIZE: device.isMobile
    ? device.performanceTier === "low"
      ? 1000
      : 5000
    : 10000,
  USE_COMPUTE_SHADERS: device.performanceTier === "high" && !device.isMobile,
  TEMPORAL_UPSAMPLING: !device.isMobile || device.performanceTier === "high",
  ENABLE_DEPTH_PREPASS: device.performanceTier !== "low",
  USE_INSTANCED_ARRAYS: true,
  TRANSPARENCY_OPTIMIZATION: true,
  ENABLE_GPU_TIMING: false, // Disable to prevent WebGL errors
  ENABLE_DEBUG_LOGGING: process.env.NODE_ENV === "development",
  MAX_TRANSPARENT_BLOCKS: device.isMobile
    ? device.performanceTier === "low"
      ? 50
      : 100
    : 200,

  // Mobile-specific optimizations
  MOBILE_OPTIMIZATIONS: {
    ENABLE_THERMAL_THROTTLING: device.isMobile,
    ENABLE_BATTERY_OPTIMIZATION: device.isMobile,
    ADAPTIVE_QUALITY: device.isMobile,
    TARGET_FPS: device.isMobile ? 30 : 60,
    PIXEL_RATIO_CAP: device.isMobile ? 2.0 : 3.0,
    SHADOW_MAP_SIZE:
      device.performanceTier === "low"
        ? 512
        : device.performanceTier === "mid"
          ? 1024
          : 2048,
    ENABLE_SHADOWS: device.performanceTier !== "low",
    CULL_DISTANCE:
      device.performanceTier === "low"
        ? 80
        : device.performanceTier === "mid"
          ? 120
          : 180,
  },
} as const;

// Memory Pool for Object Reuse
class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: (obj: T) => void;

  constructor(
    createFn: () => T,
    resetFn: (obj: T) => void,
    initialSize: number = 100,
  ) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(createFn());
    }
  }

  get(): T {
    return this.pool.pop() || this.createFn();
  }

  release(obj: T): void {
    this.resetFn(obj);
    this.pool.push(obj);
  }
}

// Advanced Glass Shader for NUMBER_7 blocks
const advancedGlassVertexShader = `
  attribute vec3 instancePosition;
  attribute vec4 instanceColor;
  attribute float instanceOpacity;

  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec4 vColor;
  varying float vOpacity;
  varying vec3 vReflect;
  varying vec3 vRefract;

  uniform mat4 instanceMatrix;
  uniform float time;
  uniform float refractionRatio;

  void main() {
    vColor = instanceColor;
    vOpacity = instanceOpacity;

    vec4 worldPosition = instanceMatrix * vec4(position + instancePosition, 1.0);
    vWorldPosition = worldPosition.xyz;

    vec3 worldNormal = normalize((instanceMatrix * vec4(normal, 0.0)).xyz);
    vNormal = worldNormal;

    vec3 I = normalize(worldPosition.xyz - cameraPosition);
    vReflect = reflect(I, worldNormal);
    vRefract = refract(I, worldNormal, refractionRatio);

    // Subtle vertex animation for glass shimmer
    vec3 animatedPosition = position;
    animatedPosition += sin(time * 2.0 + worldPosition.x * 0.1) * 0.001 * normal;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(animatedPosition + instancePosition, 1.0);
  }
`;

const advancedGlassFragmentShader = `
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec4 vColor;
  varying float vOpacity;
  varying vec3 vReflect;
  varying vec3 vRefract;

  uniform samplerCube envMap;
  uniform float time;
  uniform float fresnelBias;
  uniform float fresnelScale;
  uniform float fresnelPower;
  uniform float refractionRatio;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);

    // Fresnel calculation for realistic glass
    float fresnel = fresnelBias + fresnelScale * pow(1.0 + dot(viewDirection, normal), fresnelPower);

    // Sample environment map for reflections and refractions
    vec4 reflectedColor = textureCube(envMap, vReflect);
    vec4 refractedColor = textureCube(envMap, vRefract);

    // Mix reflection and refraction based on Fresnel
    vec4 glasColor = mix(refractedColor, reflectedColor, fresnel);

    // Add subtle shimmer effect
    float shimmer = sin(time * 3.0 + vWorldPosition.x * 0.5 + vWorldPosition.z * 0.3) * 0.1 + 0.9;

    gl_FragColor = vec4(mix(vColor.rgb, glasColor.rgb, 0.8) * shimmer, vOpacity);
  }
`;

// High-Performance Instance Data Structure
interface InstanceData {
  matrix: Matrix4;
  color: Color;
  opacity: number;
  visible: boolean;
  distance: number;
  lodLevel: number;
  blockId: string;
}

// GPU-Optimized Block Type Renderer
interface GPUBlockTypeRenderer {
  instances: InstanceData[];
  instancedMesh: InstancedMesh | null;
  material: Material;
  geometry: BufferGeometry;
  needsUpdate: boolean;
  visibleCount: number;
}

interface GPUOptimizedRendererProps {
  blocks: Map<string, Block>;
  maxRenderDistance?: number;
  enableAdvancedEffects?: boolean;
  performanceMode?: "ultra" | "high" | "balanced" | "low";
}

export default function GPUOptimizedRenderer({
  blocks,
  maxRenderDistance = 500,
  enableAdvancedEffects = true,
  performanceMode = "ultra",
}: GPUOptimizedRendererProps) {
  const { camera, scene, gl } = useThree();
  const groupRef = useRef<import("three").Group>(null);

  // Glass block types that are handled by SeamlessGlassRenderer
  const glassBlockTypes = [
    BlockType.FROSTED_GLASS,
    BlockType.NUMBER_6,
    BlockType.NUMBER_7,
  ];

  // Filter out glass blocks to avoid double rendering
  const nonGlassBlocks = useMemo(() => {
    const filtered = new Map<string, Block>();
    blocks.forEach((block, key) => {
      if (!glassBlockTypes.includes(block.type)) {
        filtered.set(key, block);
      }
    });

    if (process.env.NODE_ENV === "development") {
      console.log(
        "🚀 GPUOptimizedRenderer: Total blocks received:",
        blocks.size,
      );
    }
    if (process.env.NODE_ENV === "development") {
      console.log(
        "🔧 GPUOptimizedRenderer: Non-glass blocks to render:",
        filtered.size,
      );
    }

    if (filtered.size > 0) {
      const blockTypes = [
        ...new Set(Array.from(filtered.values()).map((b) => b.type)),
      ];
      if (process.env.NODE_ENV === "development") {
        console.log(
          "🎨 GPUOptimizedRenderer: Non-glass block types:",
          blockTypes,
        );
      }
    }

    return filtered;
  }, [blocks]);

  // Object pools for memory optimization
  const matrix4Pool = useRef(
    new ObjectPool(
      () => new Matrix4(),
      (m) => m.identity(),
      GPU_CONFIG.MEMORY_POOL_SIZE,
    ),
  );

  const vector3Pool = useRef(
    new ObjectPool(
      () => new Vector3(),
      (v) => v.set(0, 0, 0),
      GPU_CONFIG.MEMORY_POOL_SIZE,
    ),
  );

  const colorPool = useRef(
    new ObjectPool(
      () => new Color(),
      (c) => c.setHex(0xffffff),
      GPU_CONFIG.MEMORY_POOL_SIZE,
    ),
  );

  // Frustum for culling
  const frustum = useRef(new Frustum());
  const cameraMatrix = useRef(new ThreeMatrix4());

  // Performance metrics
  const performanceMetrics = useRef({
    totalInstances: 0,
    visibleInstances: 0,
    culledInstances: 0,
    drawCalls: 0,
    lastFrameTime: 0,
    averageFrameTime: 0,
    frameCount: 0,
  });

  // Create optimized geometries with LOD
  const geometries = useMemo(() => {
    const createLODGeometry = (segments: number) => {
      const geometry = new BufferGeometry();

      // Create box geometry with specified detail level
      const vertices: number[] = [];
      const normals: number[] = [];
      const uvs: number[] = [];
      const indices: number[] = [];

      // Generate vertices for each face with LOD
      const step = 1 / segments;
      let vertexIndex = 0;

      // Front, Back, Left, Right, Top, Bottom faces
      const faces = [
        { normal: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] }, // Front
        { normal: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] }, // Back
        { normal: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] }, // Left
        { normal: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] }, // Right
        { normal: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] }, // Top
        { normal: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] }, // Bottom
      ];

      faces.forEach((face) => {
        const startVertex = vertexIndex;

        for (let i = 0; i <= segments; i++) {
          for (let j = 0; j <= segments; j++) {
            const u = i / segments - 0.5;
            const v = j / segments - 0.5;

            // Calculate position
            const x = face.normal[0] * 0.5 + face.u[0] * u + face.v[0] * v;
            const y = face.normal[1] * 0.5 + face.u[1] * u + face.v[1] * v;
            const z = face.normal[2] * 0.5 + face.u[2] * u + face.v[2] * v;

            vertices.push(x, y, z);
            normals.push(face.normal[0], face.normal[1], face.normal[2]);
            uvs.push(i / segments, j / segments);

            // Create indices for triangles
            if (i < segments && j < segments) {
              const a = vertexIndex;
              const b = vertexIndex + 1;
              const c = vertexIndex + segments + 1;
              const d = vertexIndex + segments + 2;

              indices.push(a, b, c, b, d, c);
            }

            vertexIndex++;
          }
        }
      });

      geometry.setIndex(indices);
      geometry.setAttribute(
        "position",
        new BufferAttribute(new Float32Array(vertices), 3),
      );
      geometry.setAttribute(
        "normal",
        new BufferAttribute(new Float32Array(normals), 3),
      );
      geometry.setAttribute(
        "uv",
        new BufferAttribute(new Float32Array(uvs), 2),
      );
      geometry.computeBoundingSphere();

      return geometry;
    };

    return {
      high: createLODGeometry(4), // High detail
      medium: createLODGeometry(2), // Medium detail
      low: createLODGeometry(1), // Low detail
    };
  }, []);

  // Create optimized materials with performance-first approach
  const materials = useMemo(() => {
    const createGlassMaterial = () => {
      // Use the optimized transparency sorting fix for glass material
      if (process.env.NODE_ENV === "development") {
        console.log(
          "Creating optimized glass material with TransparencySortingFix",
        );
      }
      const material = TransparencyFixUtils.createGlassMaterial();

      if (process.env.NODE_ENV === "development") {
        console.log("Optimized glass material created successfully:", material);
      }
      return material;
    };

    const materialMap = new Map<BlockType, Material>();

    Object.values(BlockType).forEach((blockType) => {
      const definition = BLOCK_DEFINITIONS[blockType];

      if (blockType === BlockType.NUMBER_7) {
        materialMap.set(blockType, createGlassMaterial());
      } else {
        const material = new MeshStandardMaterial({
          color: definition.color,
          roughness: definition.roughness,
          metalness: definition.metalness,
          transparent: definition.transparency !== undefined,
          opacity: definition.transparency ? 1 - definition.transparency : 1,
          emissive: definition.emissive || "#000000",
          emissiveIntensity: definition.emissiveIntensity || 0,
        });

        // Performance optimizations
        material.toneMapped = false;
        if (performanceMode === "low") {
          material.roughness = Math.max(0.3, material.roughness);
          material.metalness = Math.min(0.5, material.metalness);
        }

        materialMap.set(blockType, material);
      }
    });

    return materialMap;
  }, [enableAdvancedEffects, performanceMode]);

  // GPU-optimized block renderers by type
  const blockRenderers = useRef<Map<BlockType, GPUBlockTypeRenderer>>(
    new Map(),
  );

  // Initialize renderers with transparency optimization
  useEffect(() => {
    if (!camera) return; // Wait for camera to be available

    const renderers = new Map<BlockType, GPUBlockTypeRenderer>();

    // Initialize transparency optimizer
    transparencyOptimizer.initialize(camera);
    transparencyOptimizer.updateConfig(
      TransparencyUtils.getRecommendedConfig(),
    );

    Object.values(BlockType).forEach((blockType) => {
      const renderer: GPUBlockTypeRenderer = {
        instances: [],
        instancedMesh: null,
        material: materials.get(blockType)!,
        geometry: geometries.high, // Start with high detail
        needsUpdate: true,
        visibleCount: 0,
      };

      renderers.set(blockType, renderer);
    });

    blockRenderers.current = renderers;
  }, [materials, geometries, camera]);

  // Update frustum for culling
  const updateFrustum = useCallback(() => {
    if (!GPU_CONFIG.FRUSTUM_CULLING) return;

    cameraMatrix.current.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    );
    frustum.current.setFromProjectionMatrix(cameraMatrix.current);
  }, [camera]);

  // Determine LOD level based on distance
  const getLODLevel = useCallback((distance: number) => {
    if (distance < GPU_CONFIG.LOD_DISTANCES[0]) return 0; // High
    if (distance < GPU_CONFIG.LOD_DISTANCES[1]) return 1; // Medium
    return 2; // Low
  }, []);

  // Get appropriate geometry for LOD level
  const getGeometryForLOD = useCallback(
    (lodLevel: number) => {
      switch (lodLevel) {
        case 0:
          return geometries.high;
        case 1:
          return geometries.medium;
        case 2:
          return geometries.low;
        default:
          return geometries.low;
      }
    },
    [geometries],
  );

  // Update instance data with advanced transparency optimization
  const updateInstances = useCallback(() => {
    const startTime = performance.now();
    updateFrustum();

    const cameraPosition = vector3Pool.current.get();
    cameraPosition.copy(camera.position);

    let totalInstances = 0;
    let visibleInstances = 0;
    let culledInstances = 0;

    // Apply transparency optimization for performance-critical blocks
    const transparencyResults = camera
      ? transparencyOptimizer.optimizeTransparentBlocks(blocks)
      : { visibleTransparentBlocks: [], culledCount: 0, performanceGain: 0 };
    const optimizedTransparentBlocks = new Set(
      transparencyResults.visibleTransparentBlocks.map((tb) => tb.block.id),
    );

    // Clear all renderers
    blockRenderers.current.forEach((renderer) => {
      renderer.instances.length = 0;
      renderer.visibleCount = 0;
    });

    if (process.env.NODE_ENV === "development") {
      console.log(
        "🔄 GPUOptimizedRenderer: Updating instances for",
        nonGlassBlocks.size,
      );
    }

    // Debug: Check for floor blocks (throttled logging)
    let floorBlockCount = 0;
    let floorBlocksAtZero = 0;
    blocks.forEach((block) => {
      if (block.position.y <= 0.5 && block.position.y >= -0.5) {
        floorBlockCount++;
        if (block.position.y === 0) {
          floorBlocksAtZero++;
        }
      }
    });

    // Debug logging disabled to prevent console spam
    // Uncomment below for debugging when needed
    /*
    if (
      process.env.NODE_ENV === "development" &&
      frameCounter.current % 60 === 0
    ) {
      console.log(
        `🏗️ GPU Renderer: ${floorBlockCount} floor blocks found, ${blocks.size} total blocks`,
      );
    }
    */

    // Process each block with transparency optimization (excluding glass blocks)
    nonGlassBlocks.forEach((block) => {
      totalInstances++;

      const renderer = blockRenderers.current.get(block.type);
      if (!renderer) return;

      const blockPosition = vector3Pool.current.get();
      blockPosition.set(block.position.x, block.position.y, block.position.z);

      const distance = cameraPosition.distanceTo(blockPosition);

      // Distance culling
      if (distance > maxRenderDistance) {
        culledInstances++;
        vector3Pool.current.release(blockPosition);
        return;
      }

      // Skip any remaining glass blocks that might have slipped through
      if (glassBlockTypes.includes(block.type)) {
        culledInstances++;
        vector3Pool.current.release(blockPosition);
        return;
      }

      // Improved frustum culling logic with special handling for floor blocks
      if (GPU_CONFIG.FRUSTUM_CULLING) {
        const isFloorBlock = blockPosition.y <= 1 && blockPosition.y >= -1;
        const cameraDistance = camera.position.distanceTo(blockPosition);

        if (isFloorBlock) {
          // More generous culling for floor blocks - only cull if very far
          const sphere = new Sphere(blockPosition, 1.5);
          if (
            cameraDistance > 150 &&
            !frustum.current.intersectsSphere(sphere)
          ) {
            culledInstances++;
            vector3Pool.current.release(blockPosition);
            return;
          }
        } else {
          // Standard frustum culling for other blocks
          const sphere = new Sphere(blockPosition, 0.866);
          if (!frustum.current.intersectsSphere(sphere)) {
            culledInstances++;
            vector3Pool.current.release(blockPosition);
            return;
          }
        }
      }

      // Create instance data
      const matrix = matrix4Pool.current.get();
      matrix.setPosition(blockPosition);

      const color = colorPool.current.get();
      color.setHex(
        parseInt(BLOCK_DEFINITIONS[block.type].color.replace("#", "0x")),
      );

      const lodLevel = getLODLevel(distance);

      const instanceData: InstanceData = {
        matrix,
        color,
        opacity: BLOCK_DEFINITIONS[block.type].transparency
          ? 1 - BLOCK_DEFINITIONS[block.type].transparency!
          : 1,
        visible: true,
        distance,
        lodLevel,
        blockId: block.id,
      };

      renderer.instances.push(instanceData);
      renderer.visibleCount++;
      visibleInstances++;

      vector3Pool.current.release(blockPosition);
    });

    vector3Pool.current.release(cameraPosition);

    // Update performance metrics
    const frameTime = performance.now() - startTime;
    const metrics = performanceMetrics.current;
    metrics.totalInstances = totalInstances;
    metrics.visibleInstances = visibleInstances;
    metrics.culledInstances = culledInstances;
    metrics.lastFrameTime = frameTime;
    metrics.frameCount++;
    metrics.averageFrameTime =
      (metrics.averageFrameTime * (metrics.frameCount - 1) + frameTime) /
      metrics.frameCount;

    // Mark renderers for update
    blockRenderers.current.forEach((renderer) => {
      renderer.needsUpdate = true;
    });
  }, [nonGlassBlocks, camera, maxRenderDistance, updateFrustum, getLODLevel]);

  // Update GPU instances
  const updateGPUInstances = useCallback(() => {
    let drawCalls = 0;

    blockRenderers.current.forEach((renderer, blockType) => {
      if (!renderer.needsUpdate || renderer.instances.length === 0) return;

      // Remove old instance mesh
      if (renderer.instancedMesh && groupRef.current) {
        groupRef.current.remove(renderer.instancedMesh);
        renderer.instancedMesh.dispose();
      }

      // Create new instanced mesh
      const count = Math.min(
        renderer.instances.length,
        GPU_CONFIG.MAX_INSTANCES,
      );
      renderer.instancedMesh = new InstancedMesh(
        getGeometryForLOD(renderer.instances[0]?.lodLevel || 0),
        renderer.material,
        count,
      );

      // Set instance matrices and colors
      const dummy = new Matrix4();
      const color = new Color();

      for (let i = 0; i < count; i++) {
        const instance = renderer.instances[i];
        if (!instance) break;

        renderer.instancedMesh.setMatrixAt(i, instance.matrix);
        renderer.instancedMesh.setColorAt(i, instance.color);

        // Glass blocks are handled by SeamlessGlassRenderer, so this shouldn't execute
        // But keeping as safety fallback
        if (glassBlockTypes.includes(blockType as BlockType)) {
          console.warn(
            `Glass block ${blockType} found in GPUOptimizedRenderer - should be handled by SeamlessGlassRenderer`,
          );
        }
      }

      renderer.instancedMesh.instanceMatrix.needsUpdate = true;
      if (renderer.instancedMesh.instanceColor) {
        renderer.instancedMesh.instanceColor.needsUpdate = true;
      }

      // GPU state optimizations
      renderer.instancedMesh.frustumCulled = false; // We handle culling manually
      renderer.instancedMesh.castShadow =
        performanceMode === "ultra" || performanceMode === "high";
      renderer.instancedMesh.receiveShadow = performanceMode === "ultra";

      // Advanced GPU optimizations
      if (GPU_CONFIG.USE_INSTANCED_ARRAYS) {
        renderer.instancedMesh.instanceMatrix.usage = 35048; // DYNAMIC_DRAW
        if (renderer.instancedMesh.instanceColor) {
          renderer.instancedMesh.instanceColor.usage = 35048;
        }
      }

      if (groupRef.current) {
        groupRef.current.add(renderer.instancedMesh);
        drawCalls++;
      }

      renderer.needsUpdate = false;
    });

    performanceMetrics.current.drawCalls = drawCalls;
  }, [getGeometryForLOD, performanceMode, enableAdvancedEffects]);

  // Main update loop with performance profiling
  useFrame((state) => {
    // Start GPU profiling only if enabled and supported
    if (
      GPU_CONFIG.ENABLE_GPU_TIMING &&
      process.env.NODE_ENV === "development" &&
      typeof state.gl.getContext === "function" &&
      ShaderUtils.isWebGL2(state.gl.getContext())
    ) {
      try {
        ShaderProfiler.startTiming(
          state.gl.getContext() as WebGL2RenderingContext,
          "gpu-render",
        );
      } catch (error) {
        // Silently fail to prevent console spam
        if (process.env.NODE_ENV === "development") {
          console.warn("GPU timing start failed:", error);
        }
      }
    }

    // Update shader uniforms for advanced materials
    // Update transparency sorting and glass materials
    if (camera) {
      // Update transparency sorting system
      transparencySortingFix.updateTransparencySorting(camera);
    }

    // Glass materials are now handled by SeamlessGlassRenderer
    // No need to update them here

    // Update instances with throttling based on performance
    const frameTime = 1000 / state.clock.elapsedTime;
    if (frameTime > 30 || performanceMode === "ultra") {
      updateInstances();
      updateGPUInstances();
    }

    // End GPU timing
    // End GPU profiling only if enabled and supported
    if (
      GPU_CONFIG.ENABLE_GPU_TIMING &&
      process.env.NODE_ENV === "development" &&
      typeof state.gl.getContext === "function" &&
      ShaderUtils.isWebGL2(state.gl.getContext())
    ) {
      ShaderProfiler.endTiming(
        state.gl.getContext() as WebGL2RenderingContext,
        "gpu-render",
      )
        .then((time) => {
          if (time > 16 && process.env.NODE_ENV === "development") {
            console.warn(
              `⚠️ GPU frame time: ${time.toFixed(2)}ms (target: <16ms)`,
            );
          }
        })
        .catch((error) => {
          // Silently handle WebGL timing errors in production
          if (process.env.NODE_ENV === "development") {
            console.warn("GPU timing failed:", error);
          }
        });
    }
  });

  // Enhanced performance monitoring with transparency optimization
  useEffect(() => {
    if (GPU_CONFIG.ENABLE_DEBUG_LOGGING) {
      const interval = setInterval(() => {
        const metrics = performanceMetrics.current;
        const memoryStats = gpuMemoryManager.getMemoryStats();
        const transparencyStats = transparencyOptimizer.getOptimizationStats();

        const floorVisibleCount = Array.from(blocks.values()).filter(
          (b) => b.position.y <= 0.5 && b.position.y >= -0.5,
        ).length;

        if (process.env.NODE_ENV === "development") {
          console.log("🚀 GPU Renderer Metrics:", {
            totalBlocks: metrics.totalInstances,
            visibleBlocks: metrics.visibleInstances,
            culledBlocks: metrics.culledInstances,
            floorBlocks: floorVisibleCount,
            drawCalls: metrics.drawCalls,
            averageFrameTime: `${metrics.averageFrameTime.toFixed(2)}ms`,
            cullingEfficiency: `${((metrics.culledInstances / Math.max(metrics.totalInstances, 1)) * 100).toFixed(1)}%`,
            cameraPosition: `(${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)})`,
            gpuOptimizations: {
              frustumCulling: GPU_CONFIG.FRUSTUM_CULLING,
              lodEnabled: true,
              instancedRendering: true,
              transparencyOptimized: GPU_CONFIG.TRANSPARENCY_OPTIMIZATION,
              advancedEffects: enableAdvancedEffects,
            },
          });
        }
      }, 30000); // Reduced to every 30 seconds to prevent spam

      return () => clearInterval(interval);
    }
  }, [performanceMode, enableAdvancedEffects]);

  return (
    <group ref={groupRef}>
      {/* Performance indicator for development */}
      {process.env.NODE_ENV === "development" && (
        <mesh position={[0, 20, 0]}>
          <boxGeometry args={[0.2, 0.2, 0.2]} />
          <meshBasicMaterial
            color={
              performanceMetrics.current.averageFrameTime < 8
                ? "#00ff00" // Excellent
                : performanceMetrics.current.averageFrameTime < 16
                  ? "#88ff00" // Good
                  : performanceMetrics.current.averageFrameTime < 33
                    ? "#ffff00" // Fair
                    : performanceMetrics.current.averageFrameTime < 50
                      ? "#ff8800" // Poor
                      : "#ff0000" // Critical
            }
            transparent={true}
            opacity={0.8}
          />
        </mesh>
      )}
    </group>
  );
}

// Export performance metrics for external monitoring
export const getPerformanceMetrics = () => {
  if (typeof window !== "undefined") {
    return (window as any).__PERFORMANCE_METRICS__;
  }
  return null;
};
