import { useEffect } from "react";
import * as THREE from "three";
import { InteractableRegistry } from "./InteractableRegistry";

export function usePlacingArea(
  meshRef: React.RefObject<THREE.Object3D | null>,
  areaData: {
    id: string;
    name: string;
    capacity: number;
    allowedTypes?: (
      | "file"
      | "laptop"
      | "pendrive"
      | "printer"
      | "coffeecup"
      | "generic"
    )[];
    dimensions: [number, number, number];
  },
) {
  useEffect(() => {
    if (!meshRef.current) return;

    meshRef.current.updateMatrixWorld(true);
    const pos = new THREE.Vector3();
    meshRef.current.getWorldPosition(pos);
    const quat = new THREE.Quaternion();
    meshRef.current.getWorldQuaternion(quat);

    /*
    console.log(
      `[PlacingArea] Registered "${areaData.name}" (${areaData.id}) at (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}), capacity: ${areaData.capacity}`,
    );
    */

    InteractableRegistry.getInstance().registerPlacingArea({
      id: areaData.id,
      name: areaData.name,
      position: pos,
      rotation: quat,
      capacity: areaData.capacity,
      currentItems: new Array(areaData.capacity).fill(null),
      dimensions: areaData.dimensions,
      allowedTypes: areaData.allowedTypes,
      meshRef: meshRef.current,
    });

    return () => {
      InteractableRegistry.getInstance().unregisterPlacingArea(areaData.id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaData.id]);
}
