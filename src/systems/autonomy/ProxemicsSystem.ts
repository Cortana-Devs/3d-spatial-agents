import * as THREE from "three";
import * as YUKA from "yuka";
import AIManager from "@/systems/AIManager";

const INTIMATE = 1.5;
const SOCIAL_OUT = 4.0;
const CROWD_RADIUS = 5;

/**
 * Single pass over peers: crowd density (for speed cap) + social-band lateral push.
 * Complements YUKA SeparationBehavior (stronger repulsion at close range).
 */
export function computeVehicleNeighborEffects(
  vehicle: YUKA.Vehicle,
  agentId: string,
  aiManager: AIManager,
  options?: { proxemicsEveryOtherFrame?: boolean; frameIndex?: number },
): { crowdNear: number; proxAccX: number; proxAccZ: number } {
  let crowdNear = 0;
  let accX = 0;
  let accZ = 0;

  const vx = vehicle.velocity.x;
  const vz = vehicle.velocity.z;
  const speedSq = vx * vx + vz * vz;
  const doProxBase = speedSq >= 0.01;
  let doProx = doProxBase;
  if (
    options?.proxemicsEveryOtherFrame &&
    options.frameIndex !== undefined &&
    (options.frameIndex & 1) === 1
  ) {
    doProx = false;
  }

  const speed = doProxBase ? Math.sqrt(speedSq) : 1;
  const fx = doProxBase ? vx / speed : 0;
  const fz = doProxBase ? vz / speed : 0;

  for (const other of aiManager.vehicles) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oid = (other as any).id as string | undefined;
    if (!oid || oid === agentId) continue;

    const dx = vehicle.position.x - other.position.x;
    const dz = vehicle.position.z - other.position.z;
    const d = Math.hypot(dx, dz);
    if (d > 0.05 && d < CROWD_RADIUS) crowdNear++;

    if (!doProx || d < 0.05 || d > SOCIAL_OUT || d < INTIMATE) continue;

    const nx = dx / d;
    const nz = dz / d;
    const approach = fx * -nx + fz * -nz;
    if (approach <= 0.12) continue;

    let px = -nz;
    let pz = nx;
    if (fx * px + fz * pz < 0) {
      px = nz;
      pz = -nx;
    }

    const band = (d - INTIMATE) / (SOCIAL_OUT - INTIMATE);
    const strength = (1 - band) * 0.55;
    accX += px * strength;
    accZ += pz * strength;
  }

  return { crowdNear, proxAccX: accX, proxAccZ: accZ };
}

/**
 * Over ~1.5s, rotate slightly off head-on toward the player (open stance).
 */
export function applyConversationOpenStance(
  vehicle: YUKA.Vehicle,
  playerPos: THREE.Vector3 | undefined,
  isChatting: boolean,
  delta: number,
  chatElapsedSec: { current: number },
): void {
  if (!isChatting || !playerPos) {
    chatElapsedSec.current = 0;
    return;
  }

  chatElapsedSec.current += delta;
  const t = THREE.MathUtils.clamp((chatElapsedSec.current - 0.4) / 1.4, 0, 1);
  if (t <= 0) return;

  const toP = new THREE.Vector3(
    playerPos.x - vehicle.position.x,
    0,
    playerPos.z - vehicle.position.z,
  );
  if (toP.lengthSq() < 0.01) return;
  toP.normalize();

  const baseYaw = Math.atan2(toP.x, toP.z);
  const openYaw = baseYaw + (15 * Math.PI) / 180;

  const qTarget = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    openYaw,
  );
  const qCur = new THREE.Quaternion().copy(
    vehicle.rotation as unknown as THREE.Quaternion,
  );
  qCur.slerp(qTarget, 0.035 + 0.05 * t);
  vehicle.rotation.copy(qCur as unknown as YUKA.Quaternion);
}
