import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useGameStore } from "@/store/gameStore";
import { ZoneInfluenceSystem } from "@/systems/ZoneInfluenceSystem";
import { POIRegistry } from "@/systems/POIRegistry";
import DonutFloor from "./DonutFloor";
import DonutWalls from "./DonutWalls";
import DonutCenterPark, { getTerrainHeight } from "./DonutCenterPark";
import { buildDonutObstacles } from "./DonutObstacles";
import DonutLabFurniture from "./DonutLabFurniture";
import { DEFAULT_LAB_HUB, DEFAULT_RING_INNER_RADIUS, DEFAULT_RING_OUTER_RADIUS, ENV_PROP_SCALE_FACTOR } from "./labFloorConstants";
import { buildPodInteractables } from "@/config/agentPods";
import { buildDonutLabWorldTaskSeeds } from "@/config/donutWorldTasksSeed";

// --- Curated Dream Park Layout ---
const treeData = [
  { x: -14, z: 16, scale: 1.4, type: 'oak' as const },    // Massive Grand Oak on the big hill
  { x: 18, z: 20, scale: 1.0, type: 'cherry' as const },  // Beautiful cherry blossom near the path
  { x: -22, z: -15, scale: 1.2, type: 'pine' as const },  // Tall pine for depth
  { x: 12, z: -20, scale: 0.9, type: 'cherry' as const }, // Second cherry blossom near water
];

// Only the fishing dock bench remains. widthScale stretches the bench along its length axis.
// widthScale 2.8 × default width 1.6 × ENV_PROP_SCALE_FACTOR 3.06 ≈ 13.7 world-units — fits 3 players.
const benchData = [
  { position: [15.5, 0, 0], rotation: [0, -Math.PI / 2, 0], widthScale: 2.8 }, // Dock bench (3-player wide)
];

// --- Interactables Registration ---
function getDonutInteractables() {
  const items: any[] = [];
  
  // Bench seat height in world units (local 0.42 * scale factor).
  // The player group Y for sitting = bench_seat_world_Y - player_hips_local_Y
  // player_hips_local_Y = 3.3 (from Player.tsx hips group position)
  const BENCH_SEAT_LOCAL_Y = 0.42;
  const PLAYER_HIPS_LOCAL_Y = 3.3;
  benchData.forEach((b, i) => {
    const lx = b.position[0];
    const lz = b.position[2];
    const terrainY = getTerrainHeight(lx, lz);
    const benchSeatWorldY = DEFAULT_LAB_HUB.y + terrainY + (BENCH_SEAT_LOCAL_Y * ENV_PROP_SCALE_FACTOR);
    const sitGroupY = benchSeatWorldY - PLAYER_HIPS_LOCAL_Y;
    const ws = (b as any).widthScale ?? 1;
    // Register 3 sit positions spread across the bench width
    const seatSpacing = 1.6 * ws * ENV_PROP_SCALE_FACTOR * 0.28; // spacing between sit slots in world units
    const rotQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(b.rotation[0], b.rotation[1], b.rotation[2]));
    const slotLabels = ["Left", "Center", "Right"];
    const slotOffsets = ws > 1 ? [-seatSpacing, 0, seatSpacing] : [0];
    slotOffsets.forEach((offset, si) => {
      const localOffset = new THREE.Vector3(offset, 0, 0).applyQuaternion(rotQ);
      items.push({
        id: `bench-park-${i}${ws > 1 ? `-${si}` : ""}`,
        type: "chair",
        position: new THREE.Vector3(
          DEFAULT_LAB_HUB.x + lx + localOffset.x,
          sitGroupY,
          DEFAULT_LAB_HUB.z + lz + localOffset.z,
        ),
        rotation: rotQ,
        name: ws > 1 ? `Dock Bench (${slotLabels[si]})` : "Park Bench",
        description: "A wide solid wood bench at the fishing dock.",
      });
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

  items.push(...buildPodInteractables());

  return items;
}

export default function DonutLabWorld() {
  const addCollidableMesh = useGameStore((s) => s.addCollidableMesh);
  const removeCollidableMesh = useGameStore((s) => s.removeCollidableMesh);
  const addObstacles = useGameStore((s) => s.addObstacles);
  const removeObstacles = useGameStore((s) => s.removeObstacles);
  const addInteractables = useGameStore((s) => s.addInteractables);
  const removeInteractables = useGameStore((s) => s.removeInteractables);
  
  const groupRef = useRef<THREE.Group>(null);
  const obstacles = useMemo(() => buildDonutObstacles(), []);
  const interactables = useMemo(() => getDonutInteractables(), []);

  useEffect(() => {
    if (groupRef.current) addCollidableMesh(groupRef.current);
    addObstacles(obstacles);
    addInteractables(interactables);

    const agentIds = useGameStore
      .getState()
      .activeResearchAgents.map((a) => a.id);
    useGameStore.getState().seedDefaultPersonalDesks(agentIds);

    const gs = useGameStore.getState();
    const hasRackTask = Object.values(gs.worldTasksById).some(
      (t) =>
        t.payload.kind === "deliver" &&
        t.payload.itemId === "file-rack3-to-supervisor",
    );
    if (!hasRackTask) {
      for (const seed of buildDonutLabWorldTaskSeeds()) {
        gs.addWorldTask(seed);
      }
    }

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

    // 3. Research Ring Interior
    zoneSystem.register({
      zoneId: "interior-ring", zoneName: "Research Ring",
      // Offset center to a point on the ring midline (radius ~66.5) so go_to doesn't target the pond center
      center: new THREE.Vector3(DEFAULT_LAB_HUB.x, DEFAULT_LAB_HUB.y, DEFAULT_LAB_HUB.z + 66.5),
      radius: DEFAULT_RING_OUTER_RADIUS, 
      effects: { focus: 2.0, belonging: 2.0 },
      moodLabel: "focused", environmentDescription: "The sweeping wooden floor of the research facility."
    });

    // 4. Exterior Plaza
    zoneSystem.register({
      zoneId: "exterior-plaza", zoneName: "Exterior Plaza",
      // Offset center to a point on the ring midline (radius ~66.5)
      center: new THREE.Vector3(DEFAULT_LAB_HUB.x, DEFAULT_LAB_HUB.y, DEFAULT_LAB_HUB.z - 66.5),
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

    // 5. Core Lab (North sector)
    const MID_RING = (DEFAULT_RING_INNER_RADIUS + DEFAULT_RING_OUTER_RADIUS) / 2;
    const southBase = 0;
    const westBase = Math.PI / 2;
    zoneSystem.register({
      zoneId: "core-lab", zoneName: "Core Lab",
      center: new THREE.Vector3(DEFAULT_LAB_HUB.x + Math.sin(Math.PI) * MID_RING, DEFAULT_LAB_HUB.y, DEFAULT_LAB_HUB.z + Math.cos(Math.PI) * MID_RING),
      radius: 30,
      effects: { focus: 3.0, curiosity: 2.0 },
      moodLabel: "focused", environmentDescription: "The core laboratory area with chemistry and biology workbenches."
    });

    // 6. Data Analysis (East sector)
    zoneSystem.register({
      zoneId: "data-analysis", zoneName: "Data Analysis Wing",
      center: new THREE.Vector3(DEFAULT_LAB_HUB.x + Math.sin(3 * Math.PI / 2) * MID_RING, DEFAULT_LAB_HUB.y, DEFAULT_LAB_HUB.z + Math.cos(3 * Math.PI / 2) * MID_RING),
      radius: 30,
      effects: { focus: 2.5, tidiness: 1.5 },
      moodLabel: "analytical", environmentDescription: "Workstations for data analysis and computational research."
    });

    // 7. Break Room (South sector)
    zoneSystem.register({
      zoneId: "break-room", zoneName: "Break Room",
      center: new THREE.Vector3(DEFAULT_LAB_HUB.x + Math.sin(southBase) * MID_RING, DEFAULT_LAB_HUB.y, DEFAULT_LAB_HUB.z + Math.cos(southBase) * MID_RING),
      radius: 30,
      effects: { energy: 2.0, social: 2.0, wonder: 1.0 },
      moodLabel: "relaxed", environmentDescription: "A cozy break room with sofas, TV, and a coffee station situated in the south wing."
    });

    // 8. Conference (West sector)
    zoneSystem.register({
      zoneId: "conference-area", zoneName: "Conference Area",
      center: new THREE.Vector3(DEFAULT_LAB_HUB.x + Math.sin(westBase) * MID_RING, DEFAULT_LAB_HUB.y, DEFAULT_LAB_HUB.z + Math.cos(westBase) * MID_RING),
      radius: 30,
      effects: { social: 2.5, belonging: 2.0 },
      moodLabel: "collaborative", environmentDescription: "A meeting area with a conference table and supervisor office in the west wing."
    });

    // POIs for key equipment
    poiSystem.register({
      id: "poi-chemistry-bench", category: "workspace", zoneId: "core-lab",
      position: new THREE.Vector3(DEFAULT_LAB_HUB.x + Math.sin(Math.PI - 0.35) * (MID_RING + 8), DEFAULT_LAB_HUB.y, DEFAULT_LAB_HUB.z + Math.cos(Math.PI - 0.35) * (MID_RING + 8)),
      name: "Chemistry Workbench", description: "A fully equipped chemistry workbench with sample racks and analyzers.",
      lookTarget: new THREE.Vector3(DEFAULT_LAB_HUB.x + Math.sin(Math.PI - 0.35) * (MID_RING + 8), DEFAULT_LAB_HUB.y + 5, DEFAULT_LAB_HUB.z + Math.cos(Math.PI - 0.35) * (MID_RING + 8)),
      noveltyDecay: 0.05, currentNovelty: 1.0
    });
    poiSystem.register({
      id: "poi-coffee-station", category: "social_spot", zoneId: "break-room",
      // Near breakAngle1 - 0.20 (~ -0.70)
      position: new THREE.Vector3(DEFAULT_LAB_HUB.x + Math.sin(-0.70) * (MID_RING + 14), DEFAULT_LAB_HUB.y, DEFAULT_LAB_HUB.z + Math.cos(-0.70) * (MID_RING + 14)),
      name: "Coffee Station", description: "A coffee machine with fresh cups — perfect for a quick energy boost.",
      lookTarget: new THREE.Vector3(DEFAULT_LAB_HUB.x + Math.sin(-0.70) * (MID_RING + 14), DEFAULT_LAB_HUB.y + 4, DEFAULT_LAB_HUB.z + Math.cos(-0.70) * (MID_RING + 14)),
      noveltyDecay: 0.2, currentNovelty: 1.0
    });

    return () => {
      if (groupRef.current) removeCollidableMesh(groupRef.current.uuid);
      removeObstacles(obstacles);
      removeInteractables(interactables.map(i => i.id));
      
      zoneSystem.unregister("center-park");
      zoneSystem.unregister("fishing-dock");
      zoneSystem.unregister("interior-ring");
      zoneSystem.unregister("exterior-plaza");
      zoneSystem.unregister("core-lab");
      zoneSystem.unregister("data-analysis");
      zoneSystem.unregister("conference-area");
      zoneSystem.unregister("break-room");
      poiSystem.unregister("poi-arowana-pond");
      poiSystem.unregister("poi-chemistry-bench");
      poiSystem.unregister("poi-coffee-station");
    };
  }, [addCollidableMesh, removeCollidableMesh, addObstacles, removeObstacles, addInteractables, removeInteractables, obstacles, interactables]);

  return (
    <group ref={groupRef}>
      <DonutFloor />
      <DonutWalls />
      <DonutCenterPark treeData={treeData} benchData={benchData} />
      <DonutLabFurniture />
    </group>
  );
}
