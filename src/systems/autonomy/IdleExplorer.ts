import * as THREE from "three";
import { memoryStorage } from "@/lib/memory/idb-adapter";
import {
  getZoneCenterPosition,
  ZONE_NAMES,
} from "@/config/donutLabRoutines";
import { InterestMap } from "@/store/InterestMap";
import type { WalkPace } from "@/types/agent";

export interface LabLocation {
  id: string;
  label: string;
  zoneId: string;
  position: { x: number; y: number; z: number };
  interest: number;
}

interface VisitRecord {
  locationId: string;
  visitCount: number;
  lastVisit: number;
  foundSomething: boolean;
}

export type ExplorerState =
  | "INACTIVE"
  | "CHOOSING"
  | "TRAVELING"
  | "DWELLING"
  | "PAUSED";

export interface ExplorerAction {
  type: "GO_TO" | "WAIT" | "NONE" | "LOOK_AT_GLANCE";
  targetAreaId?: string;
  targetLabel?: string;
  reason?: string;
  walkPace?: WalkPace;
  lookTarget?: { x: number; y: number; z: number };
}

const SEED: { zoneId: string; interest: number }[] = [
  { zoneId: "center-park", interest: 0.5 },
  { zoneId: "fishing-dock", interest: 0.7 },
  { zoneId: "core-lab", interest: 0.8 },
  { zoneId: "data-analysis", interest: 0.6 },
  { zoneId: "break-room", interest: 0.4 },
  { zoneId: "conference-area", interest: 0.6 },
  { zoneId: "exterior-plaza", interest: 0.5 },
];

/** Build POI list from live zone centers (call after DonutLabWorld registers zones). */
export function buildDefaultDonutLabIdleLocations(): LabLocation[] {
  return SEED.map(({ zoneId, interest }) => {
    const p = getZoneCenterPosition(zoneId);
    return {
      id: zoneId,
      zoneId,
      label: ZONE_NAMES[zoneId] ?? zoneId,
      interest,
      position: p
        ? { x: p.x, y: p.y, z: p.z }
        : { x: 0, y: 0, z: 0 },
    };
  });
}

export class IdleExplorer {
  state: ExplorerState = "INACTIVE";

  private locations: LabLocation[] = [];
  private visits: Map<string, VisitRecord> = new Map();
  private currentDestination: LabLocation | null = null;
  private dwellTimer = 0;
  private idleTimer = 0;
  private pauseTimer = 0;
  private currentDwellTarget = 0;
  /** Seconds until next ambient glance while dwelling */
  private glanceCooldown = 4 + Math.random() * 4;

  private readonly IDLE_THRESHOLD = 6;
  private readonly DWELL_TIME_MIN = 3;
  private readonly DWELL_TIME_MAX = 8;
  private readonly PAUSE_DURATION = 10;

  constructor(private readonly agentId: string) {}

  setLocations(locations: LabLocation[]) {
    this.locations = locations;
    for (const loc of locations) {
      if (!this.visits.has(loc.id)) {
        this.visits.set(loc.id, {
          locationId: loc.id,
          visitCount: 0,
          lastVisit: 0,
          foundSomething: false,
        });
      }
    }
  }

  tick(
    delta: number,
    context: {
      /** True when non-idle-explorer work should block autonomy. */
      interruptingBusy: boolean;
      isInConversation: boolean;
      agentPosition: { x: number; y: number; z: number };
      /** 0–100 curiosity drive; shapes walking pace when choosing a destination. */
      curiosityDrive?: number;
    },
  ): ExplorerAction {
    if (context.interruptingBusy || context.isInConversation) {
      if (this.state !== "INACTIVE") {
        this.state = "INACTIVE";
        this.idleTimer = 0;
        this.currentDestination = null;
      }
      return { type: "NONE" };
    }

    if (this.state === "PAUSED") {
      this.pauseTimer -= delta;
      if (this.pauseTimer <= 0) {
        this.state = "CHOOSING";
      }
      return { type: "NONE" };
    }

    if (this.state === "INACTIVE") {
      this.idleTimer += delta;
      if (this.idleTimer >= this.IDLE_THRESHOLD) {
        this.state = "CHOOSING";
        this.idleTimer = 0;
      }
      return { type: "NONE" };
    }

    if (this.state === "CHOOSING") {
      const destination = this.pickDestination(context.agentPosition);
      if (!destination) {
        this.state = "INACTIVE";
        return { type: "NONE" };
      }
      this.currentDestination = destination;
      this.state = "TRAVELING";
      const c = context.curiosityDrive ?? 50;
      const walkPace: WalkPace =
        c > 68 ? "purposeful" : c < 36 ? "stroll" : "normal";
      return {
        type: "GO_TO",
        targetAreaId: destination.zoneId,
        targetLabel: destination.label,
        reason: this.explainChoice(destination),
        walkPace,
      };
    }

    if (this.state === "TRAVELING") {
      return { type: "NONE" };
    }

    if (this.state === "DWELLING") {
      this.dwellTimer += delta;
      this.glanceCooldown -= delta;
      if (this.glanceCooldown <= 0) {
        this.glanceCooldown = 6 + Math.random() * 6;
        const pos = new THREE.Vector3(
          context.agentPosition.x,
          context.agentPosition.y,
          context.agentPosition.z,
        );
        const hot = InterestMap.getInstance().getNearestHotSpot(pos, 8, 0.12);
        if (hot) {
          return {
            type: "LOOK_AT_GLANCE",
            lookTarget: { x: hot.x, y: hot.y, z: hot.z },
          };
        }
      }
      if (this.dwellTimer >= this.currentDwellTarget) {
        this.state = "CHOOSING";
        this.currentDestination = null;
      }
      return { type: "WAIT" };
    }

    return { type: "NONE" };
  }

  /** Call when AgentTaskQueue completes a GO_TO that originated from this explorer. */
  onArrival(zoneId: string | undefined): void {
    if (this.state !== "TRAVELING" || !this.currentDestination) return;
    const match =
      this.currentDestination.zoneId === zoneId ||
      this.currentDestination.id === zoneId;
    if (!match) return;
    this.recordVisit(this.currentDestination.id);
    this.state = "DWELLING";
    this.dwellTimer = 0;
    this.currentDwellTarget =
      this.DWELL_TIME_MIN +
      Math.random() * (this.DWELL_TIME_MAX - this.DWELL_TIME_MIN);
  }

  private pickDestination(agentPos: {
    x: number;
    y: number;
    z: number;
  }): LabLocation | null {
    if (this.locations.length === 0) return null;
    const now = Date.now();

    const scored = this.locations
      .filter((loc) => this.distance(agentPos, loc.position) > 3.0)
      .map((loc) => {
        const visit = this.visits.get(loc.id)!;
        let score = 0;
        if (visit.visitCount === 0) score += 10;
        const minutesSinceVisit =
          visit.lastVisit > 0 ? (now - visit.lastVisit) / 60000 : 999;
        score += Math.min(minutesSinceVisit * 0.5, 5);
        score += loc.interest * 3;
        if (visit.foundSomething) score += 2;
        const dist = this.distance(agentPos, loc.position);
        score -= dist * 0.05;
        score -= visit.visitCount * 0.5;
        return { location: loc, score };
      });

    if (scored.length === 0) return null;

    scored.sort((a, b) => b.score - a.score);
    const topN = scored.slice(0, Math.min(3, scored.length));
    const totalScore = topN.reduce(
      (sum, s) => sum + Math.max(s.score, 0.1),
      0,
    );
    let roll = Math.random() * totalScore;
    for (const candidate of topN) {
      roll -= Math.max(candidate.score, 0.1);
      if (roll <= 0) return candidate.location;
    }
    return topN[0].location;
  }

  private explainChoice(loc: LabLocation): string {
    const visit = this.visits.get(loc.id)!;
    if (visit.visitCount === 0) {
      return `Haven't been to ${loc.label} yet. Curious what's there.`;
    }
    if (visit.foundSomething) {
      return `${loc.label} was interesting last time. Worth revisiting.`;
    }
    const minutesAgo = Math.floor((Date.now() - visit.lastVisit) / 60000);
    return `Haven't been to ${loc.label} in ${minutesAgo} minutes. Let me check it again.`;
  }

  markCurrentLocationInteresting() {
    if (this.currentDestination) {
      const visit = this.visits.get(this.currentDestination.id);
      if (visit) visit.foundSomething = true;
    }
  }

  pause() {
    if (this.state === "TRAVELING" || this.state === "DWELLING") {
      this.state = "PAUSED";
      this.pauseTimer = this.PAUSE_DURATION;
    }
  }

  deactivate() {
    this.state = "INACTIVE";
    this.idleTimer = 0;
    this.currentDestination = null;
  }

  describeCurrentActivity(): string | null {
    switch (this.state) {
      case "TRAVELING":
        return this.currentDestination
          ? `Wandering toward ${this.currentDestination.label}.`
          : null;
      case "DWELLING":
        return this.currentDestination
          ? `Looking around ${this.currentDestination.label}.`
          : null;
      case "CHOOSING":
        return "Deciding where to go next.";
      default:
        return null;
    }
  }

  getCurrentDestination(): LabLocation | null {
    return this.currentDestination;
  }

  private recordVisit(locationId: string) {
    const visit = this.visits.get(locationId);
    if (visit) {
      visit.visitCount++;
      visit.lastVisit = Date.now();
    }
  }

  private distance(
    a: { x: number; y: number; z: number },
    b: { x: number; y: number; z: number },
  ): number {
    return Math.sqrt(
      (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2,
    );
  }

  async saveToIdb(): Promise<void> {
    const payload = JSON.stringify({
      visits: Array.from(this.visits.entries()),
      // state always INACTIVE on reload per plan
    });
    await memoryStorage.putExplorerState(this.agentId, payload);
  }

  async loadFromIdb(): Promise<void> {
    const raw = await memoryStorage.getExplorerState(this.agentId);
    if (!raw) return;
    try {
      const data = JSON.parse(raw) as {
        visits: [string, VisitRecord][];
      };
      this.visits = new Map(data.visits);
    } catch {
      /* ignore */
    }
  }
}

const explorers = new Map<string, IdleExplorer>();

export function getIdleExplorer(agentId: string): IdleExplorer {
  let e = explorers.get(agentId);
  if (!e) {
    e = new IdleExplorer(agentId);
    explorers.set(agentId, e);
  }
  return e;
}
