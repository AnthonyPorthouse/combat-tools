import { describe, expect, it } from "vitest";

import {
  buildOccupiedCells,
  findNearestValidCell,
  findPath,
  makeMoverGrid,
  type GridCell,
} from "../src";

const cell = (x: number, y: number): GridCell => ({ x, y });

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
    for (let dX = 0; dX < 3; dX++) {
      for (let dY = 0; dY < 3; dY++) {
        expect(result.has(`${2 + dX},${2 + dY}`)).toBe(true);
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
    const obstacles: Array<{ x: number; y: number }> = [];
    for (let row = 0; row <= 10; row++) {
      if (row !== 5) obstacles.push({ x: 5, y: row });
      if (row !== 5) obstacles.push({ x: 4, y: row });
      if (row !== 5) obstacles.push({ x: 6, y: row });
    }
    const occupied = new Set(obstacles.map(({ x, y }) => `${x},${y}`));
    const grid = makeMoverGrid(occupied, 3);

    expect(grid.isPassable(5, 5)).toBe(false);
  });

  it("size-3 mover can pass through a 3-cell-wide open corridor", () => {
    const occupied = new Set<string>();
    for (let row = -5; row <= 5; row++) {
      occupied.add(`3,${row}`);
      occupied.add(`7,${row}`);
    }
    const grid = makeMoverGrid(occupied, 3);
    expect(grid.isPassable(5, 0)).toBe(true);
  });
});

describe("findNearestValidCell", () => {
  it("returns the target cell when it is passable", () => {
    const grid = makeMoverGrid(new Set(), 1);
    expect(findNearestValidCell(cell(5, 5), grid)).toEqual(cell(5, 5));
  });

  it("returns a ring-1 neighbour when the target is blocked", () => {
    const occupied = new Set(["5,5"]);
    const grid = makeMoverGrid(occupied, 1);
    const result = findNearestValidCell(cell(5, 5), grid);
    expect(result).not.toBeNull();
    expect(Math.max(Math.abs(result!.x - 5), Math.abs(result!.y - 5))).toBe(1);
    expect(grid.isPassable(result!.x, result!.y)).toBe(true);
  });

  it("skips ring 1 and returns a ring-2 cell when all 9 inner cells are blocked", () => {
    const occupied = new Set<string>();
    for (let dX = -1; dX <= 1; dX++) {
      for (let dY = -1; dY <= 1; dY++) {
        occupied.add(`${5 + dX},${5 + dY}`);
      }
    }
    const grid = makeMoverGrid(occupied, 1);
    const result = findNearestValidCell(cell(5, 5), grid);
    expect(result).not.toBeNull();
    expect(Math.max(Math.abs(result!.x - 5), Math.abs(result!.y - 5))).toBe(2);
    expect(grid.isPassable(result!.x, result!.y)).toBe(true);
  });

  it("returns null when all cells within MAX_RADIUS are blocked", () => {
    const occupied = new Set<string>();
    for (let dX = -15; dX <= 15; dX++) {
      for (let dY = -15; dY <= 15; dY++) {
        occupied.add(`${dX},${dY}`);
      }
    }
    const grid = makeMoverGrid(occupied, 1);
    expect(findNearestValidCell(cell(0, 0), grid)).toBeNull();
  });

  it("works with negative coordinates", () => {
    const occupied = new Set(["-2,-2"]);
    const grid = makeMoverGrid(occupied, 1);
    const result = findNearestValidCell(cell(-2, -2), grid);
    expect(result).not.toBeNull();
    expect(Math.max(Math.abs(result!.x + 2), Math.abs(result!.y + 2))).toBe(1);
    expect(grid.isPassable(result!.x, result!.y)).toBe(true);
  });

  it("prefer: picks the ring-1 candidate closest to prefer, not top-left", () => {
    const occupied = new Set(["5,5"]);
    const grid = makeMoverGrid(occupied, 1);
    const result = findNearestValidCell(cell(5, 5), grid, cell(7, 7));
    expect(result).toEqual(cell(6, 6));
  });

  it("works with a larger mover (size=2) blocked by an obstacle", () => {
    const occupied = new Set(["5,5"]);
    const grid = makeMoverGrid(occupied, 2);
    expect(grid.isPassable(5, 5)).toBe(false);
    const result = findNearestValidCell(cell(5, 5), grid);
    expect(result).not.toBeNull();
    expect(grid.isPassable(result!.x, result!.y)).toBe(true);
  });
});

const openGrid = makeMoverGrid(new Set(), 1);

describe("findPath", () => {
  it("returns [] when start equals end", () => {
    expect(findPath(cell(0, 0), cell(0, 0), openGrid)).toEqual([]);
  });

  it("returns a single orthogonal step for adjacent cells", () => {
    const path = findPath(cell(0, 0), cell(1, 0), openGrid);
    expect(path).toEqual([cell(1, 0)]);
  });

  it("returns a single diagonal step for diagonally adjacent cells", () => {
    const path = findPath(cell(0, 0), cell(1, 1), openGrid);
    expect(path).toEqual([cell(1, 1)]);
  });

  it("path does not include the start cell", () => {
    const start = cell(2, 2);
    const end = cell(5, 5);
    const path = findPath(start, end, openGrid)!;
    expect(path[0]).not.toEqual(start);
  });

  it("path includes the end cell as the last element", () => {
    const end = cell(5, 3);
    const path = findPath(cell(0, 0), end, openGrid)!;
    expect(path[path.length - 1]).toEqual(end);
  });

  it("every consecutive pair in the path is at most 1 step apart", () => {
    const start = cell(0, 0);
    const path = findPath(start, cell(8, 5), openGrid)!;
    const full = [start, ...path];
    for (let index = 1; index < full.length; index++) {
      const dX = Math.abs(full[index].x - full[index - 1].x);
      const dY = Math.abs(full[index].y - full[index - 1].y);
      expect(dX).toBeLessThanOrEqual(1);
      expect(dY).toBeLessThanOrEqual(1);
    }
  });

  it("path length equals Chebyshev distance on an open grid", () => {
    const path = findPath(cell(0, 0), cell(5, 3), openGrid)!;
    expect(path.length).toBe(5);
  });

  it("navigates around a wall of obstacles", () => {
    const occupied = new Set<string>();
    for (let row = 0; row <= 4; row++) occupied.add(`2,${row}`);
    const grid = makeMoverGrid(occupied, 1);

    const path = findPath(cell(0, 2), cell(4, 2), grid);
    expect(path).not.toBeNull();
    for (const currentCell of path!) {
      expect(grid.isPassable(currentCell.x, currentCell.y)).toBe(true);
    }
    expect(path![path!.length - 1]).toEqual(cell(4, 2));
  });

  it("returns null when destination is completely surrounded by obstacles", () => {
    const occupied = new Set(["5,4", "5,6", "4,5", "6,5", "4,4", "4,6", "6,4", "6,6"]);
    const grid = makeMoverGrid(occupied, 1);
    expect(findPath(cell(0, 0), cell(5, 5), grid)).toBeNull();
  });

  it("handles negative cell coordinates", () => {
    const path = findPath(cell(-3, -3), cell(-1, -1), openGrid);
    expect(path).not.toBeNull();
    expect(path![path!.length - 1]).toEqual(cell(-1, -1));
  });

  it("diagonal clipping: blocks squeezing through a corner gap", () => {
    const occupied = new Set(["1,0", "0,1"]);
    const grid = makeMoverGrid(occupied, 1);
    const path = findPath(cell(0, 0), cell(1, 1), grid);
    if (path !== null) {
      expect(path.length).toBeGreaterThan(1);
    }
  });

  it("finds a path through an L-shaped corridor", () => {
    const occupied = new Set<string>();
    for (let col = 0; col <= 4; col++) occupied.add(`${col},1`);
    for (let row = 0; row <= 3; row++) occupied.add(`2,${row}`);
    const grid = makeMoverGrid(occupied, 1);

    const path = findPath(cell(0, 0), cell(3, 3), grid);
    expect(path).not.toBeNull();
    expect(path![path!.length - 1]).toEqual(cell(3, 3));
  });

  it("takes a straight path when intervening token is not in obstacles (group move)", () => {
    const occupied = buildOccupiedCells([]);
    const grid = makeMoverGrid(occupied, 1);
    const path = findPath(cell(0, 0), cell(4, 0), grid);
    expect(path).not.toBeNull();
    expect(path!.length).toBe(4);
    expect(path![path!.length - 1]).toEqual(cell(4, 0));
  });

  it("detours when intervening token IS in obstacles (non-group move)", () => {
    const occupied = buildOccupiedCells([{ position: { x: 2, y: 0 }, size: 1 }]);
    const grid = makeMoverGrid(occupied, 1);
    const path = findPath(cell(0, 0), cell(4, 0), grid);
    expect(path).not.toBeNull();
    expect(path!.some((currentCell) => currentCell.x === 2 && currentCell.y === 0)).toBe(false);
    for (const currentCell of path!) {
      expect(grid.isPassable(currentCell.x, currentCell.y)).toBe(true);
    }
  });
});
