import { useCallback, useState } from 'react'
import {
  clampZoom,
  MAX_CAMERA_ZOOM,
  MIN_CAMERA_ZOOM,
  zoomAtScreenPoint,
  type CameraState,
} from '../utils/cameraMath'

export type UseCameraOptions = {
  initialZoom?: number
  initialPanX?: number
  initialPanY?: number
  minZoom?: number
  maxZoom?: number
}

export const useCamera = ({
  initialZoom = 1,
  initialPanX = 0,
  initialPanY = 0,
  minZoom = MIN_CAMERA_ZOOM,
  maxZoom = MAX_CAMERA_ZOOM,
}: UseCameraOptions = {}) => {
  const [camera, setCamera] = useState<CameraState>(() => ({
    zoom: clampZoom(initialZoom, minZoom, maxZoom),
    panX: initialPanX,
    panY: initialPanY,
  }))

  const setPan = useCallback((panX: number, panY: number) => {
    setCamera((current) => ({
      ...current,
      panX,
      panY,
    }))
  }, [])

  const panBy = useCallback((deltaX: number, deltaY: number) => {
    setCamera((current) => ({
      ...current,
      panX: current.panX + deltaX,
      panY: current.panY + deltaY,
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
    (screenX: number, screenY: number, zoom: number) => {
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
          screenX,
          screenY,
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
