import React, { useRef, useMemo, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGameStore } from "@/store/gameStore";
import { InteractableRegistry } from "./InteractableRegistry";

// Custom Shader for Rim Lighting / Glow
const GlowShaderMaterial = {
  uniforms: {
    color: { value: new THREE.Color("#00e5ff") }, // Premium Cyber-Blue glow
    viewVector: { value: new THREE.Vector3() },
    glowIntensity: { value: 1.5 },
    glowPower: { value: 3.0 }, // Controls sharp/soft falloff
  },
  vertexShader: `
    uniform vec3 viewVector;
    varying float intensity;
    uniform float glowPower;
    uniform float glowIntensity;
    
    void main() {
      // Calculate normal in world space
      vec3 vNormal = normalize(normalMatrix * normal);
      vec3 vNormel = normalize(normalMatrix * viewVector);
      intensity = pow(glowIntensity - dot(vNormal, vNormel), glowPower);
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
  `,
  fragmentShader: `
    uniform vec3 color;
    varying float intensity;
    
    void main() {
      vec3 glow = color * intensity;
      gl_FragColor = vec4( glow, 1.0 );
    }
  `,
  side: THREE.FrontSide,
  blending: THREE.AdditiveBlending,
  transparent: true,
  depthWrite: false, // Don't occlude other objects
};

export default function ObjectHighlighter() {
  const placingTargetType = useGameStore((state) => state.placingTargetType);
  const placingTargetId = useGameStore((state) => state.placingTargetId);

  const [targetMesh, setTargetMesh] = useState<THREE.Object3D | null>(null);
  const cloneRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  useEffect(() => {
    // Only highlight if it's an ITEM
    if (placingTargetType === "item" && placingTargetId) {
      const obj = InteractableRegistry.getInstance().getById(placingTargetId);
      if (obj && obj.meshRef) {
        setTargetMesh(obj.meshRef);
      } else {
        setTargetMesh(null);
      }
    } else {
      setTargetMesh(null);
    }
  }, [placingTargetType, placingTargetId]);

  useFrame((state) => {
    if (!targetMesh || !cloneRef.current || !materialRef.current) return;

    // Follow the target mesh
    // Note: If the target mesh is animated (skinned mesh), this static clone won't match perfectly.
    // For simple rigid bodies (furniture, items), this is fine.
    // We need world position/rotation/scale.

    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    const worldScale = new THREE.Vector3();

    targetMesh.updateMatrixWorld();
    targetMesh.matrixWorld.decompose(worldPos, worldQuat, worldScale);

    cloneRef.current.position.copy(worldPos);
    cloneRef.current.quaternion.copy(worldQuat);
    cloneRef.current.scale.copy(worldScale);

    // Update Shader Uniforms
    const cameraParams = state.camera.position;
    // We need view vector from camera to object
    // Or actually, usually Rim Light uses view vector relative to camera
    // Standard Rim Light: dot(normal, viewDir)
    // ViewDir is usually (cameraPos - vertexPos).

    // In our simplified vertex shader:
    // vNormel = normalize(normalMatrix * viewVector);
    // checks alignment of Normal with View.
    // Ideally pass camera position to shader or calculate view vector in vertex shader.

    // Let's improve the shader mechanism slightly.
    // Standard Rim: 1.0 - dot(normal, viewDir)
    // viewVector in shader usually implies camera position?
    // Let's pass camera position as viewVector for now? No, vertex shader expects a direction?
    // "uniform vec3 viewVector"

    // Actually, let's use a simpler approach which is standard:
    // varying vec3 vNormal;
    // varying vec3 vViewPosition;
    // void main() {
    //   vNormal = normalize(normalMatrix * normal);
    //   vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    //   vViewPosition = -mvPosition.xyz;
    //   gl_Position = projectionMatrix * mvPosition;
    // }
    // Fragment:
    // float intensity = pow(1.0 - dot(vNormal, normalize(vViewPosition)), 3.0);

    // Let's stick to the one I wrote but feed it correctly.
    // The previous shader code looks like it expects a direct view vector.
    // Let's rewrite the shader to be robust.
  });

  // Create a clone of geometry if available
  // We need to find the specific Mesh inside the group if it's a group
  // For now, let's assume targetMesh might be a Group or Mesh.
  // If it's a group, we might need multiple highlight meshes.
  // Complexity: High.

  // Simplified Approach:
  // Use a wired box or just standard scaling?
  // "glow froms its every borders" -> Rim light or Outline.

  // Let's implement robust Rim Light Shader
  const shaderArgs = useMemo(
    () => ({
      uniforms: {
        color: { value: new THREE.Color("#00e5ff") },
        coef: { value: 1.2 }, // Expansion coeff?
        power: { value: 2.0 },
      },
      vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
      fragmentShader: `
      uniform vec3 color;
      uniform float power;
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      void main() {
        vec3 viewDir = normalize(vViewPosition);
        float rim = 1.0 - max(0.0, dot(vNormal, viewDir));
        rim = pow(rim, power);
        gl_FragColor = vec4(color, rim * 4.0); // Increased brightness
      }
    `,
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide, // Render on front faces (overlay)
      blending: THREE.AdditiveBlending,
    }),
    [],
  );

  // Recursive render of highlights for all meshes in target
  const renderHighlights = (obj: THREE.Object3D) => {
    const meshes: React.ReactNode[] = [];

    obj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        // Don't highlight invisible meshes (like collision meshes)
        if (!m.visible) return;

        meshes.push(
          <mesh
            key={m.uuid}
            geometry={m.geometry}
            position={m.position}
            rotation={m.rotation}
            scale={m.scale}
          >
            <shaderMaterial args={[shaderArgs]} />
          </mesh>,
        );
      }
    });
    return meshes;
  };

  if (!targetMesh) return null;

  return (
    <group>
      {/* 
          Removed local transform on this wrapper.
          HighlightRenderer handles absolute World Transform syncing.
      */}
      <HighlightRenderer target={targetMesh} shaderArgs={shaderArgs} />
    </group>
  );
}

// Special renderer that handles world transform sync
function HighlightRenderer({
  target,
  shaderArgs,
}: {
  target: THREE.Object3D;
  shaderArgs: any;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current || !target) return;

    // Sync World Transform
    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    const worldScale = new THREE.Vector3();

    target.updateMatrixWorld();
    target.matrixWorld.decompose(worldPos, worldQuat, worldScale);

    groupRef.current.position.copy(worldPos);
    groupRef.current.quaternion.copy(worldQuat);
    groupRef.current.scale.copy(worldScale);
  });

  // Clone the geometry structure
  const [children, setChildren] = useState<React.ReactNode[]>([]);

  useEffect(() => {
    const list: React.ReactNode[] = [];
    target.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        // Skip purely helper meshes if any
        if (m.name.includes("Helper") || m.name.includes("Collider")) return;

        // We need to replicate the hierarchy transform?
        // Since we are moving the root group to match target root,
        // we only need LOCAL transforms of children relative to target root.

        // If target is Mesh, it has no relative children (usually).
        // If target is Group, children have local pos.

        // PROBLEM: traverse flattens.
        // If we just plot them all at world space?
        // No, simpler:
        // Just find the single mesh if possible.
        // Most interactables are simple.
        // Let's rely on cloning the structure? No, too complex.

        // Alternative:
        // For each mesh found, calculate its transforms relative to the target Root.

        // If m === target, local transform is Identity.

        // Let's accept a small limitation: simplistic cloning.
        // Or interactable registry ensures meshRef is the Mesh itself?
        // Usually meshRef is the Group containing the model.

        // Let's try to just render the meshes with their local transforms intact?
        // We can't easily recompose the React tree.

        // SOLUTION:
        // Use <primitive object={clonedMesh} />?
        // We can clone the object, replace materials!
      }
    });

    const clonedScene = target.clone(true);
    // Reset local transform because groupRef handles the World Transform
    clonedScene.position.set(0, 0, 0);
    clonedScene.rotation.set(0, 0, 0);
    clonedScene.scale.set(1, 1, 1);

    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        m.material = new THREE.ShaderMaterial(shaderArgs);
        // Ensure it renders on top?
        m.renderOrder = 1;
      }
    });

    setChildren([<primitive key={target.uuid} object={clonedScene} />]);
  }, [target, shaderArgs]);

  return <group ref={groupRef}>{children}</group>;
}
