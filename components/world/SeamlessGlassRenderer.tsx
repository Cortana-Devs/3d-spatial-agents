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
  FrontSide,
  BackSide,
  Box3,
  Sphere,
  Matrix4,
  Quaternion,
  Euler,
  Color,
  Material,
} from "three";
import { BlockType, BLOCK_DEFINITIONS } from "../../types/blocks";
import { Block } from "../../types";

interface GlassCluster {
  blockType: BlockType;
  blocks: Block[];
  boundingBox: Box3;
  geometry: BufferGeometry | null;
  mesh: Mesh | null;
}

interface SeamlessGlassRendererProps {
  blocks: Map<string, Block>;
  glassBlockTypes?: BlockType[];
  enableOptimization?: boolean;
  maxClusterSize?: number;
}

// Glass block types that should render seamlessly
const DEFAULT_GLASS_TYPES = [
  BlockType.FROSTED_GLASS,
  BlockType.NUMBER_6,
  BlockType.NUMBER_7,
];

export default function SeamlessGlassRenderer({
  blocks,
  glassBlockTypes = DEFAULT_GLASS_TYPES,
  enableOptimization = true,
  maxClusterSize = 1000,
}: SeamlessGlassRendererProps) {
  const { camera } = useThree();
  const groupRef = useRef<Group>(null);
  const clustersRef = useRef<Map<string, GlassCluster>>(new Map());

  // Filter glass blocks from all blocks
  const glassBlocks = useMemo(() => {
    const filtered = new Map<string, Block>();
    blocks.forEach((block, key) => {
      if (glassBlockTypes.includes(block.type)) {
        filtered.set(key, block);
      }
    });
    return filtered;
  }, [blocks, glassBlockTypes]);

  // Group adjacent glass blocks into clusters
  const createGlassClusters = useCallback(
    (glassBlocksMap: Map<string, Block>): Map<string, GlassCluster> => {
      const clusters = new Map<string, GlassCluster>();
      const processedBlocks = new Set<string>();

      // Helper function to get block key
      const getBlockKey = (x: number, y: number, z: number) =>
        `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;

      // Helper function to find adjacent blocks of same type
      const findAdjacentBlocks = (
        startBlock: Block,
        blockType: BlockType,
      ): Block[] => {
        const cluster: Block[] = [];
        const toProcess: Block[] = [startBlock];
        const visited = new Set<string>();

        while (toProcess.length > 0 && cluster.length < maxClusterSize) {
          const currentBlock = toProcess.pop()!;
          const currentKey = getBlockKey(
            currentBlock.position.x,
            currentBlock.position.y,
            currentBlock.position.z,
          );

          if (visited.has(currentKey)) continue;
          visited.add(currentKey);
          cluster.push(currentBlock);

          // Check 6 adjacent positions (up, down, north, south, east, west)
          const adjacentOffsets = [
            [1, 0, 0],
            [-1, 0, 0],
            [0, 1, 0],
            [0, -1, 0],
            [0, 0, 1],
            [0, 0, -1],
          ];

          adjacentOffsets.forEach(([dx, dy, dz]) => {
            const adjacentKey = getBlockKey(
              currentBlock.position.x + dx,
              currentBlock.position.y + dy,
              currentBlock.position.z + dz,
            );

            const adjacentBlock = glassBlocksMap.get(adjacentKey);
            if (
              adjacentBlock &&
              adjacentBlock.type === blockType &&
              !visited.has(adjacentKey)
            ) {
              toProcess.push(adjacentBlock);
            }
          });
        }

        return cluster;
      };

      // Process each glass block to create clusters
      glassBlocksMap.forEach((block, blockKey) => {
        if (processedBlocks.has(blockKey)) return;

        const clusterBlocks = findAdjacentBlocks(block, block.type);
        clusterBlocks.forEach((b) => {
          const key = getBlockKey(b.position.x, b.position.y, b.position.z);
          processedBlocks.add(key);
        });

        if (clusterBlocks.length > 0) {
          // Calculate bounding box for the cluster
          const boundingBox = new Box3();
          clusterBlocks.forEach((b) => {
            const pos = new Vector3(b.position.x, b.position.y, b.position.z);
            boundingBox.expandByPoint(pos.clone().addScalar(-0.5));
            boundingBox.expandByPoint(pos.clone().addScalar(0.5));
          });

          const clusterId = `${block.type}_${Date.now()}_${Math.random()}`;
          clusters.set(clusterId, {
            blockType: block.type,
            blocks: clusterBlocks,
            boundingBox,
            geometry: null,
            mesh: null,
          });
        }
      });

      return clusters;
    },
    [maxClusterSize],
  );

  // Create seamless geometry for a glass cluster
  const createSeamlessGeometry = useCallback(
    (cluster: GlassCluster): BufferGeometry => {
      const geometry = new BufferGeometry();
      const positions: number[] = [];
      const normals: number[] = [];
      const uvs: number[] = [];
      const indices: number[] = [];

      let vertexIndex = 0;
      const blockPositions = new Set<string>();

      // Create a map of block positions for quick lookup
      cluster.blocks.forEach((block) => {
        const key = `${block.position.x},${block.position.y},${block.position.z}`;
        blockPositions.add(key);
      });

      // Generate faces for each block, excluding internal faces
      cluster.blocks.forEach((block) => {
        const blockPos = new Vector3(
          block.position.x,
          block.position.y,
          block.position.z,
        );

        // Define the 6 faces of a cube
        const faces = [
          {
            // Front face (+Z)
            normal: [0, 0, 1],
            vertices: [
              [-0.5, -0.5, 0.5],
              [0.5, -0.5, 0.5],
              [0.5, 0.5, 0.5],
              [-0.5, 0.5, 0.5],
            ],
            checkPos: [blockPos.x, blockPos.y, blockPos.z + 1],
          },
          {
            // Back face (-Z)
            normal: [0, 0, -1],
            vertices: [
              [0.5, -0.5, -0.5],
              [-0.5, -0.5, -0.5],
              [-0.5, 0.5, -0.5],
              [0.5, 0.5, -0.5],
            ],
            checkPos: [blockPos.x, blockPos.y, blockPos.z - 1],
          },
          {
            // Right face (+X)
            normal: [1, 0, 0],
            vertices: [
              [0.5, -0.5, 0.5],
              [0.5, -0.5, -0.5],
              [0.5, 0.5, -0.5],
              [0.5, 0.5, 0.5],
            ],
            checkPos: [blockPos.x + 1, blockPos.y, blockPos.z],
          },
          {
            // Left face (-X)
            normal: [-1, 0, 0],
            vertices: [
              [-0.5, -0.5, -0.5],
              [-0.5, -0.5, 0.5],
              [-0.5, 0.5, 0.5],
              [-0.5, 0.5, -0.5],
            ],
            checkPos: [blockPos.x - 1, blockPos.y, blockPos.z],
          },
          {
            // Top face (+Y)
            normal: [0, 1, 0],
            vertices: [
              [-0.5, 0.5, 0.5],
              [0.5, 0.5, 0.5],
              [0.5, 0.5, -0.5],
              [-0.5, 0.5, -0.5],
            ],
            checkPos: [blockPos.x, blockPos.y + 1, blockPos.z],
          },
          {
            // Bottom face (-Y)
            normal: [0, -1, 0],
            vertices: [
              [-0.5, -0.5, -0.5],
              [0.5, -0.5, -0.5],
              [0.5, -0.5, 0.5],
              [-0.5, -0.5, 0.5],
            ],
            checkPos: [blockPos.x, blockPos.y - 1, blockPos.z],
          },
        ];

        // Only add faces that are exposed (not adjacent to another glass block of same type)
        faces.forEach((face) => {
          const adjacentKey = `${face.checkPos[0]},${face.checkPos[1]},${face.checkPos[2]}`;
          const hasAdjacentBlock = blockPositions.has(adjacentKey);

          if (!hasAdjacentBlock) {
            // Add this face to the geometry
            const startVertex = vertexIndex;

            face.vertices.forEach((vertex, i) => {
              positions.push(
                blockPos.x + vertex[0],
                blockPos.y + vertex[1],
                blockPos.z + vertex[2],
              );
              normals.push(face.normal[0], face.normal[1], face.normal[2]);
              uvs.push(i % 2, Math.floor(i / 2));
            });

            // Create triangular faces (two triangles per quad)
            indices.push(
              startVertex,
              startVertex + 1,
              startVertex + 2,
              startVertex,
              startVertex + 2,
              startVertex + 3,
            );

            vertexIndex += 4;
          }
        });
      });

      // Set geometry attributes
      geometry.setIndex(indices);
      geometry.setAttribute(
        "position",
        new BufferAttribute(new Float32Array(positions), 3),
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
    },
    [],
  );

  // Create material for glass type
  const createGlassMaterial = useCallback(
    (blockType: BlockType): MeshPhysicalMaterial => {
      const definition = BLOCK_DEFINITIONS[blockType];

      const material = new MeshPhysicalMaterial({
        color: definition.color,
        transparent: true,
        opacity: definition.transparency ? 1 - definition.transparency : 0.3,
        roughness: definition.roughness || 0.1,
        metalness: definition.metalness || 0.0,
        transmission: 0.9,
        ior: 1.5,
        thickness: 0.1,
        side: DoubleSide,
        depthWrite: false,
        alphaTest: 0.01,
      });

      // Special handling for different glass types
      if (blockType === BlockType.NUMBER_7) {
        // Ultra-light glass
        material.opacity = 0.15;
        material.roughness = 0.05;
        material.transmission = 0.95;
        material.ior = 1.33;
      } else if (blockType === BlockType.NUMBER_6) {
        // Sunset glass
        material.opacity = 0.4;
        material.roughness = 0.05;
        material.transmission = 0.8;
        material.ior = 1.5;
        if (definition.emissive) {
          material.emissive = new Color(definition.emissive);
          material.emissiveIntensity = definition.emissiveIntensity || 0.1;
        }
      }

      return material;
    },
    [],
  );

  // Update glass clusters when glass blocks change
  useEffect(() => {
    const newClusters = createGlassClusters(glassBlocks);

    // Clear old meshes
    clustersRef.current.forEach((cluster) => {
      if (cluster.mesh && groupRef.current) {
        groupRef.current.remove(cluster.mesh);
        cluster.geometry?.dispose();
        (cluster.mesh.material as Material).dispose();
      }
    });

    // Create new meshes
    newClusters.forEach((cluster, clusterId) => {
      if (cluster.blocks.length > 0) {
        const geometry = createSeamlessGeometry(cluster);
        const material = createGlassMaterial(cluster.blockType);
        const mesh = new Mesh(geometry, material);

        // Performance optimizations
        mesh.frustumCulled = true;
        mesh.castShadow = false;
        mesh.receiveShadow = true;

        // Add mesh to group
        if (groupRef.current) {
          groupRef.current.add(mesh);
        }

        cluster.geometry = geometry;
        cluster.mesh = mesh;
      }
    });

    clustersRef.current = newClusters;
  }, [
    glassBlocks,
    createGlassClusters,
    createSeamlessGeometry,
    createGlassMaterial,
  ]);

  // Optimize rendering performance
  useFrame((state) => {
    if (!enableOptimization) return;

    const cameraPosition = camera.position;
    const maxDistance = 100; // Maximum render distance for glass

    clustersRef.current.forEach((cluster) => {
      if (cluster.mesh) {
        // Distance-based visibility culling
        const distance = cameraPosition.distanceTo(
          cluster.boundingBox.getCenter(new Vector3()),
        );
        cluster.mesh.visible = distance < maxDistance;

        // LOD-based material optimization
        const material = cluster.mesh.material as MeshPhysicalMaterial;
        if (distance > 50) {
          // Far distance - reduce quality
          material.roughness = Math.max(0.2, material.roughness);
          material.transmission = Math.max(0.5, material.transmission);
        } else if (distance > 25) {
          // Medium distance - moderate quality
          material.roughness = Math.max(0.1, material.roughness);
          material.transmission = Math.max(0.7, material.transmission);
        }
        // Near distance - full quality (no changes needed)
      }
    });
  });

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clustersRef.current.forEach((cluster) => {
        cluster.geometry?.dispose();
        if (cluster.mesh) {
          (cluster.mesh.material as Material).dispose();
        }
      });
    };
  }, []);

  return <group ref={groupRef} />;
}

// Utility functions
export const GlassRenderingUtils = {
  // Check if a block type should render seamlessly
  isGlassType: (blockType: BlockType): boolean => {
    return DEFAULT_GLASS_TYPES.includes(blockType);
  },

  // Get optimized glass material
  createOptimizedGlassMaterial: (
    blockType: BlockType,
  ): MeshPhysicalMaterial => {
    const definition = BLOCK_DEFINITIONS[blockType];

    return new MeshPhysicalMaterial({
      color: definition.color,
      transparent: true,
      opacity: definition.transparency ? 1 - definition.transparency : 0.3,
      roughness: 0.05,
      metalness: 0.0,
      transmission: 0.9,
      ior: 1.5,
      thickness: 0.1,
      side: DoubleSide,
      depthWrite: false,
      alphaTest: 0.01,
    });
  },

  // Calculate cluster complexity for performance optimization
  calculateClusterComplexity: (blocks: Block[]): number => {
    return blocks.length * 6; // Max 6 faces per block
  },
};
