import * as THREE from "three";
import { createRingExtrudeGeometry } from "./donutFloorGeometry";
import { DEFAULT_RING_INNER_RADIUS, DEFAULT_RING_OUTER_RADIUS, DEFAULT_RING_CURVE_SEGMENTS } from "./labFloorConstants";

export const DOOR_WIDTH = 10;
const OUTER_GAP = DOOR_WIDTH / DEFAULT_RING_OUTER_RADIUS;
const INNER_GAP = DOOR_WIDTH / DEFAULT_RING_INNER_RADIUS;

// Elite Performance: Pre-compute and globally cache all static geometries

// Interior Wooden Floor
export const interiorFloorGeometry = createRingExtrudeGeometry(
  DEFAULT_RING_INNER_RADIUS,
  DEFAULT_RING_OUTER_RADIUS,
  0.4,
  128
);

// Exterior Concrete Plaza
export const exteriorPlazaGeometry = createRingExtrudeGeometry(
  DEFAULT_RING_OUTER_RADIUS,
  160,
  0.3,
  128
);

// Apple Park style massive overhanging roof
export const roofGeometry = createRingExtrudeGeometry(
  DEFAULT_RING_INNER_RADIUS - 12,
  DEFAULT_RING_OUTER_RADIUS + 15,
  2.0,
  128
);

export const roofSoffitGeometry = createRingExtrudeGeometry(
  DEFAULT_RING_INNER_RADIUS - 11.5,
  DEFAULT_RING_OUTER_RADIUS + 14.5,
  0.5,
  128
);

export const outerWallSegmentGeo = new THREE.CylinderGeometry(DEFAULT_RING_OUTER_RADIUS, DEFAULT_RING_OUTER_RADIUS, 30, 32, 1, true, OUTER_GAP / 2, Math.PI / 2 - OUTER_GAP);
export const innerWallSegmentGeo = new THREE.CylinderGeometry(DEFAULT_RING_INNER_RADIUS, DEFAULT_RING_INNER_RADIUS, 30, 16, 1, true, INNER_GAP / 2, Math.PI / 2 - INNER_GAP);

export const mullionGeo = new THREE.BoxGeometry(0.2, 30, 0.6);
export const transomGeo = new THREE.BoxGeometry(1.0, 0.2, 0.4);
export const finGeo = new THREE.BoxGeometry(0.1, 30, 3.0);
finGeo.translate(0, 0, 1.5);

export const doorPillarGeo = new THREE.BoxGeometry(0.6, 12, 1.5);
export const doorLintelGeo = new THREE.BoxGeometry(DOOR_WIDTH + 0.6, 0.6, 1.5);
export const doorTrackGeo = new THREE.BoxGeometry(DOOR_WIDTH, 0.2, 0.4);
export const doorGlassGeo = new THREE.BoxGeometry(DOOR_WIDTH / 2 - 0.05, 11.8, 0.1);
export const doorHandleGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 8);

export const outerRingGeometry = new THREE.TorusGeometry(DEFAULT_RING_OUTER_RADIUS, 0.4, 16, Math.floor(DEFAULT_RING_CURVE_SEGMENTS / 2));
outerRingGeometry.rotateX(Math.PI / 2);
