import React, { useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGameStore } from "@/store/gameStore";
import * as THREE from "three";
import { glassMaterial, structuralMetalMaterial, soffitMaterial, doorHandleMaterial } from "./DonutMaterials";
import { 
  outerWallSegmentGeo, innerWallSegmentGeo,
  outerRingGeometry, roofGeometry, roofSoffitGeometry,
  mullionGeo, transomGeo, finGeo, doorPillarGeo, doorLintelGeo, doorTrackGeo, doorGlassGeo, doorHandleGeo, DOOR_WIDTH
} from "./DonutGeometries";
import { DEFAULT_LAB_HUB, DEFAULT_RING_OUTER_RADIUS } from "./labFloorConstants";

function Door({ radius, angle, id }: { radius: number, angle: number, id: string }) {
  const x = Math.sin(angle) * radius;
  const z = Math.cos(angle) * radius;
  const doorHeight = 12;
  const doorY = DEFAULT_LAB_HUB.y + doorHeight / 2;

  const [isOpen, setIsOpen] = useState(false);
  const targetId = useGameStore(state => state.interactionTarget);

  useEffect(() => {
    if (targetId === id) {
       setIsOpen(true);
       useGameStore.getState().setInteractionTarget(null);
    }
  }, [targetId, id]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setIsOpen(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Create an invisible blocking radius for the player physics
  useEffect(() => {
    if (isOpen) return;
    const obs = {
      position: new THREE.Vector3(DEFAULT_LAB_HUB.x + x, DEFAULT_LAB_HUB.y, DEFAULT_LAB_HUB.z + z),
      radius: DOOR_WIDTH / 1.7,
      type: "door" as const,
    };
    useGameStore.getState().addObstacles([obs]);
    return () => {
      useGameStore.getState().removeObstacles([obs]);
    };
  }, [isOpen, x, z]);

  const leftDoorRef = useRef<THREE.Group>(null);
  const rightDoorRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!leftDoorRef.current || !rightDoorRef.current) return;
    const target = isOpen ? DOOR_WIDTH / 2.2 : 0;
    leftDoorRef.current.position.x += (-target - leftDoorRef.current.position.x) * 0.1;
    rightDoorRef.current.position.x += (target - rightDoorRef.current.position.x) * 0.1;
  });

  return (
    <group position={[DEFAULT_LAB_HUB.x + x, doorY, DEFAULT_LAB_HUB.z + z]} rotation={[0, angle, 0]}>
      <mesh geometry={doorPillarGeo} material={structuralMetalMaterial} position={[-DOOR_WIDTH/2, 0, 0]} castShadow receiveShadow onUpdate={(self) => self.layers.enable(1)} />
      <mesh geometry={doorPillarGeo} material={structuralMetalMaterial} position={[DOOR_WIDTH/2, 0, 0]} castShadow receiveShadow onUpdate={(self) => self.layers.enable(1)} />
      <mesh name="Ceiling_Lintel" geometry={doorLintelGeo} material={structuralMetalMaterial} position={[0, doorHeight/2, 0]} castShadow receiveShadow />
      
      <mesh name="Ceiling_Track" geometry={doorTrackGeo} material={structuralMetalMaterial} position={[0, doorHeight/2 - 0.4, 0]} castShadow />

      <group position={[0, -0.1, 0]}>
        <group ref={leftDoorRef}>
          <group position={[-DOOR_WIDTH/4 - 0.2, 0, 0.1]}>
            <mesh name="Ceiling_Glass" geometry={doorGlassGeo} material={glassMaterial} onUpdate={(self) => self.layers.enable(1)} />
            <mesh name="Ceiling_Handle" geometry={doorHandleGeo} material={doorHandleMaterial} position={[DOOR_WIDTH/4 - 0.4, 0, 0.15]} />
          </group>
        </group>
  
        <group ref={rightDoorRef}>
          <group position={[DOOR_WIDTH/4 + 0.2, 0, -0.1]}>
            <mesh name="Ceiling_Glass" geometry={doorGlassGeo} material={glassMaterial} onUpdate={(self) => self.layers.enable(1)} />
            <mesh name="Ceiling_Handle" geometry={doorHandleGeo} material={doorHandleMaterial} position={[-DOOR_WIDTH/4 + 0.4, 0, 0.15]} />
          </group>
        </group>
      </group>
    </group>
  );
}

function Transoms({ radius, count, yPos, levels }: { radius: number, count: number, yPos: number, levels: number[] }) {
  const meshRef = React.useRef<THREE.InstancedMesh>(null);
  const totalInstances = count * levels.length;
  
  React.useLayoutEffect(() => {
    if (!meshRef.current) return;
    const dummy = new THREE.Object3D();
    let idx = 0;
    
    const circumference = 2 * Math.PI * radius;
    const transomWidth = (circumference / count) + 0.1;
    
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.PI / count);
      const modAngle = (angle - Math.PI / count) % (Math.PI / 2);
      const gap = DOOR_WIDTH / radius;
      
      const isDoorGap = modAngle < gap / 2 || modAngle > (Math.PI / 2 - gap / 2);
      
      for (let j = 0; j < levels.length; j++) {
        if (isDoorGap && levels[j] < 18) {
          dummy.position.set(0, -1000, 0);
        } else {
          const levelY = yPos - 15 + levels[j];
          dummy.position.set(Math.sin(angle) * radius, levelY, Math.cos(angle) * radius);
          dummy.rotation.set(0, angle, 0);
          dummy.scale.set(transomWidth, 1, 1);
        }
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(idx++, dummy.matrix);
      }
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [radius, count, yPos, levels]);

  return <instancedMesh name="Ceiling_Transoms" ref={meshRef} args={[transomGeo, structuralMetalMaterial, totalInstances]} castShadow receiveShadow onUpdate={(self) => self.layers.enable(1)} />;
}

function Mullions({ radius, count, yPos }: { radius: number, count: number, yPos: number }) {
  const meshRef = React.useRef<THREE.InstancedMesh>(null);
  
  React.useLayoutEffect(() => {
    if (!meshRef.current) return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const modAngle = angle % (Math.PI / 2);
      const gap = DOOR_WIDTH / radius;
      
      if (modAngle < gap / 2 || modAngle > (Math.PI / 2 - gap / 2)) {
        dummy.position.set(0, -1000, 0);
      } else {
        dummy.position.set(Math.sin(angle) * radius, yPos, Math.cos(angle) * radius);
        dummy.rotation.set(0, angle, 0);
        dummy.scale.set(1, 1, 1);
      }
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [radius, count, yPos]);

  return <instancedMesh name="Ceiling_Mullions" ref={meshRef} args={[mullionGeo, structuralMetalMaterial, count]} castShadow receiveShadow onUpdate={(self) => self.layers.enable(1)} />;
}

function Fins({ radius, count, yPos }: { radius: number, count: number, yPos: number }) {
  const meshRef = React.useRef<THREE.InstancedMesh>(null);
  
  React.useLayoutEffect(() => {
    if (!meshRef.current) return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const modAngle = angle % (Math.PI / 2);
      const gap = DOOR_WIDTH / radius;
      
      if (modAngle < gap / 2 || modAngle > (Math.PI / 2 - gap / 2)) {
        dummy.position.set(0, -1000, 0);
      } else {
        const finRadius = radius + 0.3;
        dummy.position.set(Math.sin(angle) * finRadius, yPos, Math.cos(angle) * finRadius);
        dummy.rotation.set(0, angle + Math.PI / 6, 0);
        dummy.scale.set(1, 1, 1);
      }
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [radius, count, yPos]);

  return <instancedMesh name="Ceiling_Fins" ref={meshRef} args={[finGeo, structuralMetalMaterial, count]} castShadow receiveShadow />;
}

export default function DonutWalls() {
  const wallHeight = 30;
  const yPos = DEFAULT_LAB_HUB.y + wallHeight / 2;
  const segments = [0, 1, 2, 3];
  const transomLevels = [12, 20, 28];

  return (
    <group>
      {/* Outer Glass Wall Segments */}
      {segments.map(i => (
        <mesh 
          key={`outer-${i}`}
          geometry={outerWallSegmentGeo} 
          material={glassMaterial} 
          position={[DEFAULT_LAB_HUB.x, yPos, DEFAULT_LAB_HUB.z]} 
          rotation={[0, i * Math.PI / 2, 0]}
          onUpdate={(self) => self.layers.enable(1)}
        />
      ))}

      {/* Architectural Mullions (Vertical Window Frames) */}
      <Mullions radius={DEFAULT_RING_OUTER_RADIUS} count={144} yPos={yPos} />

      {/* Architectural Transoms (Horizontal Window Frames) */}
      <Transoms radius={DEFAULT_RING_OUTER_RADIUS} count={144} yPos={yPos} levels={transomLevels} />

      {/* Exterior Sun Shades (Fins) */}
      <Fins radius={DEFAULT_RING_OUTER_RADIUS} count={144} yPos={yPos} />

      {/* Entrance Doors */}
      {segments.map(i => (
        <React.Fragment key={`doors-${i}`}>
          <Door radius={DEFAULT_RING_OUTER_RADIUS} angle={i * Math.PI / 2} id={`door-outer-${i}`} />
        </React.Fragment>
      ))}

      <mesh 
        name="Ceiling_MainRoof"
        geometry={roofGeometry} 
        material={structuralMetalMaterial} 
        position={[DEFAULT_LAB_HUB.x, DEFAULT_LAB_HUB.y + wallHeight, DEFAULT_LAB_HUB.z]} 
        castShadow
        receiveShadow
      />

      <mesh 
        name="Ceiling_Soffit"
        geometry={roofSoffitGeometry} 
        material={soffitMaterial} 
        position={[DEFAULT_LAB_HUB.x, DEFAULT_LAB_HUB.y + wallHeight - 0.25, DEFAULT_LAB_HUB.z]} 
        receiveShadow
      />
      
      <mesh 
        geometry={outerRingGeometry} 
        material={structuralMetalMaterial} 
        position={[DEFAULT_LAB_HUB.x, DEFAULT_LAB_HUB.y, DEFAULT_LAB_HUB.z]} 
      />
    </group>
  );
}
