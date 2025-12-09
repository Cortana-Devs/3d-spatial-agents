import { create } from 'zustand';
import * as THREE from 'three';

export interface Obstacle {
    position: THREE.Vector3;
    radius: number;
}

interface GameState {
    debugText: string;
    setDebugText: (text: string) => void;
    viewMode: 'third';
    setViewMode: (mode: 'third') => void;
    isCameraLocked: boolean;
    setCameraLocked: (locked: boolean) => void;
    isNight: boolean;
    setIsNight: (isNight: boolean) => void;
    collidableMeshes: THREE.Object3D[];
    addCollidableMesh: (mesh: THREE.Object3D) => void;
    removeCollidableMesh: (uuid: string) => void;
    obstacles: Obstacle[];
    addObstacles: (obstacles: Obstacle[]) => void;
    removeObstacles: (obstacles: Obstacle[]) => void;

    // Interactables (for actions like sitting)
    interactables: { id: string; type: string; position: THREE.Vector3; rotation: THREE.Quaternion }[];
    addInteractables: (items: { id: string; type: string; position: THREE.Vector3; rotation: THREE.Quaternion }[]) => void;
    removeInteractables: (ids: string[]) => void;

    // Robot State
    isSitting: boolean;
    setSitting: (sitting: boolean) => void;
}

export const useGameStore = create<GameState>((set) => ({
    debugText: '',
    setDebugText: (text) => set({ debugText: text }),
    viewMode: 'third',
    setViewMode: (mode) => set({ viewMode: mode }),
    isCameraLocked: false,
    setCameraLocked: (locked) => set({ isCameraLocked: locked }),
    isNight: false,
    setIsNight: (isNight) => set({ isNight }),

    collidableMeshes: [],
    addCollidableMesh: (mesh) => set((state) => ({ collidableMeshes: [...state.collidableMeshes, mesh] })),
    removeCollidableMesh: (uuid) => set((state) => ({ collidableMeshes: state.collidableMeshes.filter((m) => m.uuid !== uuid) })),

    obstacles: [],
    addObstacles: (newObstacles) => set((state) => ({ obstacles: [...state.obstacles, ...newObstacles] })),
    removeObstacles: (obsToRemove) => set((state) => ({
        obstacles: state.obstacles.filter(o => !obsToRemove.some(r => r.position.equals(o.position)))
    })),

    interactables: [],
    addInteractables: (items) => set((state) => ({ interactables: [...state.interactables, ...items] })),
    removeInteractables: (ids) => set((state) => ({ interactables: state.interactables.filter(i => !ids.includes(i.id)) })),

    isSitting: false,
    setSitting: (sitting) => set({ isSitting: sitting }),
}));
