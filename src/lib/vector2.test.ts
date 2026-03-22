import { describe, it, expect } from "vitest";
import { addVector2, subtractVector2 } from "./vector2";

describe("addVector2", () => {
  it("adds two vectors component-wise", () => {
    expect(addVector2({ x: 1, y: 2 }, { x: 3, y: 4 })).toEqual({ x: 4, y: 6 });
  });

  it("returns the same vector when adding zero", () => {
    expect(addVector2({ x: 5, y: -3 }, { x: 0, y: 0 })).toEqual({ x: 5, y: -3 });
  });

  it("handles negative values", () => {
    expect(addVector2({ x: -1, y: -2 }, { x: -3, y: -4 })).toEqual({ x: -4, y: -6 });
  });

  it("handles mixed positive and negative values", () => {
    expect(addVector2({ x: 10, y: -5 }, { x: -3, y: 8 })).toEqual({ x: 7, y: 3 });
  });
});

describe("subtractVector2", () => {
  it("subtracts two vectors component-wise", () => {
    expect(subtractVector2({ x: 5, y: 7 }, { x: 2, y: 3 })).toEqual({ x: 3, y: 4 });
  });

  it("returns the same vector when subtracting zero", () => {
    expect(subtractVector2({ x: 5, y: -3 }, { x: 0, y: 0 })).toEqual({ x: 5, y: -3 });
  });

  it("returns zero vector when subtracting itself", () => {
    expect(subtractVector2({ x: 4, y: 9 }, { x: 4, y: 9 })).toEqual({ x: 0, y: 0 });
  });

  it("handles negative results", () => {
    expect(subtractVector2({ x: 1, y: 2 }, { x: 5, y: 8 })).toEqual({ x: -4, y: -6 });
  });

  it("handles negative input values", () => {
    expect(subtractVector2({ x: -3, y: -4 }, { x: -1, y: -2 })).toEqual({ x: -2, y: -2 });
  });
});
