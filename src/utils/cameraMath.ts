export type CameraState = {
  zoom: number
  panX: number
  panY: number
}

export type GridCell = {
  col: number
  row: number
}

export const MIN_CAMERA_ZOOM = 0.1
export const MAX_CAMERA_ZOOM = 8

export const clampZoom = (
  zoom: number,
  minZoom = MIN_CAMERA_ZOOM,
  maxZoom = MAX_CAMERA_ZOOM,
) => {
  if (!Number.isFinite(zoom)) {
    return 1
  }

  return Math.min(maxZoom, Math.max(minZoom, zoom))
}

export const screenToWorld = (
  screenX: number,
  screenY: number,
  camera: CameraState,
) => {
  const safeZoom = clampZoom(camera.zoom)

  return {
    x: screenX / safeZoom + camera.panX,
    y: screenY / safeZoom + camera.panY,
  }
}

export const worldToScreen = (
  worldX: number,
  worldY: number,
  camera: CameraState,
) => {
  const safeZoom = clampZoom(camera.zoom)

  return {
    x: (worldX - camera.panX) * safeZoom,
    y: (worldY - camera.panY) * safeZoom,
  }
}

export const worldToGridCell = (
  worldX: number,
  worldY: number,
  gridSize: number,
): GridCell => {
  const safeGridSize = Number.isFinite(gridSize) && gridSize > 0 ? gridSize : 32

  return {
    col: Math.floor(worldX / safeGridSize),
    row: Math.floor(worldY / safeGridSize),
  }
}

export const zoomAtScreenPoint = (
  camera: CameraState,
  screenX: number,
  screenY: number,
  nextZoom: number,
) => {
  const oldZoom = clampZoom(camera.zoom)
  const clampedNextZoom = clampZoom(nextZoom)

  if (oldZoom === clampedNextZoom) {
    return {
      ...camera,
      zoom: clampedNextZoom,
    }
  }

  const worldX = screenX / oldZoom + camera.panX
  const worldY = screenY / oldZoom + camera.panY

  return {
    zoom: clampedNextZoom,
    panX: worldX - screenX / clampedNextZoom,
    panY: worldY - screenY / clampedNextZoom,
  }
}
