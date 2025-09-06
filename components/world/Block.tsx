import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  Block as BlockType,
  BlockType as BlockTypeEnum,
  BLOCK_DEFINITIONS,
} from "../../types/blocks";

interface BlockProps {
  block: BlockType;
  onClick?: (block: BlockType) => void;
  onHover?: (block: BlockType) => void;
  selected?: boolean;
  animated?: boolean;
  scale?: number;
}

export const Block: React.FC<BlockProps> = ({
  block,
  onClick,
  onHover,
  selected = false,
  animated = false,
  scale = 1,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const blockDef = BLOCK_DEFINITIONS[block.type as BlockTypeEnum];

  // Animation for special blocks
  useFrame((state) => {
    if (meshRef.current && animated) {
      meshRef.current.rotation.y += 0.01;
      meshRef.current.position.y =
        block.position.y + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  // Create material based on block definition
  const material = useMemo(() => {
    const materialProps: any = {
      color: block.color || blockDef.color,
      roughness: blockDef.roughness,
      metalness: blockDef.metalness,
    };

    // Add transparency for glass blocks
    if (blockDef.transparency) {
      materialProps.transparent = true;
      materialProps.opacity = 1 - blockDef.transparency;
      materialProps.transmission = blockDef.transparency;
    }

    // Add emissive properties for glowing blocks
    if (blockDef.emissive && block.metadata.glow) {
      materialProps.emissive = new THREE.Color(blockDef.emissive);
      materialProps.emissiveIntensity =
        (blockDef.emissiveIntensity || 0.1) * block.metadata.glow;
    }

    return new THREE.MeshStandardMaterial(materialProps);
  }, [block.color, blockDef, block.metadata.glow]);

  // Create geometry based on block type
  const geometry = useMemo(() => {
    switch (block.type) {
      case BlockTypeEnum.FROSTED_GLASS:
        return new THREE.BoxGeometry(0.95, 0.95, 0.95); // Slightly smaller for glass effect
      case BlockTypeEnum.NUMBER_4:
        return new THREE.BoxGeometry(1, 1, 1);
      default:
        return new THREE.BoxGeometry(1, 1, 1);
    }
  }, [block.type]);

  // Selection outline
  const outlineMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: "#ffff00",
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide,
    });
  }, []);

  return (
    <group
      position={[block.position.x, block.position.y, block.position.z]}
      scale={scale}
    >
      {/* Main block */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        onClick={() => onClick?.(block)}
        onPointerOver={() => onHover?.(block)}
        userData={{ blockId: block.id, blockType: block.type }}
      />

      {/* Selection outline */}
      {selected && (
        <mesh geometry={geometry} material={outlineMaterial} scale={1.05} />
      )}

      {/* Special content for Number 4 block */}
      {block.type === BlockTypeEnum.NUMBER_4 && (
        <Number4Content position={[0, 0, 0.51]} />
      )}

      {/* Special effects for frosted glass */}
      {block.type === BlockTypeEnum.FROSTED_GLASS && <FrostedGlassEffects />}
    </group>
  );
};

// Component for rendering the number 4 on the block face
const Number4Content: React.FC<{ position: [number, number, number] }> = ({
  position,
}) => {
  const textGeometry = useMemo(() => {
    // Create a simple 4 shape using box geometries
    return new THREE.BoxGeometry(0.1, 0.6, 0.02);
  }, []);

  const textMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: "#ffffff",
      emissive: "#ffffff",
      emissiveIntensity: 0.5,
    });
  }, []);

  return (
    <group position={position}>
      {/* Vertical line of 4 */}
      <mesh
        position={[-0.1, 0.1, 0]}
        geometry={textGeometry}
        material={textMaterial}
      />
      {/* Horizontal line of 4 */}
      <mesh
        position={[0, 0, 0]}
        geometry={new THREE.BoxGeometry(0.4, 0.1, 0.02)}
        material={textMaterial}
      />
      {/* Right vertical line of 4 */}
      <mesh
        position={[0.1, -0.1, 0]}
        geometry={new THREE.BoxGeometry(0.1, 0.4, 0.02)}
        material={textMaterial}
      />
    </group>
  );
};

// Component for frosted glass visual effects
const FrostedGlassEffects: React.FC = () => {
  const particlesRef = useRef<THREE.Points>(null);

  // Create frosting particle effect
  const particles = useMemo(() => {
    const particleCount = 100;
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 0.9;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.9;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.9;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: "#ffffff",
      size: 0.01,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
    });

    return { geometry, material };
  }, []);

  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y += 0.001;
      particlesRef.current.rotation.x += 0.0005;
    }
  });

  return (
    <points
      ref={particlesRef}
      geometry={particles.geometry}
      material={particles.material}
    />
  );
};

export default Block;
