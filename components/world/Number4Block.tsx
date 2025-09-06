import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  Block as BlockType,
  BLOCK_DEFINITIONS,
  BlockType as BlockTypeEnum,
} from "../../types/blocks";

interface Number4BlockProps {
  block: BlockType;
  onClick?: (block: BlockType) => void;
  onHover?: (block: BlockType) => void;
  selected?: boolean;
  animated?: boolean;
  scale?: number;
  glowIntensity?: number;
}

export const Number4Block: React.FC<Number4BlockProps> = ({
  block,
  onClick,
  onHover,
  selected = false,
  animated = true,
  scale = 1,
  glowIntensity = 1,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const number4GroupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);

  const blockDef = BLOCK_DEFINITIONS[BlockTypeEnum.NUMBER_4];

  // Floating animation
  useFrame((state) => {
    if (meshRef.current && animated) {
      const time = state.clock.elapsedTime;
      meshRef.current.position.y = block.position.y + Math.sin(time * 2) * 0.1;
      meshRef.current.rotation.y += 0.01;
    }

    // Animate the number 4 display
    if (number4GroupRef.current && animated) {
      number4GroupRef.current.rotation.z =
        Math.sin(state.clock.elapsedTime * 1.5) * 0.1;
    }

    // Animate glow effect
    if (glowRef.current) {
      const intensity = 0.5 + Math.sin(state.clock.elapsedTime * 4) * 0.3;
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity =
        intensity * 0.2 * glowIntensity;
    }

    // Animate particles
    if (particlesRef.current) {
      particlesRef.current.rotation.y += 0.005;
    }
  });

  // Main block material with golden glow
  const blockMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: block.color || blockDef.color,
      roughness: blockDef.roughness,
      metalness: blockDef.metalness,
      emissive: new THREE.Color(blockDef.emissive!),
      emissiveIntensity:
        (blockDef.emissiveIntensity || 0.3) *
        (block.metadata.glow || 1) *
        glowIntensity,
    });
  }, [block.color, blockDef, block.metadata.glow, glowIntensity]);

  // Number 4 material with bright glow
  const numberMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: "#ffffff",
      emissive: "#ffffff",
      emissiveIntensity: 0.8 * glowIntensity,
      transparent: true,
      opacity: 0.9,
    });
  }, [glowIntensity]);

  // Glow halo material
  const glowMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: "#FFD54F",
      transparent: true,
      opacity: 0.15 * glowIntensity,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
  }, [glowIntensity]);

  // Selection outline material
  const outlineMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: "#ff9800",
      transparent: true,
      opacity: 0.5,
      side: THREE.BackSide,
    });
  }, []);

  // Create particle system for magical effect
  const particles = useMemo(() => {
    const particleCount = 50;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      // Position particles around the block
      const radius = 0.8 + Math.random() * 0.4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      // Golden particle colors
      colors[i * 3] = 1.0; // R
      colors[i * 3 + 1] = 0.84; // G
      colors[i * 3 + 2] = 0.31; // B
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.05,
      transparent: true,
      opacity: 0.7 * glowIntensity,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      sizeAttenuation: true,
    });

    return { geometry, material };
  }, [glowIntensity]);

  // Create the number "4" geometry
  const createNumber4Geometry = () => {
    return (
      <>
        {/* Left vertical line */}
        <mesh position={[-0.15, 0.1, 0]} material={numberMaterial}>
          <boxGeometry args={[0.08, 0.4, 0.08]} />
        </mesh>

        {/* Horizontal crossbar */}
        <mesh position={[0, 0, 0]} material={numberMaterial}>
          <boxGeometry args={[0.3, 0.08, 0.08]} />
        </mesh>

        {/* Right vertical line (bottom part only) */}
        <mesh position={[0.15, -0.08, 0]} material={numberMaterial}>
          <boxGeometry args={[0.08, 0.24, 0.08]} />
        </mesh>
      </>
    );
  };

  return (
    <group
      position={[block.position.x, block.position.y, block.position.z]}
      scale={scale}
    >
      {/* Main block body */}
      <mesh
        ref={meshRef}
        geometry={new THREE.BoxGeometry(1, 1, 1)}
        material={blockMaterial}
        onClick={() => onClick?.(block)}
        onPointerOver={() => onHover?.(block)}
        userData={{ blockId: block.id, blockType: block.type }}
        castShadow
        receiveShadow
      />

      {/* Glow halo effect */}
      <mesh
        ref={glowRef}
        geometry={new THREE.BoxGeometry(1, 1, 1)}
        material={glowMaterial}
        scale={1.2}
      />

      {/* Selection outline */}
      {selected && (
        <mesh
          geometry={new THREE.BoxGeometry(1, 1, 1)}
          material={outlineMaterial}
          scale={1.3}
        />
      )}

      {/* Number 4 display on front face */}
      <group ref={number4GroupRef} position={[0, 0, 0.51]}>
        {createNumber4Geometry()}
      </group>

      {/* Number 4 display on back face */}
      <group position={[0, 0, -0.51]} rotation={[0, Math.PI, 0]}>
        {createNumber4Geometry()}
      </group>

      {/* Number 4 display on left face */}
      <group position={[-0.51, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        {createNumber4Geometry()}
      </group>

      {/* Number 4 display on right face */}
      <group position={[0.51, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        {createNumber4Geometry()}
      </group>

      {/* Magical particle effect */}
      {particles && (
        <points
          ref={particlesRef}
          geometry={particles.geometry}
          material={particles.material}
        />
      )}

      {/* Point light for illumination */}
      <pointLight
        intensity={0.5 * glowIntensity}
        color="#FFD54F"
        distance={4}
        position={[0, 0, 0]}
      />

      {/* Spotlight for dramatic effect */}
      <spotLight
        intensity={0.3 * glowIntensity}
        color="#FFF176"
        distance={6}
        angle={Math.PI / 4}
        penumbra={0.5}
        position={[0, 2, 0]}
        target-position={[block.position.x, block.position.y, block.position.z]}
        castShadow
      />
    </group>
  );
};

export default Number4Block;
