import { useEffect } from "react";
import * as THREE from "three";
import { InteractableRegistry } from "./InteractableRegistry";

export function usePlacingArea(
  meshRef: React.RefObject<THREE.Object3D | null>,
  areaData: {
    id: string;
    name: string;
    capacity: number;
    dimensions: [number, number, number];
    initialItems?: string[]; // IDs of objects already placed in slots (fills from index 0)
  },
) {
  useEffect(() => {
    if (!meshRef.current) return;

    meshRef.current.updateMatrixWorld(true);
    const pos = new THREE.Vector3();
    meshRef.current.getWorldPosition(pos);
    const quat = new THREE.Quaternion();
    meshRef.current.getWorldQuaternion(quat);

    // Build currentItems: fill initial items into slots, rest null
    const currentItems: (string | null)[] = new Array(areaData.capacity).fill(
      null,
    );
    if (areaData.initialItems) {
      areaData.initialItems.forEach((itemId, i) => {
        if (i < areaData.capacity) {
          currentItems[i] = itemId;
        }
      });
    }

    InteractableRegistry.getInstance().registerPlacingArea({
      id: areaData.id,
      name: areaData.name,
      position: pos,
      rotation: quat,
      capacity: areaData.capacity,
      currentItems,
      dimensions: areaData.dimensions,
      meshRef: meshRef.current,
    });

    return () => {
      InteractableRegistry.getInstance().unregisterPlacingArea(areaData.id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaData.id]);
}
