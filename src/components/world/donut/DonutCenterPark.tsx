import React, { useMemo, useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame, extend } from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei";
import { grassMaterial, pondBottomMat, concreteMaterial, floorMaterial } from "./DonutMaterials";
import { DEFAULT_LAB_HUB, DEFAULT_RING_INNER_RADIUS, ENV_PROP_SCALE_FACTOR } from "./labFloorConstants";

const POND_RADIUS = 16.0;
const DOCK_X = 15.3;

// --- Path & Terrain Math ---
export const getTerrainHeight = (x: number, z: number): number => {
  const distance = Math.sqrt(x*x + z*z);
  const distToDock = Math.hypot(x - DOCK_X, z - 0);
  
  let dockBlend = 0;
  if (distToDock < 4.0) {
    dockBlend = Math.pow(1 - (distToDock / 4.0), 2);
  }

  let y = 0;
  if (distance < POND_RADIUS - 2.0) {
    y = -0.6; // Deep basin
  } else if (distance < POND_RADIUS) {
    // Smoother cubic easing for the pond bank
    const t = (distance - (POND_RADIUS - 2.0)) / 2.0;
    y = -0.6 + (t * t * (3 - 2 * t)) * 0.9;
  } else {
    // Elegant, curated rolling hills that reach up to 1.5 height
    const noise = Math.sin(x * 0.15) * Math.cos(z * 0.15) * 1.5;
    // Plus a grand hill on one side for the oak tree
    const bigHill = Math.max(0, 1 - Math.hypot(x + 15, z - 15) / 20) * 2.5;
    const edgeBlend = Math.min(1, (DEFAULT_RING_INNER_RADIUS - distance) / 4);
    y = 0.3 + (noise + bigHill) * edgeBlend;
  }
  
  if (dockBlend > 0 && distance >= POND_RADIUS - 2.0) {
    y = y * (1 - dockBlend) + 0.4 * dockBlend;
  }
  return y - 0.75;
};

// --- Low Poly Geometries ---
const trunkGeo = new THREE.CylinderGeometry(0.2, 0.4, 4, 5);
const pineLeavesGeo = new THREE.ConeGeometry(2, 5, 5);
const oakLeavesGeo = new THREE.IcosahedronGeometry(2.5, 1);
const cherryLeavesGeo = new THREE.IcosahedronGeometry(2.2, 1);

const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9, flatShading: true });
const pineLeavesMat = new THREE.MeshStandardMaterial({ color: 0x2d4c1e, roughness: 0.8, flatShading: true });
const oakLeavesMat = new THREE.MeshStandardMaterial({ color: 0x4a6b36, roughness: 0.8, flatShading: true });
const cherryLeavesMat = new THREE.MeshStandardMaterial({ color: 0xffb7c5, roughness: 0.8, flatShading: true });

const lilyPadGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.02, 16, 1, false, 0, Math.PI * 1.7);
const lilyPadMat = new THREE.MeshStandardMaterial({ color: 0x2d5a27, roughness: 0.9 });
const pathMat = new THREE.MeshStandardMaterial({ color: 0xeae1d0, roughness: 1.0, flatShading: true, side: THREE.DoubleSide });

const benchWoodMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.9 });
const benchMetalMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6, metalness: 0.9 });
const benchWidth = 1.6;
const seatPlankGeo = new THREE.BoxGeometry(benchWidth, 0.04, 0.08);
const backPlankGeo = new THREE.BoxGeometry(benchWidth, 0.08, 0.04);
const legVerticalGeo = new THREE.BoxGeometry(0.04, 0.4, 0.04);
const legHorizontalGeo = new THREE.BoxGeometry(0.04, 0.04, 0.45);
const armRestGeo = new THREE.BoxGeometry(0.03, 0.03, 0.45);

const fishBodyGeo = new THREE.SphereGeometry(0.12, 16, 16); fishBodyGeo.scale(1, 1.5, 3);
const fishTailGeo = new THREE.BoxGeometry(0.02, 0.25, 0.3); fishTailGeo.translate(0, 0, -0.15);
const fishFinGeo = new THREE.BoxGeometry(0.2, 0.02, 0.15);
const koiColors = [0xff4400, 0xeeeeee, 0x222222, 0xffbb00, 0xff2222];

// --- Custom Optimized Water Shader ---
const StylizedWaterMaterial = shaderMaterial(
  { uTime: 0, uColor: new THREE.Color(0x2288cc), uFoamColor: new THREE.Color(0xffffff) },
  // vertex shader
  `
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform float uTime;
    void main() {
      vUv = uv;
      vec3 pos = position;
      float wave1 = sin(pos.x * 0.2 + uTime * 1.0) * 0.04;
      float wave2 = cos(pos.y * 0.2 + uTime * 0.8) * 0.04;
      pos.z += wave1 + wave2;
      vPosition = pos;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  // fragment shader
  `
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform vec3 uColor;
    uniform vec3 uFoamColor;
    void main() {
      float waveDepth = smoothstep(-0.04, 0.04, vPosition.z);
      vec3 finalColor = mix(uColor, uFoamColor, waveDepth * 0.3);
      gl_FragColor = vec4(finalColor, 0.65);
    }
  `,
  (mat) => {
    if (mat) {
      mat.transparent = true;
      mat.depthWrite = false;
    }
  }
);
extend({ StylizedWaterMaterial });

// --- Ecosystem Logic ---
type SharedKoi = { id: number; pos: THREE.Vector3; alive: boolean; die: () => void; };
const sharedEcosystem = { kois: [] as SharedKoi[], arowanaPos: new THREE.Vector3(0, -100, 0) };

function Fish({ id, onDie }: { id: number, onDie: (id: number) => void }) {
  const groupRef = React.useRef<THREE.Group>(null);
  const tailRef = React.useRef<THREE.Mesh>(null);
  const [color] = React.useState(() => koiColors[id % koiColors.length]);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.2, metalness: 0.1 }), [color]);
  
  const state = React.useRef({
    pos: new THREE.Vector3((Math.random()-0.5)*(POND_RADIUS-2), -0.7 - Math.random()*0.2, (Math.random()-0.5)*(POND_RADIUS-2)),
    vel: new THREE.Vector3(0, 0, 1),
    speed: 0.3 + Math.random() * 0.4,
    wanderAngle: Math.random() * Math.PI * 2
  });

  React.useEffect(() => {
    const koi = { id, pos: state.current.pos, alive: true, die: () => onDie(id) };
    sharedEcosystem.kois.push(koi);
    return () => {
      koi.alive = false;
      sharedEcosystem.kois = sharedEcosystem.kois.filter(k => k.id !== id);
    };
  }, [id, onDie]);
  
  const v1 = useMemo(() => new THREE.Vector3(), []);
  const v2 = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    if (!groupRef.current || !tailRef.current) return;
    const s = state.current;
    
    s.wanderAngle += (Math.random() - 0.5) * 0.05;
    s.vel.x += (Math.sin(s.wanderAngle) - s.vel.x) * 0.05;
    s.vel.z += (Math.cos(s.wanderAngle) - s.vel.z) * 0.05;
    
    const dist = Math.hypot(s.pos.x, s.pos.z);
    if (dist > POND_RADIUS - 2.0) {
      v1.set(-s.pos.x, 0, -s.pos.z).normalize();
      s.vel.lerp(v1, 0.1);
      if (dist > POND_RADIUS - 1.0) {
        s.pos.x = (s.pos.x / dist) * (POND_RADIUS - 1.0);
        s.pos.z = (s.pos.z / dist) * (POND_RADIUS - 1.0);
      }
    }
    
    if (s.vel.lengthSq() < 0.01) {
      s.vel.x = Math.sin(s.wanderAngle);
      s.vel.z = Math.cos(s.wanderAngle);
    }
    
    let currentSpeed = s.speed;
    if (s.pos.distanceTo(sharedEcosystem.arowanaPos) < 10.0) {
      v1.subVectors(s.pos, sharedEcosystem.arowanaPos).setY(0).normalize();
      s.vel.lerp(v1, 0.2);
      currentSpeed *= 3.0;
    }
    
    s.vel.y = 0;
    v2.copy(s.vel).normalize().multiplyScalar(currentSpeed * delta);
    s.pos.add(v2);
    s.pos.y = Math.max(-1.1, Math.min(-0.5, s.pos.y));
    
    groupRef.current.position.copy(s.pos);
    
    const targetRot = Math.atan2(s.vel.x, s.vel.z);
    let diff = targetRot - groupRef.current.rotation.y;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    groupRef.current.rotation.y += diff * 0.1;
    tailRef.current.rotation.y = Math.sin(_.clock.elapsedTime * 15 * currentSpeed) * 0.3;
  });
  
  return (
    <group ref={groupRef} scale={[1.2 * ENV_PROP_SCALE_FACTOR, 1.2 * ENV_PROP_SCALE_FACTOR, 1.2 * ENV_PROP_SCALE_FACTOR]}>
      <mesh geometry={fishBodyGeo} material={mat} castShadow />
      <mesh ref={tailRef} geometry={fishTailGeo} material={mat} position={[0, 0, -0.35]} castShadow />
    </group>
  );
}

function Arowana() {
  const groupRef = React.useRef<THREE.Group>(null);
  const state = React.useRef({ pos: new THREE.Vector3(0, -0.8, 0), vel: new THREE.Vector3(1, 0, 0), speed: 1.2, wanderAngle: 0, hunger: 50 });
  const aroMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 0.8, roughness: 0.2 }), []);
  
  const v1 = useMemo(() => new THREE.Vector3(), []);
  const v2 = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const s = state.current;
    s.hunger += delta * 2;
    let hasTarget = false;
    
    if (s.hunger > 60) {
      let closestDist = Infinity;
      let closestKoi: SharedKoi | null = null;
      for (const koi of sharedEcosystem.kois) {
        if (!koi.alive) continue;
        const d = s.pos.distanceTo(koi.pos);
        if (d < closestDist) { closestDist = d; closestKoi = koi; }
      }
      if (closestKoi) {
        if (closestDist < 2.5) { closestKoi.die(); s.hunger = 0; }
        else {
          v1.subVectors(closestKoi.pos, s.pos).setY(0).normalize();
          hasTarget = true;
        }
      }
    }
    
    if (hasTarget) {
      s.vel.lerp(v1, 0.08); s.speed = 3.5;
    } else {
      s.wanderAngle += (Math.random() - 0.5) * 0.05;
      s.vel.x += (Math.sin(s.wanderAngle) - s.vel.x) * 0.02;
      s.vel.z += (Math.cos(s.wanderAngle) - s.vel.z) * 0.02;
      s.speed = 1.2;
    }
    
    const dist = Math.hypot(s.pos.x, s.pos.z);
    if (dist > POND_RADIUS - 2.0) {
      v2.set(-s.pos.x, 0, -s.pos.z).normalize();
      s.vel.lerp(v2, 0.1);
      if (dist > POND_RADIUS - 1.0) {
        s.pos.x = (s.pos.x / dist) * (POND_RADIUS - 1.0);
        s.pos.z = (s.pos.z / dist) * (POND_RADIUS - 1.0);
      }
    }
    
    s.vel.y = 0;
    v2.copy(s.vel).normalize().multiplyScalar(s.speed * delta);
    s.pos.add(v2);
    s.pos.y = Math.max(-1.1, Math.min(-0.5, s.pos.y));
    
    groupRef.current.position.copy(s.pos);
    sharedEcosystem.arowanaPos.copy(s.pos);
    const targetRot = Math.atan2(s.vel.x, s.vel.z);
    let diff = targetRot - groupRef.current.rotation.y;
    while(diff < -Math.PI) diff += Math.PI * 2;
    while(diff > Math.PI) diff -= Math.PI * 2;
    groupRef.current.rotation.y += diff * 0.08;
  });
  
  return (
    <group ref={groupRef} scale={[0.15 * ENV_PROP_SCALE_FACTOR, 0.15 * ENV_PROP_SCALE_FACTOR, 0.15 * ENV_PROP_SCALE_FACTOR]}>
      <mesh material={aroMat} castShadow>
        <sphereGeometry args={[1, 32, 16]} />
      </mesh>
    </group>
  );
}

function PondEcosystem() {
  const [kois, setKois] = React.useState<{id: number}[]>(Array.from({ length: 45 }).map((_, i) => ({ id: i }))); // Larger pond, more fish!
  const nextId = React.useRef(45);
  const handleDie = React.useCallback((id: number) => setKois(p => p.filter(k => k.id !== id)), []);

  React.useEffect(() => {
    const intv = setInterval(() => setKois(p => p.length < 55 ? [...p, { id: nextId.current++ }] : p), 2000);
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
    for(let i=0; i<count; i++){
      const angle = Math.random() * Math.PI * 2;
      const r = POND_RADIUS - Math.random() * 4 - 1; 
      dummy.position.set(Math.sin(angle) * r, -0.19, Math.cos(angle) * r);
      dummy.rotation.set(0, Math.random() * Math.PI, 0);
      const s = 0.5 + Math.random() * 0.7;
      dummy.scale.set(s,s,s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, []);
  
  return <instancedMesh ref={meshRef} args={[lilyPadGeo, lilyPadMat, count]} receiveShadow />;
}

// --- Scenery ---
function Benches({ data }: { data: { position: number[], rotation: number[] }[] }) {
  const seatRef = useRef<THREE.InstancedMesh>(null);
  const backRef = useRef<THREE.InstancedMesh>(null);
  const legHRef = useRef<THREE.InstancedMesh>(null);
  const legVRef = useRef<THREE.InstancedMesh>(null);
  const armRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    if (!seatRef.current || !backRef.current || !legHRef.current || !legVRef.current || !armRef.current) return;
    const dummy = new THREE.Object3D();
    const groupDummy = new THREE.Object3D();
    let c = { seat: 0, back: 0, legH: 0, legV: 0, arm: 0 };

    data.forEach((b) => {
      const terrainY = getTerrainHeight(b.position[0], b.position[2]);
      groupDummy.position.set(b.position[0], terrainY, b.position[2]);
      groupDummy.rotation.set(b.rotation[0], b.rotation[1], b.rotation[2]);
      groupDummy.scale.setScalar(ENV_PROP_SCALE_FACTOR);
      groupDummy.updateMatrix();

      const addPart = (ref: any, countKey: keyof typeof c, pos: [number,number,number], rot: [number,number,number]=[0,0,0]) => {
        dummy.position.set(...pos); dummy.rotation.set(...rot); dummy.scale.setScalar(1);
        dummy.updateMatrix(); dummy.applyMatrix4(groupDummy.matrix);
        ref.current.setMatrixAt(c[countKey]++, dummy.matrix);
      };

      addPart(seatRef, 'seat', [0, 0.42, 0.15]); addPart(seatRef, 'seat', [0, 0.42, 0.05]);
      addPart(seatRef, 'seat', [0, 0.42, -0.05]); addPart(seatRef, 'seat', [0, 0.42, -0.15]);
      addPart(backRef, 'back', [0, 0.55, -0.22], [0.15, 0, 0]); addPart(backRef, 'back', [0, 0.68, -0.25], [0.15, 0, 0]);
      addPart(backRef, 'back', [0, 0.81, -0.28], [0.15, 0, 0]);
      addPart(legHRef, 'legH', [-0.7, 0.4, 0]); addPart(legHRef, 'legH', [0.7, 0.4, 0]);
      addPart(legVRef, 'legV', [-0.7, 0.2, 0.18]); addPart(legVRef, 'legV', [-0.7, 0.2, -0.18]);
      addPart(legVRef, 'legV', [-0.7, 0.6, -0.22], [0.15, 0, 0]);
      addPart(legVRef, 'legV', [0.7, 0.2, 0.18]); addPart(legVRef, 'legV', [0.7, 0.2, -0.18]);
      addPart(legVRef, 'legV', [0.7, 0.6, -0.22], [0.15, 0, 0]);
      addPart(armRef, 'arm', [-0.7, 0.55, 0.05], [-0.05, 0, 0]); addPart(armRef, 'arm', [0.7, 0.55, 0.05], [-0.05, 0, 0]);
    });

    [seatRef, backRef, legHRef, legVRef, armRef].forEach(r => { if(r.current) r.current.instanceMatrix.needsUpdate = true });
  }, [data]);

  return (
    <group>
      <instancedMesh ref={seatRef} args={[seatPlankGeo, benchWoodMat, data.length * 4]} castShadow />
      <instancedMesh ref={backRef} args={[backPlankGeo, benchWoodMat, data.length * 3]} castShadow />
      <instancedMesh ref={legHRef} args={[legHorizontalGeo, benchMetalMat, data.length * 2]} castShadow />
      <instancedMesh ref={legVRef} args={[legVerticalGeo, benchMetalMat, data.length * 6]} castShadow />
      <instancedMesh ref={armRef} args={[armRestGeo, benchMetalMat, data.length * 2]} castShadow />
    </group>
  );
}

function Trees({ data, type }: { data: {x:number, z:number, scale:number}[], type: 'pine'|'oak'|'cherry' }) {
  const partsPerTree = type === 'pine' ? 3 : 4;
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const leavesRef = useRef<THREE.InstancedMesh>(null);
  const leavesGeo = type === 'pine' ? pineLeavesGeo : type === 'oak' ? oakLeavesGeo : cherryLeavesGeo;
  const leavesMat = type === 'pine' ? pineLeavesMat : type === 'oak' ? oakLeavesMat : cherryLeavesMat;

  useLayoutEffect(() => {
    if (!trunkRef.current || !leavesRef.current) return;
    const dummy = new THREE.Object3D();
    let seed = type==='pine'?1:type==='oak'?42:100;
    const random = () => { const x = Math.sin(seed++)*10000; return x - Math.floor(x); };

    data.forEach((tree, id) => {
      const { x, z, scale: originalScale } = tree;
      const scale = originalScale * ENV_PROP_SCALE_FACTOR;
      const baseY = getTerrainHeight(x, z);
      dummy.position.set(x, baseY + 2*scale, z);
      dummy.rotation.set(0, random()*0.2, 0); dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix(); trunkRef.current!.setMatrixAt(id, dummy.matrix);
      
      for(let p=0; p<partsPerTree; p++) {
        if (type === 'pine') {
          dummy.position.set(x, baseY + (3+p*1.5)*scale, z);
          dummy.rotation.set(0, random()*Math.PI, 0);
          dummy.scale.setScalar(scale*(1-p*0.2));
        } else {
          dummy.position.set(x + (random()-0.5)*2*scale, baseY + (3.5+random()*1.5)*scale, z + (random()-0.5)*2*scale);
          dummy.rotation.set(random()*Math.PI, random()*Math.PI, random()*Math.PI);
          dummy.scale.setScalar(scale*(0.8+random()*0.4));
        }
        dummy.updateMatrix(); leavesRef.current!.setMatrixAt(id * partsPerTree + p, dummy.matrix);
      }
    });
    trunkRef.current.instanceMatrix.needsUpdate = true;
    leavesRef.current.instanceMatrix.needsUpdate = true;
  }, [data, type]);

  return (
    <group>
      <instancedMesh ref={trunkRef} args={[trunkGeo, trunkMat, data.length]} castShadow receiveShadow />
      <instancedMesh ref={leavesRef} args={[leavesGeo, leavesMat, data.length*partsPerTree]} castShadow receiveShadow />
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
      {/* Terrain - we enable layer 1 here for raycasting so agents walk on the hills! */}
      <mesh geometry={terrainGeo} material={grassMaterial} position={[0, 0, 0]} receiveShadow onUpdate={(self) => self.layers.enable(1)} />
      <mesh geometry={pathGeo} material={pathMat} position={[0, 0, 0]} receiveShadow onUpdate={(self) => self.layers.enable(1)} />
      <mesh geometry={pondBottomGeo} material={pondBottomMat} position={[0, -0.95, 0]} receiveShadow />
      
      {/* Pond */}
      <AnimatedPond />
      <PondEcosystem />
      <LilyPads />
      
      <Trees data={treeData.filter(t => t.type === 'oak')} type="oak" />
      <Trees data={treeData.filter(t => t.type === 'cherry')} type="cherry" />
      <Trees data={treeData.filter(t => t.type === 'pine')} type="pine" />
      
      {/* Dock */}
      <group position={[DOCK_X, -0.10, 0]} scale={[ENV_PROP_SCALE_FACTOR, ENV_PROP_SCALE_FACTOR, ENV_PROP_SCALE_FACTOR]}>
        <mesh geometry={new THREE.BoxGeometry(3.5, 0.1, 4)} material={benchWoodMat} castShadow receiveShadow onUpdate={(self) => self.layers.enable(1)} />
        <mesh geometry={new THREE.CylinderGeometry(0.1, 0.1, 1.5)} material={benchWoodMat} position={[-1.5, -0.7, -1.8]} />
        <mesh geometry={new THREE.CylinderGeometry(0.1, 0.1, 1.5)} material={benchWoodMat} position={[1.5, -0.7, 1.8]} />
      </group>
      
      <Benches data={benchData} />
    </group>
  );
}
