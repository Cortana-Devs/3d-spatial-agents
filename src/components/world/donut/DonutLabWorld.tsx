import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useGameStore } from "@/store/gameStore";
import { ZoneInfluenceSystem } from "@/components/systems/ZoneInfluenceSystem";
import { POIRegistry } from "@/components/systems/POIRegistry";
import DonutFloor from "./DonutFloor";
import DonutWalls from "./DonutWalls";
import DonutCenterPark from "./DonutCenterPark";
import { buildDonutObstacles } from "./DonutObstacles";
import { DEFAULT_LAB_HUB, DEFAULT_RING_INNER_RADIUS, DEFAULT_RING_OUTER_RADIUS } from "./labFloorConstants";

// --- Curated Dream Park Layout ---
const treeData = [
  { x: -14, z: 16, scale: 1.4, type: 'oak' as const },    // Massive Grand Oak on the big hill
  { x: 18, z: 20, scale: 1.0, type: 'cherry' as const },  // Beautiful cherry blossom near the path
  { x: -22, z: -15, scale: 1.2, type: 'pine' as const },  // Tall pine for depth
  { x: 12, z: -20, scale: 0.9, type: 'cherry' as const }, // Second cherry blossom near water
];

const benchData = [
  { position: [15.5, 0, 0], rotation: [0, -Math.PI / 2, 0] }, // Dock bench
  { position: [-14, 0, 10], rotation: [0, Math.PI / 5, 0] }, // Overlooking pond near oak
  { position: [0, 0, -22], rotation: [0, 0, 0] },            
  { position: [16, 0, 24], rotation: [0, Math.PI / 1.5, 0] } 
];

// --- Interactables Registration ---
function getDonutInteractables() {
  const items: any[] = [];
  
  // Register benches for sitting
  benchData.forEach((b, i) => {
    items.push({
      id: `bench-park-${i}`,
      type: "chair",
      position: new THREE.Vector3(DEFAULT_LAB_HUB.x + b.position[0], DEFAULT_LAB_HUB.y, DEFAULT_LAB_HUB.z + b.position[2]),
      rotation: new THREE.Quaternion().setFromEuler(new THREE.Euler(b.rotation[0], b.rotation[1], b.rotation[2])),
      name: "Park Bench",
      description: "A solid wood and metal bench facing the center park.",
    });
  });

  // Register main entrance doors
  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI / 2;
    const r = DEFAULT_RING_OUTER_RADIUS;
    items.push({
      id: `door-outer-${i}`,
      type: "door",
      position: new THREE.Vector3(DEFAULT_LAB_HUB.x + Math.sin(angle) * r, DEFAULT_LAB_HUB.y, DEFAULT_LAB_HUB.z + Math.cos(angle) * r),
      rotation: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, angle, 0)),
      name: "Glass Slider Door",
      description: "A massive automated glass door leading to the exterior plaza.",
      isOpen: false,
    });
  }

  return items;
}

export default function DonutLabWorld() {
  const { addCollidableMesh, removeCollidableMesh, addObstacles, removeObstacles, addInteractables, removeInteractables } = useGameStore();
  const groupRef = useRef<THREE.Group>(null);
  const obstacles = useMemo(() => buildDonutObstacles(), []);
  const interactables = useMemo(() => getDonutInteractables(), []);

  useEffect(() => {
    if (groupRef.current) addCollidableMesh(groupRef.current);
    addObstacles(obstacles);
    addInteractables(interactables);

    // --- Semantic Registration ---
    const zoneSystem = ZoneInfluenceSystem;
    const poiSystem = POIRegistry.getInstance();

    // 1. Center Park
    zoneSystem.register({
      zoneId: "center-park", zoneName: "Center Garden",
      center: new THREE.Vector3(DEFAULT_LAB_HUB.x, DEFAULT_LAB_HUB.y, DEFAULT_LAB_HUB.z),
      radius: DEFAULT_RING_INNER_RADIUS,
      effects: { wonder: 3.0, tidiness: -1.5, energy: 0.5 },
      moodLabel: "serene", environmentDescription: "A beautiful interior park with natural sunlight."
    });

    // 2. Fishing Dock
    zoneSystem.register({
      zoneId: "fishing-dock", zoneName: "Fishing Dock",
      center: new THREE.Vector3(DEFAULT_LAB_HUB.x + 13.8, DEFAULT_LAB_HUB.y, DEFAULT_LAB_HUB.z),
      radius: 8,
      effects: { curiosity: 2.0, wonder: 2.0 },
      moodLabel: "contemplative", environmentDescription: "A calm dock by the koi pond."
    });

    // 3. Research Wing
    zoneSystem.register({
      zoneId: "interior-ring", zoneName: "Research Wing",
      center: new THREE.Vector3(DEFAULT_LAB_HUB.x, DEFAULT_LAB_HUB.y, DEFAULT_LAB_HUB.z),
      radius: DEFAULT_RING_OUTER_RADIUS, // Checks distance from center
      effects: { focus: 2.0, belonging: 2.0 },
      moodLabel: "focused", environmentDescription: "The sweeping wooden floor of the research facility."
    });

    // 4. Exterior Plaza
    zoneSystem.register({
      zoneId: "exterior-plaza", zoneName: "Exterior Plaza",
      center: new THREE.Vector3(DEFAULT_LAB_HUB.x, DEFAULT_LAB_HUB.y, DEFAULT_LAB_HUB.z),
      radius: 160,
      effects: { curiosity: 1.0, social: 0.8 },
      moodLabel: "expansive", environmentDescription: "The open air plaza overlooking the region."
    });

    // POIs
    poiSystem.register({
      id: "poi-arowana-pond", category: "exhibit", zoneId: "center-park",
      position: new THREE.Vector3(DEFAULT_LAB_HUB.x, DEFAULT_LAB_HUB.y, DEFAULT_LAB_HUB.z),
      name: "Arowana Pond", description: "A crystal clear pond filled with golden arowana and koi.",
      lookTarget: new THREE.Vector3(DEFAULT_LAB_HUB.x, DEFAULT_LAB_HUB.y, DEFAULT_LAB_HUB.z),
      noveltyDecay: 0.1, currentNovelty: 1.0
    });

    return () => {
      if (groupRef.current) removeCollidableMesh(groupRef.current.uuid);
      removeObstacles(obstacles);
      removeInteractables(interactables.map(i => i.id));
      
      zoneSystem.unregister("center-park");
      zoneSystem.unregister("fishing-dock");
      zoneSystem.unregister("interior-ring");
      zoneSystem.unregister("exterior-plaza");
      poiSystem.unregister("poi-arowana-pond");
    };
  }, [addCollidableMesh, removeCollidableMesh, addObstacles, removeObstacles, addInteractables, removeInteractables, obstacles, interactables]);

  return (
    <group ref={groupRef}>
      <DonutFloor />
      <DonutWalls />
      <DonutCenterPark treeData={treeData} benchData={benchData} />
    </group>
  );
}
