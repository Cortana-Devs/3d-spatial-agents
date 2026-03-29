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

    const [w, h, d] = areaData.dimensions;
    const capacity = areaData.capacity || 1;

    let optimalCols = Math.round(Math.sqrt(capacity * (w / d)));
    optimalCols = Math.max(1, optimalCols);

    const maxPossibleCols = Math.max(1, Math.floor(w / 1.5));
    const cols = Math.min(optimalCols, maxPossibleCols, capacity);
    const rows = Math.ceil(capacity / cols);

    const margin = 0.8;
    const spacingX = (w * margin) / cols;
    const spacingZ = rows > 1 ? (d * margin) / rows : 0;

    for (let i = 0; i < capacity; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);

      const localX = (col - (cols - 1) / 2) * spacingX;
      const localZ = rows > 1 ? (row - (rows - 1) / 2) * spacingZ : 0;

      const offset = new THREE.Vector3(localX, h / 2 + 0.15, localZ);
      offset.applyQuaternion(quat);

      const slotPos = pos.clone().add(offset);
      const slotId = capacity > 1 ? `${areaData.id}-slot-${i}` : areaData.id;
      const slotName =
        capacity > 1 ? `${areaData.name} ${i + 1}` : areaData.name;

      const currentItem =
        (areaData.initialItems && areaData.initialItems[i]) || null;

      InteractableRegistry.getInstance().registerPlacingArea({
        id: slotId,
        name: slotName,
        groupId: areaData.id,
        groupName: areaData.name,
        slotIndex: i,
        position: slotPos,
        rotation: quat,
        currentItem,
        dimensions:
          capacity > 1
            ? [w / cols, 1.0, rows > 1 ? d / rows : d]
            : areaData.dimensions,
        meshRef: meshRef.current,
      });
    }

    return () => {
      for (let i = 0; i < capacity; i++) {
        const slotId = capacity > 1 ? `${areaData.id}-slot-${i}` : areaData.id;
        InteractableRegistry.getInstance().unregisterPlacingArea(slotId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaData.id]);
}
