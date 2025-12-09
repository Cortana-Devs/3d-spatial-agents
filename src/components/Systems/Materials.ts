import * as THREE from 'three';
import { TextureGenerator } from './TextureGenerator';

// We can't create materials globally because they might need textures that are generated
// or need to be disposed. But we can have a factory or a hook.

export const createMaterials = () => {
    const metalTex = TextureGenerator.generateTexture('metal');
    const sandDiffuse = TextureGenerator.generateTexture('sand');
    const rockDiffuse = TextureGenerator.generateTexture('rock');
    const woodTex = TextureGenerator.generateTexture('wood');
    const concreteTex = TextureGenerator.generateTexture('concrete');
    const fabricTex = TextureGenerator.generateTexture('fabric');

    return {
        robotBody: new THREE.MeshStandardMaterial({
            map: metalTex,
            color: 0x888899,
            roughness: 0.4,
            metalness: 0.8,
            bumpMap: metalTex,
            bumpScale: 0.05
        }),
        robotJoint: new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.7,
            metalness: 0.5
        }),
        robotGlow: new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 3
        }),
        terrain: new THREE.MeshStandardMaterial({
            map: sandDiffuse,
            roughness: 0.9,
            metalness: 0.0,
            bumpMap: sandDiffuse,
            bumpScale: 0.2
        }),
        rock: new THREE.MeshStandardMaterial({
            map: rockDiffuse,
            roughness: 1.0,
            metalness: 0.0,
            bumpMap: rockDiffuse,
            bumpScale: 1.0
        }),
        wood: new THREE.MeshStandardMaterial({
            map: woodTex,
            roughness: 1.0,
            bumpMap: woodTex,
            bumpScale: 0.2,
            color: 0x8B5A2B
        }),
        leaf: new THREE.MeshStandardMaterial({
            color: 0x3A6E04,
            side: THREE.DoubleSide,
            roughness: 0.6
        }),
        metal: new THREE.MeshStandardMaterial({
            map: metalTex,
            color: 0xaaaaaa,
            roughness: 0.3,
            metalness: 0.9,
            bumpMap: metalTex,
            bumpScale: 0.02
        }),
        concrete: new THREE.MeshStandardMaterial({
            map: concreteTex,
            roughness: 0.9,
            metalness: 0.1,
            bumpMap: concreteTex,
            bumpScale: 0.1,
            color: 0x888888
        }),
        fabric: new THREE.MeshStandardMaterial({
            map: fabricTex,
            roughness: 1.0,
            metalness: 0.0,
            color: 0x0088aa // Teal
        })
    };
};
