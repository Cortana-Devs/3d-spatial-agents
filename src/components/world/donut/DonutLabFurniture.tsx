/**
 * DonutLabFurniture — Research lab equipment distributed around the donut ring.
 *
 * The walkable ring spans from inner radius ~40 to outer radius ~93.
 * Furniture is placed at the midpoint of the ring (~66) and oriented
 * radially (facing toward center park or tangentially along the curve).
 *
 * Sectors:
 *   North (angle ~π):        Core Lab — 2 LabWorkbenches + sample racks
 *   East  (angle ~3π/2):     Data Analysis — 4 OfficeDesks + chairs
 *   South (angle ~0):        Break & Storage — Sofas, TV, CoffeeStation, Cupboards
 *   West  (angle ~π/2):      Strategy — ManagersDesk, Research Tables
 */
import React from "react";
import { Text } from "@react-three/drei";
import {
  OfficeChair,
  OfficeDesk,
  ConferenceTable,
  CeilingLight,
  CupboardUnit,
  ManagersDesk,
  LabWorkbench,
} from "../../models/environment/Furniture";
import {
  FileFolder,
  Whiteboard,
  ProjectorScreen,
  Laptop,
  PenDrive,
  SmallRack,
  FlowerPot,
  Sofa,
  TV,
  CoffeeMachine,
  CoffeeCup,
  CoffeeStation,
  Telephone,
} from "../../models/environment/Props";
import {
  DEFAULT_LAB_HUB,
  DEFAULT_RING_INNER_RADIUS,
  DEFAULT_RING_OUTER_RADIUS,
} from "./labFloorConstants";
import AgentPodsGroup from "./AgentPodsGroup";

// --- Helpers ---
const cx = DEFAULT_LAB_HUB.x;
const cy = DEFAULT_LAB_HUB.y;
const cz = DEFAULT_LAB_HUB.z;

const INNER_WALK = DEFAULT_RING_INNER_RADIUS + 4;   // ~42  — near inner wall
const MID_RING = (DEFAULT_RING_INNER_RADIUS + DEFAULT_RING_OUTER_RADIUS) / 2; // ~66.5
const OUTER_WALK = DEFAULT_RING_OUTER_RADIUS - 6;   // ~89  — near outer wall

/** Place an item at (angle, radius) on the ring floor. Returns [x, y, z]. */
function ringPos(angle: number, radius: number): [number, number, number] {
  return [
    cx + Math.sin(angle) * radius,
    cy,
    cz + Math.cos(angle) * radius,
  ];
}

/** Rotation so the item faces the center (inward). */
function faceCenter(angle: number): number {
  return angle + Math.PI;
}

/** Rotation so the item faces outward (toward glass). */
function faceOutward(angle: number): number {
  return angle;
}

/** Rotation tangent to the ring (clockwise). */
function tangent(angle: number): number {
  return angle + Math.PI / 2;
}

export default function DonutLabFurniture() {
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTOR ANGLES (using radians, 0 = +Z axis, clockwise).
  // Doors are at 0, π/2, π, 3π/2, so we place furniture BETWEEN doors.
  // ═══════════════════════════════════════════════════════════════════════════

  // --- NORTH SECTOR: Core Lab (angles π ± spread, between West and East doors) ---
  const labAngle1 = Math.PI - 0.35;       // ~155°
  const labAngle2 = Math.PI + 0.35;       // ~205°
  const labAngleMid = Math.PI;            // 180° — center

  // --- EAST SECTOR: Data Analysis (angles 3π/2 ± spread) ---
  const eastBase = (3 * Math.PI) / 2;
  const deskAngles = [
    eastBase - 0.40,
    eastBase - 0.15,
    eastBase + 0.15,
    eastBase + 0.40,
  ];

  // --- SOUTH SECTOR: NOW Break & Storage (angles 0 ± spread) ---
  const southBase = 0;
  const breakAngle1 = southBase - 0.50;
  const breakAngle2 = southBase - 0.20;
  const storageAngles = [
    southBase + 0.20,
    southBase + 0.35,
    southBase + 0.50,
    southBase + 0.65,
    southBase + 0.80,
  ];

  // --- WEST SECTOR: Strategy (angles π/2 ± spread) ---
  const westBase = Math.PI / 2 - 0.50;
  const mgrAngle = westBase + 0.15; // Move to free space North of storage (gap before West door)
  const extraTableAngles = [
    labAngle1 - 0.65,
    labAngle1 - 0.83,
    labAngle1 - 1.01,
  ];

  return (
    <group name="DonutLabFurniture">
      <AgentPodsGroup />

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* NORTH SECTOR — Core Lab (2 Workbenches + Lab Props)                */}
      {/* ════════════════════════════════════════════════════════════════════ */}

      {/* Workbench 1 — near outer wall, faces center */}
      <LabWorkbench
        position={ringPos(labAngle1, MID_RING + 8)}
        rotation={faceCenter(labAngle1)}
        userData={{
          type: "Furniture",
          id: "workbench-north-1",
          name: "Chemistry Workbench",
          interactable: true,
        }}
      >
        {/* Tube rack with sample vials */}
        <group position={[10, 4.4, 0]}>
          <mesh
            castShadow
            receiveShadow
            position={[0, 0, 0]}
          >
            <boxGeometry args={[5, 0.2, 2]} />
            <meshStandardMaterial color="#d0d4e0" />
          </mesh>
          {Array.from({ length: 5 }).map((_, i) => (
            <mesh
              key={`tube-n1-${i}`}
              position={[-2 + i * 1, 0.6, 0]}
              castShadow
            >
              <cylinderGeometry args={[0.2, 0.2, 1.0, 12]} />
              <meshStandardMaterial color="#5cc0ff" />
            </mesh>
          ))}
        </group>
        {/* qPCR-style analyzer box */}
        <group position={[0, 4.6, -1]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[6, 1.6, 4]} />
            <meshStandardMaterial color="#f5f5f5" />
          </mesh>
          <mesh position={[0, 1, 1.2]}>
            <boxGeometry args={[4.5, 0.6, 0.1]} />
            <meshStandardMaterial
              color="#202531"
              emissive="#102040"
              emissiveIntensity={0.4}
            />
          </mesh>
        </group>
        {/* Lab notebook */}
        <FileFolder
          position={[-14, 4.5, 0.5]}
          color="red"
          rotation={0.1}
          userData={{
            type: "Prop",
            id: "red-file-wb1",
            name: "Experiment Logbook",
            description: "Primary notebook for recording experiment runs.",
            interactable: true,
            pickable: true,
            objectType: "file",
            owner: "System",
          }}
        />
      </LabWorkbench>

      {/* Workbench 2 — opposite side */}
      <LabWorkbench
        position={ringPos(labAngle2, MID_RING + 8)}
        rotation={faceCenter(labAngle2)}
        userData={{
          type: "Furniture",
          id: "workbench-north-2",
          name: "Biology Workbench",
          interactable: true,
        }}
      >
        {/* Microscope stand (simplified box) */}
        <group position={[-8, 4.4, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[3, 0.3, 3]} />
            <meshStandardMaterial color="#2a2f38" />
          </mesh>
          {/* Eyepiece tube */}
          <mesh position={[0, 2, -0.3]} rotation={[0.2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.3, 2.5, 8]} />
            <meshStandardMaterial color="#444444" metalness={0.5} />
          </mesh>
          {/* Stage */}
          <mesh position={[0, 0.6, 0]} castShadow>
            <boxGeometry args={[2.5, 0.15, 2.5]} />
            <meshStandardMaterial color="#888888" metalness={0.3} />
          </mesh>
        </group>
        {/* Petri dish samples */}
        {[0, 1, 2].map((i) => (
          <mesh
            key={`petri-${i}`}
            position={[6 + i * 2.5, 4.5, 0.5]}
            castShadow
          >
            <cylinderGeometry args={[0.8, 0.8, 0.15, 16]} />
            <meshStandardMaterial
              color={["#ffe0e0", "#e0ffe0", "#e0e0ff"][i]}
              transparent
              opacity={0.7}
            />
          </mesh>
        ))}
        <FileFolder
          position={[14, 4.5, 0]}
          color="blue"
          rotation={-0.1}
          userData={{
            type: "Prop",
            id: "blue-file-wb2",
            name: "Bio Protocol Binder",
            interactable: true,
            pickable: true,
            objectType: "file",
          }}
        />
      </LabWorkbench>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* EXTRA RESEARCH TABLES        */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {extraTableAngles.map((angle, i) => {
        const labels = ["A", "B", "C", "D"];
        const xz = ringPos(angle, MID_RING + 8);
        return (
          <group key={`extra-table-${i}`}>
            <OfficeDesk
              position={xz}
              rotation={faceCenter(angle)}
              withDesktopPC={false}
              userData={{
                type: "Furniture",
                id: `extra-table-${labels[i]}`,
                name: `Research Table ${labels[i]}`,
                interactable: true,
              }}
            >
              {/* Items per specific table from previous layout */}
              {i === 0 && ( // Table 6 / A
                <>
                  <Laptop
                    position={[0, 4.2, 0]}
                    rotation={Math.PI}
                    userData={{
                      type: "Prop",
                      id: `extra-table-${labels[i]}-laptop`,
                      name: "Data Analysis Laptop",
                      interactable: true,
                      pickable: true,
                      objectType: "laptop",
                    }}
                  />
                  <FileFolder
                    position={[-3, 4.1, 1]}
                    rotation={0.2}
                    color="blue"
                    userData={{
                      type: "Prop",
                      id: `extra-table-${labels[i]}-protocols`,
                      name: "Experiment Protocols",
                      interactable: true,
                      pickable: true,
                      objectType: "file",
                    }}
                  />
                </>
              )}
              {i === 1 && ( // Table 7 / B
                <>
                  <FileFolder
                    position={[2.5, 4.1, 0.5]}
                    rotation={-0.1}
                    color="red"
                    userData={{
                      type: "Prop",
                      id: `extra-table-${labels[i]}-logs`,
                      name: "Sample Log Files",
                      interactable: true,
                      pickable: true,
                      objectType: "file",
                    }}
                  />
                  <PenDrive
                    position={[-2, 4.1, 0.3]}
                    rotation={0.4}
                    userData={{
                      type: "Prop",
                      id: `extra-table-${labels[i]}-usb`,
                      name: "Backup USB Drive",
                      interactable: true,
                      pickable: true,
                      objectType: "pendrive",
                    }}
                  />
                </>
              )}
              {i === 2 && ( // Table 8 / C
                <>
                  <FileFolder
                    position={[0, 4.1, 0.5]}
                    rotation={0.05}
                    userData={{
                      type: "Prop",
                      id: `extra-table-${labels[i]}-sops`,
                      name: "Lab SOP Binder",
                      interactable: true,
                      pickable: true,
                      objectType: "file",
                    }}
                  />
                  <FileFolder
                    position={[-2.5, 4.1, -0.5]}
                    rotation={-0.15}
                    color="blue"
                    userData={{
                      type: "Prop",
                      id: `extra-table-${labels[i]}-manuals`,
                      name: "Equipment Manuals",
                      interactable: true,
                      pickable: true,
                      objectType: "file",
                    }}
                  />
                </>
              )}
            </OfficeDesk>
            {/* Visual Label */}
            <Text
              position={[xz[0], cy + 4.15, xz[2]]}
              rotation={[-Math.PI / 2, 0, faceCenter(angle)]}
              fontSize={1.2}
              color="#202531"
              anchorX="center"
              anchorY="middle"
            >
              {labels[i]}
            </Text>
          </group>
        );
      })}




      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* EAST SECTOR — Data Analysis Workstations (4 Desks + Chairs)        */}
      {/* ════════════════════════════════════════════════════════════════════ */}

      {deskAngles.map((angle, i) => (
        <group key={`desk-east-${i}`}>
          <OfficeDesk
            position={ringPos(angle, MID_RING + 6)}
            rotation={faceCenter(angle)}
            userData={{
              type: "Furniture",
              id: `desk-east-${i}`,
              name: `Research Desk ${String.fromCharCode(65 + i)}`,
              interactable: true,
            }}
          >
            <FileFolder
              position={[-3.0, 4.1, 0.8]}
              rotation={0.15}
              color="blue"
              userData={{
                type: "Prop",
                id: `desk-east-${i}-sop`,
                name: "Research Notes",
                interactable: true,
                pickable: true,
                objectType: "file",
              }}
            />
          </OfficeDesk>
          <OfficeChair
            id={`chair-east-${i}`}
            position={ringPos(angle, MID_RING - 1)}
            rotation={faceOutward(angle)}
            userData={{
              type: "Furniture",
              id: `chair-east-${i}`,
              name: `Research Chair ${String.fromCharCode(65 + i)}`,
            }}
          />
        </group>
      ))}



      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* SOUTH SECTOR — Strategy & Conference                               */}
      {/* ════════════════════════════════════════════════════════════════════ */}



      {/* Supervisor / Manager's Desk — opposite offset from south door */}
      <ManagersDesk
        position={ringPos(mgrAngle, MID_RING + 4)}
        rotation={faceCenter(mgrAngle)}
        userData={{
          type: "Furniture",
          id: "desk-supervisor-donut",
          name: "Supervisor Desk",
        }}
        initialItemsLeft={["file-supervisor-donut"]}
        initialItemsMid={["laptop-supervisor-donut"]}
        initialItemsRight={["pendrive-supervisor-donut"]}
      >
        <FileFolder
          position={[-5, 4.1, -2]}
          color="blue"
          userData={{
            type: "Prop",
            id: "file-supervisor-donut",
            name: "Grant Proposal Dossier",
            interactable: true,
            pickable: true,
            objectType: "file",
          }}
        />
        <Laptop
          position={[0, 4.1, -2]}
          rotation={-Math.PI}
          userData={{
            type: "Prop",
            id: "laptop-supervisor-donut",
            name: "Supervisor Workstation",
            interactable: true,
            pickable: true,
            objectType: "laptop",
          }}
        />
        <PenDrive
          position={[5, 4.1, -2]}
          rotation={0.3}
          userData={{
            type: "Prop",
            id: "pendrive-supervisor-donut",
            name: "USB Drive",
            interactable: true,
            pickable: true,
            objectType: "pendrive",
          }}
        />
        <Telephone
          position={[3.5, 4.15, 1.5]}
          rotation={Math.PI / 2}
          userData={{
            type: "Prop",
            id: "phone-supervisor-donut",
            name: "Desk Telephone",
            interactable: true,
            objectType: "telephone",
          }}
        />
      </ManagersDesk>
      <OfficeChair
        id="chair-supervisor-donut"
        position={ringPos(mgrAngle, MID_RING - 5)}
        rotation={faceOutward(mgrAngle)}
        userData={{
          type: "Furniture",
          id: "chair-supervisor-donut",
          name: "Supervisor Chair",
        }}
      />

      {/* Visitor chairs */}
      <OfficeChair
        id="chair-supervisor-visitor-d1"
        position={ringPos(mgrAngle - 0.05, MID_RING + 14)}
        rotation={faceCenter(mgrAngle)}
        userData={{
          type: "Furniture",
          id: "chair-supervisor-visitor-d1",
          name: "Visitor Chair 1",
        }}
      />
      <OfficeChair
        id="chair-supervisor-visitor-d2"
        position={ringPos(mgrAngle + 0.05, MID_RING + 14)}
        rotation={faceCenter(mgrAngle)}
        userData={{
          type: "Furniture",
          id: "chair-supervisor-visitor-d2",
          name: "Visitor Chair 2",
        }}
      />



      {/* Archive Rack near supervisor desk */}
      <SmallRack
        position={ringPos(mgrAngle - 0.12, MID_RING + 16)}
        rotation={faceCenter(mgrAngle)}
        userData={{
          type: "Furniture",
          id: "rack-supervisor-donut",
          name: "Supervisor Archive Rack",
          interactable: true,
        }}
        initialItems={["flower-supervisor-donut"]}
        initialItemsMiddle={["archive-box-d1", "archive-box-d2"]}
      >
        <FileFolder
          position={[0, 3.1, 0]}
          color="red"
          rotation={0.1}
          userData={{
            type: "Prop",
            id: "archive-box-d1",
            name: "Archive Box – Experiments",
            interactable: true,
            pickable: true,
            objectType: "file",
          }}
        />
        <FileFolder
          position={[-0.35, 3.1, 0.35]}
          color="red"
          rotation={-0.1}
          userData={{
            type: "Prop",
            id: "archive-box-d2",
            name: "Archive Box – Reports",
            interactable: true,
            pickable: true,
            objectType: "file",
          }}
        />
        <FlowerPot
          position={[0, 4.2, 0]}
          userData={{
            type: "Prop",
            id: "flower-supervisor-donut",
            name: "Supervisor Flower Pot",
            interactable: true,
          }}
        />
      </SmallRack>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* WEST SECTOR — Break Area & Storage                                 */}
      {/* ════════════════════════════════════════════════════════════════════ */}

      {/* Sofas — facing inward toward center park */}
      <Sofa
        position={ringPos(breakAngle1, MID_RING - 2)}
        rotation={faceOutward(breakAngle1)}
        userData={{
          type: "Furniture",
          id: "sofa-break-d1",
          name: "Break Sofa 1",
          interactable: true,
          objectType: "sofa",
        }}
      />
      <Sofa
        position={ringPos(breakAngle2, MID_RING - 2)}
        rotation={faceOutward(breakAngle2)}
        userData={{
          type: "Furniture",
          id: "sofa-break-d2",
          name: "Break Sofa 2",
          interactable: true,
          objectType: "sofa",
        }}
      />

      {/* TV on stand facing the sofas */}
      <TV
        position={ringPos((breakAngle1 + breakAngle2) / 2, MID_RING + 12)}
        rotation={faceCenter((breakAngle1 + breakAngle2) / 2)}
        userData={{
          type: "Furniture",
          id: "tv-break-donut",
          name: "Break Room TV",
          interactable: true,
          description: "A large flat screen TV.",
          objectType: "tv",
        }}
      />

      <CoffeeStation
        position={ringPos(breakAngle1 - 0.20, MID_RING + 14)}
        userData={{
          type: "Furniture",
          id: "coffee-station-donut-v2",
          name: "Coffee Station",
        }}
        initialItems={["coffee-machine-donut-v2", "cup-coffee-donut-v2"]}
      >
        <CoffeeMachine
          position={[0, 4, 0]}
          userData={{
            type: "Prop",
            id: "coffee-machine-donut-v2",
            name: "Coffee Machine",
            interactable: true,
            description: "Brew a fresh cup of coffee.",
            objectType: "coffee_machine",
          }}
        />
        <CoffeeCup
          position={[2, 4.1, 0.5]}
          userData={{
            type: "Prop",
            id: "cup-coffee-donut-v2",
            name: "Coffee Cup",
            interactable: true,
            pickable: true,
            objectType: "coffeecup",
          }}
        />
      </CoffeeStation>

      {/* Storage Cupboards — spread along the west arc */}
      {storageAngles.map((angle, i) => (
        <CupboardUnit
          key={`cupboard-donut-${i}`}
          position={ringPos(angle, OUTER_WALK - 2)}
          rotation={faceCenter(angle)}
          label={(i + 1).toString()}
          userData={{
            type: "Furniture",
            id: `cupboard-donut-${i + 1}`,
            name: `Storage Cupboard ${i + 1}`,
          }}
        />
      ))}

      {/* Floor flower pots removed as requested */}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* LIGHTING — 4 ceiling lights, one per sector                        */}
      {/* ════════════════════════════════════════════════════════════════════ */}

      {/* North — Lab Light */}
      <CeilingLight
        position={ringPos(Math.PI, MID_RING).map((v, i) =>
          i === 1 ? cy + 28 : v,
        ) as [number, number, number]}
        isOn={true}
        color="#f0f4ff"
        intensity={1800}
        distance={80}
        userData={{ type: "Device", id: "light-north", name: "North Lab Light" }}
      />
      {/* East — Analysis Light */}
      <CeilingLight
        position={ringPos(eastBase, MID_RING).map((v, i) =>
          i === 1 ? cy + 28 : v,
        ) as [number, number, number]}
        isOn={true}
        color="#f0f4ff"
        intensity={1600}
        distance={80}
        userData={{ type: "Device", id: "light-east", name: "East Analysis Light" }}
      />
      {/* South — Conference Light */}
      <CeilingLight
        position={ringPos(southBase, MID_RING).map((v, i) =>
          i === 1 ? cy + 28 : v,
        ) as [number, number, number]}
        isOn={true}
        color="#f0f4ff"
        intensity={1400}
        distance={80}
        userData={{ type: "Device", id: "light-south", name: "South Conference Light" }}
      />
      {/* West — Break Light */}
      <CeilingLight
        position={ringPos(westBase, MID_RING).map((v, i) =>
          i === 1 ? cy + 28 : v,
        ) as [number, number, number]}
        isOn={true}
        color="#ffe8d0"
        intensity={1200}
        distance={80}
        userData={{ type: "Device", id: "light-west", name: "West Break Light" }}
      />

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* SIGNAGE & WALL ART REMOVED AS REQUESTED                          */}
      {/* ════════════════════════════════════════════════════════════════════ */}

    </group>
  );
}
