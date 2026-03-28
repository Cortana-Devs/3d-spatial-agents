import * as THREE from "three";
import { TextureGenerator } from "./DonutTextureGenerator";

// Elite Performance: Instantiate materials exactly once globally.
// This avoids memory leaks and garbage collection stutters during React re-renders.

const woodColor = TextureGenerator.generateTexture("color");
const woodBump = TextureGenerator.generateTexture("bump");

export const floorMaterial = new THREE.MeshStandardMaterial({
  map: woodColor,
  bumpMap: woodBump,
  bumpScale: 0.003, // Softer bump for a more polished, premium feel
  roughness: 0.25, // Polished natural wood
  metalness: 0.05,
  color: 0xffffff,
});

export const concreteMaterial = new THREE.MeshStandardMaterial({
  color: 0xdcdcdc, // Light concrete
  roughness: 0.9,
  metalness: 0.0,
});

export const grassMaterial = new THREE.MeshStandardMaterial({
  color: 0x4a7c59, // Rich green grass
  roughness: 1.0,
  metalness: 0.0,
});

export const structuralMetalMaterial = new THREE.MeshStandardMaterial({
  color: 0xf5f5f7, // Apple's signature matte white/light grey
  metalness: 0.1,  // Low metalness for a concrete/painted aluminum look
  roughness: 0.85, // Matte architectural finish
});

export const soffitMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff, // Bright white soffit
  metalness: 0.05,
  roughness: 0.5,
});

export const shadedGlassMaterial = new THREE.MeshStandardMaterial({
  color: 0x1a1a1a, // Dark tint
  metalness: 0.9,
  roughness: 0.1,
  transparent: true,
  opacity: 0.7,
  side: THREE.DoubleSide,
  depthWrite: false,
});

export const doorHandleMaterial = new THREE.MeshStandardMaterial({
  color: 0xe5e5ea, // Brushed steel
  metalness: 0.9,
  roughness: 0.3,
});

export const glassMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff, // Ultra-clear glass
  metalness: 0.95, // Highly reflective
  roughness: 0.02, // Extremely smooth surface
  transparent: true,
  opacity: 0.15,   // Very clear, see-through
  side: THREE.DoubleSide,
  depthWrite: false, // Prevents z-fighting and sorting issues with transparent objects
});

// A shader material for the water, initialized once. The uTime will be updated via ref or custom shader.
// We will use a standard MeshStandardMaterial with onBeforeCompile for simplicity, or completely custom ShaderMaterial.
// Here we provide a custom shader material that combines realistic shading with vertex waves.
export const pondBottomMat = new THREE.MeshStandardMaterial({ color: 0x3a5b4c, roughness: 1.0 });

