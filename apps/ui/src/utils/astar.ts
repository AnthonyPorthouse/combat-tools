import type { Vector2 } from "@combat-tools/vectors";

import type { GridCell } from "./cameraMath";

export type AStarGrid = {
  isPassable: (col: number, row: number) => boolean;
};

const cellKey = (col: number, row: number): string => `${col},${row}`;

/**
 * Builds a set of all grid cells occupied by a collection of obstacle tokens.
 * Tokens with size < 1 occupy 1 cell; tokens with size N occupy an N×N block
 * starting at their top-left position.
 */
export function buildOccupiedCells(
  obstacles: Array<{ position: Vector2; size: number }>,
): Set<string> {
  const occupied = new Set<string>();
  for (const { position, size } of obstacles) {
    const cellCount = size < 1 ? 1 : Math.ceil(size);
    for (let dc = 0; dc < cellCount; dc++) {
      for (let dr = 0; dr < cellCount; dr++) {
        occupied.add(cellKey(position.x + dc, position.y + dr));
      }
    }
  }
  return occupied;
}

/**
 * Creates an AStarGrid whose `isPassable` checks whether a mover of the given
 * size can occupy a **center cell** (col, row) without overlapping any occupied cell.
 *
 * The mover's footprint is derived from its center cell:
 * - offset = size < 1 ? 0 : Math.floor((size - 1) / 2)
 * - top-left = (col - offset, row - offset)
 * - footprint = top-left..(top-left + cellCount - 1) in both axes
 */
export function makeMoverGrid(occupiedCells: Set<string>, moverSize: number): AStarGrid {
  const offset = moverSize < 1 ? 0 : Math.floor((moverSize - 1) / 2);
  const cellCount = moverSize < 1 ? 1 : Math.floor(moverSize);

  return {
    isPassable(col: number, row: number): boolean {
      const tlCol = col - offset;
      const tlRow = row - offset;
      for (let dc = 0; dc < cellCount; dc++) {
        for (let dr = 0; dr < cellCount; dr++) {
          if (occupiedCells.has(cellKey(tlCol + dc, tlRow + dr))) {
            return false;
          }
        }
      }
      return true;
    },
  };
}

/**
 * Returns the nearest cell to `target` (by Chebyshev distance) that the mover
 * can occupy according to `grid.isPassable`. If the target itself is passable
 * it is returned immediately.
 *
 * Searches outward in expanding Chebyshev rings (radius 0, 1, 2, …) up to a
 * maximum radius of 15. At each radius all passable candidates are collected
 * and the one with the smallest Euclidean distance to `prefer` is returned
 * (when `prefer` is omitted, the top-left-first candidate is returned).
 * Returns `null` if no passable cell is found within the search limit.
 */
function getChebyshevRingCells(center: GridCell, radius: number): GridCell[] {
  const cells: GridCell[] = [];
  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      if (Math.max(Math.abs(dc), Math.abs(dr)) !== radius) continue;
      cells.push({ col: center.col + dc, row: center.row + dr });
    }
  }
  return cells;
}

function closestCell(candidates: GridCell[], prefer: GridCell): GridCell {
  return candidates.reduce((best, c) => {
    const dC = Math.hypot(c.col - prefer.col, c.row - prefer.row);
    const dB = Math.hypot(best.col - prefer.col, best.row - prefer.row);
    return dC < dB ? c : best;
  });
}

export function findNearestValidCell(
  target: GridCell,
  grid: AStarGrid,
  prefer?: GridCell,
): GridCell | null {
  const MAX_RADIUS = 15;
  for (let r = 0; r <= MAX_RADIUS; r++) {
    const candidates = getChebyshevRingCells(target, r).filter((c) =>
      grid.isPassable(c.col, c.row),
    );
    if (candidates.length === 0) continue;
    return prefer ? closestCell(candidates, prefer) : candidates[0];
  }
  return null;
}

// ---------------------------------------------------------------------------
// A* internals
// ---------------------------------------------------------------------------

type Node = {
  col: number;
  row: number;
  g: number;
  f: number;
  parent: Node | null;
};

const ORTHO_COST = 1;
const DIAG_COST = Math.SQRT2;

/** Chebyshev distance — admissible and consistent for 8-directional movement. */
function heuristic(ac: number, ar: number, bc: number, br: number): number {
  return Math.max(Math.abs(ac - bc), Math.abs(ar - br));
}

/** Min-heap helpers (on Node.f). */
function heapPush(heap: Node[], node: Node): void {
  heap.push(node);
  let i = heap.length - 1;
  while (i > 0) {
    const parent = (i - 1) >> 1;
    if (heap[parent].f <= heap[i].f) break;
    [heap[parent], heap[i]] = [heap[i], heap[parent]];
    i = parent;
  }
}

function heapPop(heap: Node[]): Node {
  const top = heap[0];
  const last = heap.pop()!;
  if (heap.length > 0) {
    heap[0] = last;
    let i = 0;
    for (;;) {
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      let smallest = i;
      if (l < heap.length && heap[l].f < heap[smallest].f) smallest = l;
      if (r < heap.length && heap[r].f < heap[smallest].f) smallest = r;
      if (smallest === i) break;
      [heap[i], heap[smallest]] = [heap[smallest], heap[i]];
      i = smallest;
    }
  }
  return top;
}

const MAX_CLOSED = 1000;

/** Reconstructs the path from `node` back to `start` (excludes start, includes end). */
function reconstructPath(node: Node, start: GridCell): GridCell[] {
  const path: GridCell[] = [];
  let current: Node | null = node;
  while (current && (current.col !== start.col || current.row !== start.row)) {
    path.unshift({ col: current.col, row: current.row });
    current = current.parent;
  }
  return path;
}

/** Returns true when a diagonal move (dc, dr) is corner-clipped — both shared orthogonal cells are blocked. */
function isClippedDiagonal(
  grid: AStarGrid,
  fromCol: number,
  fromRow: number,
  dc: number,
  dr: number,
): boolean {
  return !grid.isPassable(fromCol + dc, fromRow) && !grid.isPassable(fromCol, fromRow + dr);
}

/** Adds a new neighbor to the open list, or updates it in-place if already present. */
function addOrUpdateNeighbor(
  open: Node[],
  openMap: Map<string, Node>,
  neighborKey: string,
  neighborNode: Node,
  tentativeG: number,
  f: number,
  current: Node,
): void {
  const existing = openMap.get(neighborKey);
  if (existing) {
    existing.g = tentativeG;
    existing.f = f;
    existing.parent = current;
    // Re-heapify (simple approach: push a duplicate, stale one skipped via closed check)
    heapPush(open, neighborNode);
  } else {
    heapPush(open, neighborNode);
    openMap.set(neighborKey, neighborNode);
  }
}

/** All 8 directional offsets (col, row), excluding (0, 0). */
const NEIGHBOR_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

/**
 * Finds the shortest path from `start` to `end` on `grid` using A* with
 * 8-directional movement.
 *
 * Returns the path as an array of `GridCell` values **excluding** `start` and
 * **including** `end`. Returns `[]` when `start === end`. Returns `null` when
 * no path exists within the search limit.
 *
 * For 1×1 movers, diagonal steps are blocked when both orthogonal neighbours
 * that share that corner are impassable (prevents squeezing through a corner gap).
 * This clipping rule is not applied for larger movers — the footprint check
 * already rejects most invalid diagonal moves.
 */
export function findPath(start: GridCell, end: GridCell, grid: AStarGrid): GridCell[] | null {
  if (start.col === end.col && start.row === end.row) return [];

  const open: Node[] = [];
  const openMap = new Map<string, Node>();
  const cameFrom = new Map<string, Node>();
  const gScore = new Map<string, number>();
  const closed = new Set<string>();

  const startKey = cellKey(start.col, start.row);
  const startNode: Node = {
    col: start.col,
    row: start.row,
    g: 0,
    f: heuristic(start.col, start.row, end.col, end.row),
    parent: null,
  };
  heapPush(open, startNode);
  openMap.set(startKey, startNode);
  gScore.set(startKey, 0);

  while (open.length > 0) {
    const current = heapPop(open);
    const currentKey = cellKey(current.col, current.row);

    if (current.col === end.col && current.row === end.row) {
      return reconstructPath(current, start);
    }

    if (closed.has(currentKey)) continue;
    closed.add(currentKey);
    openMap.delete(currentKey);

    if (closed.size > MAX_CLOSED) return null;

    for (const [dc, dr] of NEIGHBOR_OFFSETS) {
      const nc = current.col + dc;
      const nr = current.row + dr;

      if (!grid.isPassable(nc, nr)) continue;

      const isDiagonal = dc !== 0 && dr !== 0;
      if (isDiagonal && isClippedDiagonal(grid, current.col, current.row, dc, dr)) continue;

      const neighborKey = cellKey(nc, nr);
      if (closed.has(neighborKey)) continue;

      const tentativeG = current.g + (isDiagonal ? DIAG_COST : ORTHO_COST);
      const existingG = gScore.get(neighborKey) ?? Infinity;

      if (tentativeG < existingG) {
        gScore.set(neighborKey, tentativeG);
        const f = tentativeG + heuristic(nc, nr, end.col, end.row);
        const neighborNode: Node = { col: nc, row: nr, g: tentativeG, f, parent: current };
        cameFrom.set(neighborKey, neighborNode);
        addOrUpdateNeighbor(open, openMap, neighborKey, neighborNode, tentativeG, f, current);
      }
    }
  }

  return null;
}
