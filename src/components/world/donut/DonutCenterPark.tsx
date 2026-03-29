import React, { useMemo, useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame, extend } from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei";
import { pondBottomMat } from "./DonutMaterials";
import { DEFAULT_LAB_HUB, DEFAULT_RING_INNER_RADIUS, ENV_PROP_SCALE_FACTOR } from "./labFloorConstants";
import { useGameStore } from "@/store/gameStore";

const POND_RADIUS = 16.0;
const DOCK_X = 15.3;

// --- Path & Terrain Math (convex-only: no dark pits) ---
export const getTerrainHeight = (x: number, z: number): number => {
  const distance = Math.sqrt(x * x + z * z);
  const distToDock = Math.hypot(x - DOCK_X, z);

  // 1. Pond basin — cubic ease from bank to deep
  if (distance < POND_RADIUS - 2.5) return -0.6;
  if (distance < POND_RADIUS) {
    const t = (distance - (POND_RADIUS - 2.5)) / 2.5;
    return -0.6 + t * t * (3 - 2 * t) * 0.8;
  }

  // 2. Gentle convex terrain outside pond — only additive bumps, never pits
  //    abs(sin*cos) stays in [0,1] so no negative values → no dark concave shadows
  const ripple = Math.abs(Math.sin(x * 0.13) * Math.cos(z * 0.13)) * 0.5;

  // 3. Curated hills under tree positions only
  const oakHill    = Math.max(0, 1.0 - Math.hypot(x + 14, z - 16) * 0.1) * 1.6;
  const cherryHill = Math.max(0, 1.0 - Math.hypot(x - 18, z - 20) * 0.12) * 1.0;
  const pineHill   = Math.max(0, 1.0 - Math.hypot(x + 22, z + 15) * 0.1) * 0.8;

  let h = 0.25 + ripple + oakHill + cherryHill + pineHill;

  // 4. Flatten dock area
  if (distToDock < 4.5) {
    const t = 1.0 - distToDock / 4.5;
    h = h * (1 - t) + (-0.05 * t);
  }

  // 5. Taper to flat near park edge
  const edgeT = Math.max(0, (distance - DEFAULT_RING_INNER_RADIUS + 5) / 5);
  h *= 1.0 - Math.min(1, edgeT);

  return h;
};

import {
  trunkGeo,
  pineLeavesGeo,
  oakLeavesGeo,
  cherryLeavesGeo,
  lilyPadGeo,
  lilyFlowerGeo,
  seatPlankGeo,
  backPlankGeo,
  legVerticalGeo,
  legHorizontalGeo,
  armRestGeo,
  fishBodyGeo,
  fishTailGeo,
} from "./DonutGeometries";
import {
  grassMaterial as grassMat,
  trunkMat,
  pineLeavesMat,
  oakLeavesMat,
  cherryLeavesMat,
  petalMat,
  lilyPadMat,
  lilyFlowerMat,
  pathMat,
  benchWoodMat,
  benchMetalMat,
} from "./DonutMaterials";

const benchWidth = 1.6;
const MAX_BENCH_INSTANCES = 8;

// Fish geometry — smaller, natural koi scale
const koiColors = [0xee4411, 0xf5f5ee, 0x111111, 0xffaa00, 0xff3333, 0xffcc88];

// --- Upgraded Water Shader with depth, foam edge, caustic ripple ---
const StylizedWaterMaterial = shaderMaterial(
  { uTime: 0, uDeepColor: new THREE.Color(0x1a5c8a), uShallowColor: new THREE.Color(0x4aadcc), uFoamColor: new THREE.Color(0xd0eeff) },
  `
    varying vec2 vUv;
    varying vec3 vWorldPos;
    varying float vDepth;
    uniform float uTime;
    void main() {
      vUv = uv;
      vec3 pos = position;
      // Multi-frequency gentle waves in XZ (pond is flat, rotation applied outside)
      float w1 = sin(pos.x * 0.35 + uTime * 0.9) * 0.06;
      float w2 = cos(pos.z * 0.28 + uTime * 1.1) * 0.05;
      float w3 = sin(pos.x * 0.18 - pos.z * 0.22 + uTime * 0.7) * 0.035;
      pos.z += w1 + w2 + w3;
      vDepth = (w1 + w2 + w3 + 0.15) / 0.3;
      vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  `
    varying vec2 vUv;
    varying vec3 vWorldPos;
    varying float vDepth;
    uniform float uTime;
    uniform vec3 uDeepColor;
    uniform vec3 uShallowColor;
    uniform vec3 uFoamColor;
    void main() {
      // Depth-based color blend (deep=blue, shallow=cyan)
      vec3 waterColor = mix(uDeepColor, uShallowColor, clamp(vDepth, 0.0, 1.0));

      // Caustic shimmer — cheap additive ripple pattern
      float caustic = abs(sin(vWorldPos.x * 0.8 + uTime * 1.3) * cos(vWorldPos.z * 0.7 + uTime * 1.1)) * 0.12;
      waterColor += caustic;

      // Fresnel-like edge foam using UV distance from center
      float dist = length(vUv - 0.5) * 2.0;
      float foam = smoothstep(0.82, 0.98, dist) * 0.4;
      waterColor = mix(waterColor, uFoamColor, foam);

      gl_FragColor = vec4(waterColor, 0.78);
    }
  `,
  (mat) => { if (mat) { mat.transparent = true; mat.depthWrite = false; } }
);
extend({ StylizedWaterMaterial });

// --- Ecosystem Logic ---
type SharedKoi = { id: number; pos: THREE.Vector3; alive: boolean; die: () => void; };
const sharedEcosystem = { kois: [] as SharedKoi[], arowanaPos: new THREE.Vector3(0, -200, 0) };

// Seeded pseudo-random: deterministic per-fish, no allocation per frame
function seededRand(seed: number) { const x = Math.sin(seed) * 10000; return x - Math.floor(x); }

function Fish({ id, onDie }: { id: number; onDie: (id: number) => void }) {
  const groupRef = React.useRef<THREE.Group>(null);
  const tailRef  = React.useRef<THREE.Mesh>(null);
  const color = koiColors[id % koiColors.length];
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0.15 }), [color]);

  // Per-fish personality — set ONCE at mount, never changes
  const personality = useMemo(() => ({
    speed:         0.15 + seededRand(id * 3)    * 0.25,   // 0.15–0.40 (graceful koi pace)
    preferredDepth: -0.45 - seededRand(id * 7)  * 0.55,   // -0.45 to -1.0
    wanderFreq:    0.25  + seededRand(id * 11)  * 0.25,   // unique wander tempo
    wanderPhase:   seededRand(id * 13)          * Math.PI * 2,
    tailPhase:     seededRand(id * 17)          * Math.PI * 2,
    scale:         0.28  + seededRand(id * 19)  * 0.14,   // 0.28–0.42 world units (natural koi)
    startAngle:    seededRand(id * 23)          * Math.PI * 2,
    startRadius:   3     + seededRand(id * 29)  * (POND_RADIUS - 5),
  }), [id]);

  const state = React.useRef({
    pos: new THREE.Vector3(
      Math.sin(personality.startAngle) * personality.startRadius,
      personality.preferredDepth,
      Math.cos(personality.startAngle) * personality.startRadius,
    ),
    vel: new THREE.Vector3(Math.sin(personality.startAngle + Math.PI / 2), 0, Math.cos(personality.startAngle + Math.PI / 2)),
  });

  React.useEffect(() => {
    const koi: SharedKoi = { id, pos: state.current.pos, alive: true, die: () => onDie(id) };
    sharedEcosystem.kois.push(koi);
    return () => {
      koi.alive = false;
      sharedEcosystem.kois = sharedEcosystem.kois.filter(k => k.id !== id);
    };
  }, [id, onDie]);

  const steerVec = useMemo(() => new THREE.Vector3(), []);
  const moveVec  = useMemo(() => new THREE.Vector3(), []);

  useFrame((state3, delta) => {
    if (!groupRef.current || !tailRef.current) return;
    const s       = state.current;
    const p       = personality;
    const t       = state3.clock.elapsedTime;
    const dt      = Math.min(delta, 0.05); // cap so no tunneling on lag spikes

    // 1. Deterministic sinusoidal wander — zero per-frame allocation or random calls
    const wanderX = Math.sin(t * p.wanderFreq       + p.wanderPhase);
    const wanderZ = Math.cos(t * p.wanderFreq * 0.8 + p.wanderPhase + 1.3);
    steerVec.set(wanderX, 0, wanderZ);
    s.vel.lerp(steerVec, 1.2 * dt);   // smooth, delta-scaled

    // 2. Flee arowana when close
    const aD = s.pos.distanceTo(sharedEcosystem.arowanaPos);
    if (aD < 9.0) {
      steerVec.subVectors(s.pos, sharedEcosystem.arowanaPos).setY(0).normalize();
      s.vel.lerp(steerVec, 5.0 * dt);
    }

    // 3. Weak schooling — very subtle cohesion toward nearest neighbor
    let nearestD = Infinity;
    let nearestKoi: SharedKoi | null = null;
    for (const koi of sharedEcosystem.kois) {
      if (koi.id === id || !koi.alive) continue;
      const d = s.pos.distanceTo(koi.pos);
      if (d < nearestD) { nearestD = d; nearestKoi = koi; }
    }
    if (nearestKoi && nearestD > 7.0 && nearestD < 14.0) {
      steerVec.subVectors(nearestKoi.pos, s.pos).setY(0).normalize();
      s.vel.lerp(steerVec, 0.4 * dt);
    }

    // 4. Pond boundary confinement (smooth, not hard clamp)
    const dist = Math.hypot(s.pos.x, s.pos.z);
    if (dist > POND_RADIUS - 2.5) {
      steerVec.set(-s.pos.x, 0, -s.pos.z).normalize();
      s.vel.lerp(steerVec, Math.min(1, (dist - (POND_RADIUS - 2.5)) * 1.5) * 8 * dt);
      if (dist > POND_RADIUS - 0.8) {
        s.pos.x = (s.pos.x / dist) * (POND_RADIUS - 0.8);
        s.pos.z = (s.pos.z / dist) * (POND_RADIUS - 0.8);
      }
    }

    // 5. Move
    const speed = aD < 9.0 ? p.speed * 3.5 : p.speed;
    s.vel.y = 0;
    if (s.vel.lengthSq() < 0.001) s.vel.set(1, 0, 0);
    moveVec.copy(s.vel).normalize().multiplyScalar(speed * dt);
    s.pos.add(moveVec);

    // 6. Depth variation: gentle sinusoidal bobbing
    s.pos.y = THREE.MathUtils.lerp(
      s.pos.y,
      p.preferredDepth + Math.sin(t * 0.35 + p.wanderPhase) * 0.1,
      3.0 * dt,
    );

    // 7. Apply transform
    groupRef.current.position.copy(s.pos);

    const targetRot = Math.atan2(s.vel.x, s.vel.z);
    let diff = targetRot - groupRef.current.rotation.y;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff >  Math.PI) diff -= Math.PI * 2;
    groupRef.current.rotation.y += diff * Math.min(1, 3.0 * dt); // smooth turn

    // 8. Tail: frequency and amplitude proportional to speed — no jitter at slow pace
    const tailFreq = 4.0 + speed * 18;
    const tailAmp  = 0.12 + speed * 1.5;
    tailRef.current.rotation.y = Math.sin(t * tailFreq + p.tailPhase) * tailAmp;
  });

  return (
    <group ref={groupRef} scale={personality.scale}>
      <mesh geometry={fishBodyGeo} material={mat} castShadow />
      <mesh ref={tailRef} geometry={fishTailGeo} material={mat} position={[0, 0, -0.22]} />
    </group>
  );
}

// Arowana body geometry — elongated predator shape (instantiated once)
const aroBodyGeo   = new THREE.SphereGeometry(1, 12, 8); aroBodyGeo.scale(0.28, 0.18, 0.9);
const aroTailGeo   = new THREE.ConeGeometry(0.22, 0.55, 8); aroTailGeo.rotateX(Math.PI / 2);
const aroDorsalGeo = new THREE.BoxGeometry(0.04, 0.25, 0.45);

function Arowana() {
  const groupRef  = React.useRef<THREE.Group>(null);
  const tailRef   = React.useRef<THREE.Mesh>(null);
  const state = React.useRef({
    pos: new THREE.Vector3(0, -0.75, 0),
    vel: new THREE.Vector3(1, 0, 0),
    speed:       1.0,
    wanderAngle: 0.0,
    hunger:      30,
  });
  const aroMat    = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 0.7, roughness: 0.25 }), []);
  const steerVec  = useMemo(() => new THREE.Vector3(), []);
  const moveVec   = useMemo(() => new THREE.Vector3(), []);

  useFrame((stateR, delta) => {
    if (!groupRef.current) return;
    const s  = state.current;
    const dt = Math.min(delta, 0.05);
    s.hunger += dt * 1.5;

    let hasTarget = false;
    if (s.hunger > 55) {
      let closest = Infinity;
      let target: SharedKoi | null = null;
      for (const koi of sharedEcosystem.kois) {
        if (!koi.alive) continue;
        const d = s.pos.distanceTo(koi.pos);
        if (d < closest) { closest = d; target = koi; }
      }
      if (target) {
        if (closest < 1.8) { target.die(); s.hunger = 0; }
        else {
          steerVec.subVectors(target.pos, s.pos).setY(0).normalize();
          s.vel.lerp(steerVec, 1.5 * dt); // arowana turns slowly — large fish
          hasTarget = true;
        }
      }
    }

    if (!hasTarget) {
      // Deterministic wander — no per-frame random
      const t = stateR.clock.elapsedTime;
      s.vel.x += (Math.sin(t * 0.22) - s.vel.x) * 0.6 * dt;
      s.vel.z += (Math.cos(t * 0.18) - s.vel.z) * 0.6 * dt;
      s.speed = 0.9;
    } else { s.speed = 2.8; }

    // Boundary
    const dist = Math.hypot(s.pos.x, s.pos.z);
    if (dist > POND_RADIUS - 2.5) {
      steerVec.set(-s.pos.x, 0, -s.pos.z).normalize();
      s.vel.lerp(steerVec, 4 * dt);
      if (dist > POND_RADIUS - 0.8) {
        s.pos.x = (s.pos.x / dist) * (POND_RADIUS - 0.8);
        s.pos.z = (s.pos.z / dist) * (POND_RADIUS - 0.8);
      }
    }

    s.vel.y = 0;
    if (s.vel.lengthSq() < 0.001) s.vel.set(1, 0, 0);
    moveVec.copy(s.vel).normalize().multiplyScalar(s.speed * dt);
    s.pos.add(moveVec);
    s.pos.y = THREE.MathUtils.lerp(s.pos.y, -0.7, dt * 2);

    groupRef.current.position.copy(s.pos);
    sharedEcosystem.arowanaPos.copy(s.pos);

    const targetRot = Math.atan2(s.vel.x, s.vel.z);
    let diff = targetRot - groupRef.current.rotation.y;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff >  Math.PI) diff -= Math.PI * 2;
    groupRef.current.rotation.y += diff * Math.min(1, 1.2 * dt); // slow deliberate turns

    // Tail wag
    if (tailRef.current) {
      tailRef.current.rotation.z = Math.sin(stateR.clock.elapsedTime * (4 + s.speed * 3)) * (0.1 + s.speed * 0.08);
    }
  });

  // Scale: arowana ~40cm real = 0.9 world units body length
  return (
    <group ref={groupRef} scale={[0.9, 0.9, 0.9]}>
      <mesh geometry={aroBodyGeo} material={aroMat} castShadow />
      <mesh ref={tailRef} geometry={aroTailGeo} material={aroMat} position={[0, 0, -0.9]} castShadow />
      <mesh geometry={aroDorsalGeo} material={aroMat} position={[0, 0.19, -0.1]} castShadow />
    </group>
  );
}

function PondEcosystem() {
  const [kois, setKois] = React.useState<{ id: number }[]>(
    Array.from({ length: 12 }, (_, i) => ({ id: i }))
  );
  const nextId = React.useRef(12);
  const handleDie = React.useCallback((id: number) =>
    setKois(p => p.filter(k => k.id !== id)), []);

  React.useEffect(() => {
    const intv = setInterval(() =>
      setKois(p => p.length < 15 ? [...p, { id: nextId.current++ }] : p), 4000);
    return () => clearInterval(intv);
  }, []);

  return (
    <group>
      <Arowana />
      {kois.map(k => <Fish key={k.id} id={k.id} onDie={handleDie} />)}
    </group>
  );
}


function LilyPads() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 35;
  useLayoutEffect(() => {
    if (!meshRef.current) return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = POND_RADIUS - Math.random() * 4 - 1;
      dummy.position.set(Math.sin(angle) * r, -0.19, Math.cos(angle) * r);
      dummy.rotation.set(0, Math.random() * Math.PI, 0);
      const s = 0.5 + Math.random() * 0.7;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, []);

  return <instancedMesh ref={meshRef} args={[lilyPadGeo, lilyPadMat, count]} receiveShadow />;
}

// --- Scenery ---
function Benches({ data }: { data: { position: number[], rotation: number[], widthScale?: number }[] }) {
  const seatRef = useRef<THREE.InstancedMesh>(null);
  const backRef = useRef<THREE.InstancedMesh>(null);
  const legHRef = useRef<THREE.InstancedMesh>(null);
  const legVRef = useRef<THREE.InstancedMesh>(null);
  const armRef = useRef<THREE.InstancedMesh>(null);

  // Bench dimensions aligned to player scale
  // Player scale is ~3.06, player width ~1.5 world units.
  // Standard bench width 1.6 * ENV_SCALE 3.06 ≈ 4.9 world units (fits 2-3 players).
  const BENCH_LENGTH = benchWidth; // 1.6
  const BENCH_HEIGHT = 0.48;     // local Y for seat (matches PLAYER_HIPS_LOCAL_Y 3.3 adjustment)

  useLayoutEffect(() => {
    if (!seatRef.current || !backRef.current || !legHRef.current || !legVRef.current || !armRef.current) return;
    const dummy = new THREE.Object3D();
    const groupDummy = new THREE.Object3D();
    let c = { seat: 0, back: 0, legH: 0, legV: 0, arm: 0 };

    data.forEach((b) => {
      const ws = b.widthScale ?? 1;
      const hw = BENCH_LENGTH * ws * 0.5;
      const terrainY = getTerrainHeight(b.position[0], b.position[2]);
      
      // Bench origin is at base center
      groupDummy.position.set(b.position[0], terrainY, b.position[2]);
      groupDummy.rotation.set(b.rotation[0], b.rotation[1], b.rotation[2]);
      groupDummy.scale.setScalar(ENV_PROP_SCALE_FACTOR);
      groupDummy.updateMatrix();

      const addPart = (ref: any, countKey: keyof typeof c, pos: [number, number, number], rot: [number, number, number] = [0, 0, 0], scaleX = 1) => {
        dummy.position.set(...pos); dummy.rotation.set(...rot);
        dummy.scale.set(scaleX, 1, 1);
        dummy.updateMatrix(); dummy.applyMatrix4(groupDummy.matrix);
        ref.current.setMatrixAt(c[countKey]++, dummy.matrix);
      };

      // Seat planks
      addPart(seatRef, 'seat', [0, BENCH_HEIGHT, 0.15], [0, 0, 0], ws);
      addPart(seatRef, 'seat', [0, BENCH_HEIGHT, 0.05], [0, 0, 0], ws);
      addPart(seatRef, 'seat', [0, BENCH_HEIGHT, -0.05], [0, 0, 0], ws);
      addPart(seatRef, 'seat', [0, BENCH_HEIGHT, -0.15], [0, 0, 0], ws);

      // Back planks
      addPart(backRef, 'back', [0, BENCH_HEIGHT + 0.15, -0.22], [0.15, 0, 0], ws);
      addPart(backRef, 'back', [0, BENCH_HEIGHT + 0.3, -0.25], [0.15, 0, 0], ws);
      addPart(backRef, 'back', [0, BENCH_HEIGHT + 0.45, -0.28], [0.15, 0, 0], ws);

      const supportX = ws > 1.5 ? [-hw, -hw * 0.34, 0, hw * 0.34, hw] : [-hw, hw];
      supportX.forEach(lx => {
        addPart(legHRef, 'legH', [lx, BENCH_HEIGHT - 0.05, 0]);
        addPart(legVRef, 'legV', [lx, (BENCH_HEIGHT - 0.05) * 0.5, 0.18]);
        addPart(legVRef, 'legV', [lx, (BENCH_HEIGHT - 0.05) * 0.5, -0.18]);
        addPart(legVRef, 'legV', [lx, BENCH_HEIGHT + 0.2, -0.22], [0.15, 0, 0]);
      });

      addPart(armRef, 'arm', [-hw, BENCH_HEIGHT + 0.15, 0.05], [-0.05, 0, 0]);
      addPart(armRef, 'arm', [hw, BENCH_HEIGHT + 0.15, 0.05], [-0.05, 0, 0]);
    });

    [seatRef, backRef, legHRef, legVRef, armRef].forEach(r => { if (r.current) r.current.instanceMatrix.needsUpdate = true });
  }, [data]);

  const totalBenches = data.length;
  const maxLegSupport = data.reduce((acc, b) => acc + ((b.widthScale ?? 1) > 1.5 ? 5 : 2), 0);

  return (
    <group>
      <instancedMesh ref={seatRef} args={[seatPlankGeo, benchWoodMat, totalBenches * 4]} castShadow />
      <instancedMesh ref={backRef} args={[backPlankGeo, benchWoodMat, totalBenches * 3]} castShadow />
      <instancedMesh ref={legHRef} args={[legHorizontalGeo, benchMetalMat, maxLegSupport]} castShadow />
      <instancedMesh ref={legVRef} args={[legVerticalGeo, benchMetalMat, maxLegSupport * 3]} castShadow />
      <instancedMesh ref={armRef} args={[armRestGeo, benchMetalMat, totalBenches * 2]} castShadow />
    </group>
  );
}

function CherryPetals({ data }: { data: { x: number, z: number, scale: number }[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = data.length * 40;
  const petals = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const tree = data[Math.floor(i / 40)];
      return {
        tree,
        x: (Math.random() - 0.5) * 6 * tree.scale,
        y: 4 + Math.random() * 8,
        z: (Math.random() - 0.5) * 6 * tree.scale,
        speed: 0.5 + Math.random() * 0.5,
        rotSpeed: Math.random() * 2,
        phase: Math.random() * Math.PI * 2,
      };
    });
  }, [data, count]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const dummy = new THREE.Object3D();
    const t = state.clock.elapsedTime;
    petals.forEach((p, i) => {
      const y = ((p.y - t * p.speed) % 12 + 12) % 12 - 1.5;
      const x = p.tree.x + p.x + Math.sin(t * 0.5 + p.phase) * 0.5;
      const z = p.tree.z + p.z + Math.cos(t * 0.3 + p.phase) * 0.5;
      dummy.position.set(x, y, z);
      dummy.rotation.set(t * p.rotSpeed, t * p.rotSpeed * 0.5, 0);
      dummy.scale.setScalar(0.05 + Math.sin(t + p.phase) * 0.02);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={meshRef} args={[new THREE.PlaneGeometry(0.1, 0.1), petalMat, count]} />;
}

function Trees({ data, type }: { data: { x: number, z: number, scale: number }[], type: 'pine' | 'oak' | 'cherry' }) {
  const partsPerTree = type === 'pine' ? 4 : 6; // Increased density
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const leavesRef = useRef<THREE.InstancedMesh>(null);
  const leavesGeo = type === 'pine' ? pineLeavesGeo : type === 'oak' ? oakLeavesGeo : cherryLeavesGeo;
  const leavesMat = type === 'pine' ? pineLeavesMat : type === 'oak' ? oakLeavesMat : cherryLeavesMat;

  useLayoutEffect(() => {
    if (!trunkRef.current || !leavesRef.current) return;
    const dummy = new THREE.Object3D();
    let seed = type === 'pine' ? 1 : type === 'oak' ? 42 : 100;
    const random = () => { const x = Math.sin(seed++) * 10000; return x - Math.floor(x); };

    data.forEach((tree, id) => {
      const { x, z, scale: originalScale } = tree;
      const scale = originalScale * ENV_PROP_SCALE_FACTOR;
      const baseY = getTerrainHeight(x, z);
      dummy.position.set(x, baseY + 2 * scale, z);
      dummy.rotation.set(0, random() * 0.2, 0); dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix(); trunkRef.current!.setMatrixAt(id, dummy.matrix);

      for (let p = 0; p < partsPerTree; p++) {
        if (type === 'pine') {
          dummy.position.set(x, baseY + (3 + p * 1.5) * scale, z);
          dummy.rotation.set(0, random() * Math.PI, 0);
          dummy.scale.setScalar(scale * (1 - p * 0.15));
        } else {
          // More organic canopy clustering
          const radius = (1.5 + random() * 1.5) * scale;
          const angle = random() * Math.PI * 2;
          dummy.position.set(x + Math.sin(angle) * radius, baseY + (4 + random() * 2) * scale, z + Math.cos(angle) * radius);
          dummy.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
          dummy.scale.setScalar(scale * (0.8 + random() * 0.5));
        }
        dummy.updateMatrix(); leavesRef.current!.setMatrixAt(id * partsPerTree + p, dummy.matrix);
      }
    });
    trunkRef.current.instanceMatrix.needsUpdate = true;
    leavesRef.current.instanceMatrix.needsUpdate = true;
  }, [data, type]);

  // Wind sway
  useFrame((state) => {
    if (!leavesRef.current) return;
    const t = state.clock.elapsedTime;
    const sway = Math.sin(t * 0.5) * 0.04;
    leavesRef.current.rotation.z = sway;
    leavesRef.current.rotation.x = Math.cos(t * 0.4) * 0.03;
  });

  return (
    <group>
      <instancedMesh ref={trunkRef} args={[trunkGeo, trunkMat, data.length]} castShadow receiveShadow />
      <instancedMesh ref={leavesRef} args={[leavesGeo, leavesMat, data.length * partsPerTree]} castShadow receiveShadow />
      {type === 'cherry' && <CherryPetals data={data} />}
    </group>
  );
}

function AnimatedPond() {
  const pondGeo = useMemo(() => {
    const geo = new THREE.RingGeometry(0.001, POND_RADIUS, 128, 16);
    geo.rotateX(-Math.PI / 2); // Put it flat
    return geo;
  }, []);

  const matRef = useRef<THREE.ShaderMaterial>(null);

  useFrame((state) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <mesh geometry={pondGeo} position={[0, -0.20, 0]}>
      {/* @ts-ignore custom shader material syntax */}
      <stylizedWaterMaterial ref={matRef} />
    </mesh>
  );
}

function PondCollision() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { addCollidableMesh, removeCollidableMesh } = useGameStore();

  useLayoutEffect(() => {
    if (!meshRef.current) return;
    const mesh = meshRef.current;
    mesh.layers.enable(1);
    addCollidableMesh(mesh);
    return () => removeCollidableMesh(mesh.uuid);
  }, [addCollidableMesh, removeCollidableMesh]);

  return (
    <mesh
      ref={meshRef}
      position={[0, -0.72, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      visible={false}
    >
      <circleGeometry args={[POND_RADIUS, 48]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
}

export default function DonutCenterPark({ benchData, treeData }: { benchData: any[], treeData: any[] }) {
  const pathGeo = useMemo(() => {
    const steps = 200;
    const baseWidth = 0.9; // Base width of path
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const uvs = [];
    const indices = [];

    const getPathPos = (t: number) => {
      const angle = t * Math.PI * 2;
      // Meandering organic ellipse encircling the pond
      const r = POND_RADIUS + 3.0 + Math.sin(angle * 2) * 5.0 + Math.cos(angle * 3) * 2.0;
      return { x: Math.sin(angle) * r, z: Math.cos(angle) * r };
    };

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const pos = getPathPos(t);
      const posNext = getPathPos((t + 0.005) % 1.0);

      let dx = posNext.x - pos.x;
      let dz = posNext.z - pos.z;
      let len = Math.hypot(dx, dz);

      const nx = -dz / len;
      const nz = dx / len;

      const w = baseWidth * ENV_PROP_SCALE_FACTOR;

      const xLeft = pos.x + nx * w;
      const zLeft = pos.z + nz * w;
      const xRight = pos.x - nx * w;
      const zRight = pos.z - nz * w;

      vertices.push(xLeft, getTerrainHeight(xLeft, zLeft) + 0.05, zLeft);
      vertices.push(xRight, getTerrainHeight(xRight, zRight) + 0.05, zRight);

      uvs.push(0, t * 15);
      uvs.push(1, t * 15);

      if (i < steps) {
        const a = i * 2;
        const b = i * 2 + 1;
        const c = i * 2 + 2;
        const d = i * 2 + 3;
        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }, []);

  const terrainGeo = useMemo(() => {
    const geo = new THREE.RingGeometry(0.001, DEFAULT_RING_INNER_RADIUS, 128, 64);
    geo.rotateX(-Math.PI / 2); // Lay it flat
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, getTerrainHeight(pos.getX(i), pos.getZ(i)));
    }
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    return geo;
  }, []);

  const pondBottomGeo = useMemo(() => new THREE.CylinderGeometry(POND_RADIUS + 0.5, POND_RADIUS - 1.0, 1.0, 64), []);

  return (
    <group position={[DEFAULT_LAB_HUB.x, DEFAULT_LAB_HUB.y, DEFAULT_LAB_HUB.z]}>
      {/* Park-specific lighting */}
      <pointLight position={[0, 10, 0]} color="#fff5e0" intensity={1.8} distance={65} decay={1.8} castShadow />
      <pointLight position={[0, 2.5, 0]} color="#4ca8cc" intensity={0.9} distance={28} decay={2} />
      <hemisphereLight args={["#c8eeff", "#5a9468", 0.55]} />

      {/* Terrain — layer 1 for walkable raycasting */}
      <mesh geometry={terrainGeo} material={grassMat} position={[0, 0, 0]} receiveShadow onUpdate={(self) => self.layers.enable(1)} />
      <mesh geometry={pathGeo} material={pathMat} position={[0, 0, 0]} receiveShadow onUpdate={(self) => self.layers.enable(1)} />
      <mesh geometry={pondBottomGeo} material={pondBottomMat} position={[0, -0.95, 0]} receiveShadow />

      {/* Pond */}
      <AnimatedPond />
      <PondEcosystem />
      <LilyPads />

      {/* Invisible collision floor over pond so player doesn't sink */}
      <PondCollision />

      <Trees data={treeData.filter(t => t.type === 'oak')} type="oak" />
      <Trees data={treeData.filter(t => t.type === 'cherry')} type="cherry" />
      <Trees data={treeData.filter(t => t.type === 'pine')} type="pine" />

      {/* Dock — at waterline, pre-scaled geometry */}
      <group position={[DOCK_X, -0.18, 0]}>
        <mesh
          geometry={new THREE.BoxGeometry(3.5 * ENV_PROP_SCALE_FACTOR, 0.1 * ENV_PROP_SCALE_FACTOR, 4.0 * ENV_PROP_SCALE_FACTOR)}
          material={benchWoodMat} castShadow receiveShadow
          onUpdate={(self) => self.layers.enable(1)}
        />
        <mesh geometry={new THREE.CylinderGeometry(0.12 * ENV_PROP_SCALE_FACTOR, 0.12 * ENV_PROP_SCALE_FACTOR, 1.8 * ENV_PROP_SCALE_FACTOR)}
          material={benchWoodMat} position={[-1.6 * ENV_PROP_SCALE_FACTOR, -0.85 * ENV_PROP_SCALE_FACTOR, -1.9 * ENV_PROP_SCALE_FACTOR]} />
        <mesh geometry={new THREE.CylinderGeometry(0.12 * ENV_PROP_SCALE_FACTOR, 0.12 * ENV_PROP_SCALE_FACTOR, 1.8 * ENV_PROP_SCALE_FACTOR)}
          material={benchWoodMat} position={[1.6 * ENV_PROP_SCALE_FACTOR, -0.85 * ENV_PROP_SCALE_FACTOR, 1.9 * ENV_PROP_SCALE_FACTOR]} />
      </group>

      <Benches data={benchData} />
    </group>
  );
}
