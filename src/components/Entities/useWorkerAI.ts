import { useEffect, useRef, useState } from 'react';
import * as YUKA from 'yuka';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useGameStore } from '@/store/gameStore';

export function useWorkerAI(
    groupRef: React.RefObject<THREE.Group | null>,
    system: any, // passed from OfficeHub containing box state
    id: string,
    carryPointRef: React.RefObject<THREE.Group | null>
) {
    const [state, setState] = useState<'IDLE' | 'MOVING_TO_BOX' | 'CARRYING' | 'MOVING_TO_SITE'>('IDLE');
    const [holdingBox, setHoldingBox] = useState<any>(null);

    const vehicleRef = useRef<YUKA.Vehicle>(new YUKA.Vehicle());
    const entityManager = new YUKA.EntityManager();
    const timeRef = useRef(0);

    const targetBoxRef = useRef<any>(null); // The box we are targeting

    useEffect(() => {
        if (!groupRef.current) return;

        const vehicle = vehicleRef.current;
        vehicle.maxSpeed = 8; // Slower waddle
        vehicle.maxForce = 20;

        // Sync Initial Pos
        vehicle.position.copy(groupRef.current.position as unknown as YUKA.Vector3);
        entityManager.add(vehicle);

        return () => {
            entityManager.entities = []; // Manually clear
        };
    }, []);

    const { scene } = useThree();
    const [active, setActive] = useState(true);

    // Toggle Logic
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === 'e') {
                // Check distance to player
                // Ideally we find the robot group by name or tag
                const player = scene.getObjectByName("Robot_Group");
                if (player && groupRef.current) {
                    const dist = player.position.distanceTo(groupRef.current.position);
                    if (dist < 5) {
                        setActive(prev => !prev);
                        e.stopPropagation();
                    }
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [scene]);

    useFrame((_, delta) => {
        if (!groupRef.current) return;
        const vehicle = vehicleRef.current;
        const dt = Math.min(delta, 0.1);
        timeRef.current += dt;

        // Physics Update (Always update physics to settle?)
        // If inactive, maybe stop moving?
        if (!active) {
            vehicle.velocity.set(0, 0, 0);
            // Still accept physics updates but with 0 velocity so they don't drift?
            // Or just skip logic?
            // Let's skip logic, but sync position just in case.
        }

        if (active) {
            entityManager.update(dt);
        }

        // Sync to Mesh
        groupRef.current.position.copy(vehicle.position as unknown as THREE.Vector3);

        // Store velocity
        groupRef.current.userData.velocity = (vehicle.velocity as unknown as THREE.Vector3);
        groupRef.current.userData.active = active; // For visual feedback if needed

        // Rotation
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((vehicle.velocity as any).squaredLength() > 0.1) {
            const targetRot = Math.atan2(vehicle.velocity.x, vehicle.velocity.z);
            const currentRot = groupRef.current.rotation.y;
            let diff = targetRot - currentRot;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            groupRef.current.rotation.y = currentRot + diff * 0.1;
        }

        if (!active) return; // Skip State Machine

        // --- STATE MACHINE ---

        // 1. IDLE
        if (state === 'IDLE') {
            const box = system.findAvailableBox(vehicle.position);
            if (box) {
                targetBoxRef.current = box;
                system.claimBox(box.id, id);

                // Fix: Explicit YUKA Vector3
                const target = new YUKA.Vector3(box.position.x, box.position.y, box.position.z);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const arrive = new (YUKA as any).ArriveBehavior(target, 2.0, 0.5);
                vehicle.steering.behaviors = [arrive];

                setState('MOVING_TO_BOX');
            } else {
                if (vehicle.steering.behaviors.length === 0) {
                    const wander = new YUKA.WanderBehavior();
                    vehicle.steering.behaviors = [wander];
                }
            }
        }

        // 2. MOVING_TO_BOX
        if (state === 'MOVING_TO_BOX') {
            if (!targetBoxRef.current) { setState('IDLE'); return; } // Safety
            // Convert for distance check
            const targetPos = new YUKA.Vector3(targetBoxRef.current.position.x, targetBoxRef.current.position.y, targetBoxRef.current.position.z);
            const dist = vehicle.position.distanceTo(targetPos);

            if (dist < 3.0) {
                vehicle.steering.behaviors = [];
                vehicle.velocity.set(0, 0, 0);

                setHoldingBox(targetBoxRef.current);
                system.pickUpBox(targetBoxRef.current.id, id);

                const slot = system.getNextConstructionSlot(); // Returns Three.Vector3
                targetBoxRef.current = { position: slot };

                const slotYuka = new YUKA.Vector3(slot.x, slot.y, slot.z);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const arrive = new (YUKA as any).ArriveBehavior(slotYuka, 1.0, 0.5);
                vehicle.steering.behaviors = [arrive];

                setState('MOVING_TO_SITE');
            }
        }

        // 3. MOVING_TO_SITE
        if (state === 'MOVING_TO_SITE') {
            if (!targetBoxRef.current) { setState('IDLE'); return; }
            const targetPos = new YUKA.Vector3(targetBoxRef.current.position.x, targetBoxRef.current.position.y, targetBoxRef.current.position.z);
            const dist = vehicle.position.distanceTo(targetPos);

            if (dist < 2.0) {
                vehicle.steering.behaviors = [];
                vehicle.velocity.set(0, 0, 0);

                system.placeBox(targetBoxRef.current.position);
                setHoldingBox(null);
                targetBoxRef.current = null;

                setState('IDLE');
            }
        }
    });

    return { state, holdingBox, active, toggle: () => setActive(p => !p) };
}
