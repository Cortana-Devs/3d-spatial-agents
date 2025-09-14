import React from 'react';
import { Mesh, BoxGeometry, MeshStandardMaterial, Vector3 } from 'three';
import { useFrame } from '@react-three/fiber';
import { FrostedGlassFloor } from '@components/floors/FrostedGlassFloor';
import { FloorFactory } from '../utils/floorFactory';
import { usePerformanceMonitor } from '@systems/PerformanceMonitor';

export const BasicMaterialTest: React.FC = () => {
  const floors = [
    { position: new Vector3(-2, 0, -2), opacity: 0.3 },
    { position: new Vector3(2, 0, -2), opacity: 0.5 },
    { position: new Vector3(-2, 0, 2), opacity: 0.7 },
    { position: new Vector3(2, 0, 2), opacity: 0.9 },
  ];

  return (
    <>
      {floors.map((floor, index) => (
        <FrostedGlassFloor
          key={index}
          floor={FloorFactory.createFrostedGlassFloor(floor.position, 'medium_frosted')}
          opacity={floor.opacity}
        />
      ))}
    </>
  );
};

export const AdvancedMaterialTest: React.FC = () => {
  const floors = [
    { position: new Vector3(-3, 0, -3), type: 'clear_frosted' },
    { position: new Vector3(0, 0, -3), type: 'light_frosted' },
    { position: new Vector3(3, 0, -3), type: 'medium_frosted' },
    { position: new Vector3(-3, 0, 0), type: 'heavy_frosted' },
    { position: new Vector3(0, 0, 0), type: 'iridescent' },
    { position: new Vector3(3, 0, 0), type: 'caustic' },
    { position: new Vector3(-3, 0, 3), type: 'reflective' },
    { position: new Vector3(0, 0, 3), type: 'tinted' },
    { position: new Vector3(3, 0, 3), type: 'premium' },
  ];

  return (
    <>
      {floors.map((floor, index) => (
        <FrostedGlassFloor
          key={index}
          floor={FloorFactory.createFrostedGlassFloor(floor.position, floor.type)}
        />
      ))}
    </>
  );
};

export const LODPerformanceTest: React.FC = () => {
  const size = 10;
  const spacing = 2;
  const floors = [];

  for (let x = -size/2; x < size/2; x++) {
    for (let z = -size/2; z < size/2; z++) {
      floors.push({
        position: new Vector3(x * spacing, 0, z * spacing),
        type: 'medium_frosted'
      });
    }
  }

  return (
    <>
      {floors.map((floor, index) => (
        <FrostedGlassFloor
          key={index}
          floor={FloorFactory.createFrostedGlassFloor(floor.position, floor.type)}
          useLOD={true}
        />
      ))}
    </>
  );
};

export const BatchingPerformanceTest: React.FC = () => {
  const size = 15;
  const spacing = 1.5;
  const floors = [];

  for (let x = -size/2; x < size/2; x++) {
    for (let z = -size/2; z < size/2; z++) {
      floors.push({
        position: new Vector3(x * spacing, 0, z * spacing),
        type: 'light_frosted'
      });
    }
  }

  return (
    <>
      {floors.map((floor, index) => (
        <FrostedGlassFloor
          key={index}
          floor={FloorFactory.createFrostedGlassFloor(floor.position, floor.type)}
          useBatching={true}
        />
      ))}
    </>
  );
};

export const InteractionTest: React.FC = () => {
  const [selected, setSelected] = React.useState<number | null>(null);

  const floors = [
    { position: new Vector3(-2, 0, 0), type: 'clear_frosted' },
    { position: new Vector3(0, 0, 0), type: 'medium_frosted' },
    { position: new Vector3(2, 0, 0), type: 'heavy_frosted' },
  ];

  return (
    <>
      {floors.map((floor, index) => (
        <FrostedGlassFloor
          key={index}
          floor={FloorFactory.createFrostedGlassFloor(floor.position, floor.type)}
          onInteract={() => setSelected(index)}
          isSelected={selected === index}
        />
      ))}
    </>
  );
};

export const AINavigationTest: React.FC = () => {
  const floors = [
    { position: new Vector3(-3, 0, 0), type: 'clear_frosted', walkable: true },
    { position: new Vector3(-1, 0, 0), type: 'light_frosted', walkable: true },
    { position: new Vector3(1, 0, 0), type: 'medium_frosted', walkable: false },
    { position: new Vector3(3, 0, 0), type: 'heavy_frosted', walkable: false },
  ];

  return (
    <>
      {floors.map((floor, index) => (
        <FrostedGlassFloor
          key={index}
          floor={FloorFactory.createFrostedGlassFloor(floor.position, floor.type)}
          walkable={floor.walkable}
          showNavMesh={true}
        />
      ))}
    </>
  );
};

export const FullIntegrationTest: React.FC = () => {
  const monitor = usePerformanceMonitor();
  
  return (
    <>
      <LODPerformanceTest />
      <AINavigationTest />
      <InteractionTest />
    </>
  );
};
