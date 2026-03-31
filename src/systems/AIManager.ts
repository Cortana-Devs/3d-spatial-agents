import * as YUKA from 'yuka';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';

class AIManager {
    private static instance: AIManager;
    public entityManager: YUKA.EntityManager;
    public time: YUKA.Time;
    public vehicles: YUKA.Vehicle[] = [];
    private obstacles: YUKA.GameEntity[] = [];

    private constructor() {
        this.entityManager = new YUKA.EntityManager();
        this.time = new YUKA.Time();
    }

    public static getInstance(): AIManager {
        if (!AIManager.instance) {
            AIManager.instance = new AIManager();
        }
        return AIManager.instance;
    }

    public update(delta: number) {
        this.entityManager.update(delta);
    }

    public addEntity(entity: YUKA.GameEntity) {
        this.entityManager.add(entity);
        if (entity instanceof YUKA.Vehicle) {
            this.vehicles.push(entity);
        }
    }

    public removeEntity(entity: YUKA.GameEntity) {
        this.entityManager.remove(entity);
        if (entity instanceof YUKA.Vehicle) {
            this.vehicles = this.vehicles.filter(v => v !== entity);
        }
    }

    /**
     * Partner position for COLLABORATE: store first (minimap-throttled), then live vehicle positions.
     */
    public getPartnerApproachPosition(partnerId: string, selfY: number): THREE.Vector3 | null {
        const stored = useGameStore.getState().agentPositions[partnerId];
        if (stored) {
            return new THREE.Vector3(stored.x, selfY, stored.z);
        }
        for (const v of this.vehicles) {
            if ((v as unknown as { id?: string }).id === partnerId) {
                const p = v.position as unknown as THREE.Vector3;
                return new THREE.Vector3(p.x, selfY, p.z);
            }
        }
        return null;
    }

    // Sync obstacles from GameStore if needed, or add manually
    public addObstacle(position: THREE.Vector3, radius: number) {
        const obstacle = new YUKA.GameEntity();
        obstacle.position.copy(position as unknown as YUKA.Vector3);
        obstacle.boundingRadius = radius;
        this.entityManager.add(obstacle);
        this.obstacles.push(obstacle);
        return obstacle;
    }
}

export default AIManager;
