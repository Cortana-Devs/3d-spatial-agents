import { useEffect, useRef } from 'react';
import * as YUKA from 'yuka';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import AIManager from '../Systems/AIManager';
import { useGameStore } from '@/store/gameStore';

export function useYukaAI(
    groupRef: React.RefObject<THREE.Group | null>,
    playerRef: React.RefObject<THREE.Group | null>,
    joints: React.MutableRefObject<any>
) {
    const vehicleRef = useRef<YUKA.Vehicle | null>(null);
    const aiManager = AIManager.getInstance();
    const obstacles = useGameStore((state) => state.obstacles);
    const collidableMeshes = useGameStore((state) => state.collidableMeshes);
    const walkTime = useRef(0);
    const greetingState = useRef<'NONE' | 'LOOKING' | 'WAVING' | 'DONE'>('NONE');
    const greetingTimer = useRef(0);

    // Social State (Robot-Robot Interaction)
    const socialState = useRef<'NONE' | 'CHATTING' | 'COOLDOWN'>('NONE');
    const socialTimer = useRef(0);
    const socialTarget = useRef<YUKA.Vehicle | null>(null);
    // Optimization Refs
    const raycasterRef = useRef(new THREE.Raycaster());
    const rayOriginRef = useRef(new THREE.Vector3());
    const rayDirRef = useRef(new THREE.Vector3(0, -1, 0));
    const frameRef = useRef(0);

    useEffect(() => {
        if (!groupRef.current) return;

        // Create Yuka Vehicle
        const vehicle = new YUKA.Vehicle();
        vehicle.maxSpeed = 12.0;
        vehicle.maxForce = 30.0;
        vehicle.mass = 1.0;
        vehicle.boundingRadius = 2.0; // Ensure they have size for separation

        // Sync initial position
        vehicle.position.copy(groupRef.current.position as unknown as YUKA.Vector3);
        vehicle.rotation.copy(groupRef.current.quaternion as unknown as YUKA.Quaternion);

        // Render Component (Sync Yuka -> Three)
        vehicle.setRenderComponent(groupRef.current, (entity, renderComponent) => {
            const mesh = renderComponent as THREE.Group;
            mesh.position.copy(entity.position as unknown as THREE.Vector3);
            mesh.quaternion.copy(entity.rotation as unknown as THREE.Quaternion);
        });

        // --- BEHAVIORS ---

        // 1. Obstacle Avoidance
        const yukaObstacles: YUKA.GameEntity[] = [];
        obstacles.forEach(ob => {
            const ent = new YUKA.GameEntity();
            ent.position.copy(ob.position as unknown as YUKA.Vector3);
            ent.boundingRadius = ob.radius;
            yukaObstacles.push(ent);
        });
        const obstacleAvoidance = new YUKA.ObstacleAvoidanceBehavior(yukaObstacles);
        obstacleAvoidance.weight = 5.0;
        vehicle.steering.add(obstacleAvoidance);

        // 2. Wander (Idle/Patrol)
        const wander = new YUKA.WanderBehavior();
        wander.weight = 1.0;
        vehicle.steering.add(wander);

        // 3. Seek (Follow Player)
        const seek = new YUKA.SeekBehavior(new YUKA.Vector3());
        seek.active = false;
        vehicle.steering.add(seek);

        // 4. Separation (Don't overlap with other robots)
        // We pass the global list of vehicles. Yuka will check distance to each.
        const separation = new YUKA.SeparationBehavior(aiManager.vehicles);
        separation.weight = 5.0; // Strong personal space
        vehicle.steering.add(separation);

        vehicleRef.current = vehicle;
        aiManager.addEntity(vehicle);

        return () => {
            aiManager.removeEntity(vehicle);
        };
    }, [obstacles]);

    useFrame((state, delta) => {
        const vehicle = vehicleRef.current;
        if (!vehicle) return;
        const dt = Math.min(delta, 0.1);
        frameRef.current++;

        // --- PHYSICS CONSTRAINT ---
        // Lock Y velocity to prevent the robot from pitching up/down (face-planting)
        vehicle.velocity.y = 0;

        // --- HARD COLLISION (Robot vs Robot) ---
        // Prevent overlapping by manually pushing them apart
        const vehicles = aiManager.vehicles;
        const myPos = vehicle.position;
        const minSeparation = 2.5; // 1.25 radius each

        for (const other of vehicles) {
            if (other !== vehicle) {
                const distSq = myPos.squaredDistanceTo(other.position);

                // Hard Collision
                if (distSq < minSeparation * minSeparation) {
                    const dist = Math.sqrt(distSq);
                    const overlap = minSeparation - dist;

                    // Push away vector
                    // Handle exact overlap (dist = 0)
                    let pushX = 0, pushZ = 0;
                    if (dist > 0.001) {
                        const dx = (myPos.x - other.position.x) / dist;
                        const dz = (myPos.z - other.position.z) / dist;
                        pushX = dx * overlap * 0.5; // Push half the overlap
                        pushZ = dz * overlap * 0.5;
                    } else {
                        // Random push if exactly on top
                        pushX = (Math.random() - 0.5) * 0.1;
                        pushZ = (Math.random() - 0.5) * 0.1;
                    }

                    // Apply position correction
                    vehicle.position.x += pushX;
                    vehicle.position.z += pushZ;

                    // Kill velocity towards the other robot
                    // Simple friction/bounce
                    vehicle.velocity.x *= 0.9;
                    vehicle.velocity.z *= 0.9;
                }

                // Social Interaction Trigger
                // If close enough (< 5m), not greeting player, and ready to chat
                if (distSq < 25.0 && socialState.current === 'NONE' && greetingState.current === 'NONE') {
                    // Check if other is also free (Simple check: is it moving slow?)
                    // Ideally we'd check other.userData.state, but Yuka entities are generic.
                    // Let's just initiate.
                    if (Math.random() < 0.01) { // Random chance to start chat
                        socialState.current = 'CHATTING';
                        socialTarget.current = other;
                        socialTimer.current = 0;
                    }
                }
            }
        }

        // --- PHYSICS (Gravity / Ground Detection) ---
        // We need to keep the AI on the ground (Terrain or Bridge)
        // Optimization: Run ground check every 2 frames
        if (collidableMeshes.length > 0 && frameRef.current % 2 === 0) {
            const raycaster = raycasterRef.current;
            const rayOrigin = rayOriginRef.current;

            rayOrigin.set(vehicle.position.x, vehicle.position.y + 5.0, vehicle.position.z);
            raycaster.set(rayOrigin, rayDirRef.current);

            // 1. Current Position Check
            const hits = raycaster.intersectObjects(collidableMeshes, true);
            let groundHeight = -100;
            let foundGround = false;

            if (hits.length > 0) {
                for (const hit of hits) {
                    if (hit.point.y < rayOrigin.y) {
                        groundHeight = Math.max(groundHeight, hit.point.y);
                        foundGround = true;
                    }
                }
            }

            if (foundGround) {
                // Wading Logic
                if (groundHeight > -1.5) {
                    // Solid Ground or Shallow Water -> Snap to height
                    // Smooth snap to avoid jitter from throttling
                    vehicle.position.y = THREE.MathUtils.lerp(vehicle.position.y, groundHeight, 0.5);

                    // Water Resistance (Knee deep?)
                    if (groundHeight < -0.1) {
                        vehicle.velocity.multiplyScalar(0.98); // Drag
                    }
                } else {
                    // Deep Water -> Sink
                    vehicle.position.y -= 5.0 * dt * 2; // Compensate for 2 frames? No, dt is real time.
                }
            } else {
                // Void -> Fall
                vehicle.position.y -= 10.0 * dt;
            }
        } else if (collidableMeshes.length > 0 && frameRef.current % 2 !== 0) {
            // Interpolate gravity on skipped frames if falling? 
            // For now, just let it hold Y or simple gravity.
            // Actually, if we skip, we just don't update Y, which is fine for 1 frame.
        }

        // 2. Ground Sensor (Look Ahead)
        // Optimization: Run sensor check every 3 frames
        if (collidableMeshes.length > 0 && vehicle.velocity.length() > 0.1 && frameRef.current % 3 === 0) {
            const raycaster = raycasterRef.current;

            // Yuka Vector3 methods
            const lookAhead = vehicle.velocity.clone().normalize().multiplyScalar(2.0);
            const sensorPos = new THREE.Vector3(vehicle.position.x, vehicle.position.y, vehicle.position.z).add(
                new THREE.Vector3(lookAhead.x, lookAhead.y, lookAhead.z)
            );
            sensorPos.y += 5.0;

            raycaster.set(sensorPos, rayDirRef.current);
            const sensorHits = raycaster.intersectObjects(collidableMeshes, true);

            let sensorGroundY = -100;
            if (sensorHits.length > 0) {
                for (const hit of sensorHits) {
                    if (hit.point.y < sensorPos.y) {
                        sensorGroundY = Math.max(sensorGroundY, hit.point.y);
                    }
                }
            }

            // Avoid Deep Water (< -1.0)
            if (sensorGroundY < -1.0) {
                // EMERGENCY: Deep Water Ahead!
                // 1. Brake Hard
                vehicle.velocity.multiplyScalar(0.5);

                // 2. Steer towards Safety (Center/Spawn)
                const safetyTarget = new THREE.Vector3(0, 0, -330); // Back to hub
                const toSafety = new THREE.Vector3().subVectors(safetyTarget, vehicle.position as unknown as THREE.Vector3).normalize();

                // Apply strong force towards safety
                vehicle.velocity.x += toSafety.x * 20.0 * dt;
                vehicle.velocity.z += toSafety.z * 20.0 * dt;
            }
        }

        // --- SAFETY RESET (Respawn if fallen/glitched) ---
        if (vehicle.position.y < -20 || isNaN(vehicle.position.y)) {
            // Reset to Spawn
            vehicle.position.set(0, 5, -330);
            vehicle.velocity.set(0, 0, 0);
        }

        // --- UNSTUCK LOGIC ---
        // If trying to move (Seek active) but speed is low, force a move
        const seek = vehicle.steering.behaviors[2] as YUKA.SeekBehavior;
        if (seek.active && vehicle.velocity.length() < 0.5) {
            // Increment stuck timer (using a static property or ref would be better, but let's use a random chance for now)
            if (Math.random() < 0.05) {
                // Jiggle
                vehicle.velocity.x += (Math.random() - 0.5) * 5.0;
                vehicle.velocity.z += (Math.random() - 0.5) * 5.0;
            }
        }

        // --- LOGIC UPDATE ---
        if (playerRef && playerRef.current) {
            const playerPos = playerRef.current.position;
            const dist = vehicle.position.distanceTo(playerPos as unknown as YUKA.Vector3);

            const seek = vehicle.steering.behaviors[2] as YUKA.SeekBehavior;
            const wander = vehicle.steering.behaviors[1] as YUKA.WanderBehavior;

            // Social State Machine
            if (socialState.current === 'CHATTING') {
                // Stop and Chat
                seek.active = false;
                wander.active = false;
                vehicle.velocity.multiplyScalar(0.9); // Slow down to stop

                socialTimer.current += dt;

                // End Chat
                if (socialTimer.current > 8.0) {
                    socialState.current = 'COOLDOWN';
                    socialTimer.current = 0;
                    socialTarget.current = null;
                }
            } else if (socialState.current === 'COOLDOWN') {
                // Resume normal behavior
                socialTimer.current += dt;
                if (socialTimer.current > 15.0) {
                    socialState.current = 'NONE';
                }

                // Normal Logic (Wander/Follow)
                if (dist < 40 && dist > 8) {
                    seek.active = true;
                    wander.active = false;
                    seek.target.copy(playerPos as unknown as YUKA.Vector3);
                } else if (dist <= 8) {
                    seek.active = false;
                    vehicle.velocity.multiplyScalar(0.95);
                } else {
                    seek.active = false;
                    wander.active = true;
                }
            } else {
                // Normal Logic (Greeting or Wander)
                // Reset Greeting if far away
                if (dist > 100) {
                    greetingState.current = 'NONE';
                }

                // Trigger Greeting
                if (greetingState.current === 'NONE' && dist < 60 && dist > 40) {
                    greetingState.current = 'LOOKING';
                    greetingTimer.current = 0;
                }

                // State Machine
                if (greetingState.current === 'LOOKING') {
                    // Stop and Stare
                    seek.active = false;
                    wander.active = false;
                    vehicle.velocity.set(0, 0, 0);

                    greetingTimer.current += dt;
                    if (greetingTimer.current > 2.0) {
                        greetingState.current = 'WAVING';
                        greetingTimer.current = 0;
                    }
                } else if (greetingState.current === 'WAVING') {
                    // Stop and Wave
                    seek.active = false;
                    wander.active = false;
                    vehicle.velocity.set(0, 0, 0);

                    greetingTimer.current += dt;
                    if (greetingTimer.current > 2.5) {
                        greetingState.current = 'DONE';
                    }
                } else if (greetingState.current === 'DONE') {
                    // Mind own business (Patrol/Wander)
                    // Unless very close (Follow logic overrides)
                    if (dist < 40 && dist > 8) {
                        seek.active = true;
                        wander.active = false;
                        seek.target.copy(playerPos as unknown as YUKA.Vector3);
                    } else if (dist <= 8) {
                        seek.active = false;
                        vehicle.velocity.multiplyScalar(0.95);
                    } else {
                        seek.active = false;
                        wander.active = true;
                    }
                } else {
                    // Normal Logic (Before Greeting or if logic falls through)
                    if (dist < 40 && dist > 8) {
                        // FOLLOW MODE
                        seek.active = true;
                        wander.active = false;
                        seek.target.copy(playerPos as unknown as YUKA.Vector3);
                    } else if (dist <= 8) {
                        // IDLE MODE (Close enough)
                        seek.active = false;
                        vehicle.velocity.multiplyScalar(0.95); // Brake
                    } else {
                        // PATROL/WANDER MODE
                        seek.active = false;
                        wander.active = true;
                    }
                }
            }
        }

        // Update Manager (Global update usually, but for now per-hook is okay if singleton handles dedupe, 
        // BUT AIManager.update() updates ALL entities. We should call it ONCE in Scene, not here.
        // Wait, we need a central updater. For now, let's just update THIS vehicle's steering? 
        // No, Yuka needs the manager update.
        // We will add a <YukaSystem /> component to Scene to handle the global update.

        // --- ANIMATION UPDATE ---
        const speed = vehicle.velocity.length(); // Yuka vector length
        const isRunning = speed > 6.0;
        const j = joints.current;

        if (j.hips && j.torso && j.leftArm && j.rightArm && j.leftHip && j.rightHip && j.leftKnee && j.rightKnee && j.neck) {
            const lerpFactor = 0.15;

            // Greeting Animations
            if (greetingState.current === 'LOOKING' || greetingState.current === 'WAVING') {
                // Look at player
                if (playerRef.current) {
                    const targetPos = playerRef.current.position.clone();
                    const lookDir = targetPos.sub(vehicle.position as unknown as THREE.Vector3).normalize();
                    const targetAngle = Math.atan2(lookDir.x, lookDir.z);

                    // Rotate body to face player slowly
                    const currentRot = new THREE.Euler().setFromQuaternion(vehicle.rotation as unknown as THREE.Quaternion);
                    let diff = targetAngle - currentRot.y;
                    while (diff > Math.PI) diff -= Math.PI * 2;
                    while (diff < -Math.PI) diff += Math.PI * 2;

                    // Manually rotate Yuka entity (it will sync to mesh)
                    const rot = new YUKA.Quaternion().copy(vehicle.rotation);
                    const targetQ = new YUKA.Quaternion().fromEuler(0, targetAngle, 0);
                    vehicle.rotation.slerp(targetQ, 0.05);

                    // Neck look at player
                    const neckLookDir = playerRef.current.position.clone().sub(j.neck.getWorldPosition(new THREE.Vector3())).normalize();
                    const neckTargetQuaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), neckLookDir);
                    j.neck.quaternion.slerp(neckTargetQuaternion, lerpFactor);
                }

                // Reset legs/arms to Idle
                j.hips.position.y = THREE.MathUtils.lerp(j.hips.position.y, 3.5, lerpFactor);
                j.leftHip.rotation.x = THREE.MathUtils.lerp(j.leftHip.rotation.x, 0, lerpFactor);
                j.rightHip.rotation.x = THREE.MathUtils.lerp(j.rightHip.rotation.x, 0, lerpFactor);
                j.leftKnee.rotation.x = THREE.MathUtils.lerp(j.leftKnee.rotation.x, 0.1, lerpFactor);
                j.rightKnee.rotation.x = THREE.MathUtils.lerp(j.rightKnee.rotation.x, 0.1, lerpFactor);
                j.leftArm.shoulder.rotation.x = THREE.MathUtils.lerp(j.leftArm.shoulder.rotation.x, 0, lerpFactor);
                j.rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(j.rightArm.shoulder.rotation.x, 0, lerpFactor);
                j.torso.rotation.x = THREE.MathUtils.lerp(j.torso.rotation.x, 0, lerpFactor);


                if (greetingState.current === 'WAVING') {
                    // Wave Animation
                    const waveSpeed = 12;
                    const liftDuration = 0.4;
                    const liftProgress = Math.min(greetingTimer.current / liftDuration, 1);
                    const targetShoulderZ = -2.8; // Raised high
                    const targetElbowZ = -0.8;
                    const easedLift = 1 - Math.pow(1 - liftProgress, 3);

                    if (liftProgress >= 1) {
                        const wave = Math.sin((greetingTimer.current - liftDuration) * waveSpeed) * 0.4;
                        j.rightArm.shoulder.rotation.z = targetShoulderZ + wave;
                        j.rightArm.elbow.rotation.z = targetElbowZ + wave * 0.2;
                    } else {
                        j.rightArm.shoulder.rotation.z = THREE.MathUtils.lerp(j.rightArm.shoulder.rotation.z, targetShoulderZ, easedLift);
                        j.rightArm.elbow.rotation.z = THREE.MathUtils.lerp(j.rightArm.elbow.rotation.z, targetElbowZ, easedLift);
                    }
                } else {
                    // Just Looking
                    j.rightArm.shoulder.rotation.z = THREE.MathUtils.lerp(j.rightArm.shoulder.rotation.z, -0.2, lerpFactor);
                    j.rightArm.elbow.rotation.z = THREE.MathUtils.lerp(j.rightArm.elbow.rotation.z, 0, lerpFactor);
                }
            } else if (speed > 0.1) {
                // Walk/Run
                walkTime.current += dt * (isRunning ? 15 : 10);
                const w = walkTime.current;

                const legAmp = isRunning ? 0.8 : 0.6;
                const kneeAmp = isRunning ? 0.5 : 0.3;

                j.hips.position.y = THREE.MathUtils.lerp(j.hips.position.y, 3.5 + Math.sin(w * 2) * (isRunning ? 0.2 : 0.1), lerpFactor);

                j.leftHip.rotation.x = Math.sin(w) * legAmp;
                j.leftKnee.rotation.x = Math.abs(Math.cos(w)) * kneeAmp + 0.2;

                j.rightHip.rotation.x = Math.sin(w + Math.PI) * legAmp;
                j.rightKnee.rotation.x = Math.abs(Math.cos(w + Math.PI)) * kneeAmp + 0.2;

                j.leftArm.shoulder.rotation.x = Math.sin(w + Math.PI) * legAmp;
                j.rightArm.shoulder.rotation.x = Math.sin(w) * legAmp;
                j.rightArm.shoulder.rotation.z = THREE.MathUtils.lerp(j.rightArm.shoulder.rotation.z, -0.2, lerpFactor); // Arms down
                j.rightArm.elbow.rotation.z = THREE.MathUtils.lerp(j.rightArm.elbow.rotation.z, 0, lerpFactor);

                // Fix Lean: Reduced to 0.1 max
                j.torso.rotation.x = THREE.MathUtils.lerp(j.torso.rotation.x, isRunning ? 0.1 : 0.02, lerpFactor);
                j.neck.rotation.y = THREE.MathUtils.lerp(j.neck.rotation.y, 0, lerpFactor);

            } else {
                // Idle
                walkTime.current += dt;
                const breath = Math.sin(walkTime.current * 1.5);

                j.hips.position.y = THREE.MathUtils.lerp(j.hips.position.y, 3.5, lerpFactor);
                j.torso.rotation.x = THREE.MathUtils.lerp(j.torso.rotation.x, breath * 0.02, lerpFactor);

                j.leftHip.rotation.x = THREE.MathUtils.lerp(j.leftHip.rotation.x, 0, lerpFactor);
                j.rightHip.rotation.x = THREE.MathUtils.lerp(j.rightHip.rotation.x, 0, lerpFactor);
                j.leftKnee.rotation.x = THREE.MathUtils.lerp(j.leftKnee.rotation.x, 0.1, lerpFactor);
                j.rightKnee.rotation.x = THREE.MathUtils.lerp(j.rightKnee.rotation.x, 0.1, lerpFactor);

                // Reset Arms (Fix "Hand Up" glitch)
                j.leftArm.shoulder.rotation.x = THREE.MathUtils.lerp(j.leftArm.shoulder.rotation.x, 0, lerpFactor);
                j.rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(j.rightArm.shoulder.rotation.x, 0, lerpFactor);
                j.rightArm.shoulder.rotation.z = THREE.MathUtils.lerp(j.rightArm.shoulder.rotation.z, -0.2, lerpFactor); // Arms down
                j.rightArm.elbow.rotation.z = THREE.MathUtils.lerp(j.rightArm.elbow.rotation.z, 0, lerpFactor);

                // Look around (Simple version for now)
                j.neck.rotation.y = Math.sin(walkTime.current * 0.5) * 0.3;
            }
        }
    });

    return { vehicle: vehicleRef.current };
}
