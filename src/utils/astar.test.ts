import { describe, it, expect } from "vitest";
import { buildOccupiedCells, makeMoverGrid, findPath, findNearestValidCell } from "./astar";
import type { GridCell } from "./cameraMath";

// ---------------------------------------------------------------------------
// buildOccupiedCells
// ---------------------------------------------------------------------------

describe("buildOccupiedCells", () => {
  it("returns an empty set for no obstacles", () => {
    expect(buildOccupiedCells([])).toEqual(new Set());
  });

  it("marks 1 cell for a size-0.5 token", () => {
    const result = buildOccupiedCells([{ position: { x: 3, y: 2 }, size: 0.5 }]);
    expect(result.has("3,2")).toBe(true);
    expect(result.size).toBe(1);
  });

  it("marks 1 cell for a size-1 token", () => {
    const result = buildOccupiedCells([{ position: { x: 1, y: 1 }, size: 1 }]);
    expect(result.has("1,1")).toBe(true);
    expect(result.size).toBe(1);
  });

  it("marks 4 cells for a size-2 token", () => {
    const result = buildOccupiedCells([{ position: { x: 0, y: 0 }, size: 2 }]);
    expect(result).toEqual(new Set(["0,0", "1,0", "0,1", "1,1"]));
  });

  it("marks 9 cells for a size-3 token", () => {
    const result = buildOccupiedCells([{ position: { x: 2, y: 2 }, size: 3 }]);
    expect(result.size).toBe(9);
    for (let dc = 0; dc < 3; dc++) {
      for (let dr = 0; dr < 3; dr++) {
        expect(result.has(`${2 + dc},${2 + dr}`)).toBe(true);
      }
    }
  });

  it("combines cells from multiple obstacles", () => {
    const result = buildOccupiedCells([
      { position: { x: 0, y: 0 }, size: 1 },
      { position: { x: 5, y: 5 }, size: 1 },
    ]);
    expect(result.size).toBe(2);
    expect(result.has("0,0")).toBe(true);
    expect(result.has("5,5")).toBe(true);
  });

  it("handles negative position coordinates", () => {
    const result = buildOccupiedCells([{ position: { x: -2, y: -3 }, size: 1 }]);
    expect(result.has("-2,-3")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// makeMoverGrid
// ---------------------------------------------------------------------------

describe("makeMoverGrid", () => {
  it("size-1 mover is blocked by an occupied cell", () => {
    const occupied = new Set(["3,3"]);
    const grid = makeMoverGrid(occupied, 1);
    expect(grid.isPassable(3, 3)).toBe(false);
  });

  it("size-1 mover is passable when cell is clear", () => {
    const occupied = new Set(["3,3"]);
    const grid = makeMoverGrid(occupied, 1);
    expect(grid.isPassable(4, 4)).toBe(true);
  });

  it("size-0.5 mover is blocked by an occupied cell", () => {
    const occupied = new Set(["2,2"]);
    const grid = makeMoverGrid(occupied, 0.5);
    expect(grid.isPassable(2, 2)).toBe(false);
  });

  it("size-2 mover is blocked when footprint overlaps an occupied cell", () => {
    // size-2: offset=0, footprint=(col,row),(col+1,row),(col,row+1),(col+1,row+1)
    // center cell (3,3) → footprint (3,3),(4,3),(3,4),(4,4)
    const occupied = new Set(["4,4"]);
    const grid = makeMoverGrid(occupied, 2);
    expect(grid.isPassable(3, 3)).toBe(false);
  });

  it("size-2 mover is passable when footprint is clear", () => {
    const occupied = new Set(["10,10"]);
    const grid = makeMoverGrid(occupied, 2);
    expect(grid.isPassable(3, 3)).toBe(true);
  });

  it("size-3 mover cannot pass through a 1-cell-wide gap", () => {
    // Wall of obstacles: column x=5, rows 0..4 and rows 6..10,
    // leaving only row 5 open at x=5.
    // A size-3 mover at center (5,5) needs footprint (4,4)..(6,6) — that's 3×3.
    // The gap at (5,5) alone is 1 cell wide, not enough for a 3×3 footprint.
    const obstacles: Array<{ x: number; y: number }> = [];
    for (let r = 0; r <= 10; r++) {
      if (r !== 5) obstacles.push({ x: 5, y: r });
      // Also block x=4 for rows != 5 to make a proper 1-wide gap
      if (r !== 5) obstacles.push({ x: 4, y: r });
      if (r !== 5) obstacles.push({ x: 6, y: r });
    }
    const occupied = new Set(obstacles.map(({ x, y }) => `${x},${y}`));
    const grid = makeMoverGrid(occupied, 3);

    // A 3×3 mover centred at (5,5): offset=1, footprint (4,4)..(6,6).
    // (4,4) blocked → not passable.
    expect(grid.isPassable(5, 5)).toBe(false);
  });

  it("size-3 mover can pass through a 3-cell-wide open corridor", () => {
    // Open corridor: columns 4,5,6 are completely clear.
    // Everything else beyond col 3 and col 7 is blocked.
    const occupied = new Set<string>();
    for (let r = -5; r <= 5; r++) {
      occupied.add(`3,${r}`);
      occupied.add(`7,${r}`);
    }
    const grid = makeMoverGrid(occupied, 3);
    // center (5,0): offset=1, footprint (4,-1)..(6,1) — all clear.
    expect(grid.isPassable(5, 0)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// findNearestValidCell
// ---------------------------------------------------------------------------

describe("findNearestValidCell", () => {
  it("returns the target cell when it is passable", () => {
    const grid = makeMoverGrid(new Set(), 1);
    expect(findNearestValidCell({ col: 5, row: 5 }, grid)).toEqual({ col: 5, row: 5 });
  });

  it("returns a ring-1 neighbour when the target is blocked", () => {
    const occupied = new Set(["5,5"]);
    const grid = makeMoverGrid(occupied, 1);
    const result = findNearestValidCell({ col: 5, row: 5 }, grid);
    expect(result).not.toBeNull();
    expect(Math.max(Math.abs(result!.col - 5), Math.abs(result!.row - 5))).toBe(1);
    expect(grid.isPassable(result!.col, result!.row)).toBe(true);
  });

  it("skips ring 1 and returns a ring-2 cell when all 9 inner cells are blocked", () => {
    const occupied = new Set<string>();
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        occupied.add(`${5 + dc},${5 + dr}`);
      }
    }
    const grid = makeMoverGrid(occupied, 1);
    const result = findNearestValidCell({ col: 5, row: 5 }, grid);
    expect(result).not.toBeNull();
    expect(Math.max(Math.abs(result!.col - 5), Math.abs(result!.row - 5))).toBe(2);
    expect(grid.isPassable(result!.col, result!.row)).toBe(true);
  });

  it("returns null when all cells within MAX_RADIUS are blocked", () => {
    const occupied = new Set<string>();
    for (let dc = -15; dc <= 15; dc++) {
      for (let dr = -15; dr <= 15; dr++) {
        occupied.add(`${dc},${dr}`);
      }
    }
    const grid = makeMoverGrid(occupied, 1);
    expect(findNearestValidCell({ col: 0, row: 0 }, grid)).toBeNull();
  });

  it("works with negative coordinates", () => {
    const occupied = new Set(["-2,-2"]);
    const grid = makeMoverGrid(occupied, 1);
    const result = findNearestValidCell({ col: -2, row: -2 }, grid);
    expect(result).not.toBeNull();
    expect(Math.max(Math.abs(result!.col - -2), Math.abs(result!.row - -2))).toBe(1);
    expect(grid.isPassable(result!.col, result!.row)).toBe(true);
  });

  it("prefer: picks the ring-1 candidate closest to prefer, not top-left", () => {
    // Block (5,5); all 8 ring-1 neighbours are passable.
    // Without prefer → returns (4,4) (top-left first in iteration order).
    // With prefer=(7,7) → returns (6,6), the ring-1 cell closest to (7,7).
    const occupied = new Set(["5,5"]);
    const grid = makeMoverGrid(occupied, 1);
    const result = findNearestValidCell({ col: 5, row: 5 }, grid, { col: 7, row: 7 });
    expect(result).toEqual({ col: 6, row: 6 });
  });

  it("works with a larger mover (size=2) blocked by an obstacle", () => {
    const occupied = new Set(["5,5"]);
    const grid = makeMoverGrid(occupied, 2);
    // size-2 mover: offset=0, footprint (col,row)..(col+1,row+1)
    // center (5,5): footprint (5,5),(6,5),(5,6),(6,6) — (5,5) blocked → not passable
    expect(grid.isPassable(5, 5)).toBe(false);
    const result = findNearestValidCell({ col: 5, row: 5 }, grid);
    expect(result).not.toBeNull();
    expect(grid.isPassable(result!.col, result!.row)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// findPath
// ---------------------------------------------------------------------------

const openGrid = makeMoverGrid(new Set(), 1);

describe("findPath", () => {
  it("returns [] when start equals end", () => {
    expect(findPath({ col: 0, row: 0 }, { col: 0, row: 0 }, openGrid)).toEqual([]);
  });

  it("returns a single orthogonal step for adjacent cells", () => {
    const path = findPath({ col: 0, row: 0 }, { col: 1, row: 0 }, openGrid);
    expect(path).toEqual([{ col: 1, row: 0 }]);
  });

  it("returns a single diagonal step for diagonally adjacent cells", () => {
    const path = findPath({ col: 0, row: 0 }, { col: 1, row: 1 }, openGrid);
    expect(path).toEqual([{ col: 1, row: 1 }]);
  });

  it("path does not include the start cell", () => {
    const start: GridCell = { col: 2, row: 2 };
    const end: GridCell = { col: 5, row: 5 };
    const path = findPath(start, end, openGrid)!;
    expect(path[0]).not.toEqual(start);
  });

  it("path includes the end cell as the last element", () => {
    const end: GridCell = { col: 5, row: 3 };
    const path = findPath({ col: 0, row: 0 }, end, openGrid)!;
    expect(path[path.length - 1]).toEqual(end);
  });

  it("every consecutive pair in the path is at most 1 step apart", () => {
    const start: GridCell = { col: 0, row: 0 };
    const path = findPath(start, { col: 8, row: 5 }, openGrid)!;
    const full = [start, ...path];
    for (let i = 1; i < full.length; i++) {
      const dc = Math.abs(full[i].col - full[i - 1].col);
      const dr = Math.abs(full[i].row - full[i - 1].row);
      expect(dc).toBeLessThanOrEqual(1);
      expect(dr).toBeLessThanOrEqual(1);
    }
  });

  it("path length equals Chebyshev distance on an open grid", () => {
    // Chebyshev distance from (0,0) to (5,3) = max(5,3) = 5
    const path = findPath({ col: 0, row: 0 }, { col: 5, row: 3 }, openGrid)!;
    expect(path.length).toBe(5);
  });

  it("navigates around a wall of obstacles", () => {
    // Vertical wall at col=2 from row=0 to row=4
    const occupied = new Set<string>();
    for (let r = 0; r <= 4; r++) occupied.add(`2,${r}`);
    const grid = makeMoverGrid(occupied, 1);

    const path = findPath({ col: 0, row: 2 }, { col: 4, row: 2 }, grid);
    expect(path).not.toBeNull();
    // Path must not pass through blocked cells
    for (const cell of path!) {
      expect(grid.isPassable(cell.col, cell.row)).toBe(true);
    }
    // And must end at the destination
    expect(path![path!.length - 1]).toEqual({ col: 4, row: 2 });
  });

  it("returns null when destination is completely surrounded by obstacles", () => {
    const occupied = new Set(["5,4", "5,6", "4,5", "6,5", "4,4", "4,6", "6,4", "6,6"]);
    const grid = makeMoverGrid(occupied, 1);
    expect(findPath({ col: 0, row: 0 }, { col: 5, row: 5 }, grid)).toBeNull();
  });

  it("handles negative cell coordinates", () => {
    const path = findPath({ col: -3, row: -3 }, { col: -1, row: -1 }, openGrid);
    expect(path).not.toBeNull();
    expect(path![path!.length - 1]).toEqual({ col: -1, row: -1 });
  });

  it("diagonal clipping: blocks squeezing through a corner gap", () => {
    // Two obstacles that share a corner force a size-1 mover to go around.
    // Both orthogonal neighbours (right, down) of start are blocked.
    const occupied = new Set(["1,0", "0,1"]);
    const grid = makeMoverGrid(occupied, 1);
    // Direct diagonal to (1,1) requires passing between (1,0) and (0,1) — blocked.
    const path = findPath({ col: 0, row: 0 }, { col: 1, row: 1 }, grid);
    // Path should either be null (no route if (1,1) is blocked too) or go around.
    // (1,1) is open, so it should find a longer path around.
    if (path !== null) {
      // Must not take a direct diagonal as the first step
      expect(path.length).toBeGreaterThan(1);
    }
  });

  it("finds a path through an L-shaped corridor", () => {
    // Closed corridor: go right to (3,0) then down to (3,3)
    const occupied = new Set<string>();
    // Walls along top and sides creating an L-shape
    for (let c = 0; c <= 4; c++) occupied.add(`${c},1`); // bottom wall of horizontal segment
    for (let r = 0; r <= 3; r++) occupied.add(`2,${r}`); // wall separating the two legs
    const grid = makeMoverGrid(occupied, 1);

    const path = findPath({ col: 0, row: 0 }, { col: 3, row: 3 }, grid);
    expect(path).not.toBeNull();
    expect(path![path!.length - 1]).toEqual({ col: 3, row: 3 });
  });
});
