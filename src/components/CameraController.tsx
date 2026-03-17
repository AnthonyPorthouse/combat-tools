import { useApplication } from '@pixi/react'
import { FederatedPointerEvent } from 'pixi.js'
import { useEffect, useRef } from 'react'
import type { CameraState } from '../utils/cameraMath'

type CameraControllerProps = {
  camera: CameraState
  panBy: (deltaX: number, deltaY: number) => void
  zoomAt: (screenX: number, screenY: number, zoom: number) => void
}

const SCREEN_PAN_SPEED = 700
const WHEEL_ZOOM_SENSITIVITY = 0.0015

export const CameraController = ({
  camera,
  panBy,
  zoomAt,
}: CameraControllerProps) => {
  const { app } = useApplication()
  const draggingRef = useRef(false)
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null)
  const activeKeysRef = useRef(new Set<string>())

  useEffect(() => {
    const stopDrag = () => {
      draggingRef.current = false
      lastPointerRef.current = null
    }

    const handlePointerDown = (event: FederatedPointerEvent) => {
      if (event.button !== 2) {
        return
      }

      draggingRef.current = true
      lastPointerRef.current = {
        x: event.global.x,
        y: event.global.y,
      }
    }

    const handlePointerMove = (event: FederatedPointerEvent) => {
      if (!draggingRef.current || !lastPointerRef.current) {
        return
      }

      const deltaX = event.global.x - lastPointerRef.current.x
      const deltaY = event.global.y - lastPointerRef.current.y

      if (deltaX !== 0 || deltaY !== 0) {
        panBy(-deltaX / camera.zoom, -deltaY / camera.zoom)
      }

      lastPointerRef.current = {
        x: event.global.x,
        y: event.global.y,
      }
    }

    app.stage.on('pointerdown', handlePointerDown)
    app.stage.on('globalpointermove', handlePointerMove)
    app.stage.on('pointerup', stopDrag)
    app.stage.on('pointerupoutside', stopDrag)

    return () => {
      app.stage.off('pointerdown', handlePointerDown)
      app.stage.off('globalpointermove', handlePointerMove)
      app.stage.off('pointerup', stopDrag)
      app.stage.off('pointerupoutside', stopDrag)
    }
  }, [app, camera.zoom, panBy])

  useEffect(() => {
    if (!app) return
    const view = app.canvas as HTMLCanvasElement | undefined
    if (!view) return
    const suppress = (e: MouseEvent) => e.preventDefault()
    view.addEventListener('contextmenu', suppress)
    return () => view.removeEventListener('contextmenu', suppress)
  }, [app])

  useEffect(() => {
    if (!app) return
    const view = app.canvas as HTMLCanvasElement | undefined

    if (!view) {
      return
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()

      const bounds = view.getBoundingClientRect()
      const screenX = event.clientX - bounds.left
      const screenY = event.clientY - bounds.top
      const zoomFactor = Math.exp(-event.deltaY * WHEEL_ZOOM_SENSITIVITY)

      zoomAt(screenX, screenY, camera.zoom * zoomFactor)
    }

    view.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      view.removeEventListener('wheel', handleWheel)
    }
  }, [app, camera.zoom, zoomAt])

  useEffect(() => {
    const keys = activeKeysRef.current

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault()
      }

      keys.add(event.code)
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      keys.delete(event.code)
    }

    const handleBlur = () => {
      keys.clear()
    }

    const tick = () => {
      if (keys.size === 0) {
        return
      }

      let xAxis = 0
      let yAxis = 0

      if (keys.has('KeyA') || keys.has('ArrowLeft')) {
        xAxis -= 1
      }

      if (keys.has('KeyD') || keys.has('ArrowRight')) {
        xAxis += 1
      }

      if (keys.has('KeyW') || keys.has('ArrowUp')) {
        yAxis -= 1
      }

      if (keys.has('KeyS') || keys.has('ArrowDown')) {
        yAxis += 1
      }

      if (xAxis === 0 && yAxis === 0) {
        return
      }

      const length = Math.hypot(xAxis, yAxis) || 1
      const normalizedX = xAxis / length
      const normalizedY = yAxis / length
      const deltaSeconds = app.ticker.deltaMS / 1000
      const worldStep = (SCREEN_PAN_SPEED * deltaSeconds) / camera.zoom

      panBy(normalizedX * worldStep, normalizedY * worldStep)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)
    app.ticker.add(tick)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
      app.ticker.remove(tick)
    }
  }, [app, camera.zoom, panBy])

  return null
}
