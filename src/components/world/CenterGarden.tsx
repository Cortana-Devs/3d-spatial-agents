"use client";

import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  DEFAULT_LAB_HUB,
  type LabHubCenter,
} from "@/components/world/labFloorConstants";

// ─── Layout constants ─────────────────────────────────────────────────────────

/** Slightly smaller than inner ring radius (38) to avoid z-fighting the ring edge. */
const GARDEN_RADIUS = 35;
const DISC_SEGS     = 48;

/**
 * Top surface of the soil disc — slightly below the walkable tile floor (y = 4.0)
 * so the garden reads as a planted bed rather than a continuation of the floor.
 */
const SOIL_TOP_Y  = 3.7;
const SOIL_HEIGHT = 2.5;

// Tree
const TRUNK_R_BOT  = 1.2;
const TRUNK_R_TOP  = 0.75;
const TRUNK_H      = 4.0;
const TRUNK_TOP_Y  = SOIL_TOP_Y + TRUNK_H;

const CANOPY: { y: number; r: number }[] = [
  { y: TRUNK_TOP_Y + 1.8, r: 5.5 },  // wide bottom layer
  { y: TRUNK_TOP_Y + 4.0, r: 4.5 },  // mid layer
  { y: TRUNK_TOP_Y + 6.0, r: 3.0 },  // small top
];

// Instanced element counts
const GRASS_COUNT  = 80;
const ROCK_COUNT   = 10;
const MUSH_COUNT   = 14;
const FLOWER_COUNT = 26;

// Flower palette — per-instance color applied to a white base material
const FLOWER_PALETTE: THREE.Color[] = [
  new THREE.Color(0xffe066), // yellow
  new THREE.Color(0xf888c0), // pink
  new THREE.Color(0xffffff), // white
  new THREE.Color(0xcc99ff), // lavender
  new THREE.Color(0xff9955), // orange
];

// ─── Seeded deterministic RNG ─────────────────────────────────────────────────

function makeRng(seed: number): () => number {
  let s = (seed | 0) >>> 0;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

// ─── Static geometry builders (called once inside useMemo) ───────────────────

/**
 * Two crossed planes forming an X: cheap volumetric grass tuft.
 * Base sits at local y=0 so instance Y positions land on soil surface directly.
 */
function buildGrassTuftGeo(): THREE.BufferGeometry {
  const w = 0.75, h = 1.3;
  const a = new THREE.PlaneGeometry(w, h);
  a.translate(0, h / 2, 0);
  const b = new THREE.PlaneGeometry(w, h);
  b.rotateY(Math.PI / 2);
  b.translate(0, h / 2, 0);
  const g = mergeGeometries([a, b])!;
  a.dispose();
  b.dispose();
  return g;
}

/** Low-poly rock: IcosahedronGeometry detail=0 gives a chunky natural boulder look. */
function buildRockGeo(): THREE.BufferGeometry {
  return new THREE.IcosahedronGeometry(1, 0);
}

/** Dome-only hemisphere for mushroom cap (top half of a sphere). */
function buildMushCapGeo(): THREE.BufferGeometry {
  return new THREE.SphereGeometry(0.4, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2);
}

function buildMushStemGeo(): THREE.BufferGeometry {
  return new THREE.CylinderGeometry(0.1, 0.15, 0.55, 6);
}

function buildFlowerStemGeo(): THREE.BufferGeometry {
  return new THREE.CylinderGeometry(0.04, 0.04, 0.9, 5);
}

function buildFlowerHeadGeo(): THREE.BufferGeometry {
  return new THREE.SphereGeometry(0.22, 6, 5);
}

// ─── Shared reuse helper ───────────────────────────────────────────────────────

const _up = new THREE.Vector3(0, 1, 0);

function placeInstance(
  mesh: THREE.InstancedMesh,
  index: number,
  x: number,
  y: number,
  z: number,
  yaw: number,
  sx: number,
  sy: number,
  sz: number,
): void {
  const mat4 = new THREE.Matrix4();
  mat4.compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromAxisAngle(_up, yaw),
    new THREE.Vector3(sx, sy, sz),
  );
  mesh.setMatrixAt(index, mat4);
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface CenterGardenProps {
  hubCenter?: LabHubCenter;
}

/**
 * Organic garden filling the facility's center void.
 * No collision registration — navigation already blocks this zone.
 * Performance: all repeated elements use InstancedMesh (one draw call each).
 */
const CenterGarden = React.memo(function CenterGarden({
  hubCenter = DEFAULT_LAB_HUB,
}: CenterGardenProps) {
  const grassRef    = useRef<THREE.InstancedMesh>(null);
  const rockRef     = useRef<THREE.InstancedMesh>(null);
  const mushCapRef  = useRef<THREE.InstancedMesh>(null);
  const mushStemRef = useRef<THREE.InstancedMesh>(null);
  const flStemRef   = useRef<THREE.InstancedMesh>(null);
  const flHeadRef   = useRef<THREE.InstancedMesh>(null);

  const geos = useMemo(
    () => ({
      grass:      buildGrassTuftGeo(),
      rock:       buildRockGeo(),
      mushCap:    buildMushCapGeo(),
      mushStem:   buildMushStemGeo(),
      flowerStem: buildFlowerStemGeo(),
      flowerHead: buildFlowerHeadGeo(),
    }),
    [],
  );

  const mats = useMemo(
    () => ({
      soil:       new THREE.MeshStandardMaterial({ color: 0x3b1a09, roughness: 1.0, metalness: 0 }),
      grass:      new THREE.MeshStandardMaterial({ color: 0x4e9624, roughness: 0.9, metalness: 0, side: THREE.DoubleSide }),
      bark:       new THREE.MeshStandardMaterial({ color: 0x6b3a1e, roughness: 1.0, metalness: 0 }),
      leaf:       new THREE.MeshStandardMaterial({ color: 0x28700e, roughness: 0.8, metalness: 0 }),
      stone:      new THREE.MeshStandardMaterial({ color: 0x88837e, roughness: 1.0, metalness: 0 }),
      mushCap:    new THREE.MeshStandardMaterial({ color: 0xcd3800, roughness: 0.7, metalness: 0 }),
      mushStem:   new THREE.MeshStandardMaterial({ color: 0xede5c0, roughness: 1.0, metalness: 0 }),
      flowerStem: new THREE.MeshStandardMaterial({ color: 0x5eaa2e, roughness: 0.9, metalness: 0 }),
      flowerHead: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, metalness: 0 }),
    }),
    [],
  );

  // Dispose geometries and materials on unmount
  useEffect(
    () => () => {
      Object.values(geos).forEach((g) => g.dispose());
    },
    [geos],
  );
  useEffect(
    () => () => {
      Object.values(mats).forEach((m) => m.dispose());
    },
    [mats],
  );

  // Populate all InstancedMesh matrices once after mount (static garden, no animation)
  useEffect(() => {
    const rng = makeRng(0xc0ffee42);

    // ── Grass tufts ──────────────────────────────────────────────────────────
    const gm = grassRef.current;
    if (gm) {
      const TREE_CLEAR = 6; // keep grass away from trunk base
      for (let i = 0; i < GRASS_COUNT; i++) {
        let x = 0, z = 0, tries = 0;
        do {
          const a = rng() * Math.PI * 2;
          const r = 1.5 + rng() * (GARDEN_RADIUS - 2.5);
          x = Math.cos(a) * r;
          z = Math.sin(a) * r;
          tries++;
        } while (x * x + z * z < TREE_CLEAR * TREE_CLEAR && tries < 8);

        const sc = 0.5 + rng() * 0.75;
        placeInstance(gm, i, x, SOIL_TOP_Y, z, rng() * Math.PI * 2, sc, sc, sc);
      }
      gm.instanceMatrix.needsUpdate = true;
    }

    // ── Rocks ────────────────────────────────────────────────────────────────
    const rm = rockRef.current;
    if (rm) {
      for (let i = 0; i < ROCK_COUNT; i++) {
        const a = rng() * Math.PI * 2;
        const r = 5 + rng() * (GARDEN_RADIUS - 7);
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        const sx = 0.6 + rng() * 1.1;
        const sy = 0.35 + rng() * 0.45;
        const sz = 0.55 + rng() * 1.0;
        // sit on soil: half-height of scaled rock above surface
        placeInstance(rm, i, x, SOIL_TOP_Y + sy * 0.9, z, rng() * Math.PI * 2, sx, sy, sz);
      }
      rm.instanceMatrix.needsUpdate = true;
    }

    // ── Mushrooms ────────────────────────────────────────────────────────────
    const STEM_H = 0.55;
    const mc = mushCapRef.current;
    const ms = mushStemRef.current;
    if (mc && ms) {
      for (let i = 0; i < MUSH_COUNT; i++) {
        const a = rng() * Math.PI * 2;
        const r = 4 + rng() * (GARDEN_RADIUS - 7);
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        const sc = 0.55 + rng() * 0.7;
        const yaw = rng() * Math.PI * 2;
        placeInstance(ms, i, x, SOIL_TOP_Y + (STEM_H * sc) / 2, z, yaw, sc, sc, sc);
        // Cap base sits at top of stem
        placeInstance(mc, i, x, SOIL_TOP_Y + STEM_H * sc, z, yaw, sc * 1.35, sc * 0.9, sc * 1.35);
      }
      mc.instanceMatrix.needsUpdate = true;
      ms.instanceMatrix.needsUpdate = true;
    }

    // ── Flowers ──────────────────────────────────────────────────────────────
    const FSTEM_H = 0.9;
    const fh = flHeadRef.current;
    const fs = flStemRef.current;
    if (fh && fs) {
      for (let i = 0; i < FLOWER_COUNT; i++) {
        const a = rng() * Math.PI * 2;
        const r = 3 + rng() * (GARDEN_RADIUS - 5);
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        const sc = 0.65 + rng() * 0.6;
        const yaw = rng() * Math.PI * 2;
        placeInstance(fs, i, x, SOIL_TOP_Y + (FSTEM_H * sc) / 2, z, yaw, sc, sc, sc);
        placeInstance(fh, i, x, SOIL_TOP_Y + FSTEM_H * sc + 0.22 * sc, z, yaw, sc, sc, sc);
        fh.setColorAt(i, FLOWER_PALETTE[i % FLOWER_PALETTE.length]);
      }
      if (fh.instanceColor) fh.instanceColor.needsUpdate = true;
      fh.instanceMatrix.needsUpdate = true;
      fs.instanceMatrix.needsUpdate = true;
    }
  }, []); // static garden — runs once on mount

  const { x, z } = hubCenter;

  return (
    <group name="CenterGarden" position={[x, 0, z]}>

      {/* Soil disc: fills inner void with rich dark earth */}
      <mesh
        position={[0, SOIL_TOP_Y - SOIL_HEIGHT / 2, 0]}
        receiveShadow
        castShadow
        userData={{ type: "Structure", id: "garden-soil", name: "Garden Soil" }}
      >
        <cylinderGeometry args={[GARDEN_RADIUS, GARDEN_RADIUS, SOIL_HEIGHT, DISC_SEGS]} />
        <primitive object={mats.soil} attach="material" />
      </mesh>

      {/* Tree trunk */}
      <mesh
        position={[0, SOIL_TOP_Y + TRUNK_H / 2, 0]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[TRUNK_R_TOP, TRUNK_R_BOT, TRUNK_H, 10]} />
        <primitive object={mats.bark} attach="material" />
      </mesh>

      {/* Stacked canopy spheres — three overlapping layers give a lush rounded crown */}
      {CANOPY.map((c, i) => (
        <mesh key={`canopy-${i}`} position={[0, c.y, 0]} castShadow receiveShadow>
          <sphereGeometry args={[c.r, 10, 8]} />
          <primitive object={mats.leaf} attach="material" />
        </mesh>
      ))}

      {/* Grass tufts: 80 × crossed-plane pairs = 1 draw call */}
      <instancedMesh
        ref={grassRef}
        args={[geos.grass, mats.grass, GRASS_COUNT]}
        frustumCulled={false}
      />

      {/* Rocks: 10 icosahedra, non-uniform scale for organic variety */}
      <instancedMesh
        ref={rockRef}
        args={[geos.rock, mats.stone, ROCK_COUNT]}
        frustumCulled={false}
      />

      {/* Mushroom stems */}
      <instancedMesh
        ref={mushStemRef}
        args={[geos.mushStem, mats.mushStem, MUSH_COUNT]}
        frustumCulled={false}
      />

      {/* Mushroom caps */}
      <instancedMesh
        ref={mushCapRef}
        args={[geos.mushCap, mats.mushCap, MUSH_COUNT]}
        frustumCulled={false}
      />

      {/* Flower stems */}
      <instancedMesh
        ref={flStemRef}
        args={[geos.flowerStem, mats.flowerStem, FLOWER_COUNT]}
        frustumCulled={false}
      />

      {/* Flower heads: per-instance color from FLOWER_PALETTE */}
      <instancedMesh
        ref={flHeadRef}
        args={[geos.flowerHead, mats.flowerHead, FLOWER_COUNT]}
        frustumCulled={false}
      />

    </group>
  );
});

export default CenterGarden;
