import React, { useMemo, useEffect, useRef } from "react";
import * as THREE from "three";
import { Instances, Instance } from "@react-three/drei";
import { useGameStore, Obstacle } from "@/store/gameStore";
import { WorldDefinition, FurnitureDef } from "@/config/WorldConfig";
import {
  OfficeChair,
  OfficeDesk,
  ConferenceTable,
  LabWorkbench,
  StorageShelf,
  DesktopPC,
  CupboardUnit,
  ManagersDesk,
  ReceptionDesk,
  Sofa,
  OfficeDoor,
} from "./Furniture";

import {
  FileFolder,
  Whiteboard,
  ProjectorScreen,
  Laptop,
  PenDrive,
  SmallRack,
  FlowerPot,
  TV,
  CoffeeMachine,
  CoffeeCup,
  Telephone,
  CoffeeStation
} from "./Props";

// Standard materials for walls and floors
const wallMaterial = new THREE.MeshStandardMaterial({
  color: "#f4f6f8",
  roughness: 0.8,
});
const windowMaterial = new THREE.MeshPhysicalMaterial({
  color: "#88ccff",
  transmission: 0.9,
  opacity: 0.4,
  transparent: true,
  roughness: 0.1,
});
const defaultFloorMaterial = new THREE.MeshStandardMaterial({
  color: "#333b47",
  roughness: 0.7,
});

// A factory to map string IDs to our React components
function renderFurniture(f: FurnitureDef) {
  const commonProps = {
    key: f.id,
    id: f.id,
    position: f.position,
    rotation: f.rotationY,
    ...f
  };

  switch (f.type) {
    case 'OfficeChair': return <OfficeChair {...commonProps as any} />;
    case 'OfficeDesk': return <OfficeDesk {...commonProps as any} />;
    case 'ConferenceTable': return <ConferenceTable {...commonProps as any} />;
    case 'LabWorkbench': return <LabWorkbench {...commonProps as any} />;
    case 'StorageShelf': return <StorageShelf {...commonProps as any} />;
    case 'DesktopPC': return <DesktopPC {...commonProps as any} />;
    case 'CupboardUnit': return <CupboardUnit {...commonProps as any} />;
    case 'ManagersDesk': return <ManagersDesk {...commonProps as any} />;
    case 'ReceptionDesk': return <ReceptionDesk {...commonProps as any} />;
    case 'Sofa': return <Sofa {...commonProps as any} />;
    case 'OfficeDoor': return <OfficeDoor {...commonProps as any} />;
    case 'FileFolder': return <FileFolder {...commonProps as any} />;
    case 'Whiteboard': return <Whiteboard {...commonProps as any} />;
    case 'ProjectorScreen': return <ProjectorScreen {...commonProps as any} />;
    case 'Laptop': return <Laptop {...commonProps as any} />;
    case 'PenDrive': return <PenDrive {...commonProps as any} />;
    case 'SmallRack': return <SmallRack {...commonProps as any} />;
    case 'FlowerPot': return <FlowerPot {...commonProps as any} />;
    case 'TV': return <TV {...commonProps as any} />;
    case 'CoffeeMachine': return <CoffeeMachine {...commonProps as any} />;
    case 'CoffeeCup': return <CoffeeCup {...commonProps as any} />;
    case 'Telephone': return <Telephone {...commonProps as any} />;
    case 'CoffeeStation': return <CoffeeStation {...commonProps as any} />;
    default:
      console.warn(`Unknown furniture type: ${f.type}`);
      return null;
  }
}

export function WorldBuilder({ config }: { config: WorldDefinition }) {
  const addCollidableMesh = useGameStore((state) => state.addCollidableMesh);
  const removeCollidableMesh = useGameStore((state) => state.removeCollidableMesh);
  const addObstacles = useGameStore((state) => state.addObstacles);
  const removeObstacles = useGameStore((state) => state.removeObstacles);

  const groupRef = useRef<THREE.Group>(null);

  // 1. Unify physics and visuals: Compute Obstacles natively from config
  const obstacles = useMemo(() => {
    const obs: Obstacle[] = [];
    
    // Add walls to YUKA obstacles automatically
    config.walls.forEach((wall) => {
      obs.push({
        position: new THREE.Vector3(...wall.position),
        radius: 0,
        type: "wall",
        halfExtents: new THREE.Vector3(wall.size[0] / 2, wall.size[1] / 2, wall.size[2] / 2),
        rotation: wall.rotationY || 0,
      });
    });

    return obs;
  }, [config]);

  // 2. Register Colliders and Obstacles
  useEffect(() => {
    if (groupRef.current) addCollidableMesh(groupRef.current);
    addObstacles(obstacles);

    return () => {
      if (groupRef.current) removeCollidableMesh(groupRef.current.uuid);
      removeObstacles(obstacles);
    };
  }, [obstacles, addCollidableMesh, removeCollidableMesh, addObstacles, removeObstacles]);

  // 3. Separate standard walls and windows
  const solidWalls = config.walls.filter(w => !w.isWindow);
  const glassWalls = config.walls.filter(w => w.isWindow);

  return (
    <group ref={groupRef} name={config.name}>
      
      {/* --- HIGH-PERFORMANCE INSTANCED WALLS --- */}
      {solidWalls.length > 0 && (
        <Instances
          limit={solidWalls.length}
          castShadow
          receiveShadow
          geometry={new THREE.BoxGeometry(1, 1, 1)}
          material={wallMaterial}
          onUpdate={(self) => self.layers.enable(1)}
        >
          {solidWalls.map((wall) => (
            <Instance
              key={wall.id}
              position={wall.position}
              scale={wall.size}
              rotation={[0, wall.rotationY || 0, 0]}
              userData={{ type: "Structure", id: wall.id, name: wall.id, isWall: true }}
            />
          ))}
        </Instances>
      )}

      {/* --- INSTANCED WINDOWS --- */}
      {glassWalls.length > 0 && (
        <Instances
          limit={glassWalls.length}
          geometry={new THREE.BoxGeometry(1, 1, 1)}
          material={windowMaterial}
          onUpdate={(self) => self.layers.enable(1)}
        >
          {glassWalls.map((wall) => (
            <Instance
              key={wall.id}
              position={wall.position}
              scale={wall.size}
              rotation={[0, wall.rotationY || 0, 0]}
              userData={{ type: "Structure", id: wall.id, name: wall.id, isWindow: true }}
            />
          ))}
        </Instances>
      )}

      {/* --- INSTANCED FLOORS --- */}
      {config.floors.length > 0 && (
        <Instances
          limit={config.floors.length}
          receiveShadow
          geometry={new THREE.BoxGeometry(1, 1, 1)}
          material={defaultFloorMaterial}
          onUpdate={(self) => self.layers.enable(1)}
        >
          {config.floors.map((floor) => (
            <Instance
              key={floor.id}
              position={floor.position}
              scale={floor.size}
              userData={{ type: "Structure", id: floor.id, name: floor.id, isFloor: true }}
            />
          ))}
        </Instances>
      )}

      {/* --- DYNAMIC FURNITURE/PROPS --- */}
      {config.furniture.map(renderFurniture)}
      
    </group>
  );
}
