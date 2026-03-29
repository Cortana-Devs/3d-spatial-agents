"use client";

/**
 * AgentPodsGroup — renders all 5 agent pods in a single, highly optimised pass.
 *
 * Performance design:
 *  • InstancedMesh for every structural element  → 4 GPU draw calls for all 5 pods
 *  • Zero dynamic lights                         → no per-light shadow computations
 *  • Zero MeshPhysicalMaterial / transmission    → eliminates the extra render pass
 *    that caused the 60 → 15 FPS regression
 *  • Module-level geometries & materials         → created once, never GC'd mid-frame
 *  • Segment counts halved vs the old design     → ~50 % fewer vertices
 *  • Single Zustand subscription for all pods   → 1 re-render instead of 5
 *  • Per-pod LED rings (5 tiny meshes)           → share geometry + 3 pre-made mats,
 *    so state-driven colour change costs nothing extra
 */

import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { useGameStore } from "@/store/gameStore";
import { AGENT_POD_LAYOUT } from "@/config/agentPods";

const COUNT = AGENT_POD_LAYOUT.length; // 5

// ─── Shared geometries – allocated once at module level ───────────────────────

/** Base disc under the pod */
const geoBase = new THREE.CylinderGeometry(2.5, 2.65, 0.25, 16);

/** Flat back-spine slab (simple BoxGeometry – no RoundedBox cost) */
const geoSpine = new THREE.BoxGeometry(3.4, 8.8, 0.85);

/** Top canopy cap */
const geoCap = new THREE.CylinderGeometry(2.6, 2.6, 0.35, 16);

/**
 * Open glass arc:
 *  thetaStart = PI/4, thetaLength = 3PI/2 (270°).
 *  In THREE CylinderGeometry, theta=0 → +Z (= inward / facing player),
 *  so this leaves a 90° gap at the front for the agent to "step out."
 */
const geoGlass = new THREE.CylinderGeometry(
  2.42,
  2.42,
  7.9,
  24,
  1,
  true,
  (Math.PI * 3) / 4, // 135 degrees
  (Math.PI * 3) / 2, // 270 degrees
);

/** Torus ring for LED status band (lies in XY plane by default; rotate X -90° to lay flat) */
const geoRing = new THREE.TorusGeometry(2.42, 0.07, 4, 24);

// ─── Shared materials – allocated once at module level ────────────────────────

const matWhite = new THREE.MeshStandardMaterial({
  color: "#f0f4f8",
  metalness: 0.12,
  roughness: 0.22,
});

const matDark = new THREE.MeshStandardMaterial({
  color: "#0d1117",
  metalness: 0.55,
  roughness: 0.38,
});

/**
 * Simple transparent glass – MeshStandardMaterial only.
 * Deliberately NOT MeshPhysicalMaterial; avoiding its transmission render pass
 * is the single biggest performance win here.
 */
const matGlass = new THREE.MeshStandardMaterial({
  color: "#050a14",
  metalness: 0.88,
  roughness: 0.04,
  transparent: true,
  opacity: 0.36,
  side: THREE.DoubleSide,
  depthWrite: false,
});

// Three fixed LED materials – one per pod state, shared across all 5 pods
const matLedEmpty = new THREE.MeshStandardMaterial({
  color: "#1e2530",
  emissive: "#1e2530",
  emissiveIntensity: 0.5,
  toneMapped: false,
});
const matLedDocked = new THREE.MeshStandardMaterial({
  color: "#0ea5e9",
  emissive: "#0ea5e9",
  emissiveIntensity: 1.8,
  toneMapped: false,
});
const matLedDeployed = new THREE.MeshStandardMaterial({
  color: "#22c55e",
  emissive: "#22c55e",
  emissiveIntensity: 1.8,
  toneMapped: false,
});

function getLedMat(
  assignedAgentId: string | null,
  isDeployed: boolean,
): THREE.Material {
  if (!assignedAgentId) return matLedEmpty;
  return isDeployed ? matLedDeployed : matLedDocked;
}

// ─── Matrix helpers – module-level scratch objects (no allocations in loops) ──
const _podObj = new THREE.Object3D();
const _localObj = new THREE.Object3D();

/**
 * Computes the world Matrix4 for a single pod element by composing:
 *   T(podWorldPos) × Ry(podFacingY) × T(localOffset) × Rx(localRotX)
 */
function buildMatrix(
  spec: (typeof AGENT_POD_LAYOUT)[0],
  lx: number,
  ly: number,
  lz: number,
  lrx = 0,
): THREE.Matrix4 {
  _podObj.position.set(
    spec.worldPosition.x,
    spec.worldPosition.y,
    spec.worldPosition.z,
  );
  _podObj.rotation.set(0, spec.facingY, 0);
  _podObj.scale.set(1, 1, 1);
  _podObj.updateMatrix();

  _localObj.position.set(lx, ly, lz);
  _localObj.rotation.set(lrx, 0, 0);
  _localObj.scale.set(1, 1, 1);
  _localObj.updateMatrix();

  return new THREE.Matrix4().multiplyMatrices(_podObj.matrix, _localObj.matrix);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AgentPodsGroup() {
  // Single subscription for all 5 pods – only one re-render when any state changes
  const pods = useGameStore((s) => s.pods);

  const refBase = useRef<THREE.InstancedMesh>(null);
  const refSpine = useRef<THREE.InstancedMesh>(null);
  const refCap = useRef<THREE.InstancedMesh>(null);
  const refGlass = useRef<THREE.InstancedMesh>(null);

  // Pod transforms are fully static – compute matrices ONCE on mount
  useEffect(() => {
    const meshes = [refBase, refSpine, refCap, refGlass];
    if (meshes.some((r) => !r.current)) return;

    AGENT_POD_LAYOUT.forEach((spec, i) => {
      refBase.current!.setMatrixAt(i, buildMatrix(spec, 0, 0.125, 0));
      // Spine pushed toward outer wall (local -Z)
      refSpine.current!.setMatrixAt(i, buildMatrix(spec, 0, 4.25, -1.35));
      refCap.current!.setMatrixAt(i, buildMatrix(spec, 0, 8.2, 0));
      refGlass.current!.setMatrixAt(i, buildMatrix(spec, 0, 3.95, 0));
    });

    meshes.forEach((r) => {
      r.current!.instanceMatrix.needsUpdate = true;
      // Pods surround the ring – let the scene-level frustum cull the whole group
      r.current!.frustumCulled = false;
    });
  }, []);

  return (
    <>
      {/* ── Structural InstancedMeshes: 4 draw calls for all 5 pods ─────── */}
      <instancedMesh
        ref={refBase}
        args={[geoBase, matDark, COUNT]}
        receiveShadow
        castShadow
      />
      <instancedMesh
        ref={refSpine}
        args={[geoSpine, matWhite, COUNT]}
        receiveShadow
        castShadow
      />
      <instancedMesh
        ref={refCap}
        args={[geoCap, matWhite, COUNT]}
        receiveShadow
        castShadow
      />
      {/* Glass has no shadow (transparent) */}
      <instancedMesh ref={refGlass} args={[geoGlass, matGlass, COUNT]} />

      {/* ── Per-pod LED rings: 5 tiny meshes, negligible cost ───────────── */}
      {AGENT_POD_LAYOUT.map((spec) => {
        const ps = pods[spec.id];
        const mat = getLedMat(
          ps?.assignedAgentId ?? null,
          ps?.isDeployed ?? false,
        );
        return (
          <group
            key={spec.id}
            position={[
              spec.worldPosition.x,
              spec.worldPosition.y,
              spec.worldPosition.z,
            ]}
            rotation={[0, spec.facingY, 0]}
          >
            {/* Bottom LED ring – torus rotated to lie flat in XZ plane */}
            <mesh
              geometry={geoRing}
              material={mat}
              position={[0, 0.28, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
            />
            {/* Top LED ring */}
            <mesh
              geometry={geoRing}
              material={mat}
              position={[0, 8.0, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
            />
          </group>
        );
      })}
    </>
  );
}
