import * as THREE from "three";
import { TextureGenerator } from "./FacilityTextureGenerator";

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

// --- APPLE DESIGN SYSTEM (2026 High-Performance Standard) ---

export const appleWhiteMaterial = new THREE.MeshStandardMaterial({
  color: "#f5f5f7",
  roughness: 0.15,
  metalness: 0.05,
});

export const appleDarkMaterial = new THREE.MeshStandardMaterial({
  color: "#1c1c1e",
  roughness: 0.25,
  metalness: 0.1,
});

export const appleAluminumMaterial = new THREE.MeshStandardMaterial({
  color: "#d3d3d6",
  roughness: 0.35,
  metalness: 0.9,
});

export const appleSpaceGreyMaterial = new THREE.MeshStandardMaterial({
  color: "#6e6e73",
  roughness: 0.4,
  metalness: 0.85,
});

export const appleAccentBlue = new THREE.MeshStandardMaterial({
  color: "#007aff",
  roughness: 0.2,
  metalness: 0.2,
});

export const appleAccentRed = new THREE.MeshStandardMaterial({
  color: "#ff3b30",
  roughness: 0.3,
  metalness: 0.1,
});

export const applePremiumWood = new THREE.MeshStandardMaterial({
  color: "#a67c52", // Light walnut / oak warm tone typical in Apple Stores
  roughness: 0.6,
  metalness: 0.05,
});

export const neonGlowBlue = new THREE.MeshBasicMaterial({ color: "#00ffff" });

export const appleScreenMaterial = new THREE.MeshStandardMaterial({
  color: "#4488ff",
  emissive: "#001133",
});

export const appleDeviceScreenOff = new THREE.MeshStandardMaterial({
  color: "#000000",
  roughness: 0.05,
  metalness: 0.8,
});

export const appleDeviceScreenOn = new THREE.MeshStandardMaterial({
  color: "#ffffff",
  roughness: 0.1,
  metalness: 0.1,
  emissive: "#ffffff",
  emissiveIntensity: 0.8,
});

// Environment Elements
export const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9, flatShading: true });
export const pineLeavesMat = new THREE.MeshStandardMaterial({ color: 0x2d4c1e, roughness: 0.8, flatShading: true });
export const oakLeavesMat = new THREE.MeshStandardMaterial({ color: 0x4a6b36, roughness: 0.8, flatShading: true });
export const cherryLeavesMat = new THREE.MeshStandardMaterial({ color: 0xffb7c5, roughness: 0.8, flatShading: true });
export const petalMat = new THREE.MeshStandardMaterial({ color: 0xffc8d5, roughness: 0.9 });
export const lilyPadMat = new THREE.MeshStandardMaterial({ color: 0x2d5a27, roughness: 0.9 });
export const lilyFlowerMat = new THREE.MeshStandardMaterial({ color: 0xfff0f5, roughness: 0.6 });
export const pathMat = new THREE.MeshStandardMaterial({ color: 0xeae1d0, roughness: 1.0, flatShading: true, side: THREE.DoubleSide });
export const benchWoodMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.9 });
export const benchMetalMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6, metalness: 0.9 });
