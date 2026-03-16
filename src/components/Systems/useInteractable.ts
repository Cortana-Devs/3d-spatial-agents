import { useEffect } from "react";
import * as THREE from "three";
import { InteractableRegistry } from "./InteractableRegistry";

export function useInteractable(
  meshRef: React.RefObject<THREE.Object3D | null>,
  userData: any,
) {
  useEffect(() => {
    if (!meshRef.current || !userData?.interactable) return;

    const registry = InteractableRegistry.getInstance();
    const worldPos = new THREE.Vector3();
    meshRef.current.updateMatrixWorld(true); // Ensure world matrix is up to date
    meshRef.current.getWorldPosition(worldPos);

    /*
    console.log(
      `[InteractableRegistry] Registered "${userData.name}" (${userData.id}) at (${worldPos.x.toFixed(1)}, ${worldPos.y.toFixed(1)}, ${worldPos.z.toFixed(1)}), pickable: ${userData.pickable}`,
    );
    */

    registry.register({
      id: userData.id,
      name: userData.name,
      type: userData.objectType || "generic",
      position: worldPos,
      description: userData.description,
      pickable: userData.pickable ?? false,
      carriedBy: null,
      meshRef: meshRef.current,
    });

    return () => {
      /*
      console.log(
        `[InteractableRegistry] Unregistered "${userData.name}" (${userData.id})`,
      );
      */
      registry.unregister(userData.id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.id]); // Use stable ID as dependency, not the full object
}
