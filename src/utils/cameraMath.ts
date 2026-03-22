import type { Vector2 } from "../lib/vector2";

export type CameraState = {
  zoom: number;
  pan: Vector2;
};

export type GridCell = {
  col: number;
  row: number;
};

export const MIN_CAMERA_ZOOM = 0.1;
export const MAX_CAMERA_ZOOM = 8;

export const clampZoom = (zoom: number, minZoom = MIN_CAMERA_ZOOM, maxZoom = MAX_CAMERA_ZOOM) => {
  if (!Number.isFinite(zoom)) {
    return 1;
  }

  return Math.min(maxZoom, Math.max(minZoom, zoom));
};

export const screenToWorld = (screen: Vector2, camera: CameraState): Vector2 => {
  const safeZoom = clampZoom(camera.zoom);

  return {
    x: screen.x / safeZoom + camera.pan.x,
    y: screen.y / safeZoom + camera.pan.y,
  };
};

export const worldToScreen = (world: Vector2, camera: CameraState): Vector2 => {
  const safeZoom = clampZoom(camera.zoom);

  return {
    x: (world.x - camera.pan.x) * safeZoom,
    y: (world.y - camera.pan.y) * safeZoom,
  };
};

export const worldToGridCell = (world: Vector2, gridSize: number): GridCell => {
  const safeGridSize = Number.isFinite(gridSize) && gridSize > 0 ? gridSize : 32;

  return {
    col: Math.round(world.x / safeGridSize) || 0,
    row: Math.round(world.y / safeGridSize) || 0,
  };
};

export const zoomAtScreenPoint = (
  camera: CameraState,
  screen: Vector2,
  nextZoom: number,
): CameraState => {
  const oldZoom = clampZoom(camera.zoom);
  const clampedNextZoom = clampZoom(nextZoom);

  if (oldZoom === clampedNextZoom) {
    return {
      ...camera,
      zoom: clampedNextZoom,
    };
  }

  const worldX = screen.x / oldZoom + camera.pan.x;
  const worldY = screen.y / oldZoom + camera.pan.y;

  return {
    zoom: clampedNextZoom,
    pan: {
      x: worldX - screen.x / clampedNextZoom,
      y: worldY - screen.y / clampedNextZoom,
    },
  };
};
