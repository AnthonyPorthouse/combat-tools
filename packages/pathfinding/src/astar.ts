import type { Vector2 } from "@combat-tools/vectors";

import type { GridCell } from "./gridCell";

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
    for (let dX = 0; dX < cellCount; dX++) {
      for (let dY = 0; dY < cellCount; dY++) {
        occupied.add(cellKey(position.x + dX, position.y + dY));
      }
    }
  }
  return occupied;
}

/**
 * Creates an AStarGrid whose `isPassable` checks whether a mover of the given
 * size can occupy a center cell without overlapping any occupied cell.
 */
export function makeMoverGrid(occupiedCells: Set<string>, moverSize: number): AStarGrid {
  const offset = moverSize < 1 ? 0 : Math.floor((moverSize - 1) / 2);
  const cellCount = moverSize < 1 ? 1 : Math.floor(moverSize);

  return {
    isPassable(col: number, row: number): boolean {
      const topLeftCol = col - offset;
      const topLeftRow = row - offset;
      for (let dX = 0; dX < cellCount; dX++) {
        for (let dY = 0; dY < cellCount; dY++) {
          if (occupiedCells.has(cellKey(topLeftCol + dX, topLeftRow + dY))) {
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
 */
function getChebyshevRingCells(center: GridCell, radius: number): GridCell[] {
  const cells: GridCell[] = [];
  for (let dY = -radius; dY <= radius; dY++) {
    for (let dX = -radius; dX <= radius; dX++) {
      if (Math.max(Math.abs(dX), Math.abs(dY)) !== radius) continue;
      cells.push({ x: center.x + dX, y: center.y + dY });
    }
  }
  return cells;
}

function closestCell(candidates: GridCell[], prefer: GridCell): GridCell {
  return candidates.reduce((best, candidate) => {
    const distanceToCandidate = Math.hypot(candidate.x - prefer.x, candidate.y - prefer.y);
    const distanceToBest = Math.hypot(best.x - prefer.x, best.y - prefer.y);
    return distanceToCandidate < distanceToBest ? candidate : best;
  });
}

export function findNearestValidCell(
  target: GridCell,
  grid: AStarGrid,
  prefer?: GridCell,
): GridCell | null {
  const MAX_RADIUS = 15;
  for (let radius = 0; radius <= MAX_RADIUS; radius++) {
    const candidates = getChebyshevRingCells(target, radius).filter((cell) =>
      grid.isPassable(cell.x, cell.y),
    );
    if (candidates.length === 0) continue;
    return prefer ? closestCell(candidates, prefer) : candidates[0];
  }
  return null;
}

type Node = {
  x: number;
  y: number;
  g: number;
  f: number;
  parent: Node | null;
};

const ORTHO_COST = 1;
const DIAG_COST = Math.SQRT2;

/** Chebyshev distance — admissible and consistent for 8-directional movement. */
function heuristic(ax: number, ay: number, bx: number, by: number): number {
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

/** Min-heap helpers (on Node.f). */
function heapPush(heap: Node[], node: Node): void {
  heap.push(node);
  let index = heap.length - 1;
  while (index > 0) {
    const parentIndex = (index - 1) >> 1;
    if (heap[parentIndex].f <= heap[index].f) break;
    [heap[parentIndex], heap[index]] = [heap[index], heap[parentIndex]];
    index = parentIndex;
  }
}

function heapPop(heap: Node[]): Node {
  const top = heap[0];
  const last = heap.pop()!;
  if (heap.length > 0) {
    heap[0] = last;
    let index = 0;
    for (;;) {
      const left = 2 * index + 1;
      const right = 2 * index + 2;
      let smallest = index;
      if (left < heap.length && heap[left].f < heap[smallest].f) smallest = left;
      if (right < heap.length && heap[right].f < heap[smallest].f) smallest = right;
      if (smallest === index) break;
      [heap[index], heap[smallest]] = [heap[smallest], heap[index]];
      index = smallest;
    }
  }
  return top;
}

const MAX_CLOSED = 1000;

/** Reconstructs the path from `node` back to `start` (excludes start, includes end). */
function reconstructPath(node: Node, start: GridCell): GridCell[] {
  const path: GridCell[] = [];
  let current: Node | null = node;
  while (current && (current.x !== start.x || current.y !== start.y)) {
    path.unshift({ x: current.x, y: current.y });
    current = current.parent;
  }
  return path;
}

/** Returns true when a diagonal move is corner-clipped by blocked orthogonal neighbours. */
function isClippedDiagonal(
  grid: AStarGrid,
  fromCol: number,
  fromRow: number,
  dCol: number,
  dRow: number,
): boolean {
  return !grid.isPassable(fromCol + dCol, fromRow) && !grid.isPassable(fromCol, fromRow + dRow);
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
 */
export function findPath(start: GridCell, end: GridCell, grid: AStarGrid): GridCell[] | null {
  if (start.x === end.x && start.y === end.y) return [];

  const open: Node[] = [];
  const openMap = new Map<string, Node>();
  const gScore = new Map<string, number>();
  const closed = new Set<string>();

  const startKey = cellKey(start.x, start.y);
  const startNode: Node = {
    x: start.x,
    y: start.y,
    g: 0,
    f: heuristic(start.x, start.y, end.x, end.y),
    parent: null,
  };
  heapPush(open, startNode);
  openMap.set(startKey, startNode);
  gScore.set(startKey, 0);

  while (open.length > 0) {
    const current = heapPop(open);
    const currentKey = cellKey(current.x, current.y);

    if (current.x === end.x && current.y === end.y) {
      return reconstructPath(current, start);
    }

    if (closed.has(currentKey)) continue;
    closed.add(currentKey);
    openMap.delete(currentKey);

    if (closed.size > MAX_CLOSED) return null;

    for (const [dCol, dRow] of NEIGHBOR_OFFSETS) {
      const neighborCol = current.x + dCol;
      const neighborRow = current.y + dRow;

      if (!grid.isPassable(neighborCol, neighborRow)) continue;

      const isDiagonal = dCol !== 0 && dRow !== 0;
      if (isDiagonal && isClippedDiagonal(grid, current.x, current.y, dCol, dRow)) continue;

      const neighborKey = cellKey(neighborCol, neighborRow);
      if (closed.has(neighborKey)) continue;

      const tentativeG = current.g + (isDiagonal ? DIAG_COST : ORTHO_COST);
      const existingG = gScore.get(neighborKey) ?? Infinity;

      if (tentativeG < existingG) {
        gScore.set(neighborKey, tentativeG);
        const f = tentativeG + heuristic(neighborCol, neighborRow, end.x, end.y);
        const neighborNode: Node = {
          x: neighborCol,
          y: neighborRow,
          g: tentativeG,
          f,
          parent: current,
        };
        addOrUpdateNeighbor(open, openMap, neighborKey, neighborNode, tentativeG, f, current);
      }
    }
  }

  return null;
}
