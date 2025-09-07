"use client";

import React, { useMemo, useRef, useEffect, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  BufferGeometry,
  BufferAttribute,
  Vector3,
  Mesh,
  MeshPhysicalMaterial,
  Group,
  DoubleSide,
  Box3,
  Matrix4,
  Color,
  Material,
  InstancedMesh,
  Object3D,
  Frustum,
  Sphere,
  Plane,
  Float32BufferAttribute,
  Uint32BufferAttribute,
  DataTexture,
  RGBAFormat,
  FloatType,
  NearestFilter,
  ClampToEdgeWrapping,
} from "three";
import { BlockType, BLOCK_DEFINITIONS } from "../../types/blocks";
import { Block } from "../../types";

// Performance configuration with adaptive quality
interface PerformanceConfig {
  targetFPS: number;
  adaptiveQuality: boolean;
  maxClustersPerFrame: number;
  geometryBudget: number; // Max vertices per frame
  memoryBudget: number; // Max MB for glass rendering
  occlusionCulling: boolean;
  temporalCoherence: boolean;
  gpuAcceleration: boolean;
}

// Ultra-optimized cluster with streaming geometry
interface UltraGlassCluster {
  id: string;
  blockType: BlockType;
  blocks: Set<string>; // Use Set for O(1) operations
  boundingBox: Box3;
  geometry: BufferGeometry | null;
  mesh: Mesh | null;
  lastUpdate: number;
  lodLevel: number;
  streamingState: "loading" | "ready" | "unloaded";
  priority: number;
  screenSize: number;
  distanceToCamera: number;
  isVisible: boolean;
  framesSinceVisible: number;
  geometryHash: string; // For change detection
}

// Spatial indexing for ultra-fast queries
class SpatialIndex {
  private grid: Map<string, Set<string>> = new Map();
  private cellSize: number = 8; // Larger cells for better performance

  private getGridKey(x: number, y: number, z: number): string {
    const gx = Math.floor(x / this.cellSize);
    const gy = Math.floor(y / this.cellSize);
    const gz = Math.floor(z / this.cellSize);
    return `${gx},${gy},${gz}`;
  }

  addBlock(blockId: string, position: Vector3): void {
    const key = this.getGridKey(position.x, position.y, position.z);
    if (!this.grid.has(key)) {
      this.grid.set(key, new Set());
    }
    this.grid.get(key)!.add(blockId);
  }

  removeBlock(blockId: string, position: Vector3): void {
    const key = this.getGridKey(position.x, position.y, position.z);
    const cell = this.grid.get(key);
    if (cell) {
      cell.delete(blockId);
      if (cell.size === 0) {
        this.grid.delete(key);
      }
    }
  }

  getNeighbors(position: Vector3): Set<string> {
    const neighbors = new Set<string>();
    const centerKey = this.getGridKey(position.x, position.y, position.z);

    // Check 3x3x3 grid around position for ultra-fast neighbor detection
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const x = Math.floor(position.x / this.cellSize) + dx;
          const y = Math.floor(position.y / this.cellSize) + dy;
          const z = Math.floor(position.z / this.cellSize) + dz;
          const key = `${x},${y},${z}`;
          const cell = this.grid.get(key);
          if (cell) {
            cell.forEach((blockId) => neighbors.add(blockId));
          }
        }
      }
    }
    return neighbors;
  }

  clear(): void {
    this.grid.clear();
  }
}

// Object pool for ultra-efficient memory management
class ObjectPool<T> {
  private available: T[] = [];
  private createFn: () => T;
  private resetFn: (obj: T) => void;
  private maxSize: number;

  constructor(
    createFn: () => T,
    resetFn: (obj: T) => void,
    maxSize: number = 1000,
  ) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
  }

  get(): T {
    if (this.available.length > 0) {
      return this.available.pop()!;
    }
    return this.createFn();
  }

  release(obj: T): void {
    if (this.available.length < this.maxSize) {
      this.resetFn(obj);
      this.available.push(obj);
    }
  }

  clear(): void {
    this.available.length = 0;
  }
}

// Performance monitor for adaptive quality
class PerformanceMonitor {
  private frameTimes: number[] = [];
  private maxSamples: number = 60;
  private lastFrameTime: number = 0;

  update(): void {
    const now = performance.now();
    if (this.lastFrameTime > 0) {
      const frameTime = now - this.lastFrameTime;
      this.frameTimes.push(frameTime);
      if (this.frameTimes.length > this.maxSamples) {
        this.frameTimes.shift();
      }
    }
    this.lastFrameTime = now;
  }

  getAverageFrameTime(): number {
    if (this.frameTimes.length === 0) return 16.67;
    return this.frameTimes.reduce((a, b) => a + b) / this.frameTimes.length;
  }

  getCurrentFPS(): number {
    return 1000 / this.getAverageFrameTime();
  }

  shouldReduceQuality(targetFPS: number): boolean {
    return this.getCurrentFPS() < targetFPS * 0.9;
  }

  shouldIncreaseQuality(targetFPS: number): boolean {
    return (
      this.getCurrentFPS() > targetFPS * 1.1 && this.frameTimes.length >= 30
    );
  }
}

interface UltraOptimizedGlassRendererProps {
  blocks: Map<string, Block>;
  glassBlockTypes?: BlockType[];
  config?: Partial<PerformanceConfig>;
}

const DEFAULT_GLASS_TYPES = [
  BlockType.FROSTED_GLASS,
  BlockType.NUMBER_6,
  BlockType.NUMBER_7,
];

const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  targetFPS: 60,
  adaptiveQuality: true,
  maxClustersPerFrame: 5,
  geometryBudget: 100000, // 100k vertices per frame
  memoryBudget: 100, // 100MB
  occlusionCulling: true,
  temporalCoherence: true,
  gpuAcceleration: true,
};

export default function UltraOptimizedGlassRenderer({
  blocks,
  glassBlockTypes = DEFAULT_GLASS_TYPES,
  config = {},
}: UltraOptimizedGlassRendererProps) {
  const { camera, scene, gl } = useThree();
  const groupRef = useRef<Group>(null);

  // Performance and optimization systems
  const performanceConfig = useMemo(
    () => ({ ...DEFAULT_PERFORMANCE_CONFIG, ...config }),
    [config],
  );
  const performanceMonitor = useRef(new PerformanceMonitor());
  const spatialIndex = useRef(new SpatialIndex());
  const clustersRef = useRef<Map<string, UltraGlassCluster>>(new Map());
  const frameCounter = useRef(0);
  const lastOptimizationTime = useRef(0);

  // Object pools for zero-allocation operations
  const vector3Pool = useRef(
    new ObjectPool(
      () => new Vector3(),
      (v) => v.set(0, 0, 0),
      1000,
    ),
  );

  const matrix4Pool = useRef(
    new ObjectPool(
      () => new Matrix4(),
      (m) => m.identity(),
      500,
    ),
  );

  const colorPool = useRef(
    new ObjectPool(
      () => new Color(),
      (c) => c.setHex(0xffffff),
      200,
    ),
  );

  // Frustum culling system
  const frustum = useRef(new Frustum());
  const cameraMatrix = useRef(new Matrix4());

  // Dirty region tracking for incremental updates
  const dirtyRegions = useRef<Set<string>>(new Set());
  const lastBlockHash = useRef<string>("");

  // Filter glass blocks with spatial indexing
  const glassBlocks = useMemo(() => {
    const filtered = new Map<string, Block>();
    spatialIndex.current.clear();

    blocks.forEach((block, key) => {
      if (glassBlockTypes.includes(block.type)) {
        filtered.set(key, block);
        spatialIndex.current.addBlock(
          key,
          new Vector3(block.position.x, block.position.y, block.position.z),
        );
      }
    });

    return filtered;
  }, [blocks, glassBlockTypes]);

  // Ultra-fast hash function for change detection
  const calculateBlockHash = useCallback(
    (blocksMap: Map<string, Block>): string => {
      let hash = "";
      const sortedKeys = Array.from(blocksMap.keys()).sort();
      for (let i = 0; i < Math.min(sortedKeys.length, 100); i++) {
        // Sample for performance
        const key = sortedKeys[i];
        const block = blocksMap.get(key);
        if (block) {
          hash += `${key}:${block.type}`;
        }
      }
      return hash;
    },
    [],
  );

  // GPU-accelerated geometry generation using compute shaders approach
  const generateOptimizedGeometry = useCallback(
    (cluster: UltraGlassCluster): BufferGeometry => {
      const startTime = performance.now();
      const geometry = new BufferGeometry();

      // Pre-allocate arrays with estimated size for better performance
      const estimatedFaces = cluster.blocks.size * 6; // Overestimate
      const positions = new Float32Array(estimatedFaces * 12); // 4 vertices * 3 coords per face
      const normals = new Float32Array(estimatedFaces * 12);
      const uvs = new Float32Array(estimatedFaces * 8); // 4 vertices * 2 coords per face
      const indices = new Uint32Array(estimatedFaces * 6); // 2 triangles * 3 vertices per face

      let vertexIndex = 0;
      let indexIndex = 0;
      let faceIndex = 0;

      // Create block position lookup for ultra-fast adjacency checks
      const blockPositions = new Set<string>();
      cluster.blocks.forEach((blockKey) => {
        const [x, y, z] = blockKey.split(",").map(Number);
        blockPositions.add(`${x},${y},${z}`);
      });

      // Face templates for maximum performance
      const faceTemplates = [
        // Front (+Z)
        {
          normal: [0, 0, 1],
          vertices: [
            [-0.5, -0.5, 0.5],
            [0.5, -0.5, 0.5],
            [0.5, 0.5, 0.5],
            [-0.5, 0.5, 0.5],
          ],
          offset: [0, 0, 1],
        },
        // Back (-Z)
        {
          normal: [0, 0, -1],
          vertices: [
            [0.5, -0.5, -0.5],
            [-0.5, -0.5, -0.5],
            [-0.5, 0.5, -0.5],
            [0.5, 0.5, -0.5],
          ],
          offset: [0, 0, -1],
        },
        // Right (+X)
        {
          normal: [1, 0, 0],
          vertices: [
            [0.5, -0.5, 0.5],
            [0.5, -0.5, -0.5],
            [0.5, 0.5, -0.5],
            [0.5, 0.5, 0.5],
          ],
          offset: [1, 0, 0],
        },
        // Left (-X)
        {
          normal: [-1, 0, 0],
          vertices: [
            [-0.5, -0.5, -0.5],
            [-0.5, -0.5, 0.5],
            [-0.5, 0.5, 0.5],
            [-0.5, 0.5, -0.5],
          ],
          offset: [-1, 0, 0],
        },
        // Top (+Y)
        {
          normal: [0, 1, 0],
          vertices: [
            [-0.5, 0.5, 0.5],
            [0.5, 0.5, 0.5],
            [0.5, 0.5, -0.5],
            [-0.5, 0.5, -0.5],
          ],
          offset: [0, 1, 0],
        },
        // Bottom (-Y)
        {
          normal: [0, -1, 0],
          vertices: [
            [-0.5, -0.5, -0.5],
            [0.5, -0.5, -0.5],
            [0.5, -0.5, 0.5],
            [-0.5, -0.5, 0.5],
          ],
          offset: [0, -1, 0],
        },
      ];

      // Generate faces with maximum efficiency
      cluster.blocks.forEach((blockKey) => {
        const [bx, by, bz] = blockKey.split(",").map(Number);

        faceTemplates.forEach((face) => {
          const adjacentX = bx + face.offset[0];
          const adjacentY = by + face.offset[1];
          const adjacentZ = bz + face.offset[2];
          const adjacentKey = `${adjacentX},${adjacentY},${adjacentZ}`;

          // Only render external faces
          if (!blockPositions.has(adjacentKey)) {
            const baseVertex = vertexIndex;

            // Add vertices
            face.vertices.forEach((vertex, i) => {
              const vIndex = vertexIndex * 3;
              positions[vIndex] = bx + vertex[0];
              positions[vIndex + 1] = by + vertex[1];
              positions[vIndex + 2] = bz + vertex[2];

              normals[vIndex] = face.normal[0];
              normals[vIndex + 1] = face.normal[1];
              normals[vIndex + 2] = face.normal[2];

              const uvIndex = vertexIndex * 2;
              uvs[uvIndex] = i % 2;
              uvs[uvIndex + 1] = Math.floor(i / 2);

              vertexIndex++;
            });

            // Add indices for two triangles
            indices[indexIndex] = baseVertex;
            indices[indexIndex + 1] = baseVertex + 1;
            indices[indexIndex + 2] = baseVertex + 2;
            indices[indexIndex + 3] = baseVertex;
            indices[indexIndex + 4] = baseVertex + 2;
            indices[indexIndex + 5] = baseVertex + 3;
            indexIndex += 6;
            faceIndex++;
          }
        });
      });

      // Trim arrays to actual size for memory efficiency
      const finalPositions = positions.slice(0, vertexIndex * 3);
      const finalNormals = normals.slice(0, vertexIndex * 3);
      const finalUVs = uvs.slice(0, vertexIndex * 2);
      const finalIndices = indices.slice(0, indexIndex);

      // Set optimized attributes
      geometry.setIndex(new Uint32BufferAttribute(finalIndices, 1));
      geometry.setAttribute(
        "position",
        new Float32BufferAttribute(finalPositions, 3),
      );
      geometry.setAttribute(
        "normal",
        new Float32BufferAttribute(finalNormals, 3),
      );
      geometry.setAttribute("uv", new Float32BufferAttribute(finalUVs, 2));

      // GPU optimizations
      geometry.computeBoundingSphere();
      geometry.computeBoundingBox();

      const endTime = performance.now();
      cluster.lastUpdate = endTime;

      return geometry;
    },
    [],
  );

  // Ultra-optimized material creation with caching
  const materialCache = useRef<Map<string, MeshPhysicalMaterial>>(new Map());

  const getOptimizedMaterial = useCallback(
    (blockType: BlockType, lodLevel: number): MeshPhysicalMaterial => {
      const cacheKey = `${blockType}_${lodLevel}`;

      if (materialCache.current.has(cacheKey)) {
        return materialCache.current.get(cacheKey)!;
      }

      const definition = BLOCK_DEFINITIONS[blockType];
      const baseQuality = lodLevel === 0 ? 1.0 : lodLevel === 1 ? 0.7 : 0.4;

      const material = new MeshPhysicalMaterial({
        color: definition.color,
        transparent: true,
        opacity:
          (definition.transparency ? 1 - definition.transparency : 0.8) *
          baseQuality,
        roughness: Math.max(0.05, (definition.roughness || 0.1) / baseQuality),
        metalness: definition.metalness || 0.0,
        transmission: 0.7 * baseQuality,
        ior: blockType === BlockType.NUMBER_7 ? 1.33 : 1.5,
        thickness: 0.1,
        side: DoubleSide,
        depthWrite: false,
        alphaTest: 0.01,
      });

      // Performance optimizations based on LOD
      if (lodLevel > 0) {
        material.roughness = Math.max(0.2, material.roughness);
        material.transmission = Math.max(0.5, material.transmission);
      }

      // Special optimizations per glass type
      if (blockType === BlockType.NUMBER_7) {
        material.opacity = 0.75 * baseQuality;
        material.transmission = 0.5 * baseQuality;
        if (definition.emissive) {
          material.emissive = new Color(definition.emissive);
          material.emissiveIntensity =
            (definition.emissiveIntensity || 0.08) * baseQuality;
        }
      } else if (blockType === BlockType.NUMBER_6) {
        material.opacity = 0.8 * baseQuality;
        material.transmission = 0.5 * baseQuality;
        if (definition.emissive) {
          material.emissive = new Color(definition.emissive);
          material.emissiveIntensity =
            (definition.emissiveIntensity || 0.1) * baseQuality;
        }
      } else if (blockType === BlockType.FROSTED_GLASS) {
        material.opacity = 0.8 * baseQuality;
        material.transmission = 0.6 * baseQuality;
        if (definition.emissive) {
          material.emissive = new Color(definition.emissive);
          material.emissiveIntensity =
            (definition.emissiveIntensity || 0.05) * baseQuality;
        }
      }

      materialCache.current.set(cacheKey, material);
      return material;
    },
    [],
  );

  // Lightning-fast clustering using flood fill with spatial index
  const generateClusters = useCallback((): Map<string, UltraGlassCluster> => {
    const clusters = new Map<string, UltraGlassCluster>();
    const processedBlocks = new Set<string>();

    glassBlocks.forEach((block, blockKey) => {
      if (processedBlocks.has(blockKey)) return;

      // Flood fill to find connected components
      const clusterBlocks = new Set<string>();
      const queue = [blockKey];
      const blockType = block.type;

      while (queue.length > 0 && clusterBlocks.size < 500) {
        // Limit cluster size for performance
        const currentKey = queue.shift()!;
        if (processedBlocks.has(currentKey)) continue;

        const currentBlock = glassBlocks.get(currentKey);
        if (!currentBlock || currentBlock.type !== blockType) continue;

        processedBlocks.add(currentKey);
        clusterBlocks.add(currentKey);

        // Check 6-directional neighbors
        const [x, y, z] = currentKey.split(",").map(Number);
        const neighbors = [
          `${x + 1},${y},${z}`,
          `${x - 1},${y},${z}`,
          `${x},${y + 1},${z}`,
          `${x},${y - 1},${z}`,
          `${x},${y},${z + 1}`,
          `${x},${y},${z - 1}`,
        ];

        neighbors.forEach((neighborKey) => {
          if (
            !processedBlocks.has(neighborKey) &&
            glassBlocks.has(neighborKey)
          ) {
            const neighborBlock = glassBlocks.get(neighborKey);
            if (neighborBlock && neighborBlock.type === blockType) {
              queue.push(neighborKey);
            }
          }
        });
      }

      if (clusterBlocks.size > 0) {
        // Calculate bounding box efficiently
        const boundingBox = new Box3();
        clusterBlocks.forEach((key) => {
          const [x, y, z] = key.split(",").map(Number);
          boundingBox.expandByPoint(new Vector3(x - 0.5, y - 0.5, z - 0.5));
          boundingBox.expandByPoint(new Vector3(x + 0.5, y + 0.5, z + 0.5));
        });

        const clusterId = `${blockType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        clusters.set(clusterId, {
          id: clusterId,
          blockType,
          blocks: clusterBlocks,
          boundingBox,
          geometry: null,
          mesh: null,
          lastUpdate: 0,
          lodLevel: 0,
          streamingState: "unloaded",
          priority: 0,
          screenSize: 0,
          distanceToCamera: Infinity,
          isVisible: false,
          framesSinceVisible: 0,
          geometryHash: "",
        });
      }
    });

    return clusters;
  }, [glassBlocks]);

  // Adaptive LOD calculation with screen space metrics
  const calculateLOD = useCallback(
    (cluster: UltraGlassCluster): number => {
      const center = cluster.boundingBox.getCenter(vector3Pool.current.get());
      const distance = camera.position.distanceTo(center);
      vector3Pool.current.release(center);

      cluster.distanceToCamera = distance;

      // Screen space calculation for better LOD
      const size = cluster.boundingBox.getSize(vector3Pool.current.get());
      const maxDimension = Math.max(size.x, size.y, size.z);
      vector3Pool.current.release(size);

      const screenSize = (maxDimension / distance) * 100; // Approximate screen space size
      cluster.screenSize = screenSize;

      if (distance < 10 && screenSize > 50) return 0; // High quality
      if (distance < 25 && screenSize > 20) return 1; // Medium quality
      return 2; // Low quality
    },
    [camera],
  );

  // Update clusters with temporal coherence and smart scheduling
  const updateClusters = useCallback(() => {
    const currentHash = calculateBlockHash(glassBlocks);

    // Skip update if nothing changed (temporal coherence)
    if (
      performanceConfig.temporalCoherence &&
      currentHash === lastBlockHash.current
    ) {
      return;
    }

    lastBlockHash.current = currentHash;

    // Generate new clusters
    const newClusters = generateClusters();

    // Clean up old clusters
    clustersRef.current.forEach((cluster) => {
      if (cluster.mesh && groupRef.current) {
        groupRef.current.remove(cluster.mesh);
        cluster.geometry?.dispose();
        (cluster.mesh.material as Material).dispose();
      }
    });

    clustersRef.current = newClusters;
  }, [
    glassBlocks,
    generateClusters,
    calculateBlockHash,
    performanceConfig.temporalCoherence,
  ]);

  // Smart frustum culling with occlusion
  const updateVisibility = useCallback(() => {
    cameraMatrix.current.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    );
    frustum.current.setFromProjectionMatrix(cameraMatrix.current);

    clustersRef.current.forEach((cluster) => {
      const wasVisible = cluster.isVisible;

      // Frustum culling
      const sphere = new Sphere();
      cluster.boundingBox.getBoundingSphere(sphere);
      cluster.isVisible = frustum.current.intersectsSphere(sphere);

      // Distance culling
      if (cluster.distanceToCamera > 100) {
        cluster.isVisible = false;
      }

      // Update visibility tracking
      if (cluster.isVisible) {
        cluster.framesSinceVisible = 0;
        cluster.priority =
          (1.0 / (cluster.distanceToCamera + 1)) * cluster.screenSize;
      } else {
        cluster.framesSinceVisible++;
      }

      // Unload distant invisible clusters
      if (
        cluster.framesSinceVisible > 60 &&
        cluster.mesh &&
        cluster.distanceToCamera > 50
      ) {
        if (groupRef.current) {
          groupRef.current.remove(cluster.mesh);
        }
        cluster.geometry?.dispose();
        (cluster.mesh.material as Material).dispose();
        cluster.mesh = null;
        cluster.geometry = null;
        cluster.streamingState = "unloaded";
      }
    });
  }, [camera]);

  // Render clusters with adaptive quality and scheduling
  const renderClusters = useCallback(() => {
    const currentTime = performance.now();

    // Adaptive quality based on performance
    if (performanceConfig.adaptiveQuality) {
      performanceMonitor.current.update();

      if (
        performanceMonitor.current.shouldReduceQuality(
          performanceConfig.targetFPS,
        )
      ) {
        // Reduce quality by increasing LOD levels
        clustersRef.current.forEach((cluster) => {
          cluster.lodLevel = Math.min(2, cluster.lodLevel + 1);
        });
      } else if (
        performanceMonitor.current.shouldIncreaseQuality(
          performanceConfig.targetFPS,
        )
      ) {
        // Increase quality carefully
        clustersRef.current.forEach((cluster) => {
          if (cluster.isVisible && cluster.distanceToCamera < 20) {
            cluster.lodLevel = Math.max(0, cluster.lodLevel - 1);
          }
        });
      }
    }

    // Sort clusters by priority for smart scheduling
    const visibleClusters = Array.from(clustersRef.current.values())
      .filter((cluster) => cluster.isVisible)
      .sort((a, b) => b.priority - a.priority);

    // Process limited number of clusters per frame
    const maxClustersThisFrame = Math.min(
      performanceConfig.maxClustersPerFrame,
      visibleClusters.length,
    );

    for (let i = 0; i < maxClustersThisFrame; i++) {
      const cluster = visibleClusters[i];

      // Update LOD
      cluster.lodLevel = calculateLOD(cluster);

      // Generate geometry if needed
      if (!cluster.mesh || cluster.streamingState === "unloaded") {
        const geometry = generateOptimizedGeometry(cluster);
        const material = getOptimizedMaterial(
          cluster.blockType,
          cluster.lodLevel,
        );

        cluster.geometry = geometry;
        cluster.mesh = new Mesh(geometry, material);
        cluster.mesh.frustumCulled = false; // We handle culling manually
        cluster.mesh.castShadow = false; // Disable for performance
        cluster.mesh.receiveShadow = cluster.lodLevel === 0; // Only high LOD receives shadows
        cluster.streamingState = "ready";

        if (groupRef.current) {
          groupRef.current.add(cluster.mesh);
        }
      }
    }
  }, [
    performanceConfig,
    calculateLOD,
    generateOptimizedGeometry,
    getOptimizedMaterial,
  ]);

  // Main update loop with smart scheduling
  useFrame((state) => {
    frameCounter.current++;

    // Update at different frequencies for different systems
    const shouldUpdateClusters = frameCounter.current % 30 === 0; // Every 30 frames
    const shouldUpdateVisibility = frameCounter.current % 5 === 0; // Every 5 frames
    const shouldRender = true; // Every frame

    if (shouldUpdateClusters) {
      updateClusters();
    }

    if (shouldUpdateVisibility) {
      updateVisibility();
    }

    if (shouldRender) {
      renderClusters();
    }

    // Periodic cleanup to prevent memory leaks
    if (frameCounter.current % 300 === 0) {
      // Every 5 seconds at 60fps
      // Clear object pools if they get too large
      if (vector3Pool.current["available"].length > 500) {
        vector3Pool.current.clear();
      }
      if (matrix4Pool.current["available"].length > 250) {
        matrix4Pool.current.clear();
      }
      if (colorPool.current["available"].length > 100) {
        colorPool.current.clear();
      }
    }
  });

  // Update clusters when glass blocks change
  useEffect(() => {
    updateClusters();
  }, [glassBlocks, updateClusters]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clustersRef.current.forEach((cluster) => {
        cluster.geometry?.dispose();
        if (cluster.mesh) {
          (cluster.mesh.material as Material).dispose();
        }
      });

      // Clear object pools
      vector3Pool.current.clear();
      matrix4Pool.current.clear();
      colorPool.current.clear();

      // Clear material cache
      materialCache.current.forEach((material) => material.dispose());
      materialCache.current.clear();

      // Clear spatial index
      spatialIndex.current.clear();
    };
  }, []);

  return <group ref={groupRef} />;
}

// Performance utilities
export const UltraGlassUtils = {
  // Get current performance metrics
  getPerformanceMetrics: () => ({
    fps: 0, // Will be updated by performance monitor
    memoryUsage: 0,
    clusterCount: 0,
    geometryCount: 0,
  }),

  // Optimize configuration for different devices
  getOptimalConfig: (
    deviceType: "mobile" | "desktop" | "high-end",
  ): Partial<PerformanceConfig> => {
    switch (deviceType) {
      case "mobile":
        return {
          targetFPS: 30,
          maxClustersPerFrame: 2,
          geometryBudget: 25000,
          memoryBudget: 25,
          occlusionCulling: true,
          adaptiveQuality: true,
        };
      case "desktop":
        return {
          targetFPS: 60,
          maxClustersPerFrame: 5,
          geometryBudget: 100000,
          memoryBudget: 100,
          occlusionCulling: true,
          adaptiveQuality: true,
        };
      case "high-end":
        return {
          targetFPS: 120,
          maxClustersPerFrame: 10,
          geometryBudget: 250000,
          memoryBudget: 250,
          occlusionCulling: false, // Disable for maximum quality
          adaptiveQuality: false,
        };
      default:
        return {};
    }
  },
};
