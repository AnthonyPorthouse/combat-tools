import { useCallback, useState } from 'react'
import {
  clampZoom,
  MAX_CAMERA_ZOOM,
  MIN_CAMERA_ZOOM,
  zoomAtScreenPoint,
  type CameraState,
} from '../utils/cameraMath'
import type { Vector2 } from '../lib/vector2'

export type UseCameraOptions = {
  initialZoom?: number
  initialPan?: Vector2
  minZoom?: number
  maxZoom?: number
}

export const useCamera = ({
  initialZoom = 1,
  initialPan = { x: 0, y: 0 },
  minZoom = MIN_CAMERA_ZOOM,
  maxZoom = MAX_CAMERA_ZOOM,
}: UseCameraOptions = {}) => {
  const [camera, setCamera] = useState<CameraState>(() => ({
    zoom: clampZoom(initialZoom, minZoom, maxZoom),
    pan: initialPan,
  }))

  const setPan = useCallback((pan: Vector2) => {
    setCamera((current) => ({
      ...current,
      pan,
    }))
  }, [])

  const panBy = useCallback((delta: Vector2) => {
    setCamera((current) => ({
      ...current,
      pan: { x: current.pan.x + delta.x, y: current.pan.y + delta.y },
    }))
  }, [])

  const setZoom = useCallback(
    (zoom: number) => {
      setCamera((current) => ({
        ...current,
        zoom: clampZoom(zoom, minZoom, maxZoom),
      }))
    },
    [maxZoom, minZoom],
  )

  const zoomAt = useCallback(
    (screen: Vector2, zoom: number) => {
      setCamera((current) => {
        const oldZoom = clampZoom(current.zoom, minZoom, maxZoom)
        const nextZoom = clampZoom(zoom, minZoom, maxZoom)

        if (oldZoom === nextZoom) {
          return {
            ...current,
            zoom: nextZoom,
          }
        }

        return zoomAtScreenPoint(
          {
            ...current,
            zoom: oldZoom,
          },
          screen,
          nextZoom,
        )
      })
    },
    [maxZoom, minZoom],
  )

  return {
    camera,
    setPan,
    panBy,
    setZoom,
    zoomAt,
    minZoom,
    maxZoom,
  }
}
