/* eslint-disable react-hooks/purity */
import React, { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { fbm } from '../Systems/Utilities';
import { createMaterials } from '../Systems/Materials';
import { useGameStore, Obstacle } from '@/store/gameStore';

export default function Terrain() {
    const addCollidableMesh = useGameStore((state) => state.addCollidableMesh);
    const removeCollidableMesh = useGameStore((state) => state.removeCollidableMesh);
    const addObstacles = useGameStore((state) => state.addObstacles);
    const removeObstacles = useGameStore((state) => state.removeObstacles);
    const terrainRef = useRef<THREE.Mesh>(null);

    const { terrainMat, rockMat, woodMat, leafMat } = useMemo(() => {
        const mats = createMaterials();
        return {
            terrainMat: mats.terrain,
            rockMat: mats.rock,
            woodMat: mats.wood,
            leafMat: mats.leaf
        };
    }, []);

    // --- Terrain Generation ---
    const { geometry } = useMemo(() => {
        const geo = new THREE.PlaneGeometry(500, 500, 128, 128);
        const posAttribute = geo.attributes.position;
        const vertex = new THREE.Vector3();

        for (let i = 0; i < posAttribute.count; i++) {
            vertex.fromBufferAttribute(posAttribute, i);
            const dist = Math.sqrt(vertex.x * vertex.x + vertex.y * vertex.y);

            const islandRadius = 220;
            const falloff = Math.max(0, islandRadius - dist) / islandRadius;
            const falloffCurve = falloff * falloff * (3 - 2 * falloff);

            const base = fbm(vertex.x, vertex.y) * 20;
            let height = base;

            if (dist < 60) {
                const flatFactor = 1.0 - (dist / 60);
                height = THREE.MathUtils.lerp(height, 3.0, flatFactor * 0.95);
            }

            height *= falloffCurve;

            if (height < 4.0 && height > 0.5) {
                height = THREE.MathUtils.lerp(height, 2.0, 0.6);
            }

            if (dist > islandRadius * 0.9) {
                height = THREE.MathUtils.lerp(height, -20, (dist - islandRadius * 0.9) / (islandRadius * 0.1));
            }

            posAttribute.setZ(i, height);
        }

        geo.computeVertexNormals();
        return { geometry: geo };
    }, []);

    // --- Rock Generation (Instanced) ---
    const rockInstances = useMemo(() => {
        const tempObj = new THREE.Object3D();
        const count = 60;
        const data: { matrix: THREE.Matrix4, radius: number }[] = [];

        // We need a temporary mesh to raycast against for placement
        const tempMesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
        tempMesh.rotation.x = -Math.PI / 2;
        tempMesh.updateMatrixWorld(true);
        const raycaster = new THREE.Raycaster();

        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * 400;
            const z = (Math.random() - 0.5) * 400;

            raycaster.set(new THREE.Vector3(x, 500, z), new THREE.Vector3(0, -1, 0));
            const hits = raycaster.intersectObject(tempMesh, false);

            if (hits.length > 0) {
                const hit = hits[0];
                const distFromCenter = Math.sqrt(x * x + z * z);

                if (distFromCenter > 65 && hit.point.y > 1) {
                    // Visual scale
                    const scaleX = 1 + Math.random() * 1.5; // Increased visual size slightly to be more visible
                    const scaleY = 0.7 + Math.random() * 0.5;
                    const scaleZ = 1 + Math.random() * 1.5;

                    tempObj.position.copy(hit.point).add(new THREE.Vector3(0, scaleY * 0.5, 0));
                    tempObj.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
                    tempObj.scale.set(scaleX, scaleY, scaleZ);
                    tempObj.updateMatrix();

                    // Collider radius should match visual size (approx average of X/Z scale)
                    // The base geometry is radius 1.
                    const colliderRadius = (scaleX + scaleZ) / 2 * 0.9; // 0.9 for slightly tighter fit

                    data.push({ matrix: tempObj.matrix.clone(), radius: colliderRadius });
                }
            }
        }
        return data;
    }, [geometry]);

    // --- Tree Generation (Instanced) ---
    const treeInstances = useMemo(() => {
        const trunkData: THREE.Matrix4[] = [];
        const leafData: THREE.Matrix4[] = [];
        const obstacles: Obstacle[] = [];
        const tempObj = new THREE.Object3D();

        const tempMesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
        tempMesh.rotation.x = -Math.PI / 2;
        tempMesh.updateMatrixWorld(true);
        const raycaster = new THREE.Raycaster();

        for (let c = 0; c < 15; c++) {
            const clusterX = (Math.random() - 0.5) * 350;
            const clusterZ = (Math.random() - 0.5) * 350;

            for (let i = 0; i < 10; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * 40;
                const x = clusterX + Math.cos(angle) * dist;
                const z = clusterZ + Math.sin(angle) * dist;

                raycaster.set(new THREE.Vector3(x, 150, z), new THREE.Vector3(0, -1, 0));
                const hits = raycaster.intersectObject(tempMesh, true);

                if (hits.length > 0 && hits[0].point.y > 3.0 && hits[0].point.y < 40) {
                    const pos = hits[0].point;
                    const scale = 1.2 + Math.random() * 0.8;

                    // Trunk segments
                    let height = 0;
                    const segments = 8;
                    let radius = 0.8;
                    const leanX = (Math.random() - 0.5) * 1.0;
                    const leanZ = (Math.random() - 0.5) * 1.0;

                    for (let s = 0; s < segments; s++) {
                        const h = 2.0;
                        // We can't easily instance the curved trunk perfectly with just one cylinder geometry unless we transform each segment
                        // But we can approximate.
                        // Actually, for instancing, it's better to instance the WHOLE trunk if it was a single mesh, but here it's segments.
                        // To keep it simple and performant, let's just instance the segments.

                        tempObj.position.set(pos.x, pos.y + height + h / 2, pos.z);
                        const t = s / segments;
                        tempObj.position.x += leanX * t * t * 2.0 * scale;
                        tempObj.position.z += leanZ * t * t * 2.0 * scale;
                        tempObj.rotation.set(-leanZ * t * 0.3, 0, leanX * t * 0.3);
                        tempObj.scale.set(radius * scale, 1 * scale, radius * scale); // Approximate radius scaling
                        tempObj.updateMatrix();
                        trunkData.push(tempObj.matrix.clone());

                        height += h * 0.9 * scale;
                        radius *= 0.88;
                    }

                    // Leaves
                    const topPos = new THREE.Vector3(
                        pos.x + leanX * 2.0 * scale,
                        pos.y + height,
                        pos.z + leanZ * 2.0 * scale
                    );

                    for (let l = 0; l < 15; l++) {
                        tempObj.position.copy(topPos);

                        // Randomized rotation for fuller look
                        const rotationY = (l / 15) * Math.PI * 2 + (Math.random() * 0.5);
                        tempObj.rotation.set(0, rotationY, 0);
                        tempObj.rotateX(-Math.PI / 2.5 + (Math.random() - 0.5) * 0.2); // Random droop
                        tempObj.translateY(4.5 * scale); // Offset from center

                        tempObj.scale.setScalar(scale);
                        tempObj.updateMatrix();
                        leafData.push(tempObj.matrix.clone());
                    }

                    obstacles.push({ position: pos, radius: 0.5 });
                }
            }
        }
        return { trunkData, leafData, obstacles };
    }, [geometry]);

    useEffect(() => {
        if (terrainRef.current) {
            addCollidableMesh(terrainRef.current);
            return () => {
                if (terrainRef.current) removeCollidableMesh(terrainRef.current.uuid);
            };
        }
    }, [addCollidableMesh, removeCollidableMesh]);

    useEffect(() => {
        const allObstacles = [
            ...rockInstances.map(r => ({ position: new THREE.Vector3().setFromMatrixPosition(r.matrix), radius: r.radius })),
            ...treeInstances.obstacles
        ];
        addObstacles(allObstacles);

        return () => {
            removeObstacles(allObstacles);
        };
    }, [rockInstances, treeInstances, addObstacles, removeObstacles]);

    return (
        <group>
            <mesh
                ref={terrainRef}
                geometry={geometry}
                material={terrainMat}
                rotation={[-Math.PI / 2, 0, 0]}
                receiveShadow
                castShadow
                name="Ground"
            />


            <RockInstances data={rockInstances} material={rockMat} />

            {/* Trees */}
            <TreeInstances trunkData={treeInstances.trunkData} leafData={treeInstances.leafData} woodMat={woodMat} leafMat={leafMat} />
        </group>
    );
}

function RockInstances({ data, material }: { data: { matrix: THREE.Matrix4 }[], material: THREE.Material }) {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    useEffect(() => {
        if (meshRef.current) {
            data.forEach((d, i) => {
                meshRef.current!.setMatrixAt(i, d.matrix);
            });
            meshRef.current.instanceMatrix.needsUpdate = true;
        }
    }, [data]);

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, data.length]} castShadow receiveShadow material={material}>
            <dodecahedronGeometry args={[1, 1]} />
        </instancedMesh>
    );
}

function TreeInstances({ trunkData, leafData, woodMat, leafMat }: { trunkData: THREE.Matrix4[], leafData: THREE.Matrix4[], woodMat: THREE.Material, leafMat: THREE.Material }) {
    const trunkRef = useRef<THREE.InstancedMesh>(null);
    const leafRef = useRef<THREE.InstancedMesh>(null);

    useEffect(() => {
        if (trunkRef.current) {
            trunkData.forEach((d, i) => trunkRef.current!.setMatrixAt(i, d));
            trunkRef.current.instanceMatrix.needsUpdate = true;
        }
        if (leafRef.current) {
            leafData.forEach((d, i) => leafRef.current!.setMatrixAt(i, d));
            leafRef.current.instanceMatrix.needsUpdate = true;
        }
    }, [trunkData, leafData]);

    // Trunk Geometry: Cylinder
    // Leaf Geometry: Plane with bending (we can't easily bend instanced planes differently, so we use a pre-bent geometry)
    const leafGeo = useMemo(() => {
        const geo = new THREE.PlaneGeometry(4.0, 9, 2, 4); // Increased width to 4.0
        const positions = geo.attributes.position;
        for (let v = 0; v < positions.count; v++) {
            const y = positions.getY(v);
            const x = positions.getX(v);
            const bend = Math.pow((y + 4.5) / 9, 1.8) * -5.0;
            positions.setZ(v, bend);
            positions.setX(v, x * (1 - (y + 4.5) / 10));
        }
        geo.computeVertexNormals();
        // Center offset handled in matrix generation or here?
        // Original: leafGeo.translate(0, 4.5, 0);
        geo.translate(0, 4.5, 0);
        return geo;
    }, []);

    return (
        <group>
            <instancedMesh ref={trunkRef} args={[undefined, undefined, trunkData.length]} castShadow receiveShadow material={woodMat}>
                <cylinderGeometry args={[0.8, 0.8, 2, 7]} />
            </instancedMesh>
            <instancedMesh ref={leafRef} args={[undefined, undefined, leafData.length]} castShadow material={leafMat}>
                <primitive object={leafGeo} attach="geometry" />
            </instancedMesh>
        </group>
    );
}
