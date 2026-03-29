import * as THREE from "three";
import type { StateCreator } from "zustand";
import { InteractableRegistry } from "@/systems/InteractableRegistry";
import type { WorldObject } from "@/types/world";
import type { GameState, WorldSlice } from "./gameStoreTypes";

export const createWorldSlice: StateCreator<
  GameState,
  [],
  [],
  WorldSlice
> = (set, get) => ({
  collidableMeshes: [],
  addCollidableMesh: (mesh) => {
    const flattenedMeshes: THREE.Object3D[] = [];
    mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        const alreadyExists = get().collidableMeshes.some(
          (m) => m.uuid === child.uuid,
        );
        if (alreadyExists) return;

        const position = child.geometry.attributes?.position;
        if (!position || position.count === undefined) {
          return;
        }

        if (!child.geometry.boundsTree) {
          child.geometry.computeBoundsTree();
        }

        (child as THREE.Mesh & { _groupUuid?: string })._groupUuid =
          mesh.uuid;
        flattenedMeshes.push(child);
      }
    });

    if (flattenedMeshes.length > 0) {
      set((state) => ({
        collidableMeshes: [...state.collidableMeshes, ...flattenedMeshes],
      }));
    }
  },
  removeCollidableMesh: (uuid) =>
    set((state) => ({
      collidableMeshes: state.collidableMeshes.filter(
        (m: THREE.Object3D & { _groupUuid?: string }) =>
          m.uuid !== uuid && m._groupUuid !== uuid,
      ),
    })),

  obstacles: [],
  addObstacles: (newObstacles) =>
    set((state) => ({ obstacles: [...state.obstacles, ...newObstacles] })),
  removeObstacles: (obsToRemove) =>
    set((state) => ({
      obstacles: state.obstacles.filter(
        (o) => !obsToRemove.some((r) => r.position.equals(o.position)),
      ),
    })),

  interactables: [],
  addInteractables: (items) => {
    items.forEach((item) => {
      InteractableRegistry.getInstance().register(item as unknown as WorldObject);
    });
    set((state) => ({ interactables: [...state.interactables, ...items] }));
  },
  removeInteractables: (ids) => {
    ids.forEach((id) => {
      InteractableRegistry.getInstance().unregister(id);
    });
    set((state) => ({
      interactables: state.interactables.filter((i) => !ids.includes(i.id)),
    }));
  },
});
