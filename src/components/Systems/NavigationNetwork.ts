// @ts-nocheck
import * as THREE from "three";

/**
 * Obstacle data interface – matches the shape stored in gameStore.
 */
export interface ObstacleData {
  position: { x: number; y: number; z: number };
  halfExtents?: { x: number; y: number; z: number };
  radius?: number;
}

/**
 * Result from findPath — includes the path AND the walkable approach
 * position for the goal (which may differ from the raw target when
 * the target is inside a carved obstacle).
 */
export interface PathResult {
  path: THREE.Vector3[];
  /** The walkable cell closest to the requested target.
   *  Use this for distance checks instead of the raw target. */
  approachPos: THREE.Vector3;
  /** True if A* found a real path; false if fallback/direct was used. */
  pathFound: boolean;
}

// ============================================================================
// Grid-based Navigation Network
// ============================================================================
// Dynamic grid that automatically carves out walls and furniture.
// ============================================================================

class NavigationNetwork {
  private static instance: NavigationNetwork;

  // --- Grid data ---
  private grid: Uint8Array; // 0 = blocked, 1 = walkable
  private cellSize: number = 2.0;
  // A smaller padding allows agents to get closer to objects and doorways
  // Agent's physical bounding radius is 1.0.
  private padding: number = 0.8;

  // World bounds (from wall_layout.md: 200 wide × 150 deep)
  private minX: number = -100;
  private maxX: number = 100;
  private minZ: number = -75;
  private maxZ: number = 75;

  private cols: number;
  private rows: number;

  // Fix #1: Proper content-based deduplication instead of count-only hash
  private lastObstacleHash: string = "";
  private isBuilt: boolean = false;

  private constructor() {
    this.cols = Math.ceil((this.maxX - this.minX) / this.cellSize); // 100
    this.rows = Math.ceil((this.maxZ - this.minZ) / this.cellSize); // 75
    this.grid = new Uint8Array(this.cols * this.rows).fill(1);
  }

  public static getInstance(): NavigationNetwork {
    if (!NavigationNetwork.instance) {
      NavigationNetwork.instance = new NavigationNetwork();
    }
    return NavigationNetwork.instance;
  }

  // =========================================================================
  // Coordinate conversions
  // =========================================================================

  private worldToGrid(x: number, z: number): { col: number; row: number } {
    return {
      col: Math.max(
        0,
        Math.min(this.cols - 1, Math.floor((x - this.minX) / this.cellSize)),
      ),
      row: Math.max(
        0,
        Math.min(this.rows - 1, Math.floor((z - this.minZ) / this.cellSize)),
      ),
    };
  }

  private gridToWorld(col: number, row: number): { x: number; z: number } {
    return {
      x: this.minX + (col + 0.5) * this.cellSize,
      z: this.minZ + (row + 0.5) * this.cellSize,
    };
  }

  private cellIndex(col: number, row: number): number {
    return row * this.cols + col;
  }

  private isInBounds(col: number, row: number): boolean {
    return col >= 0 && col < this.cols && row >= 0 && row < this.rows;
  }

  private isWalkable(col: number, row: number): boolean {
    if (!this.isInBounds(col, row)) return false;
    return this.grid[this.cellIndex(col, row)] === 1;
  }

  // =========================================================================
  // Grid building
  // =========================================================================

  /**
   * Fix #1: Build a content hash from obstacle positions + dimensions
   * so the grid rebuilds when obstacles move, not just when count changes.
   */
  private computeObstacleHash(obstacles: ObstacleData[]): string {
    // Fast hash: concatenate quantized positions and extents
    let hash = `n=${obstacles.length};`;
    for (const ob of obstacles) {
      const px = (ob.position.x * 10) | 0;
      const pz = (ob.position.z * 10) | 0;
      if (ob.halfExtents) {
        const hx = (ob.halfExtents.x * 10) | 0;
        const hz = (ob.halfExtents.z * 10) | 0;
        hash += `B${px},${pz},${hx},${hz};`;
      } else if (ob.radius) {
        const r = (ob.radius * 10) | 0;
        hash += `S${px},${pz},${r};`;
      }
    }
    return hash;
  }

  /**
   * Rebuild the navigation grid from obstacle data.
   * Call whenever obstacles change. Uses content-based deduplication
   * so redundant rebuilds are skipped.
   */
  public rebuildGrid(obstacles: ObstacleData[]): void {
    const hash = this.computeObstacleHash(obstacles);
    if (this.isBuilt && hash === this.lastObstacleHash) return;
    this.lastObstacleHash = hash;

    console.log(
      `[NavNetwork] Rebuilding grid: ${this.cols}x${this.rows} = ${this.cols * this.rows} cells, ${obstacles.length} obstacles`,
    );

    // Reset all cells to walkable
    this.grid.fill(1);

    // Carve out obstacle footprints
    for (const ob of obstacles) {
      if (ob.halfExtents) {
        // OBB obstacle: block the rectangle + padding
        this.carveOBB(ob.position, ob.halfExtents);
      } else if (ob.radius && ob.radius > 0) {
        // Sphere obstacle: block cells within radius + padding
        this.carveSphere(ob.position, ob.radius);
      }
    }

    this.isBuilt = true;

    // Stats
    let walkable = 0;
    for (let i = 0; i < this.grid.length; i++) {
      if (this.grid[i] === 1) walkable++;
    }
    console.log(
      `[NavNetwork] Grid built: ${walkable} walkable / ${this.grid.length} total cells`,
    );
  }

  /** Force a grid rebuild on the next call (e.g. when a door opens/closes). */
  public invalidate(): void {
    this.lastObstacleHash = "";
  }

  private carveOBB(
    pos: { x: number; y: number; z: number },
    half: { x: number; y: number; z: number },
  ): void {
    const minOX = pos.x - half.x - this.padding;
    const maxOX = pos.x + half.x + this.padding;
    const minOZ = pos.z - half.z - this.padding;
    const maxOZ = pos.z + half.z + this.padding;

    const gMin = this.worldToGrid(minOX, minOZ);
    const gMax = this.worldToGrid(maxOX, maxOZ);

    for (let r = gMin.row; r <= gMax.row; r++) {
      for (let c = gMin.col; c <= gMax.col; c++) {
        if (this.isInBounds(c, r)) {
          this.grid[this.cellIndex(c, r)] = 0;
        }
      }
    }
  }

  private carveSphere(
    pos: { x: number; y: number; z: number },
    radius: number,
  ): void {
    const totalR = radius + this.padding;
    const gMin = this.worldToGrid(pos.x - totalR, pos.z - totalR);
    const gMax = this.worldToGrid(pos.x + totalR, pos.z + totalR);

    for (let r = gMin.row; r <= gMax.row; r++) {
      for (let c = gMin.col; c <= gMax.col; c++) {
        if (this.isInBounds(c, r)) {
          const wp = this.gridToWorld(c, r);
          const dx = wp.x - pos.x;
          const dz = wp.z - pos.z;
          if (dx * dx + dz * dz <= totalR * totalR) {
            this.grid[this.cellIndex(c, r)] = 0;
          }
        }
      }
    }
  }

  // =========================================================================
  // Pathfinding
  // =========================================================================

  /**
   * Find a path from `from` to `to` using grid-based A*.
   * Returns a PathResult containing:
   *   - path: array of THREE.Vector3 waypoints
   *   - approachPos: the walkable position nearest to `to` (use for distance checks)
   *   - pathFound: whether A* succeeded
   */
  public findPath(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3[] {
    const result = this.findPathDetailed(from, to);
    return result.path;
  }

  /**
   * Detailed path query that also returns the approach position.
   * AgentTaskQueue should use this for object navigation so it can
   * check distance to `approachPos` instead of the raw item position.
   */
  public findPathDetailed(from: THREE.Vector3, to: THREE.Vector3): PathResult {
    if (!this.isBuilt) {
      console.warn("[NavNetwork] Grid not built yet, returning direct path");
      return {
        path: [to.clone()],
        approachPos: to.clone(),
        pathFound: false,
      };
    }

    let startCell = this.worldToGrid(from.x, from.z);
    let endCell = this.worldToGrid(to.x, to.z);
    // Use the agent's current Y for all waypoints so YUKA doesn't
    // generate vertical steering forces.
    const pathY = from.y;

    // If start is blocked, find nearest walkable
    if (!this.isWalkable(startCell.col, startCell.row)) {
      console.warn(
        `[NavNetwork] Start cell (${startCell.col},${startCell.row}) is blocked — finding nearest walkable`,
      );
      const alt = this.findNearestWalkable(
        startCell.col,
        startCell.row,
        endCell.col,
        endCell.row,
      );
      if (!alt) {
        console.warn(`[NavNetwork] No walkable cell near start!`);
        return {
          path: [],
          approachPos: to.clone(),
          pathFound: false,
        };
      }
      startCell = alt;
    }

    // Fix #2: If end is blocked, find nearest walkable BIASED toward start
    // and record the actual approach position for the caller.
    let approachPos = to.clone();
    if (!this.isWalkable(endCell.col, endCell.row)) {
      console.warn(
        `[NavNetwork] End cell (${endCell.col},${endCell.row}) is blocked — finding nearest walkable`,
      );
      const alt = this.findNearestWalkable(
        endCell.col,
        endCell.row,
        startCell.col,
        startCell.row,
      );
      if (!alt) {
        console.warn(`[NavNetwork] No walkable cell near end!`);
        // Fix #3: return empty path instead of direct path into walls
        return {
          path: [],
          approachPos: to.clone(),
          pathFound: false,
        };
      }
      endCell = alt;
      // Fix #2: The approach position is the center of the walkable cell we found
      const wp = this.gridToWorld(alt.col, alt.row);
      approachPos = new THREE.Vector3(wp.x, pathY, wp.z);
    }

    // Same cell → go direct
    if (startCell.col === endCell.col && startCell.row === endCell.row) {
      return {
        path: [approachPos.clone()],
        approachPos: approachPos.clone(),
        pathFound: true,
      };
    }

    // Run A*
    const gridPath = this.astar(startCell, endCell);
    if (!gridPath || gridPath.length === 0) {
      // Fix #3: Return empty path instead of direct path into walls
      return {
        path: [],
        approachPos: approachPos.clone(),
        pathFound: false,
      };
    }

    // Convert grid path to world positions — skip first cell (agent is already there)
    // Use agent's current Y for all waypoints to avoid YUKA vertical forces
    const worldPath: THREE.Vector3[] = [];
    for (let i = 1; i < gridPath.length; i++) {
      const wp = this.gridToWorld(gridPath[i].col, gridPath[i].row);
      worldPath.push(new THREE.Vector3(wp.x, pathY, wp.z));
    }

    // Fix #4: Smooth with agent-width-aware line-of-sight
    const smoothed = this.smoothPath(worldPath);

    // Fix #11: Append approachPos (walkable) instead of raw target (may be blocked)
    // Only append if it differs meaningfully from the last smoothed point
    const lastSmoothed = smoothed[smoothed.length - 1];
    if (
      !lastSmoothed ||
      lastSmoothed.distanceTo(approachPos) > this.cellSize * 0.5
    ) {
      smoothed.push(approachPos.clone());
    }

    return {
      path: smoothed,
      approachPos: approachPos.clone(),
      pathFound: true,
    };
  }

  // =========================================================================
  // A* implementation
  // =========================================================================

  private astar(
    start: { col: number; row: number },
    end: { col: number; row: number },
  ): { col: number; row: number }[] | null {
    const SQRT2 = Math.SQRT2;

    // 8-directional neighbors: [dcol, drow, cost]
    const neighbors: [number, number, number][] = [
      [0, -1, 1], // N
      [1, -1, SQRT2], // NE
      [1, 0, 1], // E
      [1, 1, SQRT2], // SE
      [0, 1, 1], // S
      [-1, 1, SQRT2], // SW
      [-1, 0, 1], // W
      [-1, -1, SQRT2], // NW
    ];

    const key = (c: number, r: number) => r * this.cols + c;
    const startKey = key(start.col, start.row);
    const endKey = key(end.col, end.row);

    // Octile heuristic (optimal for 8-way grids)
    const heuristic = (c: number, r: number) => {
      const dc = Math.abs(c - end.col);
      const dr = Math.abs(r - end.row);
      return Math.max(dc, dr) + (SQRT2 - 1) * Math.min(dc, dr);
    };

    const gScore = new Float32Array(this.cols * this.rows).fill(Infinity);
    const fScore = new Float32Array(this.cols * this.rows).fill(Infinity);
    const cameFrom = new Int32Array(this.cols * this.rows).fill(-1);
    const closed = new Uint8Array(this.cols * this.rows);

    gScore[startKey] = 0;
    fScore[startKey] = heuristic(start.col, start.row);

    // Binary heap open set (stores cell keys, sorted by fScore)
    const open: number[] = [startKey];

    const heapPush = (k: number) => {
      open.push(k);
      let i = open.length - 1;
      while (i > 0) {
        const parent = (i - 1) >> 1;
        if (fScore[open[parent]] <= fScore[open[i]]) break;
        [open[parent], open[i]] = [open[i], open[parent]];
        i = parent;
      }
    };

    const heapPop = (): number => {
      const top = open[0];
      const last = open.pop()!;
      if (open.length > 0) {
        open[0] = last;
        let i = 0;
        while (true) {
          let smallest = i;
          const l = 2 * i + 1;
          const r = 2 * i + 2;
          if (l < open.length && fScore[open[l]] < fScore[open[smallest]])
            smallest = l;
          if (r < open.length && fScore[open[r]] < fScore[open[smallest]])
            smallest = r;
          if (smallest === i) break;
          [open[i], open[smallest]] = [open[smallest], open[i]];
          i = smallest;
        }
      }
      return top;
    };

    const maxIter = this.cols * this.rows;
    let iter = 0;

    while (open.length > 0 && iter++ < maxIter) {
      const currentKey = heapPop();

      if (currentKey === endKey) {
        // Reconstruct path
        return this.reconstructPath(cameFrom, startKey, endKey);
      }

      if (closed[currentKey]) continue;
      closed[currentKey] = 1;

      const currentCol = currentKey % this.cols;
      const currentRow = Math.floor(currentKey / this.cols);
      const currentG = gScore[currentKey];

      for (const [dc, dr, cost] of neighbors) {
        const nc = currentCol + dc;
        const nr = currentRow + dr;

        if (!this.isInBounds(nc, nr)) continue;
        if (!this.isWalkable(nc, nr)) continue;

        // Corner-cutting prevention: for diagonal moves,
        // both adjacent cardinal cells must be walkable
        if (dc !== 0 && dr !== 0) {
          if (
            !this.isWalkable(currentCol + dc, currentRow) ||
            !this.isWalkable(currentCol, currentRow + dr)
          ) {
            continue;
          }
        }

        const nKey = key(nc, nr);
        if (closed[nKey]) continue;

        const tentativeG = currentG + cost;
        if (tentativeG < gScore[nKey]) {
          cameFrom[nKey] = currentKey;
          gScore[nKey] = tentativeG;
          fScore[nKey] = tentativeG + heuristic(nc, nr);
          heapPush(nKey);
        }
      }
    }

    return null; // No path found
  }

  private reconstructPath(
    cameFrom: Int32Array,
    startKey: number,
    endKey: number,
  ): { col: number; row: number }[] {
    const path: { col: number; row: number }[] = [];
    let current = endKey;

    while (current !== -1) {
      path.unshift({
        col: current % this.cols,
        row: Math.floor(current / this.cols),
      });
      if (current === startKey) break;
      current = cameFrom[current];
    }

    return path;
  }

  // =========================================================================
  // Path smoothing
  // =========================================================================

  /**
   * Remove unnecessary intermediate waypoints using grid line-of-sight.
   * Fix #4: Uses fat line-of-sight that accounts for agent width.
   */
  private smoothPath(path: THREE.Vector3[]): THREE.Vector3[] {
    if (path.length <= 2) return [...path];

    const smoothed: THREE.Vector3[] = [path[0]];
    let current = 0;

    while (current < path.length - 1) {
      let farthest = current + 1;
      // Try to skip ahead as far as possible
      for (let i = path.length - 1; i > current + 1; i--) {
        if (this.hasFatLineOfSight(path[current], path[i])) {
          farthest = i;
          break;
        }
      }
      smoothed.push(path[farthest]);
      current = farthest;
    }

    return smoothed;
  }

  /**
   * Fix #4: Fat line-of-sight check that tests cells in a corridor
   * of width = 1 cell on each side of the Bresenham line.
   * This prevents smoothing through gaps too narrow for the agent.
   */
  private hasFatLineOfSight(a: THREE.Vector3, b: THREE.Vector3): boolean {
    const cellA = this.worldToGrid(a.x, a.z);
    const cellB = this.worldToGrid(b.x, b.z);

    let x0 = cellA.col;
    let y0 = cellA.row;
    const x1 = cellB.col;
    const y1 = cellB.row;

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    // Perpendicular direction for width check
    const len = Math.sqrt(dx * dx + dy * dy);
    // Normal to the line (perpendicular offsets)
    const nx = len > 0 ? -(y1 - y0) / len : 0;
    const ny = len > 0 ? (x1 - x0) / len : 0;

    while (true) {
      // Check center cell + 1-cell margin on each side of the line
      if (!this.isWalkable(x0, y0)) return false;

      // Check offset cells for agent width clearance
      const ox = Math.round(nx);
      const oy = Math.round(ny);
      if (ox !== 0 || oy !== 0) {
        if (!this.isWalkable(x0 + ox, y0 + oy)) return false;
        if (!this.isWalkable(x0 - ox, y0 - oy)) return false;
      }

      if (x0 === x1 && y0 === y1) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }

    return true;
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  /**
   * Fix #7: BFS spiral outward to find the nearest walkable cell,
   * biased toward a reference point (e.g., the agent's position when
   * fixing a blocked goal, or the goal when fixing a blocked start).
   */
  private findNearestWalkable(
    col: number,
    row: number,
    biasCol?: number,
    biasRow?: number,
  ): { col: number; row: number } | null {
    const maxRadius = 25;
    let bestCell: { col: number; row: number } | null = null;
    let bestBiasDist = Infinity;

    for (let r = 1; r <= maxRadius; r++) {
      for (let dr = -r; dr <= r; dr++) {
        for (let dc = -r; dc <= r; dc++) {
          // Only check the ring perimeter
          if (Math.abs(dr) !== r && Math.abs(dc) !== r) continue;
          const nc = col + dc;
          const nr = row + dr;
          if (this.isWalkable(nc, nr)) {
            if (biasCol !== undefined && biasRow !== undefined) {
              // Pick the walkable cell closest to the bias point
              const bDist =
                (nc - biasCol) * (nc - biasCol) +
                (nr - biasRow) * (nr - biasRow);
              if (bDist < bestBiasDist) {
                bestBiasDist = bDist;
                bestCell = { col: nc, row: nr };
              }
            } else {
              // No bias — return first found
              return { col: nc, row: nr };
            }
          }
        }
      }
      // If we found any candidate on this ring, return it
      // (don't search further rings, the ring is close enough)
      if (bestCell) return bestCell;
    }
    return bestCell;
  }

  /**
   * Debug data for visualization.
   */
  public getDebugData(): {
    position: { x: number; z: number };
    walkable: boolean;
  }[] {
    if (!this.isBuilt) return [];
    const data: { position: { x: number; z: number }; walkable: boolean }[] =
      [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const pos = this.gridToWorld(c, r);
        data.push({
          position: pos,
          walkable: this.grid[this.cellIndex(c, r)] === 1,
        });
      }
    }
    return data;
  }
  /**
   * Return a randomly selected walkable point within a max radius from the given origin.
   */
  public getRandomPoint(
    origin: THREE.Vector3,
    maxRadius: number,
  ): THREE.Vector3 | null {
    if (!this.isBuilt) return null;

    const originCell = this.worldToGrid(origin.x, origin.z);
    // Convert 10.0 world units to cells (cellSize = 2.0 -> 5 cells)
    const radiusCells = Math.ceil(maxRadius / this.cellSize);

    // Try a few times to find a random walkable cell
    for (let i = 0; i < 20; i++) {
      const dCol = Math.floor((Math.random() - 0.5) * 2 * radiusCells);
      const dRow = Math.floor((Math.random() - 0.5) * 2 * radiusCells);

      const candidateCol = originCell.col + dCol;
      const candidateRow = originCell.row + dRow;

      if (this.isWalkable(candidateCol, candidateRow)) {
        const wp = this.gridToWorld(candidateCol, candidateRow);
        return new THREE.Vector3(wp.x, origin.y, wp.z);
      }
    }

    return null;
  }
}

export default NavigationNetwork;
