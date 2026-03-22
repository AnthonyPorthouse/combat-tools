import { extend, useApplication } from "@pixi/react";
import { Circle, Container, Graphics, Sprite, Text, TextStyle } from "pixi.js";
import { useCallback, useMemo } from "react";
import { worldToScreen } from "../utils/cameraMath";
import type { Token } from "../types/token";
import type { Vector2 } from "../lib/vector2";
import { useCamera } from "../hooks/useCamera";
import { useTokenTexture } from "../hooks/useTokenTexture";
import { useTokenDrag } from "../hooks/useTokenDrag";

extend({ Container, Graphics, Sprite, Text });

/** Width of the border stroke drawn around a token, in screen pixels. */
const TOKEN_BORDER_WIDTH = 1;

/**
 * Font size as a fraction of the token's rendered screen size.
 * Keeps text proportional as the user zooms in and out.
 */
const TOKEN_FONT_SCALE = 0.25;

type TokenDisplayProps = {
  /** The token data to render. */
  token: Token;
  /** Grid cell position of the token (x = col, y = row). */
  position: Vector2;
  /** Width/height of a single grid cell in world-space units. */
  gridSize: number;
  /** Called when the token is dropped at a new grid cell. */
  onMove: (id: string, newPosition: Vector2) => void;
  /** Called when the pointer enters or leaves the token. */
  onHoverChange?: (name: string | null) => void;
};

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
 * During drag a 50% transparent ghost clone follows the cursor while
 * preserving the offset from where the drag started within the token.
 * A snapped blue rectangle shows the grid-aligned cell(s) where the token
 * will land, based on the ghost's top-left corner. The original token stays
 * at its committed position until drop.
 */
export const TokenDisplay = ({
  token,
  position,
  gridSize,
  onMove,
  onHoverChange,
}: TokenDisplayProps) => {
  const { app } = useApplication();
  const { camera } = useCamera();

  const { texture } = useTokenTexture({ imageUrl: token.image });

  const tokenWorldSize = gridSize * token.size;

  const worldX =
    token.size === 0.5
      ? position.x * gridSize + (gridSize - tokenWorldSize) / 2
      : position.x * gridSize;

  const worldY =
    token.size === 0.5
      ? position.y * gridSize + (gridSize - tokenWorldSize) / 2
      : position.y * gridSize;

  const { x: screenX, y: screenY } = worldToScreen({ x: worldX, y: worldY }, camera);
  const screenSize = tokenWorldSize * camera.zoom;
  const screenRadius = screenSize / 2;
  const fontSize = Math.max(8, Math.round(screenSize * TOKEN_FONT_SCALE));

  const { ghostScreenPos, dropZoneScreenPos, handlePointerDown } = useTokenDrag({
    app,
    token,
    position,
    gridSize,
    camera,
    onMove,
    tokenWorldSize,
    tokenScreenPos: { x: screenX, y: screenY },
  });

  const hitArea = useMemo(
    () => new Circle(screenRadius, screenRadius, screenRadius),
    [screenRadius],
  );

  const drawDropZone = useCallback(
    (g: Graphics) => {
      g.clear();
      g.setFillStyle({ color: 0x3b82f6, alpha: 0.35 });
      g.setStrokeStyle({ width: 2, color: 0x3b82f6, alpha: 0.8 });
      g.rect(0, 0, screenSize, screenSize);
      g.fill();
      g.stroke();
    },
    [screenSize],
  );

  const drawCircle = useCallback(
    (g: Graphics) => {
      g.clear();
      if (texture) {
        g.setFillStyle({ texture });
      } else {
        g.setFillStyle({ color: 0xffffff });
      }
      g.setStrokeStyle({ width: TOKEN_BORDER_WIDTH, color: 0x000000 });
      g.circle(screenRadius, screenRadius, screenRadius);
      g.fill();
      g.stroke();
    },
    [texture, screenSize, screenRadius],
  );

  const textStyle = useMemo(
    () =>
      new TextStyle({
        fill: 0x000000,
        fontSize,
        wordWrap: true,
        wordWrapWidth: screenSize * 0.9,
        align: "center",
      }),
    [fontSize, screenSize],
  );

  const nameLabel = !texture ? (
    <pixiText text={token.name} x={screenRadius} y={screenRadius} anchor={0.5} style={textStyle} />
  ) : null;

  return (
    <pixiContainer eventMode="passive">
      {/* Original token — stays at its committed grid position */}
      <pixiContainer
        x={screenX}
        y={screenY}
        eventMode="static"
        cursor={token.locked ? "default" : "pointer"}
        hitArea={hitArea}
        onPointerDown={handlePointerDown}
        onPointerOver={() => onHoverChange?.(token.name)}
        onPointerOut={() => onHoverChange?.(null)}
      >
        <pixiGraphics draw={drawCircle} />
        {nameLabel}
      </pixiContainer>

      {/* Ghost and snapped drop zone highlight */}
      {ghostScreenPos && (
        <>
          {dropZoneScreenPos && (
            <pixiContainer x={dropZoneScreenPos.x} y={dropZoneScreenPos.y} eventMode="none">
              <pixiGraphics draw={drawDropZone} />
            </pixiContainer>
          )}
          {/* Ghost — follows cursor with preserved drag offset, 50% alpha, no events */}
          <pixiContainer x={ghostScreenPos.x} y={ghostScreenPos.y} alpha={0.5} eventMode="none">
            <pixiGraphics draw={drawCircle} />
            {nameLabel}
          </pixiContainer>
        </>
      )}
    </pixiContainer>
  );
};
