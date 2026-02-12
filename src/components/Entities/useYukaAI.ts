import { useEffect, useRef, useState } from "react";
import * as YUKA from "yuka";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import AIManager from "../Systems/AIManager";
import { useGameStore } from "@/store/gameStore";
import { ClientBrain } from "../Systems/ClientBrain";
import { NearbyEntity } from "@/app/actions";
import { InteractableRegistry } from "../Systems/InteractableRegistry";
import NavigationNetwork from "../Systems/NavigationNetwork";


export function useYukaAI(
  id: string,
  groupRef: React.RefObject<THREE.Group | null>,
  playerRef: React.RefObject<THREE.Group | null>,
  joints: React.MutableRefObject<any>,
) {
  const vehicleRef = useRef<YUKA.Vehicle | null>(null);
  const aiManager = AIManager.getInstance();
  const obstacles = useGameStore((state) => state.obstacles);
  const collidableMeshes = useGameStore((state) => state.collidableMeshes);
  const walkTime = useRef(0);
  const greetingState = useRef<"NONE" | "LOOKING" | "WAVING" | "DONE">("NONE");
  const greetingTimer = useRef(0);

  // Social State (Robot-Robot Interaction)
  const socialState = useRef<"NONE" | "CHATTING" | "COOLDOWN">("NONE");
  const socialTimer = useRef(0);
  const socialTarget = useRef<YUKA.Vehicle | null>(null);
  // Optimization Refs
  const raycasterRef = useRef(new THREE.Raycaster());
  const rayOriginRef = useRef(new THREE.Vector3());
  const rayDirRef = useRef(new THREE.Vector3(0, -1, 0));
  const frameRef = useRef(0);
  const lookAheadRef = useRef(new THREE.Vector3());
  const sensorPosRef = useRef(new THREE.Vector3());
  const safetyTargetRef = useRef(new THREE.Vector3(0, 0, -330));

  const toSafetyRef = useRef(new THREE.Vector3());

  // AI Brain
  const brainRef = useRef(new ClientBrain(id));
  // Randomize update interval to prevent API spikes (300-400 frames ~ 5-7s)
  const brainIntervalRef = useRef(300 + Math.floor(Math.random() * 100));

  // --- ANIMATION STATE ---
  const [animationState, setAnimationState] = useState<"Idle" | "Walk" | "Run" | "Wave">("Idle");

  useEffect(() => {
    if (!groupRef.current) return;

    // Create Yuka Vehicle
    const vehicle = new YUKA.Vehicle();
    (vehicle as any).id = id;
    vehicle.maxSpeed = 12.0;
    vehicle.maxForce = 30.0;
    vehicle.mass = 1.0;
    vehicle.boundingRadius = 2.0; // Ensure they have size for separation

    // Sync initial position
    vehicle.position.copy(groupRef.current.position as unknown as YUKA.Vector3);
    vehicle.rotation.copy(
      groupRef.current.quaternion as unknown as YUKA.Quaternion,
    );

    // Render Component (Sync Yuka -> Three)
    vehicle.setRenderComponent(groupRef.current, (entity, renderComponent) => {
      const mesh = renderComponent as THREE.Group;
      mesh.position.copy(entity.position as unknown as THREE.Vector3);
      mesh.quaternion.copy(entity.rotation as unknown as THREE.Quaternion);
    });

    // --- BEHAVIORS ---

    // 1. Obstacle Avoidance
    const yukaObstacles: YUKA.GameEntity[] = [];
    obstacles.forEach((ob) => {
      const ent = new YUKA.GameEntity();
      ent.position.copy(ob.position as unknown as YUKA.Vector3);
      ent.boundingRadius = ob.radius;
      yukaObstacles.push(ent);
    });
    const obstacleAvoidance = new YUKA.ObstacleAvoidanceBehavior(yukaObstacles);
    obstacleAvoidance.weight = 5.0;
    vehicle.steering.add(obstacleAvoidance);

    // 2. Follow Path (Primary Movement)
    const followPath = new YUKA.FollowPathBehavior();
    followPath.active = false;
    followPath.nextWaypointDistance = 2.0;
    vehicle.steering.add(followPath);

    // 3. Seek (Legacy / Short distance)
    const seek = new YUKA.SeekBehavior(new YUKA.Vector3());
    seek.active = false;
    vehicle.steering.add(seek);

    // 4. Arrive (Final stopping)
    // We arrive at the *final* destination after path following
    const arrive = new YUKA.ArriveBehavior(new YUKA.Vector3());
    arrive.active = false;
    arrive.deceleration = 1.5;
    arrive.tolerance = 0.5;
    vehicle.steering.add(arrive);

    // 5. Wander (Idle)
    const wander = new YUKA.WanderBehavior();
    wander.weight = 0.5;
    vehicle.steering.add(wander);

    // 6. Separation
    const separation = new YUKA.SeparationBehavior(aiManager.vehicles);
    separation.weight = 5.0;
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
          let pushX = 0,
            pushZ = 0;
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
        if (
          distSq < 25.0 &&
          socialState.current === "NONE" &&
          greetingState.current === "NONE"
        ) {
          // Check if other is also free (Simple check: is it moving slow?)
          // Ideally we'd check other.userData.state, but Yuka entities are generic.
          // Let's just initiate.
          if (Math.random() < 0.01) {
            // Random chance to start chat
            socialState.current = "CHATTING";
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

      rayOrigin.set(
        vehicle.position.x,
        vehicle.position.y + 5.0,
        vehicle.position.z,
      );
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
          vehicle.position.y = THREE.MathUtils.lerp(
            vehicle.position.y,
            groundHeight,
            0.5,
          );

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
    if (
      collidableMeshes.length > 0 &&
      vehicle.velocity.length() > 0.1 &&
      frameRef.current % 3 === 0
    ) {
      const raycaster = raycasterRef.current;
      const lookAhead = lookAheadRef.current;
      const sensorPos = sensorPosRef.current;

      // Zero GC Vector Math
      // lookAhead = vehicle.velocity.clone().normalize().multiplyScalar(2.0);
      lookAhead
        .set(vehicle.velocity.x, vehicle.velocity.y, vehicle.velocity.z)
        .normalize()
        .multiplyScalar(2.0);

      // sensorPos = vehicle.position + lookAhead
      sensorPos
        .set(vehicle.position.x, vehicle.position.y, vehicle.position.z)
        .add(lookAhead);
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
        const safetyTarget = safetyTargetRef.current;
        const toSafety = toSafetyRef.current;

        // toSafety = (safetyTarget - vehicle.position).normalize()
        toSafety
          .subVectors(
            safetyTarget,
            vehicle.position as unknown as THREE.Vector3,
          )
          .normalize();

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

    // --- BRAIN UPDATE (Autopilot) ---
    // Optimization: Run every ~5-7 seconds (custom per agent)
    const brain = brainRef.current;

    if (frameRef.current % brainIntervalRef.current === 0) {
      let currentBehavior = "IDLE";
      if (vehicle.steering.behaviors[2].active) currentBehavior = "SEEKING";
      else if (vehicle.steering.behaviors[1].active)
        currentBehavior = "WANDERING";

      // Fire and forget (async)
      // Construct Perception Data
      const nearbyEntities: NearbyEntity[] = []; // Explicit type

      // 1. Perceive Player
      if (playerRef.current) {
        const distToPlayer = vehicle.position.distanceTo(
          playerRef.current.position as unknown as YUKA.Vector3,
        );
        if (distToPlayer < 30) {
          nearbyEntities.push({
            type: "PLAYER",
            id: "player-01",
            distance: parseFloat(distToPlayer.toFixed(1)),
            status: "Active",
          });
        }
      }

      // 2. Perceive Other Agents
      const otherAgents = AIManager.getInstance()
        .vehicles.filter((v) => v !== vehicle)
        .map((v) => ({
          entity: v,
          distance: v.position.distanceTo(vehicle.position),
        }))
        .filter((e) => e.distance < 20);

      otherAgents.forEach((agent) => {
        nearbyEntities.push({
          type: "AGENT",
          id: String(
            (agent.entity as any).id || (agent.entity as any).uuid || "unknown",
          ),
          distance: parseFloat(agent.distance.toFixed(1)),
          status: "Idle",
        });
      });

      // 3. Perceive Nearby Objects
      const nearbyObjects = InteractableRegistry.getInstance().getNearby(
        vehicle.position as unknown as THREE.Vector3,
        15,
      );

      nearbyObjects.forEach((obj) => {
        nearbyEntities.push({
          type: "OBJECT",
          id: obj.id,
          distance: parseFloat(
            vehicle.position
              .distanceTo(obj.position as unknown as YUKA.Vector3)
              .toFixed(1),
          ),
          status: obj.carriedBy ? `carried by ${obj.carriedBy}` : "available",
          objectType: obj.type,
          name: obj.name,
        });
      });

      // 4. Perceive Placing Areas (Surfaces)
      const nearbyAreas =
        InteractableRegistry.getInstance().getNearbyPlacingAreas(
          vehicle.position as unknown as THREE.Vector3,
          15,
        );

      nearbyAreas.forEach((area) => {
        nearbyEntities.push({
          type: "SURFACE",
          id: area.id,
          distance: parseFloat(
            vehicle.position
              .distanceTo(area.position as unknown as YUKA.Vector3)
              .toFixed(1),
          ),
          status: `${area.currentItems.length}/${area.capacity} items`,
          name: area.name,
        });
      });

      // 5. Perceive carried items
      const carriedItems =
        InteractableRegistry.getInstance().getAllCarriedBy(id);
      carriedItems.forEach((obj) => {
        nearbyEntities.push({
          type: "CARRIED",
          id: obj.id,
          distance: 0,
          status: "in inventory",
          objectType: obj.type,
          name: obj.name,
        });
      });

      // Always update brain, even if alone, so it can decide to Wander
      if (nearbyEntities.length >= 0) {
        // Condition actually redundant but keeps structure
        brain
          .update(
            vehicle.position as unknown as THREE.Vector3,
            nearbyEntities,
            currentBehavior,
          )
          .then((decision) => {
            if (decision) {
              // console.log("Brain Decision:", decision); // Optional logging

              // Decision Logic
              const seek = vehicle.steering.behaviors[2] as YUKA.SeekBehavior;
              const wander = vehicle.steering
                .behaviors[1] as YUKA.WanderBehavior;
              const followPath = vehicle.steering.behaviors[1] as YUKA.FollowPathBehavior; // Index 1 is followPath now? 
              // Wait, indexes changed. 
              // 0: Obstacle, 1: FollowPath, 2: Seek, 3: Arrive, 4: Wander, 5: Separation
              // Let's re-fetch by type or keep index consistent. 
              // My previous edit inserted FollowPath at index 1.
              // So: 0=Obstacle, 1=FollowPath, 2=Seek, 3=Arrive, 4=Wander, 5=Separation.

              const bFollowPath = vehicle.steering.behaviors[1] as YUKA.FollowPathBehavior;
              const bSeek = vehicle.steering.behaviors[2] as YUKA.SeekBehavior; // Keep legacy seek for short dist
              const bArrive = vehicle.steering.behaviors[3] as YUKA.ArriveBehavior;
              const bWander = vehicle.steering.behaviors[4] as YUKA.WanderBehavior;

              // Helper to reset all
              const resetBehaviors = () => {
                bFollowPath.active = false;
                bSeek.active = false;
                bArrive.active = false;
                bWander.active = false;
              }

              if (decision.action === "FOLLOW" && decision.targetId) {
                // High Priority: Follow specific entity
                const targetEntity = nearbyEntities.find(
                  (e) => e.id === decision.targetId,
                );
                // Also check actual Yuka entities to get position
                let targetPos: THREE.Vector3 | null = null;

                if (decision.targetId === "player-01" && playerRef.current) {
                  targetPos = playerRef.current.position;
                } else {
                  const agent = AIManager.getInstance().vehicles.find(
                    (v) => String((v as any).id) === decision.targetId,
                  );
                  if (agent)
                    targetPos = agent.position as unknown as THREE.Vector3;
                }

                if (targetPos) {
                  resetBehaviors();

                  const dist = vehicle.position.distanceTo(targetPos as unknown as YUKA.Vector3);
                  if (dist < 5) {
                    // Close enough, just Seek (Arrival)
                    bArrive.active = true;
                    bArrive.target.copy(targetPos as unknown as YUKA.Vector3);
                  } else {
                    // Use Pathfinding
                    const path = NavigationNetwork.getInstance().findPath(
                      vehicle.position as unknown as THREE.Vector3,
                      targetPos
                    );

                    // Convert to Yuka Path
                    const yukaPath = new YUKA.Path();
                    path.forEach(p => yukaPath.add(new YUKA.Vector3(p.x, p.y, p.z)));

                    bFollowPath.path = yukaPath;
                    bFollowPath.active = true;
                  }
                }
              } else if (decision.action === "MOVE_TO" && decision.target) {
                resetBehaviors();
                const target = new THREE.Vector3(decision.target.x, decision.target.y, decision.target.z);

                const path = NavigationNetwork.getInstance().findPath(
                  vehicle.position as unknown as THREE.Vector3,
                  target
                );

                const yukaPath = new YUKA.Path();
                path.forEach(p => yukaPath.add(new YUKA.Vector3(p.x, p.y, p.z)));
                bFollowPath.path = yukaPath;
                bFollowPath.active = true;

              } else if (decision.action === "WANDER") {
                resetBehaviors();
                bWander.active = true;
              } else if (decision.action === "WAIT") {
                resetBehaviors();
                vehicle.velocity.multiplyScalar(0.5); // Slow down
              } else if (decision.action === "INTERACT" && decision.targetId) {
                // Move toward the object first
                const obj = InteractableRegistry.getInstance().getById(
                  decision.targetId,
                );
                if (obj && obj.pickable && !obj.carriedBy) {
                  resetBehaviors();
                  // Close range direct seek
                  bArrive.active = true;
                  bArrive.target.set(obj.position.x, obj.position.y, obj.position.z);
                }
              } else if (decision.action === "DROP" && decision.targetId) {
                // Drop a specific carried object
                const registry = InteractableRegistry.getInstance();
                const obj = registry.getById(decision.targetId);
                if (obj && obj.carriedBy === id) {
                  registry.putDown(
                    obj.id,
                    vehicle.position as unknown as THREE.Vector3,
                  );
                  console.log(`[Agent ${id}] Dropped ${obj.name}`);
                }
              } else if (
                decision.action === "PLACE_AT" &&
                decision.targetId &&
                decision.placeAreaId
              ) {
                // Place a carried object on a surface
                const registry = InteractableRegistry.getInstance();
                const obj = registry.getById(decision.targetId);
                const area = registry.getPlacingAreaById(decision.placeAreaId);
                if (obj && obj.carriedBy === id && area) {
                  // Move toward the area first
                  seek.active = true;
                  wander.active = false;
                  seek.target.set(
                    area.position.x,
                    area.position.y,
                    area.position.z,
                  );
                  // If close enough, place it
                  const distToArea = vehicle.position.distanceTo(
                    area.position as unknown as YUKA.Vector3,
                  );
                  if (distToArea < 5.0) {
                    registry.placeItemAt(obj.id, area.id);
                    console.log(
                      `[Agent ${id}] Placed ${obj.name} on ${area.name}`,
                    );
                  }
                }
              }
            }
          });
      }
    }

    // --- INTERACTION UPDATE (Brain-Controlled Pickup) ---
    // Only pick up if the brain has decided INTERACT and we are close
    const registry = InteractableRegistry.getInstance();
    const brain_state = brain.state;
    if (brain_state.thought) {
      try {
        const lastDecision = JSON.parse(brain_state.thought);
        if (lastDecision.action === "INTERACT" && lastDecision.targetId) {
          const obj = registry.getById(lastDecision.targetId);
          if (obj && obj.pickable && !obj.carriedBy) {
            const distToObj = vehicle.position.distanceTo(
              obj.position as unknown as YUKA.Vector3,
            );
            if (distToObj < 3.0) {
              registry.pickUp(obj.id, id);
              console.log(`[Agent ${id}] Picked up ${obj.name}`);
            }
          }
        }
      } catch {
        // Thought is not a valid JSON — could be a natural language string
      }
    }

    // --- LOGIC UPDATE ---
    // Removed hardcoded "Auto-Follow" logic to respect Brain decisions.
    // Keeping only physical interactions and state machines that shouldn't wait for LLM (like Greetings)

    if (playerRef && playerRef.current) {
      const playerPos = playerRef.current.position;
      const dist = vehicle.position.distanceTo(
        playerPos as unknown as YUKA.Vector3,
      );

      // Note: We REMOVED the "if (dist < 40) seek.active = true" block.
      // Now the Brain MUST set seek.active via 'FOLLOW' action.

      // Ensure seek and wander are defined for the entire playerRef block
      const seek = vehicle.steering.behaviors[2] as YUKA.SeekBehavior;
      const wander = vehicle.steering.behaviors[1] as YUKA.WanderBehavior;

      // Social State Machine (Keep this as "Reflexes")
      if (socialState.current === "CHATTING") {
        // Stop and Chat
        seek.active = false;
        wander.active = false;
        vehicle.velocity.multiplyScalar(0.9); // Slow down to stop

        socialTimer.current += dt;

        // End Chat
        if (socialTimer.current > 8.0) {
          socialState.current = "COOLDOWN";
          socialTimer.current = 0;
          socialTarget.current = null;
        }
      } else if (socialState.current === "COOLDOWN") {
        // Resume normal behavior
        socialTimer.current += dt;
        if (socialTimer.current > 15.0) {
          socialState.current = "NONE";
        }
      } else {
        // Greet Reflex (Can override movement momentarily)
        if (dist > 100) greetingState.current = "NONE";
        if (greetingState.current === "NONE" && dist < 15 && dist > 5) {
          // Closer range for greeting
          greetingState.current = "LOOKING";
          greetingTimer.current = 0;
        }

        // State Machine
        if (greetingState.current === "LOOKING") {
          // Stop and Stare
          seek.active = false;
          wander.active = false;
          vehicle.velocity.set(0, 0, 0);

          greetingTimer.current += dt;
          if (greetingTimer.current > 2.0) {
            greetingState.current = "WAVING";
            greetingTimer.current = 0;
          }
        } else if (greetingState.current === "WAVING") {
          // Stop and Wave
          seek.active = false;
          wander.active = false;
          vehicle.velocity.set(0, 0, 0);

          greetingTimer.current += dt;
          if (greetingTimer.current > 2.5) {
            greetingState.current = "DONE";
          }
        } else if (greetingState.current === "DONE") {
          // Mind own business (Patrol/Wander)
          // Unless very close (Follow logic overrides)
          // No specific action here, brain will decide.
        } else {
          // Normal Logic (Before Greeting or if logic falls through)
          // No specific action here, brain will decide.
        }
      }
    }

    // Update Manager (Global update usually, but for now per-hook is okay if singleton handles dedupe,
    // BUT AIManager.update() updates ALL entities. We should call it ONCE in Scene, not here.
    // Wait, we need a central updater. For now, let's just update THIS vehicle's steering?
    // No, Yuka needs the manager update.
    // We will add a <YukaSystem /> component to Scene to handle the global update.

    // Determine Animation State
    const speed = vehicle.velocity.length();
    let newState: "Idle" | "Walk" | "Run" | "Wave" = "Idle";

    if (greetingState.current === "WAVING") {
      newState = "Wave";
    } else if (speed > 6.0) {
      newState = "Run";
    } else if (speed > 0.1) {
      newState = "Walk";
    }

    if (newState !== animationState) {
      setAnimationState(newState);
    }


  });

  return { vehicle: vehicleRef.current, brain: brainRef.current, animationState };
}
