import { useApplication } from '@pixi/react'
import { FederatedPointerEvent, Graphics } from 'pixi.js'
import { useCallback, useEffect, useState } from 'react'
import { screenToWorld, worldToScreen, type CameraState } from '../utils/cameraMath'

type CursorTrackerProps = {
  camera: CameraState
}

export const CursorTracker = ({ camera }: CursorTrackerProps) => {
  const [screenCursorPos, setScreenCursorPos] = useState({ x: 0, y: 0 })
  const { app } = useApplication()

  useEffect(() => {
    const handlePointerMove = (event: FederatedPointerEvent) => {
      setScreenCursorPos({ x: event.global.x, y: event.global.y })
    }

    app.stage.on('globalpointermove', handlePointerMove)

    return () => {
      app.stage.off('globalpointermove', handlePointerMove)
    }
  }, [app])

  const drawCallback = useCallback((graphics: Graphics) => {
    const worldCursorPos = screenToWorld(screenCursorPos.x, screenCursorPos.y, camera)
    const drawPos = worldToScreen(worldCursorPos.x, worldCursorPos.y, camera)

    graphics.clear()
    graphics.setFillStyle({ color: 'red' })
    graphics.rect(drawPos.x - 5, drawPos.y - 5, 10, 10)
    graphics.fill()
  }, [camera, screenCursorPos.x, screenCursorPos.y])

  return <pixiGraphics draw={drawCallback} />
}
