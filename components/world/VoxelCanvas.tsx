'use client';

import React, { useRef, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { Vector3, Vector2, Plane, Mesh } from 'three';
import { useWorldStore } from '../../store/worldStore';
import { BlockType } from '../../types';

// VoxelBlock component for rendering individual blocks
interface VoxelBlockProps {
    position: [number, number, number];
    type: BlockType;
    color: string;
    onSelect?: (position: Vector3) => void;
}

function VoxelBlock({ position, type, color, onSelect }: VoxelBlockProps) {
    const meshRef = useRef<Mesh>(null);
    const [hovered, setHovered] = useState(false);

    const handleClick = useCallback((event: React.MouseEvent) => {
        event.stopPropagation();
        if (onSelect) {
            onSelect(new Vector3(...position));
        }
    }, [position, onSelect]);

    useFrame((state) => {
        if (meshRef.current && hovered) {
            // Subtle glow animation when hovered
            meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 4) * 0.02);
        } else if (meshRef.current) {
            meshRef.current.scale.setScalar(1);
        }
    });

    return (
        <mesh
            ref={meshRef}
            position={position}
            onClick={handleClick}
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
        >
            <boxGeometry args={[0.98, 0.98, 0.98]} />
            <meshStandardMaterial
                color={hovered ? '#ffffff' : color}
                roughness={type === 'stone' ? 0.8 : type === 'leaf' ? 0.9 : 0.7}
                metalness={type === 'stone' ? 0.1 : 0}
                transparent={type === 'leaf'}
                opacity={type === 'leaf' ? 0.9 : 1}
                emissive={hovered ? color : type === 'leaf' ? '#2E7D32' : '#000000'}
                emissiveIntensity={hovered ? 0.2 : type === 'leaf' ? 0.1 : 0}
            />
        </mesh>
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
            meshRef.current.position.y = (position?.[1] || 0) + Math.sin(state.clock.elapsedTime * 2) * 0.05;
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
                roughness={type === 'stone' ? 0.8 : type === 'leaf' ? 0.9 : 0.7}
                metalness={type === 'stone' ? 0.1 : 0}
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
            {/* Ambient light for overall illumination */}
            <ambientLight intensity={0.4} color="#f0f0f0" />

            {/* Main directional light (sun) */}
            <directionalLight
                position={[10, 10, 5]}
                intensity={1}
                color="#ffffff"
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
                shadow-camera-far={50}
                shadow-camera-left={-20}
                shadow-camera-right={20}
                shadow-camera-top={20}
                shadow-camera-bottom={-20}
            />

            {/* Fill light for softer shadows */}
            <directionalLight
                position={[-5, 5, -5]}
                intensity={0.3}
                color="#4CAF50"
            />

            {/* Accent light with Axiom glow colors */}
            <pointLight
                position={[0, 5, 0]}
                intensity={0.5}
                color="#00D4FF"
                distance={20}
                decay={2}
            />
        </>
    );
}

// Click handler for placing blocks
function ClickHandler() {
    const { camera, raycaster } = useThree();
    const { addBlock, removeBlock, selectedBlockType, blockMap, worldLimits } = useWorldStore();
    const [ghostPosition, setGhostPosition] = useState<[number, number, number] | null>(null);

    const handleClick = useCallback((event: MouseEvent) => {
        // Update raycaster
        const mouse = new Vector2(
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
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
                Math.round(intersectionPoint.z)
            );

            // Check if we can place a block here
            const positionKey = `${snappedPosition.x},${snappedPosition.y},${snappedPosition.z}`;
            const hasExistingBlock = blockMap.has(positionKey);
            const atLimit = blockMap.size >= worldLimits.maxBlocks;

            if (!hasExistingBlock && !atLimit) {
                addBlock(snappedPosition, selectedBlockType, 'human');
            }
        }
    }, [camera, raycaster, addBlock, selectedBlockType, blockMap, worldLimits]);

    const handleMouseMove = useCallback((event: MouseEvent) => {
        // Update raycaster for ghost preview
        const mouse = new Vector2(
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
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
                Math.round(intersectionPoint.z)
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
    }, [camera, raycaster, blockMap]);

    // Handle right-click for block removal
    const handleRightClick = useCallback((event: MouseEvent) => {
        event.preventDefault();

        // Update raycaster
        const mouse = new Vector2(
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
        );

        raycaster.setFromCamera(mouse, camera);

        // Raycast against existing blocks
        const blocks = Array.from(blockMap.values());
        const intersections: any[] = [];

        // Simple intersection test with block positions
        blocks.forEach(block => {
            const blockPosition = new Vector3(block.position.x, block.position.y, block.position.z);
            const distance = raycaster.ray.distanceToPoint(blockPosition);
            if (distance < 0.7) { // Within block bounds
                intersections.push({ block, distance });
            }
        });

        // Remove the closest block
        if (intersections.length > 0) {
            intersections.sort((a, b) => a.distance - b.distance);
            const closestBlock = intersections[0].block;
            const blockPosition = new Vector3(closestBlock.position.x, closestBlock.position.y, closestBlock.position.z);
            removeBlock(blockPosition, 'human');
        }
    }, [camera, raycaster, blockMap, removeBlock]);

    // Add event listeners
    React.useEffect(() => {
        const canvas = document.querySelector('canvas');
        if (canvas) {
            canvas.addEventListener('click', handleClick);
            canvas.addEventListener('contextmenu', handleRightClick);
            canvas.addEventListener('mousemove', handleMouseMove);

            return () => {
                canvas.removeEventListener('click', handleClick);
                canvas.removeEventListener('contextmenu', handleRightClick);
                canvas.removeEventListener('mousemove', handleMouseMove);
            };
        }
    }, [handleClick, handleRightClick, handleMouseMove]);

    // Get block definition for ghost preview
    const blockDefinitions = {
        stone: { color: '#666666' },
        leaf: { color: '#4CAF50' },
        wood: { color: '#8D6E63' }
    };

    return (
        <GhostBlock
            position={ghostPosition}
            type={selectedBlockType}
            color={blockDefinitions[selectedBlockType].color}
        />
    );
}

// Main scene content
function SceneContent() {
    const { blockMap } = useWorldStore();
    const blocks = Array.from(blockMap.values());

    return (
        <>
            <SceneLighting />

            {/* Render all blocks */}
            {blocks.map((block) => (
                <VoxelBlock
                    key={block.id}
                    position={[block.position.x, block.position.y, block.position.z]}
                    type={block.type}
                    color={block.color}
                />
            ))}

            {/* Grid helper */}
            <Grid
                args={[20, 20]}
                position={[0, -0.01, 0]}
                cellSize={1}
                cellThickness={0.5}
                cellColor="#666666"
                sectionSize={5}
                sectionThickness={1}
                sectionColor="#888888"
                fadeDistance={30}
                fadeStrength={1}
                infiniteGrid
            />

            {/* Click handler and ghost preview */}
            <ClickHandler />
        </>
    );
}

// Main VoxelCanvas component
interface VoxelCanvasProps {
    className?: string;
}

export default function VoxelCanvas({ className = '' }: VoxelCanvasProps) {
    return (
        <div className={`w-full h-full ${className}`}>
            <Canvas
                shadows
                camera={{
                    position: [10, 10, 10],
                    fov: 60,
                    near: 0.1,
                    far: 1000
                }}
                gl={{
                    antialias: true,
                    alpha: false,
                    powerPreference: 'high-performance',
                    stencil: false,
                    depth: true
                }}
                dpr={[1, 2]} // Responsive pixel ratio
                performance={{
                    min: 0.5,
                    max: 1,
                    debounce: 200
                }}
            >
                {/* Orbit controls with smooth damping */}
                <OrbitControls
                    enablePan={true}
                    enableZoom={true}
                    enableRotate={true}
                    dampingFactor={0.05}
                    enableDamping={true}
                    rotateSpeed={0.5}
                    zoomSpeed={0.8}
                    panSpeed={0.8}
                    maxPolarAngle={Math.PI * 0.75} // Prevent camera from going below ground
                    minDistance={3}
                    maxDistance={50}
                    target={[0, 0, 0]}
                />

                <SceneContent />
            </Canvas>
        </div>
    );
}