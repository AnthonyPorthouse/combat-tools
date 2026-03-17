import { extend } from '@pixi/react'
import { Assets, Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CameraState } from '../utils/cameraMath'
import { worldToScreen } from '../utils/cameraMath'
import type { Token } from '../types/token'

extend({ Container, Graphics, Sprite, Text })

/** Width of the border stroke drawn around a name-only token, in screen pixels. */
const TOKEN_BORDER_WIDTH = 1

/**
 * Font size as a fraction of the token's rendered screen size.
 * Keeps text proportional as the user zooms in and out.
 */
const TOKEN_FONT_SCALE = 0.25

type TokenDisplayProps = {
  /** The token data to render. */
  token: Token
  /** Column of the grid square the token occupies (0-based). */
  gridCol: number
  /** Row of the grid square the token occupies (0-based). */
  gridRow: number
  /** Width/height of a single grid cell in world-space units. */
  gridSize: number
  /** Current camera state used to transform world coordinates to screen space. */
  camera: CameraState
}

/**
 * Renders a single combat token on the PixiJS canvas.
 *
 * Tokens are positioned in world space and drawn above the grid layer.
 * They snap to the grid: tokens with `size >= 1` align their top-left corner
 * to the cell origin, while tokens with `size === 0.5` are centred within the
 * cell to prevent them from obscuring grid lines.
 *
 * When an `image` URL is supplied the token renders as a sprite filling its
 * bounding box. Otherwise the token's name is displayed in black text on a
 * white background, sized to fit the token's screen area.
 */
export const TokenDisplay = ({
  token,
  gridCol,
  gridRow,
  gridSize,
  camera,
}: TokenDisplayProps) => {
  const [texture, setTexture] = useState<Texture | null>(null)

  // Load the portrait image asynchronously; fall back to the name display on failure.
  useEffect(() => {
    if (!token.image) {
      setTexture(null)
      return
    }

    let cancelled = false

    Assets.load<Texture>(token.image)
      .then((loaded) => {
        if (!cancelled) setTexture(loaded)
      })
      .catch(() => {
        if (!cancelled) setTexture(null)
      })

    return () => {
      cancelled = true
    }
  }, [token.image])

  const tokenWorldSize = gridSize * token.size

  /*
   * Position the token's top-left corner in world space.
   *
   * Size 0.5 tokens are centred inside the target cell so they sit in the
   * middle of the square rather than at its origin. Larger tokens start at
   * the cell's top-left and expand outward.
   */
  const worldX =
    token.size === 0.5
      ? gridCol * gridSize + (gridSize - tokenWorldSize) / 2
      : gridCol * gridSize

  const worldY =
    token.size === 0.5
      ? gridRow * gridSize + (gridSize - tokenWorldSize) / 2
      : gridRow * gridSize

  const { x: screenX, y: screenY } = worldToScreen(worldX, worldY, camera)
  const screenSize = tokenWorldSize * camera.zoom
  const fontSize = Math.max(8, Math.round(screenSize * TOKEN_FONT_SCALE))

  const drawBackground = useCallback(
    (g: Graphics) => {
      g.clear()
      g.setFillStyle({ color: 0xffffff })
      g.setStrokeStyle({ width: TOKEN_BORDER_WIDTH, color: 0x000000 })
      g.rect(0, 0, screenSize, screenSize)
      g.fill()
      g.stroke()
    },
    [screenSize],
  )

  // Memoise the TextStyle to avoid recreating it on every render cycle.
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

  return (
    <pixiContainer x={screenX} y={screenY}>
      {texture ? (
        <pixiSprite texture={texture} width={screenSize} height={screenSize} />
      ) : (
        <>
          <pixiGraphics draw={drawBackground} />
          <pixiText
            text={token.name}
            x={screenSize / 2}
            y={screenSize / 2}
            anchor={0.5}
            style={textStyle}
          />
        </>
      )}
    </pixiContainer>
  )
}
