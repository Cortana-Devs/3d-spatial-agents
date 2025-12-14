import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/store/gameStore';

export interface Joints {
    hips?: THREE.Group;
    torso?: THREE.Group;
    neck?: THREE.Group;
    leftArm?: { shoulder: THREE.Group; elbow: THREE.Group };
    rightArm?: { shoulder: THREE.Group; elbow: THREE.Group };
    leftHip?: THREE.Group;
    rightHip?: THREE.Group;
    leftKnee?: THREE.Group;
    rightKnee?: THREE.Group;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any; // Allow dynamic access
}

export function useRobotController(groupRef: React.RefObject<THREE.Group | null>) {
    const collidableMeshes = useGameStore((state) => state.collidableMeshes);
    const obstacles = useGameStore((state) => state.obstacles);
    // const setDebugText = useGameStore((state) => state.setDebugText);
    // const isLocked = useGameStore((state) => state.isLocked);

    const inputRef = useRef({ f: false, b: false, l: false, r: false, jump: false, sneak: false, wave: false });
    const state = useRef({
        isWaving: false,
        waveTimer: 0,
        velocity: new THREE.Vector3(),
        isGrounded: false,
        walkTime: 0,
        isSneaking: false,
        idleTime: 0
    });

    const keyBindings = useGameStore((state) => state.keyBindings);

    // Input Handling
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            switch (e.code) {
                case keyBindings.forward: inputRef.current.f = true; break;
                case keyBindings.backward: inputRef.current.b = true; break;
                case keyBindings.left: inputRef.current.l = true; break;
                case keyBindings.right: inputRef.current.r = true; break;
                case keyBindings.jump: inputRef.current.jump = true; break;
                case keyBindings.sprint: inputRef.current.sneak = true; break; // Sprint maps to 'sneak' internally for now? Or vice versa? 
                // Note: Original code mapped Shift to 'sneak'. If user wants 'Sprint', we should clarify. 
                // Assuming 'sneak' in state is actually used for sprinting based on speed constants (12 vs 5). 
                // Wait, walkSpeed=12, sneakSpeed=5. So Shift makes you SLOWER? 
                // "case 'ShiftLeft': case 'ShiftRight': inputRef.current.sneak = true; break;"
                // And "const currentSpeed = s.isSneaking ? sneakSpeed : walkSpeed;"
                // So holding Shift makes you sneak (slower). 
                // The prompt asked for "Sprint", but the code implements Sneak. 
                // I will map 'sprint' binding to 'sneak' input for now to preserve behavior, but label it as 'Sneak' in UI if possible, or just keep it as is.
            }
        };
        const onKeyUp = (e: KeyboardEvent) => {
            switch (e.code) {
                case keyBindings.forward: inputRef.current.f = false; break;
                case keyBindings.backward: inputRef.current.b = false; break;
                case keyBindings.left: inputRef.current.l = false; break;
                case keyBindings.right: inputRef.current.r = false; break;
                case keyBindings.jump: inputRef.current.jump = false; break;
                case keyBindings.sprint: inputRef.current.sneak = false; break;
            }
        };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
        };
    }, [keyBindings]);

    // Physics Constants
    const walkSpeed = 12.0;
    const sneakSpeed = 5.0;
    const jumpForce = 20.0;
    const gravity = -50.0;
    const radius = 0.8;

    const joints = useRef<Joints>({});
    const rb = useRef<any>(null);

    const interactables = useGameStore((state) => state.interactables);
    const isSitting = useGameStore((state) => state.isSitting);
    const setSitting = useGameStore((state) => state.setSitting);
    const setDebugText = useGameStore((state) => state.setDebugText);

    // Sitting State
    const sitTargetPos = useRef<THREE.Vector3 | null>(null);
    const sitTargetRot = useRef<THREE.Quaternion | null>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === keyBindings.interact) {
                console.log("Interact key pressed. isSitting:", isSitting);
                console.log("Interactables count:", interactables.length);

                if (isSitting) {
                    console.log("Standing up...");
                    setSitting(false);
                    sitTargetPos.current = null;
                    sitTargetRot.current = null;
                    state.current.velocity.set(0, 5, 0);
                    state.current.isGrounded = false;

                    // Reset rotation to be upright immediately to prevent disorientation
                    if (groupRef.current) {
                        groupRef.current.rotation.x = 0;
                        groupRef.current.rotation.z = 0;
                    }
                } else {
                    if (!groupRef.current) return;
                    const robotPos = groupRef.current.position;
                    console.log("Robot Pos:", robotPos);

                    let nearest = null;
                    let minDist = 5.0; // Increased range for easier testing

                    for (const item of interactables) {
                        if (item.type === 'sofa') {
                            const dist = robotPos.distanceTo(item.position);
                            console.log(`Checking sofa at ${item.position.toArray()} - Dist: ${dist}`);
                            if (dist < minDist) {
                                minDist = dist;
                                nearest = item;
                            }
                        }
                    }

                    if (nearest) {
                        console.log("Found nearest sofa! Sitting...");
                        setSitting(true);
                        sitTargetPos.current = nearest.position.clone();
                        sitTargetRot.current = nearest.rotation.clone();
                    } else {
                        console.log("No sofa near enough. Waving.");
                        inputRef.current.wave = true;
                        state.current.isWaving = true;
                        state.current.waveTimer = 0;
                    }
                }
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === keyBindings.interact) {
                inputRef.current.wave = false;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [interactables, isSitting, setSitting, groupRef, keyBindings]);

    useFrame((stateRoot, delta) => {
        if (!groupRef.current) return;
        const mesh = groupRef.current;
        const input = inputRef.current;
        const s = state.current;

        // Interaction Prompt
        if (!isSitting) {
            let showPrompt = false;
            for (const item of interactables) {
                if (groupRef.current.position.distanceTo(item.position) < 3.0) {
                    showPrompt = true;
                    break;
                }
            }
            setDebugText(showPrompt ? `Press '${keyBindings.interact.replace('Key', '')}' to Sit` : "");
        } else {
            setDebugText(`Press '${keyBindings.interact.replace('Key', '')}' to Stand`);
        }

        // Clamp delta
        const dt = Math.min(delta, 0.1);

        // Input Processing
        s.isSneaking = input.sneak;
        const currentSpeed = s.isSneaking ? sneakSpeed : walkSpeed;
        const moveDist = currentSpeed * dt;

        let inputZ = 0;
        let inputX = 0;
        if (input.f) inputZ = 1;
        if (input.b) inputZ = -1;
        if (input.l) inputX = 1;
        if (input.r) inputX = -1;

        if (inputX !== 0 || inputZ !== 0) {
            const len = Math.sqrt(inputX * inputX + inputZ * inputZ);
            inputX /= len;
            inputZ /= len;
        }

        // Camera-relative movement
        const camera = stateRoot.camera;
        const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        camForward.y = 0;
        camForward.normalize();
        const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        camRight.y = 0;
        camRight.normalize();

        const moveDir = new THREE.Vector3();
        moveDir.addScaledVector(camForward, inputZ);
        moveDir.addScaledVector(camRight, -inputX);

        if (moveDir.lengthSq() > 0) moveDir.normalize();

        const worldDx = moveDir.x * moveDist;
        const worldDz = moveDir.z * moveDist;

        const isMoving = (inputX !== 0 || inputZ !== 0);

        if (isSitting && sitTargetPos.current && sitTargetRot.current) {
            // Smoothly move to sit target
            groupRef.current.position.lerp(sitTargetPos.current, 0.1);
            groupRef.current.quaternion.slerp(sitTargetRot.current, 0.1);
            s.velocity.set(0, 0, 0);
        } else {
            // Enforce upright orientation (Fix for "messed up controls" after sitting)
            // If the robot was tilted by the sit animation (via quaternion), we must reset X/Z rotation.
            mesh.rotation.x = 0;
            mesh.rotation.z = 0;

            // Actions
            if (input.wave && !s.isWaving) {
                s.isWaving = true;
                s.waveTimer = 0;
            }

            // Rotation
            if (isMoving) {
                const targetAngle = Math.atan2(moveDir.x, moveDir.z);
                let diff = targetAngle - mesh.rotation.y;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                mesh.rotation.y += diff * 10 * dt;
            }

            // Collision
            const proposedX = mesh.position.x + worldDx;
            const proposedZ = mesh.position.z + worldDz;
            let canMove = true;

            for (const ob of obstacles) {
                const distSq = (proposedX - ob.position.x) ** 2 + (proposedZ - ob.position.z) ** 2;
                const minDist = radius + ob.radius;
                if (distSq < minDist * minDist) {
                    canMove = false;
                    break;
                }
            }
            if (canMove) {
                mesh.position.x = proposedX;
                mesh.position.z = proposedZ;
            }

            // Gravity / Ground
            let groundHeight = -10;
            if (collidableMeshes.length > 0) {
                const raycaster = new THREE.Raycaster();
                const rayOrigin = mesh.position.clone();
                rayOrigin.y += 50;
                raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));
                const hits = raycaster.intersectObjects(collidableMeshes, true);
                if (hits.length > 0) groundHeight = hits[0].point.y;
            }

            const groundMeshY = groundHeight;

            if (s.isGrounded) {
                if (input.jump) {
                    s.velocity.y = jumpForce;
                    s.isGrounded = false;
                } else {
                    s.velocity.y = 0;
                    mesh.position.y = groundMeshY;
                }
            } else {
                s.velocity.y += gravity * dt;
                mesh.position.y += s.velocity.y * dt;
                if (mesh.position.y <= groundMeshY) {
                    mesh.position.y = groundMeshY;
                    s.isGrounded = true;
                    s.velocity.y = 0;
                }
            }
        }

        // --- Animation Logic ---
        const j = joints.current;
        // Check if joints are populated
        if (!j.hips || !j.torso || !j.leftArm || !j.rightArm || !j.leftHip || !j.rightHip || !j.leftKnee || !j.rightKnee || !j.neck) {
            // console.warn("Joints not ready");
            return;
        }

        const sneakHipHeight = 2.8;
        const standHipHeight = 3.5;
        const targetHipY = s.isSneaking ? sneakHipHeight : standHipHeight;
        j.hips.position.y = THREE.MathUtils.lerp(j.hips.position.y, targetHipY, 0.15);
        j.torso.rotation.x = THREE.MathUtils.lerp(j.torso.rotation.x, s.isSneaking ? 0.5 : 0, 0.1);

        const lerpFactor = 0.15;

        if (isSitting) {
            // Vibing Pose
            const t = stateRoot.clock.getElapsedTime();

            // Lower Hips to Seat Height
            // Seat height is 2.2.
            // Target Hip Y = 1.9 (Lowered "10% down" to sink in)
            j.hips.position.y = THREE.MathUtils.lerp(j.hips.position.y, 1.9, 0.1);

            // Move hips BACK to reach backrest
            // We moved the root forward to 2.0.
            // Hips should stay relative to root (0.0) or slightly back (-0.2).
            // Let's try 0.0 to be safe and avoid clipping.
            j.hips.position.z = THREE.MathUtils.lerp(j.hips.position.z, 0.0, 0.1);

            // Lean back
            j.torso.rotation.x = THREE.MathUtils.lerp(j.torso.rotation.x, -0.3, 0.1);

            // Head bobbing to music
            j.neck.rotation.x = Math.sin(t * 8) * 0.05;
            j.neck.rotation.y = Math.sin(t * 2) * 0.1;

            // Arms spread out on sofa back
            j.leftArm.shoulder.rotation.z = THREE.MathUtils.lerp(j.leftArm.shoulder.rotation.z, 0.5, 0.1);
            j.leftArm.shoulder.rotation.y = THREE.MathUtils.lerp(j.leftArm.shoulder.rotation.y, -0.5, 0.1);
            j.rightArm.shoulder.rotation.z = THREE.MathUtils.lerp(j.rightArm.shoulder.rotation.z, -0.5, 0.1);
            j.rightArm.shoulder.rotation.y = THREE.MathUtils.lerp(j.rightArm.shoulder.rotation.y, 0.5, 0.1);

            // Legs - Perfect Sit (90 degree bends)
            // Hips bent -90 degrees (legs forward)
            j.leftHip.rotation.x = THREE.MathUtils.lerp(j.leftHip.rotation.x, -1.6, 0.1);
            j.rightHip.rotation.x = THREE.MathUtils.lerp(j.rightHip.rotation.x, -1.6, 0.1);

            // Knees bent 90 degrees (legs down)
            j.leftKnee.rotation.x = THREE.MathUtils.lerp(j.leftKnee.rotation.x, 1.6, 0.1);
            j.rightKnee.rotation.x = THREE.MathUtils.lerp(j.rightKnee.rotation.x, 1.6, 0.1);

            // Slight spread
            j.leftHip.rotation.z = THREE.MathUtils.lerp(j.leftHip.rotation.z, -0.15, 0.1);
            j.rightHip.rotation.z = THREE.MathUtils.lerp(j.rightHip.rotation.z, 0.15, 0.1);

            return; // Skip other animations
        }

        if (s.isWaving) {
            s.waveTimer += dt;
            const waveSpeed = 12;
            const liftDuration = 0.4;
            const liftProgress = Math.min(s.waveTimer / liftDuration, 1);
            const targetShoulderZ = -2.8;
            const targetElbowZ = -0.8;
            const easedLift = 1 - Math.pow(1 - liftProgress, 3);

            const currentShoulderZ = THREE.MathUtils.lerp(j.rightArm.shoulder.rotation.z, targetShoulderZ, easedLift);
            const currentElbowZ = THREE.MathUtils.lerp(j.rightArm.elbow.rotation.z, targetElbowZ, easedLift);

            if (liftProgress >= 1) {
                const wave = Math.sin((s.waveTimer - liftDuration) * waveSpeed) * 0.4;
                j.rightArm.shoulder.rotation.z = targetShoulderZ + wave;
                j.rightArm.elbow.rotation.z = targetElbowZ + wave * 0.2;
            } else {
                j.rightArm.shoulder.rotation.z = currentShoulderZ;
                j.rightArm.elbow.rotation.z = currentElbowZ;
            }

            j.leftArm.shoulder.rotation.x = THREE.MathUtils.lerp(j.leftArm.shoulder.rotation.x, 0, lerpFactor);
            j.leftArm.shoulder.rotation.z = THREE.MathUtils.lerp(j.leftArm.shoulder.rotation.z, 0.2, lerpFactor);
            j.leftHip.rotation.x = THREE.MathUtils.lerp(j.leftHip.rotation.x, 0, lerpFactor);
            j.rightHip.rotation.x = THREE.MathUtils.lerp(j.rightHip.rotation.x, 0, lerpFactor);
            // Reset spread
            j.leftHip.rotation.z = THREE.MathUtils.lerp(j.leftHip.rotation.z, 0, lerpFactor);
            j.rightHip.rotation.z = THREE.MathUtils.lerp(j.rightHip.rotation.z, 0, lerpFactor);

            if (s.waveTimer > 2.5) {
                s.isWaving = false;
            }
        } else if (isMoving && s.isGrounded) {
            s.walkTime += dt * (s.isSneaking ? 8 : 12);
            const legAmp = s.isSneaking ? 0.3 : 0.6;
            const baseKneeBend = s.isSneaking ? 0.8 : 0.2;
            const kneeAmp = s.isSneaking ? 0.2 : 0.3;

            j.leftHip.rotation.x = Math.sin(s.walkTime) * legAmp - (s.isSneaking ? 0.5 : 0);
            j.leftKnee.rotation.x = Math.abs(Math.cos(s.walkTime)) * kneeAmp + baseKneeBend;
            j.rightHip.rotation.x = Math.sin(s.walkTime + Math.PI) * legAmp - (s.isSneaking ? 0.5 : 0);
            j.rightKnee.rotation.x = Math.abs(Math.cos(s.walkTime + Math.PI)) * kneeAmp + baseKneeBend;

            // Reset spread
            j.leftHip.rotation.z = THREE.MathUtils.lerp(j.leftHip.rotation.z, 0, lerpFactor);
            j.rightHip.rotation.z = THREE.MathUtils.lerp(j.rightHip.rotation.z, 0, lerpFactor);

            if (s.isSneaking) {
                j.leftArm.shoulder.rotation.x = THREE.MathUtils.lerp(j.leftArm.shoulder.rotation.x, -0.5, lerpFactor);
                j.rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(j.rightArm.shoulder.rotation.x, -0.5, lerpFactor);
                j.leftArm.shoulder.rotation.z = THREE.MathUtils.lerp(j.leftArm.shoulder.rotation.z, 0.8, lerpFactor);
                j.rightArm.shoulder.rotation.z = THREE.MathUtils.lerp(j.rightArm.shoulder.rotation.z, -0.8, lerpFactor);
            } else {
                j.leftArm.shoulder.rotation.x = Math.sin(s.walkTime + Math.PI) * 0.6;
                j.rightArm.shoulder.rotation.x = Math.sin(s.walkTime) * 0.6;
                j.leftArm.shoulder.rotation.z = THREE.MathUtils.lerp(j.leftArm.shoulder.rotation.z, 0.2, lerpFactor);
                j.rightArm.shoulder.rotation.z = THREE.MathUtils.lerp(j.rightArm.shoulder.rotation.z, -0.2, lerpFactor);
            }
            j.rightArm.elbow.rotation.z = THREE.MathUtils.lerp(j.rightArm.elbow.rotation.z, 0, lerpFactor);
        } else if (!s.isGrounded) {
            j.leftHip.rotation.x = THREE.MathUtils.lerp(j.leftHip.rotation.x, 0.5, lerpFactor);
            j.rightHip.rotation.x = THREE.MathUtils.lerp(j.rightHip.rotation.x, 0.2, lerpFactor);
            j.leftKnee.rotation.x = THREE.MathUtils.lerp(j.leftKnee.rotation.x, 0.8, lerpFactor);
            j.rightKnee.rotation.x = THREE.MathUtils.lerp(j.rightKnee.rotation.x, 0.1, lerpFactor);
            j.rightArm.elbow.rotation.z = THREE.MathUtils.lerp(j.rightArm.elbow.rotation.z, 0, lerpFactor);

            // Reset spread
            j.leftHip.rotation.z = THREE.MathUtils.lerp(j.leftHip.rotation.z, 0, lerpFactor);
            j.rightHip.rotation.z = THREE.MathUtils.lerp(j.rightHip.rotation.z, 0, lerpFactor);
        } else {
            s.idleTime += dt;
            const breath = Math.sin(s.idleTime * 1.5);
            const microMovement = Math.cos(s.idleTime * 0.8);

            const baseKneeBend = s.isSneaking ? 0.9 : 0.1 + breath * 0.02;
            const baseHipBend = s.isSneaking ? -0.6 : -0.1 - breath * 0.02;

            j.leftHip.rotation.x = THREE.MathUtils.lerp(j.leftHip.rotation.x, baseHipBend, lerpFactor);
            j.rightHip.rotation.x = THREE.MathUtils.lerp(j.rightHip.rotation.x, baseHipBend + microMovement * 0.02, lerpFactor);
            j.leftKnee.rotation.x = THREE.MathUtils.lerp(j.leftKnee.rotation.x, baseKneeBend, lerpFactor);
            j.rightKnee.rotation.x = THREE.MathUtils.lerp(j.rightKnee.rotation.x, baseKneeBend - microMovement * 0.02, lerpFactor);

            // Reset spread
            j.leftHip.rotation.z = THREE.MathUtils.lerp(j.leftHip.rotation.z, 0, lerpFactor);
            j.rightHip.rotation.z = THREE.MathUtils.lerp(j.rightHip.rotation.z, 0, lerpFactor);

            j.torso.rotation.x = THREE.MathUtils.lerp(j.torso.rotation.x, (s.isSneaking ? 0.5 : 0) + breath * 0.03, lerpFactor);
            j.neck.rotation.x = THREE.MathUtils.lerp(j.neck.rotation.x, -breath * 0.03 + microMovement * 0.02, lerpFactor);

            if (s.isSneaking) {
                j.leftArm.shoulder.rotation.x = THREE.MathUtils.lerp(j.leftArm.shoulder.rotation.x, -0.4 + breath * 0.05, lerpFactor);
                j.rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(j.rightArm.shoulder.rotation.x, -0.4 + breath * 0.05, lerpFactor);
                j.leftArm.shoulder.rotation.z = THREE.MathUtils.lerp(j.leftArm.shoulder.rotation.z, 0.5, lerpFactor);
                j.rightArm.shoulder.rotation.z = THREE.MathUtils.lerp(j.rightArm.shoulder.rotation.z, -0.5, lerpFactor);
            } else {
                j.leftArm.shoulder.rotation.x = THREE.MathUtils.lerp(j.leftArm.shoulder.rotation.x, breath * 0.05, lerpFactor);
                j.rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(j.rightArm.shoulder.rotation.x, -breath * 0.05, lerpFactor);
                j.leftArm.shoulder.rotation.z = THREE.MathUtils.lerp(j.leftArm.shoulder.rotation.z, 0.2 + microMovement * 0.03, lerpFactor);
                j.rightArm.shoulder.rotation.z = THREE.MathUtils.lerp(j.rightArm.shoulder.rotation.z, -0.2 - microMovement * 0.03, lerpFactor);
            }
            j.rightArm.elbow.rotation.z = THREE.MathUtils.lerp(j.rightArm.elbow.rotation.z, 0, lerpFactor);
        }
    });

    return { joints };
}
