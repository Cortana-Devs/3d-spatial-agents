"use client";

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Mesh,
  PlaneGeometry,
  MeshStandardMaterial,
  RepeatWrapping,
  TextureLoader,
  DoubleSide,
  Vector3,
} from "three";
import { useWorldStore } from "../../store/worldStore";
import { BlockType, BLOCK_DEFINITIONS } from "../../types/blocks";

interface FloorBlockProps {
  size?: number; // Size of the floor in grid units
  position?: Vector3; // Center position of the floor
  blockType?: BlockType;
  textureRepeat?: number; // How many times to repeat the texture
  onInteract?: (position: Vector3) => void;
}

export default function FloorBlock({
  size = 50,
  position = new Vector3(0, 0, 0),
  blockType = BlockType.FLOOR,
  textureRepeat = size / 2,
  onInteract,
}: FloorBlockProps) {
  const meshRef = useRef<Mesh>(null);
  const { gridConfig } = useWorldStore();

  // Get block definition
  const blockDef = BLOCK_DEFINITIONS[blockType];

  // Create geometry based on grid size
  const geometry = useMemo(() => {
    const actualSize = size * gridConfig.cellSize;
    return new PlaneGeometry(actualSize, actualSize, 1, 1);
  }, [size, gridConfig.cellSize]);

  // Create material with texture support
  const material = useMemo(() => {
    const mat = new MeshStandardMaterial({
      color: blockDef.color,
      roughness: blockDef.roughness,
      metalness: blockDef.metalness,
      transparent:
        blockDef.transparency !== undefined && blockDef.transparency > 0,
      opacity:
        blockDef.transparency !== undefined ? 1 - blockDef.transparency : 1,
      side: DoubleSide,
    });

    // Load texture if available
    if (blockDef.textureUrl) {
      const textureLoader = new TextureLoader();
      textureLoader.load(
        blockDef.textureUrl,
        (texture) => {
          texture.wrapS = RepeatWrapping;
          texture.wrapT = RepeatWrapping;
          texture.repeat.set(textureRepeat, textureRepeat);
          mat.map = texture;
          mat.needsUpdate = true;
        },
        undefined,
        (error) => {
          console.warn(
            `Failed to load texture for floor block: ${blockDef.textureUrl}`,
            error,
          );
        },
      );
    }

    // Add emissive properties if block is glowable
    if (blockDef.glowable && blockDef.emissive) {
      mat.emissive.setStyle(blockDef.emissive);
      mat.emissiveIntensity = blockDef.emissiveIntensity || 0.1;
    }

    return mat;
  }, [blockDef, textureRepeat]);

  // Handle click interactions
  const handleClick = (event: any) => {
    event.stopPropagation();
    if (onInteract) {
      // Convert click position to world coordinates
      const intersectionPoint = event.point;
      onInteract(intersectionPoint);
    }
  };

  // Optional subtle animation for glowing floors
  useFrame((state) => {
    if (meshRef.current && blockDef.glowable) {
      const material = meshRef.current.material as MeshStandardMaterial;
      if (material.emissiveIntensity !== undefined) {
        // Gentle pulsing glow
        const baseIntensity = blockDef.emissiveIntensity || 0.1;
        material.emissiveIntensity =
          baseIntensity + Math.sin(state.clock.elapsedTime * 2) * 0.02;
      }
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      position={[position.x, position.y, position.z]}
      rotation={[-Math.PI / 2, 0, 0]} // Rotate to be horizontal
      onClick={handleClick}
      userData={{
        blockType: blockType,
        isFloor: true,
        id: `floor_${blockType}_${position.x}_${position.z}`,
      }}
      receiveShadow
    />
  );
}

// Utility component for creating a multi-block floor pattern
interface FloorPatternProps {
  gridSize: number;
  pattern: BlockType[];
  centerPosition?: Vector3;
  onInteract?: (position: Vector3) => void;
}

export function FloorPattern({
  gridSize,
  pattern,
  centerPosition = new Vector3(0, -0.5, 0),
  onInteract,
}: FloorPatternProps) {
  const { gridConfig } = useWorldStore();

  const floorBlocks = useMemo(() => {
    const blocks = [];
    const patternSize = Math.sqrt(pattern.length);
    const halfSize = Math.floor(patternSize / 2);

    for (let i = 0; i < pattern.length; i++) {
      const x = (i % patternSize) - halfSize;
      const z = Math.floor(i / patternSize) - halfSize;

      const position = new Vector3(
        centerPosition.x + x * gridConfig.cellSize,
        centerPosition.y,
        centerPosition.z + z * gridConfig.cellSize,
      );

      blocks.push({
        blockType: pattern[i],
        position,
        key: `floor_${i}_${x}_${z}`,
      });
    }

    return blocks;
  }, [pattern, centerPosition, gridConfig.cellSize]);

  return (
    <group>
      {floorBlocks.map(({ blockType, position, key }) => (
        <FloorBlock
          key={key}
          size={1}
          position={position}
          blockType={blockType}
          textureRepeat={1}
          onInteract={onInteract}
        />
      ))}
    </group>
  );
}

// Preset floor configurations
export const FLOOR_PRESETS = {
  STONE_FLOOR: {
    blockType: BlockType.STONE,
    size: 50,
    textureRepeat: 25,
  },
  WOOD_FLOOR: {
    blockType: BlockType.WOOD,
    size: 50,
    textureRepeat: 25,
  },
  GLASS_FLOOR: {
    blockType: BlockType.FROSTED_GLASS,
    size: 50,
    textureRepeat: 10,
  },
  MIXED_PATTERN: {
    pattern: [
      BlockType.STONE,
      BlockType.WOOD,
      BlockType.STONE,
      BlockType.WOOD,
      BlockType.WOOD,
      BlockType.STONE,
      BlockType.WOOD,
      BlockType.STONE,
      BlockType.STONE,
      BlockType.WOOD,
      BlockType.STONE,
      BlockType.WOOD,
      BlockType.WOOD,
      BlockType.STONE,
      BlockType.WOOD,
      BlockType.STONE,
    ],
    gridSize: 4,
  },
} as const;
