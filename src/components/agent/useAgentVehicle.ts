import { useEffect, useMemo, type MutableRefObject, type RefObject } from "react";
import * as YUKA from "yuka";
import * as THREE from "three";
import AIManager from "@/systems/AIManager";
import { AgentBrainClient } from "@/lib/workers/AgentBrainClient";
import { AGENT_VEHICLE_SPAWN_Y } from "@/constants/agent";
import { getNavigationObstacleStateSignature } from "@/systems/NavigationNetwork";
import type { Obstacle } from "@/types/world";

/**
 * Creates the YUKA vehicle, steering stack, and registers with AIManager.
 * Cleanup removes the entity from the manager.
 */
export function useAgentVehicle(
  id: string,
  groupRef: RefObject<THREE.Group | null>,
  obstacles: Obstacle[],
  vehicleRef: MutableRefObject<YUKA.Vehicle | null>,
  lastGroundedPosRef: MutableRefObject<THREE.Vector3>,
): void {
  const aiManager = AIManager.getInstance();
  const obstacleNavSignature = useMemo(
    () => getNavigationObstacleStateSignature(obstacles),
    [obstacles],
  );

  useEffect(() => {
    if (!groupRef.current) return;

    const vehicle = new YUKA.Vehicle();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (vehicle as any).id = id;
    vehicle.maxSpeed = 5.5;
    vehicle.maxForce = 4.0;
    vehicle.mass = 2.0;
    vehicle.boundingRadius = 1.0;

    vehicle.position.set(
      groupRef.current.position.x,
      AGENT_VEHICLE_SPAWN_Y,
      groupRef.current.position.z,
    );
    groupRef.current.position.y = AGENT_VEHICLE_SPAWN_Y;
    vehicle.rotation.copy(
      groupRef.current.quaternion as unknown as YUKA.Quaternion,
    );
    lastGroundedPosRef.current.set(
      groupRef.current.position.x,
      AGENT_VEHICLE_SPAWN_Y,
      groupRef.current.position.z,
    );

    vehicle.setRenderComponent(groupRef.current, (entity, renderComponent) => {
      const mesh = renderComponent as THREE.Group;
      mesh.position.copy(entity.position as unknown as THREE.Vector3);
      mesh.quaternion.copy(entity.rotation as unknown as THREE.Quaternion);
    });

    const followPath = new YUKA.FollowPathBehavior();
    followPath.active = false;
    followPath.nextWaypointDistance = 2.0;
    vehicle.steering.add(followPath);

    const seek = new YUKA.SeekBehavior(new YUKA.Vector3());
    seek.active = false;
    vehicle.steering.add(seek);

    const arrive = new YUKA.ArriveBehavior(new YUKA.Vector3());
    arrive.active = false;
    arrive.deceleration = 5.0;
    arrive.tolerance = 0.3;
    vehicle.steering.add(arrive);

    const separation = new YUKA.SeparationBehavior(aiManager.vehicles);
    separation.weight = 5.0;
    vehicle.steering.add(separation);

    vehicleRef.current = vehicle;
    aiManager.addEntity(vehicle);

    return () => {
      aiManager.removeEntity(vehicle);
    };
    // Vehicle lifecycle is per-agent only; do not tie to obstacles — that array reference
    // changes on every incremental addObstacles() and would recreate all agents + re-init nav.
    // refs (groupRef, vehicleRef, lastGroundedPosRef) intentionally omitted — stable identity
  }, [id]);

  useEffect(() => {
    AgentBrainClient.getInstance().initNav(obstacles);
  }, [obstacleNavSignature, obstacles]);
}
