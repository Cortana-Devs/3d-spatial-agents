import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/store/gameStore';
import { WAYPOINTS, PATROL_SPEED, CHASE_SPEED, IDLE_DURATION } from '../Systems/AIGoals';
import { Joints } from './useRobotController';

export function useAIController(groupRef: React.RefObject<THREE.Group | null>, playerRef: React.RefObject<THREE.Group | null>) {
    const obstacles = useGameStore((state) => state.obstacles);
    const collidableMeshes = useGameStore((state) => state.collidableMeshes);

    // AI State
    const state = useRef({
        mode: 'PATROL', // PATROL, IDLE, FOLLOW, UNSTUCK
        targetIndex: 0,
        idleTimer: 0,
        stuckTimer: 0,
        velocity: new THREE.Vector3(),
        walkTime: 0,
        isGrounded: false,
        lastPos: new THREE.Vector3(),
        stuckCheckTimer: 0,
        // New Natural Behavior State
        followOffset: new THREE.Vector3(2, 0, 2), // Offset from player
        followUpdateTimer: 0,
        idleSubState: 'BREATHE', // BREATHE, LOOK, SHIFT
        idleSubTimer: 0,
    });

    const joints = useRef<Joints>({});

    useFrame((rootState, delta) => {
        if (!groupRef.current) return;
        const mesh = groupRef.current;
        const s = state.current;
        const dt = Math.min(delta, 0.1);
        const time = rootState.clock.getElapsedTime();

        // DEBUG LOGGING
        if (Math.random() < 0.005) {
            console.log(`AI: ${s.mode} | Sub: ${s.idleSubState} | Dist: ${playerRef?.current ? mesh.position.distanceTo(playerRef.current.position).toFixed(1) : 'N/A'}`);
        }

        // --- PHYSICS (Gravity) ---
        let groundHeight = -10;
        if (collidableMeshes.length > 0) {
            const raycaster = new THREE.Raycaster();
            const rayOrigin = mesh.position.clone();
            rayOrigin.y += 50.0;
            raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));
            const hits = raycaster.intersectObjects(collidableMeshes, true);
            if (hits.length > 0) {
                for (const hit of hits) {
                    if (hit.point.y < mesh.position.y + 50.0) {
                        groundHeight = Math.max(groundHeight, hit.point.y);
                    }
                }
            }
        }

        // Safety Floor
        if (groundHeight === -10 && mesh.position.z < -300 && mesh.position.z > -450) {
            groundHeight = 0.0;
        }

        // Apply Gravity
        if (mesh.position.y > groundHeight + 0.1) {
            s.velocity.y -= 50.0 * dt;
            s.isGrounded = false;
        } else {
            s.velocity.y = 0;
            mesh.position.y = groundHeight;
            s.isGrounded = true;
        }
        mesh.position.y += s.velocity.y * dt;

        // --- DECISION MAKING ---
        const currentPos = mesh.position.clone();
        currentPos.y = 0;

        // Check Player Distance
        let distToPlayer = 9999;
        let playerPos = null;
        if (playerRef && playerRef.current) {
            playerPos = playerRef.current.position.clone();
            playerPos.y = 0;
            distToPlayer = currentPos.distanceTo(playerPos);
        }

        // State Transitions
        if (s.mode !== 'UNSTUCK') {
            if (distToPlayer < 40 && distToPlayer > 8) { // Increased min follow dist
                s.mode = 'FOLLOW';
            } else if (s.mode === 'FOLLOW' && distToPlayer > 60) {
                s.mode = 'PATROL';
            } else if (s.mode === 'FOLLOW' && distToPlayer <= 8) {
                s.mode = 'IDLE';
                s.idleTimer = 2.0;
            }
        }

        // --- NAVIGATION TARGET ---
        let target = currentPos.clone();
        let desiredSpeed = 0;

        if (s.mode === 'PATROL') {
            target = WAYPOINTS[s.targetIndex].clone();
            target.y = 0;
            const dist = currentPos.distanceTo(target);
            if (dist < 3.0) {
                s.mode = 'IDLE';
                s.idleTimer = IDLE_DURATION;
                s.idleSubState = 'BREATHE'; // Reset idle state
            } else {
                desiredSpeed = PATROL_SPEED;
            }
        } else if (s.mode === 'FOLLOW' && playerPos) {
            // Natural Follow Logic
            s.followUpdateTimer -= dt;
            if (s.followUpdateTimer <= 0) {
                // Pick a new random offset around the player
                const angle = Math.random() * Math.PI * 2;
                const radius = 5 + Math.random() * 5; // 5-10 units away
                s.followOffset.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
                s.followUpdateTimer = 3.0 + Math.random() * 2.0; // Change every 3-5s
            }

            // Target is player + offset
            target = playerPos.clone().add(s.followOffset);

            // Smooth speed based on distance to TARGET (not player)
            const distToTarget = currentPos.distanceTo(target);
            if (distToTarget > 2.0) {
                // Lerp speed for natural acceleration
                const targetSpeed = distToTarget > 10 ? CHASE_SPEED : PATROL_SPEED;
                desiredSpeed = targetSpeed;
            } else {
                desiredSpeed = 0; // Reached offset point
                // Don't switch to IDLE mode, just stand there (in FOLLOW mode)
            }

        } else if (s.mode === 'IDLE') {
            s.idleTimer -= dt;

            // Sub-state logic
            s.idleSubTimer -= dt;
            if (s.idleSubTimer <= 0) {
                // Pick new sub-state
                const rand = Math.random();
                if (rand < 0.5) s.idleSubState = 'BREATHE';
                else if (rand < 0.8) s.idleSubState = 'LOOK';
                else s.idleSubState = 'SHIFT';
                s.idleSubTimer = 2.0 + Math.random() * 3.0;
            }

            if (s.idleTimer <= 0) {
                if (distToPlayer < 40 && distToPlayer > 8) {
                    s.mode = 'FOLLOW';
                } else {
                    s.targetIndex = (s.targetIndex + 1) % WAYPOINTS.length;
                    s.mode = 'PATROL';
                }
            }
        } else if (s.mode === 'UNSTUCK') {
            s.stuckTimer -= dt;
            desiredSpeed = PATROL_SPEED;
            if (s.stuckTimer <= 0) {
                s.mode = 'IDLE';
                s.idleTimer = 0.5;
            }
        }

        // --- MOVEMENT LOGIC ---
        let moveDir = new THREE.Vector3();
        if (desiredSpeed > 0 && s.mode !== 'UNSTUCK') {
            moveDir.subVectors(target, currentPos).normalize();
        } else if (s.mode === 'UNSTUCK') {
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(mesh.quaternion);
            moveDir.copy(forward).negate();
        }

        // --- OBSTACLE AVOIDANCE (Whiskers) ---
        if (desiredSpeed > 0 && s.mode !== 'UNSTUCK') {
            const rayOrigin = mesh.position.clone();
            rayOrigin.y += 1.0;

            const whiskers = [
                moveDir.clone(),
                moveDir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 5),
                moveDir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 5)
            ];

            let avoidanceForce = new THREE.Vector3();
            for (const dir of whiskers) {
                for (const ob of obstacles) {
                    const sphereCenter = ob.position.clone();
                    const toSphere = sphereCenter.sub(rayOrigin);
                    const projection = toSphere.dot(dir);

                    if (projection > 0 && projection < 6.0) {
                        const closestPoint = rayOrigin.clone().add(dir.clone().multiplyScalar(projection));
                        const dist = closestPoint.distanceTo(ob.position);

                        if (dist < ob.radius + 2.0) {
                            const steer = closestPoint.sub(ob.position).normalize();
                            avoidanceForce.add(steer.multiplyScalar(15.0));
                        }
                    }
                }
            }
            moveDir.add(avoidanceForce).normalize();
        }

        // --- APPLY MOVEMENT ---
        if (desiredSpeed > 0) {
            // Rotation
            if (s.mode === 'UNSTUCK') {
                // Turn while backing up
                mesh.rotation.y += 3.0 * dt;
            } else {
                const targetAngle = Math.atan2(moveDir.x, moveDir.z);
                let diff = targetAngle - mesh.rotation.y;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                mesh.rotation.y += diff * 5 * dt;
            }

            // Position
            const moveDist = desiredSpeed * dt;
            const proposedX = mesh.position.x + moveDir.x * moveDist;
            const proposedZ = mesh.position.z + moveDir.z * moveDist;

            // Hard Collision
            let canMove = true;
            for (const ob of obstacles) {
                const distSq = (proposedX - ob.position.x) ** 2 + (proposedZ - ob.position.z) ** 2;
                const minDist = 1.0 + ob.radius;
                if (distSq < minDist * minDist) {
                    canMove = false;
                    break;
                }
            }

            if (canMove) {
                mesh.position.x = proposedX;
                mesh.position.z = proposedZ;
                s.walkTime += dt * (desiredSpeed > 10 ? 15 : 10);
            } else {
                // Hit something hard
                if (s.mode !== 'UNSTUCK') {
                    s.mode = 'UNSTUCK';
                    s.stuckTimer = 1.0;
                }
            }

            // Stuck Detection (Velocity Check)
            s.stuckCheckTimer += dt;
            if (s.stuckCheckTimer > 0.5) {
                const distMoved = mesh.position.distanceTo(s.lastPos);
                if (distMoved < 0.5 && s.mode !== 'IDLE' && s.mode !== 'UNSTUCK') {
                    // We are trying to move but not moving -> STUCK
                    s.mode = 'UNSTUCK';
                    s.stuckTimer = 1.5;
                }
                s.lastPos.copy(mesh.position);
                s.stuckCheckTimer = 0;
            }

        } else {
            s.walkTime += dt;
        }

        // --- ANIMATION ---
        const j = joints.current;
        if (!j.hips || !j.torso || !j.leftArm || !j.rightArm || !j.leftHip || !j.rightHip || !j.leftKnee || !j.rightKnee || !j.neck) return;

        const lerpFactor = 0.1; // Smoother lerp
        const isRunning = desiredSpeed > 10;

        if (desiredSpeed > 0) {
            // Walk/Run
            const legAmp = isRunning ? 0.8 : 0.6;
            const kneeAmp = isRunning ? 0.5 : 0.3;

            j.hips.position.y = THREE.MathUtils.lerp(j.hips.position.y, 3.5 + Math.sin(s.walkTime * 2) * (isRunning ? 0.2 : 0.1), lerpFactor);

            j.leftHip.rotation.x = Math.sin(s.walkTime) * legAmp;
            j.leftKnee.rotation.x = Math.abs(Math.cos(s.walkTime)) * kneeAmp + 0.2;

            j.rightHip.rotation.x = Math.sin(s.walkTime + Math.PI) * legAmp;
            j.rightKnee.rotation.x = Math.abs(Math.cos(s.walkTime + Math.PI)) * kneeAmp + 0.2;

            j.leftArm.shoulder.rotation.x = Math.sin(s.walkTime + Math.PI) * legAmp;
            j.rightArm.shoulder.rotation.x = Math.sin(s.walkTime) * legAmp;

            j.torso.rotation.x = THREE.MathUtils.lerp(j.torso.rotation.x, isRunning ? 0.3 : 0.1, lerpFactor);

            // Reset Neck
            j.neck.rotation.y = THREE.MathUtils.lerp(j.neck.rotation.y, 0, lerpFactor);

        } else {
            // --- RICH IDLE ANIMATION ---
            const breath = Math.sin(time * 1.5);

            // Base Pose
            j.hips.position.y = THREE.MathUtils.lerp(j.hips.position.y, 3.5, lerpFactor);
            j.torso.rotation.x = THREE.MathUtils.lerp(j.torso.rotation.x, breath * 0.02, lerpFactor);

            // Reset other joint rotations to idle defaults
            j.leftHip.rotation.x = THREE.MathUtils.lerp(j.leftHip.rotation.x, 0, lerpFactor);
            j.rightHip.rotation.x = THREE.MathUtils.lerp(j.rightHip.rotation.x, 0, lerpFactor);
            j.leftKnee.rotation.x = THREE.MathUtils.lerp(j.leftKnee.rotation.x, 0.1, lerpFactor);
            j.rightKnee.rotation.x = THREE.MathUtils.lerp(j.rightKnee.rotation.x, 0.1, lerpFactor);

            // Sub-state logic
            if (s.idleSubState === 'BREATHE') {
                j.neck.rotation.y = THREE.MathUtils.lerp(j.neck.rotation.y, 0, lerpFactor);
            } else if (s.idleSubState === 'LOOK') {
                const lookTarget = Math.sin(time * 0.5) * 0.8;
                j.neck.rotation.y = THREE.MathUtils.lerp(j.neck.rotation.y, lookTarget, 0.05);
                j.torso.rotation.y = THREE.MathUtils.lerp(j.torso.rotation.y, lookTarget * 0.3, 0.05);
            } else if (s.idleSubState === 'SHIFT') {
                j.hips.position.x = THREE.MathUtils.lerp(j.hips.position.x, 0.2, 0.05);
                j.leftKnee.rotation.x = THREE.MathUtils.lerp(j.leftKnee.rotation.x, 0.4, 0.1);
                j.rightKnee.rotation.x = THREE.MathUtils.lerp(j.rightKnee.rotation.x, 0.0, 0.1);
            }

            // Look at player override (if close)
            if (playerPos && distToPlayer < 10 && s.mode !== 'PATROL') {
                const targetLook = new THREE.Vector3().subVectors(playerPos, mesh.position).normalize();
                const lookAngle = Math.atan2(targetLook.x, targetLook.z);
                let headDiff = lookAngle - mesh.rotation.y;
                while (headDiff > Math.PI) headDiff -= Math.PI * 2;
                while (headDiff < -Math.PI) headDiff += Math.PI * 2;
                headDiff = Math.max(-1, Math.min(1, headDiff));
                j.neck.rotation.y = THREE.MathUtils.lerp(j.neck.rotation.y, headDiff, 0.1);
            }
        }
    });

    return { joints };
}
