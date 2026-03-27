import { WorldDefinition } from "./WorldConfig";

// Base coordinates
const hubCenter = { x: 0, y: 4, z: 0 };
const bWidth = 200;
const bDepth = 150;
const bHeight = 30;
const thickness = 2;

const left = hubCenter.x - bWidth / 2;
const right = hubCenter.x + bWidth / 2;
const back = hubCenter.z - bDepth / 2;
const front = hubCenter.z + bDepth / 2;
const mx = (left + right) / 2;
const mz = (back + front) / 2;
const roomDividerZ = hubCenter.z - 20;

export const researchComplexLayout: WorldDefinition = {
  name: "Research Complex V1",
  walls: [
    // Outer Shell
    { id: "Wall-North", position: [mx, hubCenter.y + bHeight / 2, back], size: [bWidth, bHeight, thickness] },
    { id: "Wall-East", position: [right, hubCenter.y + bHeight / 2, mz], size: [bDepth, bHeight, thickness], rotationY: -Math.PI / 2 },
    { id: "Wall-West", position: [left, hubCenter.y + bHeight / 2, mz], size: [bDepth, bHeight, thickness], rotationY: -Math.PI / 2 },
    { id: "Window-South", position: [mx, hubCenter.y + bHeight / 2, front], size: [bWidth, bHeight, thickness], isWindow: true },

    // Internal Zoning - Storage Left
    { id: "Wall-Divide-Storage-Left", position: [(left + (hubCenter.x - 59)) / 2, hubCenter.y + bHeight / 2, roomDividerZ], size: [Math.abs(left - (hubCenter.x - 59)), bHeight, thickness] },
    { id: "Wall-Divide-Storage-Right", position: [((hubCenter.x - 41) + hubCenter.x) / 2, hubCenter.y + bHeight / 2, roomDividerZ], size: [Math.abs((hubCenter.x - 41) - hubCenter.x), bHeight, thickness] },
    
    // Internal Zoning - Conf Right
    { id: "Wall-Divide-Conf-Left", position: [((hubCenter.x + 1) + (hubCenter.x + 40)) / 2, hubCenter.y + bHeight / 2, roomDividerZ], size: [39, bHeight, thickness] },
    { id: "Wall-Divide-Conf-Right", position: [((hubCenter.x + 60) + right) / 2, hubCenter.y + bHeight / 2, roomDividerZ], size: [Math.abs((hubCenter.x + 60) - right), bHeight, thickness] },

    // Center Spine
    { id: "Wall-Divide-Center-Back", position: [hubCenter.x, hubCenter.y + bHeight / 2, (roomDividerZ + back) / 2], size: [Math.abs(roomDividerZ - back), bHeight, thickness], rotationY: -Math.PI / 2 },
    { id: "Pillar-Center-Spine", position: [hubCenter.x, hubCenter.y + bHeight / 2, roomDividerZ], size: [2, bHeight, 2] },
  ],
  floors: [
    { id: "Main-Floor", position: [hubCenter.x, hubCenter.y, hubCenter.z], size: [bWidth, thickness, bDepth], color: "#444" },
    { id: "Ceiling", position: [hubCenter.x, hubCenter.y + bHeight, hubCenter.z], size: [bWidth, thickness, bDepth], color: "#fff" },
  ],
  furniture: [
    { id: "conf-table", type: "ConferenceTable", position: [hubCenter.x + 50, hubCenter.y, hubCenter.z - 47.5] },
    { id: "main-lab-bench", type: "LabWorkbench", position: [hubCenter.x - 40, hubCenter.y, hubCenter.z - 5] },
  ]
};
