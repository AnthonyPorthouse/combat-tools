import { describe, it, expect } from "vitest";

import {
  clampZoom,
  screenToWorld,
  worldToScreen,
  worldToGridCell,
  zoomAtScreenPoint,
  MIN_CAMERA_ZOOM,
  MAX_CAMERA_ZOOM,
  type CameraState,
} from "./cameraMath";

const identityCamera: CameraState = { zoom: 1, pan: { x: 0, y: 0 } };

describe("clampZoom", () => {
  it("returns the value unchanged when within range", () => {
    expect(clampZoom(1)).toBe(1);
    expect(clampZoom(MIN_CAMERA_ZOOM)).toBe(MIN_CAMERA_ZOOM);
    expect(clampZoom(MAX_CAMERA_ZOOM)).toBe(MAX_CAMERA_ZOOM);
  });

  it("clamps values below the minimum to the minimum", () => {
    expect(clampZoom(0)).toBe(MIN_CAMERA_ZOOM);
    expect(clampZoom(-5)).toBe(MIN_CAMERA_ZOOM);
  });

  it("clamps values above the maximum to the maximum", () => {
    expect(clampZoom(100)).toBe(MAX_CAMERA_ZOOM);
    expect(clampZoom(MAX_CAMERA_ZOOM + 1)).toBe(MAX_CAMERA_ZOOM);
  });

  it("returns 1 for NaN", () => {
    expect(clampZoom(Number.NaN)).toBe(1);
  });

  it("returns 1 for Infinity (non-finite guard)", () => {
    expect(clampZoom(Infinity)).toBe(1);
  });

  it("returns 1 for -Infinity (non-finite guard)", () => {
    expect(clampZoom(-Infinity)).toBe(1);
  });

  it("respects custom min and max bounds", () => {
    expect(clampZoom(0.5, 1, 3)).toBe(1);
    expect(clampZoom(5, 1, 3)).toBe(3);
    expect(clampZoom(2, 1, 3)).toBe(2);
  });
});

describe("screenToWorld", () => {
  it("returns screen coords unchanged for an identity camera", () => {
    const result = screenToWorld({ x: 100, y: 200 }, identityCamera);
    expect(result).toEqual({ x: 100, y: 200 });
  });

  it("divides screen coords by zoom", () => {
    const camera: CameraState = { zoom: 2, pan: { x: 0, y: 0 } };
    const result = screenToWorld({ x: 100, y: 200 }, camera);
    expect(result).toEqual({ x: 50, y: 100 });
  });

  it("adds pan offset to the result", () => {
    const camera: CameraState = { zoom: 1, pan: { x: 50, y: 75 } };
    const result = screenToWorld({ x: 100, y: 200 }, camera);
    expect(result).toEqual({ x: 150, y: 275 });
  });

  it("applies zoom and pan together", () => {
    const camera: CameraState = { zoom: 2, pan: { x: 10, y: 20 } };
    const result = screenToWorld({ x: 100, y: 200 }, camera);
    // screenX / zoom + panX = 100/2 + 10 = 60
    // screenY / zoom + panY = 200/2 + 20 = 120
    expect(result).toEqual({ x: 60, y: 120 });
  });
});

describe("worldToScreen", () => {
  it("returns world coords unchanged for an identity camera", () => {
    const result = worldToScreen({ x: 100, y: 200 }, identityCamera);
    expect(result).toEqual({ x: 100, y: 200 });
  });

  it("multiplies world coords by zoom", () => {
    const camera: CameraState = { zoom: 2, pan: { x: 0, y: 0 } };
    const result = worldToScreen({ x: 50, y: 100 }, camera);
    expect(result).toEqual({ x: 100, y: 200 });
  });

  it("subtracts pan before applying zoom", () => {
    const camera: CameraState = { zoom: 1, pan: { x: 50, y: 75 } };
    const result = worldToScreen({ x: 150, y: 275 }, camera);
    expect(result).toEqual({ x: 100, y: 200 });
  });

  it("is the inverse of screenToWorld", () => {
    const camera: CameraState = { zoom: 2, pan: { x: 10, y: 20 } };
    const screen = { x: 100, y: 200 };
    const world = screenToWorld(screen, camera);
    const backToScreen = worldToScreen(world, camera);
    expect(backToScreen.x).toBeCloseTo(screen.x);
    expect(backToScreen.y).toBeCloseTo(screen.y);
  });
});

describe("worldToGridCell", () => {
  it("maps world (0, 0) to cell (0, 0)", () => {
    expect(worldToGridCell({ x: 0, y: 0 }, 64)).toEqual({ col: 0, row: 0 });
  });

  it("rounds fractional world coords to the nearest cell", () => {
    // 63.9 / 64 ≈ 0.998 — rounds up to cell 1
    expect(worldToGridCell({ x: 63.9, y: 63.9 }, 64)).toEqual({ col: 1, row: 1 });
    // Exactly on a cell boundary
    expect(worldToGridCell({ x: 64, y: 64 }, 64)).toEqual({ col: 1, row: 1 });
    // 128.5 / 64 ≈ 2.008, 192.7 / 64 ≈ 3.011 — both round to nearest
    expect(worldToGridCell({ x: 128.5, y: 192.7 }, 64)).toEqual({ col: 2, row: 3 });
  });

  it("snaps to the closer cell at the midpoint boundary (positive)", () => {
    // 31.9 / 64 ≈ 0.498 — just below midpoint, stays in cell 0
    expect(worldToGridCell({ x: 31.9, y: 31.9 }, 64)).toEqual({ col: 0, row: 0 });
    // 32 / 64 = 0.5 exactly — Math.round rounds towards +Infinity, so cell 1
    expect(worldToGridCell({ x: 32, y: 32 }, 64)).toEqual({ col: 1, row: 1 });
    // 32.1 / 64 ≈ 0.502 — just past midpoint, rounds to cell 1
    expect(worldToGridCell({ x: 32.1, y: 32.1 }, 64)).toEqual({ col: 1, row: 1 });
  });

  it("handles negative world coordinates (rounds to nearest cell)", () => {
    // -1 / 64 ≈ -0.016 — close to 0, rounds to cell 0
    expect(worldToGridCell({ x: -1, y: -1 }, 64)).toEqual({ col: 0, row: 0 });
    // Exactly on a negative cell boundary
    expect(worldToGridCell({ x: -64, y: -64 }, 64)).toEqual({ col: -1, row: -1 });
    // -65 / 64 ≈ -1.016 — just past -1, rounds to cell -1
    expect(worldToGridCell({ x: -65, y: -65 }, 64)).toEqual({ col: -1, row: -1 });
  });

  it("snaps to the closer cell at the midpoint boundary (negative)", () => {
    // -31.9 / 64 ≈ -0.498 — just below midpoint magnitude, rounds to cell 0
    expect(worldToGridCell({ x: -31.9, y: -31.9 }, 64)).toEqual({ col: 0, row: 0 });
    // -32 / 64 = -0.5 exactly — Math.round rounds towards +Infinity, so cell 0 (not -1)
    expect(worldToGridCell({ x: -32, y: -32 }, 64)).toEqual({ col: 0, row: 0 });
    // -32.1 / 64 ≈ -0.502 — just past negative midpoint, rounds to cell -1
    expect(worldToGridCell({ x: -32.1, y: -32.1 }, 64)).toEqual({ col: -1, row: -1 });
  });

  it("falls back to gridSize 32 when gridSize is zero", () => {
    expect(worldToGridCell({ x: 32, y: 64 }, 0)).toEqual({ col: 1, row: 2 });
  });

  it("falls back to gridSize 32 when gridSize is negative", () => {
    expect(worldToGridCell({ x: 32, y: 64 }, -10)).toEqual({ col: 1, row: 2 });
  });

  it("falls back to gridSize 32 when gridSize is NaN", () => {
    expect(worldToGridCell({ x: 32, y: 64 }, Number.NaN)).toEqual({ col: 1, row: 2 });
  });
});

describe("zoomAtScreenPoint", () => {
  it("returns the same camera state (with clamped zoom) when zoom is unchanged", () => {
    const camera: CameraState = { zoom: 2, pan: { x: 10, y: 20 } };
    const result = zoomAtScreenPoint(camera, { x: 100, y: 100 }, 2);
    expect(result).toEqual({ ...camera, zoom: 2 });
  });

  it("preserves the world point under the screen point when zooming in", () => {
    const camera: CameraState = { zoom: 1, pan: { x: 0, y: 0 } };
    const screen = { x: 200, y: 150 };

    const worldBefore = screenToWorld(screen, camera);
    const newCamera = zoomAtScreenPoint(camera, screen, 2);
    const worldAfter = screenToWorld(screen, newCamera);

    expect(worldAfter.x).toBeCloseTo(worldBefore.x);
    expect(worldAfter.y).toBeCloseTo(worldBefore.y);
  });

  it("preserves the world point under the screen point when zooming out", () => {
    const camera: CameraState = { zoom: 4, pan: { x: 50, y: 50 } };
    const screen = { x: 300, y: 200 };

    const worldBefore = screenToWorld(screen, camera);
    const newCamera = zoomAtScreenPoint(camera, screen, 2);
    const worldAfter = screenToWorld(screen, newCamera);

    expect(worldAfter.x).toBeCloseTo(worldBefore.x);
    expect(worldAfter.y).toBeCloseTo(worldBefore.y);
  });

  it("clamps the resulting zoom to MIN_CAMERA_ZOOM", () => {
    const camera: CameraState = { zoom: 1, pan: { x: 0, y: 0 } };
    const result = zoomAtScreenPoint(camera, { x: 0, y: 0 }, 0);
    expect(result.zoom).toBe(MIN_CAMERA_ZOOM);
  });

  it("clamps the resulting zoom to MAX_CAMERA_ZOOM", () => {
    const camera: CameraState = { zoom: 1, pan: { x: 0, y: 0 } };
    const result = zoomAtScreenPoint(camera, { x: 0, y: 0 }, 9999);
    expect(result.zoom).toBe(MAX_CAMERA_ZOOM);
  });
});
