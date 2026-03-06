import { useEffect, useMemo, useState, type RefObject } from 'react'
import {
  screenToWorld,
  worldToGridCell,
  type CameraState,
  type GridCell,
} from '../utils/cameraMath'

type UseDebuggerOverlayOptions = {
  camera: CameraState
  gridSize?: number
  containerRef: RefObject<HTMLElement | null>
}

type ScreenPosition = {
  x: number
  y: number
}

export const useDebuggerOverlay = ({
  camera,
  gridSize = 32,
  containerRef,
}: UseDebuggerOverlayOptions) => {
  const [screenPosition, setScreenPosition] = useState<ScreenPosition | null>(null)

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const container = containerRef.current
      const canvas = container?.querySelector('canvas')

      if (!canvas) {
        setScreenPosition(null)
        return
      }

      const rect = canvas.getBoundingClientRect()
      const isInsideX = event.clientX >= rect.left && event.clientX <= rect.right
      const isInsideY = event.clientY >= rect.top && event.clientY <= rect.bottom

      if (!isInsideX || !isInsideY) {
        setScreenPosition(null)
        return
      }

      setScreenPosition({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      })
    }

    window.addEventListener('pointermove', handlePointerMove)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
    }
  }, [containerRef])

  const gridCell: GridCell | null = useMemo(() => {
    if (!screenPosition) {
      return null
    }

    const world = screenToWorld(screenPosition.x, screenPosition.y, camera)
    return worldToGridCell(world.x, world.y, gridSize)
  }, [camera, gridSize, screenPosition])

  return {
    gridCell,
  }
}
