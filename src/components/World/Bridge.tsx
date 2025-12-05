import React, { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';
import { createMaterials } from '../Systems/Materials';

export default function Bridge() {
    const addCollidableMesh = useGameStore((state) => state.addCollidableMesh);
    const removeCollidableMesh = useGameStore((state) => state.removeCollidableMesh);
    const colliderRef = useRef<THREE.Mesh>(null);

    // Bridge Configuration
    const startPos = new THREE.Vector3(0, 5, -120); // Edge of island
    const endPos = new THREE.Vector3(0, 2, -300);   // Start of hub, slightly elevated
    const length = startPos.distanceTo(endPos);
    const width = 8;
    const segmentCount = 20;
    const segmentLength = length / segmentCount;

    const { materials } = useMemo(() => {
        const mats = createMaterials();
        return { materials: mats };
    }, []); ``

    // Generate Instanced Meshes for Bridge Parts
    const { floorMatrices, railingMatrices } = useMemo(() => {
        const floor: THREE.Matrix4[] = [];
        const railing: THREE.Matrix4[] = [];
        // const cable = []; // Unused for now

        const direction = new THREE.Vector3().subVectors(endPos, startPos).normalize();
        const angle = Math.atan2(direction.x, direction.z);
        const quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);

        for (let i = 0; i < segmentCount; i++) {
            const t = i / segmentCount;
            const pos = new THREE.Vector3().lerpVectors(startPos, endPos, t);

            // Floor Plate
            const matrix = new THREE.Matrix4();
            matrix.compose(pos, quaternion, new THREE.Vector3(1, 1, 1));
            floor.push(matrix);

            // Railings (Left and Right)
            const leftRailPos = pos.clone().add(new THREE.Vector3(-width / 2, 1.5, 0).applyQuaternion(quaternion));
            const rightRailPos = pos.clone().add(new THREE.Vector3(width / 2, 1.5, 0).applyQuaternion(quaternion));

            const leftMatrix = new THREE.Matrix4();
            leftMatrix.compose(leftRailPos, quaternion, new THREE.Vector3(1, 1, 1));
            railing.push(leftMatrix);

            const rightMatrix = new THREE.Matrix4();
            rightMatrix.compose(rightRailPos, quaternion, new THREE.Vector3(1, 1, 1));
            railing.push(rightMatrix);
        }

        return { floorMatrices: floor, railingMatrices: railing };
    }, [startPos, endPos, length, segmentCount, width]);

    // Register Collider
    useEffect(() => {
        if (colliderRef.current) {
            addCollidableMesh(colliderRef.current);
            return () => {
                if (colliderRef.current) removeCollidableMesh(colliderRef.current.uuid);
            };
        }
    }, [addCollidableMesh, removeCollidableMesh]);

    const floorRef = useRef<THREE.InstancedMesh>(null);
    const railingRef = useRef<THREE.InstancedMesh>(null);

    React.useLayoutEffect(() => {
        if (floorRef.current) {
            floorMatrices.forEach((matrix, i) => floorRef.current!.setMatrixAt(i, matrix));
            floorRef.current.instanceMatrix.needsUpdate = true;
        }
        if (railingRef.current) {
            railingMatrices.forEach((matrix, i) => railingRef.current!.setMatrixAt(i, matrix));
            railingRef.current.instanceMatrix.needsUpdate = true;
        }
    }, [floorMatrices, railingMatrices]);

    return (
        <group>
            {/* Visuals */}
            <instancedMesh ref={floorRef} args={[undefined, undefined, floorMatrices.length]} castShadow receiveShadow>
                <boxGeometry args={[width, 0.5, segmentLength]} />
                <primitive object={materials.metal} attach="material" />
            </instancedMesh>

            <instancedMesh ref={railingRef} args={[undefined, undefined, railingMatrices.length]} castShadow receiveShadow>
                <boxGeometry args={[0.5, 3, segmentLength]} />
                <primitive object={materials.metal} attach="material" />
            </instancedMesh>

            {/* Invisible Collider for Physics */}
            <mesh ref={colliderRef} visible={false} position={new THREE.Vector3().lerpVectors(startPos, endPos, 0.5)} rotation={new THREE.Euler(0, Math.atan2(endPos.x - startPos.x, endPos.z - startPos.z), 0)}>
                <boxGeometry args={[width, 1, length]} />
                <meshBasicMaterial color="red" wireframe />
            </mesh>
        </group>
    );
}
