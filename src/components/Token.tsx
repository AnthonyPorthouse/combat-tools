import { extend, useApplication } from '@pixi/react'
import { Assets, Circle, Container, Graphics, Matrix, Sprite, Text, TextStyle, Texture } from 'pixi.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CameraState } from '../utils/cameraMath'
import { screenToWorld, worldToGridCell, worldToScreen } from '../utils/cameraMath'
import type { Token } from '../types/token'
import type { Vector2 } from '../lib/vector2'

extend({ Container, Graphics, Sprite, Text })

/** Width of the border stroke drawn around a token, in screen pixels. */
const TOKEN_BORDER_WIDTH = 1

/**
 * Font size as a fraction of the token's rendered screen size.
 * Keeps text proportional as the user zooms in and out.
 */
const TOKEN_FONT_SCALE = 0.25

type TokenDisplayProps = {
  /** The token data to render. */
  token: Token
  /** Grid cell position of the token (x = col, y = row). */
  position: Vector2
  /** Width/height of a single grid cell in world-space units. */
  gridSize: number
  /** Current camera state used to transform world coordinates to screen space. */
  camera: CameraState
  /** Called when the token is dropped at a new grid cell. */
  onMove: (id: string, newPosition: Vector2) => void
  /** Called when the pointer enters or leaves the token. */
  onHoverChange?: (name: string | null) => void
}

/**
 * Renders a single combat token on the PixiJS canvas as a circle.
 *
 * Tokens are positioned in world space and drawn above the grid layer.
 * They snap to the grid on drop. Tokens with `size >= 1` align their
 * top-left corner to the cell origin, while tokens with `size === 0.5`
 * are centred within the cell.
 *
 * When an `image` URL is supplied the token renders as a circle with
 * cover-filled texture. Otherwise the token's name is displayed in black
 * text on a white circle.
 *
 * During drag a 50% transparent ghost clone follows the cursor exactly
 * (no grid snapping). The original token stays at its committed position.
 * On pointer up the ghost disappears and the token commits to the grid
 * cell under the cursor.
 */
export const TokenDisplay = ({
  token,
  position,
  gridSize,
  camera,
  onMove,
  onHoverChange,
}: TokenDisplayProps) => {
  const { app } = useApplication()
  const [texture, setTexture] = useState<Texture | null>(null)
  const isDraggingRef = useRef(false)
  const [dragScreenPos, setDragScreenPos] = useState<{ x: number; y: number } | null>(null)
  const dragScreenPosRef = useRef<{ x: number; y: number } | null>(null)

  // Keep stable refs so stage handlers always use the latest values without
  // needing to be re-registered when props change.
  const cameraRef = useRef(camera)
  const gridSizeRef = useRef(gridSize)
  const positionRef = useRef(position)
  const onMoveRef = useRef(onMove)
  const tokenIdRef = useRef(token.id)

  useEffect(() => { cameraRef.current = camera }, [camera])
  useEffect(() => { gridSizeRef.current = gridSize }, [gridSize])
  useEffect(() => { positionRef.current = position }, [position])
  useEffect(() => { onMoveRef.current = onMove }, [onMove])
  useEffect(() => { tokenIdRef.current = token.id }, [token.id])

  // Load the portrait image asynchronously; fall back to the name display on failure.
  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (!token.image) {
        setTexture(null)
        return
      }
      try {
        const loaded = await Assets.load<Texture>(token.image)
        if (!cancelled) setTexture(loaded)
      } catch {
        if (!cancelled) setTexture(null)
      }
    }

    load()

    return () => { cancelled = true }
  }, [token.image])

  const tokenWorldSize = gridSize * token.size

  const worldX =
    token.size === 0.5
      ? position.x * gridSize + (gridSize - tokenWorldSize) / 2
      : position.x * gridSize

  const worldY =
    token.size === 0.5
      ? position.y * gridSize + (gridSize - tokenWorldSize) / 2
      : position.y * gridSize

  const { x: screenX, y: screenY } = worldToScreen(worldX, worldY, camera)
  const screenSize = tokenWorldSize * camera.zoom
  const screenRadius = screenSize / 2
  const fontSize = Math.max(8, Math.round(screenSize * TOKEN_FONT_SCALE))

  const hitArea = useMemo(() => new Circle(screenRadius, screenRadius, screenRadius), [screenRadius])

  const drawCircle = useCallback(
    (g: Graphics) => {
      g.clear()
      if (texture) {
        const s = Math.max(screenSize / texture.width, screenSize / texture.height)
        const offsetX = (screenSize - texture.width * s) / 2
        const offsetY = (screenSize - texture.height * s) / 2
        const matrix = new Matrix(1 / s, 0, 0, 1 / s, -offsetX / s, -offsetY / s)
        g.setFillStyle({ texture, matrix })
      } else {
        g.setFillStyle({ color: 0xffffff })
      }
      g.setStrokeStyle({ width: TOKEN_BORDER_WIDTH, color: 0x000000 })
      g.circle(screenRadius, screenRadius, screenRadius)
      g.fill()
      g.stroke()
    },
    [texture, screenSize, screenRadius],
  )

  const textStyle = useMemo(
    () =>
      new TextStyle({
        fill: 0x000000,
        fontSize,
        wordWrap: true,
        wordWrapWidth: screenSize * 0.9,
        align: 'center',
      }),
    [fontSize, screenSize],
  )

  // Register stage-level pointer handlers once on mount. Handlers check
  // isDraggingRef so they're no-ops when this token isn't being dragged,
  // avoiding any race condition with React state updates.
  useEffect(() => {
    if (!app) return

    const onGlobalPointerMove = (e: { global: { x: number; y: number } }) => {
      if (!isDraggingRef.current) return
      const pos = { x: e.global.x, y: e.global.y }
      dragScreenPosRef.current = pos
      setDragScreenPos(pos)
    }

    const onPointerUp = () => {
      if (!isDraggingRef.current) return
      const screenPos = dragScreenPosRef.current
      const finalPos: Vector2 = screenPos
        ? (() => {
            const world = screenToWorld(screenPos.x, screenPos.y, cameraRef.current)
            const cell = worldToGridCell(world.x, world.y, gridSizeRef.current)
            return { x: cell.col, y: cell.row }
          })()
        : positionRef.current

      onMoveRef.current(tokenIdRef.current, finalPos)
      isDraggingRef.current = false
      dragScreenPosRef.current = null
      setDragScreenPos(null)
    }

    app.stage.on('globalpointermove', onGlobalPointerMove)
    app.stage.on('pointerup', onPointerUp)
    app.stage.on('pointerupoutside', onPointerUp)

    return () => {
      app.stage.off('globalpointermove', onGlobalPointerMove)
      app.stage.off('pointerup', onPointerUp)
      app.stage.off('pointerupoutside', onPointerUp)
    }
  }, [app])

  const handlePointerDown = useCallback((e: {
    button: number
    stopPropagation: () => void
    global: { x: number; y: number }
  }) => {
    if (e.button !== 0) return
    e.stopPropagation()
    isDraggingRef.current = true
    dragScreenPosRef.current = { x: e.global.x, y: e.global.y }
    setDragScreenPos({ x: e.global.x, y: e.global.y })
  }, [])

  const nameLabel = !texture ? (
    <pixiText
      text={token.name}
      x={screenRadius}
      y={screenRadius}
      anchor={0.5}
      style={textStyle}
    />
  ) : null

  return (
    <pixiContainer eventMode='passive'>
      {/* Original token — stays at its committed grid position */}
      <pixiContainer
        x={screenX}
        y={screenY}
        eventMode='static'
        cursor='pointer'
        hitArea={hitArea}
        onPointerDown={handlePointerDown}
        onPointerOver={() => onHoverChange?.(token.name)}
        onPointerOut={() => onHoverChange?.(null)}
      >
        <pixiGraphics draw={drawCircle} />
        {nameLabel}
      </pixiContainer>

      {/* Ghost — follows cursor exactly, 50% alpha, no events */}
      {dragScreenPos && (
        <pixiContainer
          x={dragScreenPos.x - screenRadius}
          y={dragScreenPos.y - screenRadius}
          alpha={0.5}
          eventMode='none'
        >
          <pixiGraphics draw={drawCircle} />
          {nameLabel}
        </pixiContainer>
      )}
    </pixiContainer>
  )
}
