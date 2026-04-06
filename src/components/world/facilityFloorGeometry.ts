import * as THREE from "three";

/**
 * Flat annulus extruded along Y (after rotation), centered on origin in XZ and vertically on Y=0.
 * Top surface is at +depth/2 in local space.
 */
export function createRingExtrudeGeometry(
  innerRadius: number,
  outerRadius: number,
  depth: number,
  curveSegments = 64,
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    steps: 1,
    curveSegments,
  });

  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const cy = (bb.max.y + bb.min.y) / 2;
  geo.translate(0, -cy, 0);
  return geo;
}
