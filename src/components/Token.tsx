import { extend, useApplication } from "@pixi/react";
import {
  Circle,
  Container,
  FederatedPointerEvent,
  Graphics,
  Sprite,
  Text,
  TextStyle,
} from "pixi.js";
import { useCallback, useMemo } from "react";

import type { Vector2 } from "../lib/vector2";
import type { Token } from "../types/token";
import type { GridCell } from "../utils/cameraMath";

import { useCamera } from "../hooks/useCamera";
import { useTokenDrag } from "../hooks/useTokenDrag";
import { useTokenMovement } from "../hooks/useTokenMovement";
import { useTokenTexture } from "../hooks/useTokenTexture";
import { buildOccupiedCells, findNearestValidCell, findPath, makeMoverGrid } from "../utils/astar";
import { worldToScreen } from "../utils/cameraMath";

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
  /** Animation speed in cells per second (default: 5). */
  movementSpeed?: number;
  /** Other tokens that block pathfinding. */
  obstacles?: Array<{ position: Vector2; size: number }>;
  /** Called on right-click with the token and cursor screen coordinates. */
  onContextMenu?: (token: Token, x: number, y: number) => void;
};

/**
 * Returns the center cell (for A* path calculation) of a token at the given
 * top-left grid position.
 *
 * - size < 1 : center cell === position cell
 * - size >= 1: offset = Math.floor((size - 1) / 2)
 */
function getTokenCenterCell(position: Vector2, tokenSize: number): GridCell {
  if (tokenSize < 1) {
    return { col: position.x, row: position.y };
  }
  const offset = Math.floor((tokenSize - 1) / 2);
  return { col: position.x + offset, row: position.y + offset };
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
 * During drag, an A* path is computed (routing around obstacle tokens) and
 * displayed as white lines between cell centres. A 50% transparent ghost
 * clone follows the cursor. A snapped blue rectangle shows the target cell(s).
 * The original token stays at its committed position until drop.
 *
 * On drop the token slides along the computed path at `movementSpeed`
 * cells/sec. The parent `onMove` callback is called only when the animation
 * completes. The path line's origin follows the token's centre during movement.
 */
export const TokenDisplay = ({
  token,
  position,
  gridSize,
  onMove,
  onHoverChange,
  movementSpeed = 5,
  obstacles = [],
  onContextMenu,
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

  // ---------------------------------------------------------------------------
  // Animation
  // ---------------------------------------------------------------------------

  const { animatedWorldPos, remainingPath, isAnimating, startAnimation } = useTokenMovement({
    app,
    gridSize,
    tokenSize: token.size,
    movementSpeed,
  });

  // When animating, override the committed position with the animated position.
  const resolvedWorldX = animatedWorldPos?.x ?? worldX;
  const resolvedWorldY = animatedWorldPos?.y ?? worldY;

  const { x: screenX, y: screenY } = worldToScreen(
    { x: resolvedWorldX, y: resolvedWorldY },
    camera,
  );
  const screenSize = tokenWorldSize * camera.zoom;
  const screenRadius = screenSize / 2;
  const fontSize = Math.max(8, Math.round(screenSize * TOKEN_FONT_SCALE));

  // ---------------------------------------------------------------------------
  // Pathfinding
  // ---------------------------------------------------------------------------

  const centerCell = useMemo(
    () => getTokenCenterCell(position, token.size),
    [position, token.size],
  );

  const occupiedCells = useMemo(() => buildOccupiedCells(obstacles), [obstacles]);

  // ---------------------------------------------------------------------------
  // Drag
  // ---------------------------------------------------------------------------

  // Intercept onMove to start the animation instead of committing immediately.
  const handleMove = useCallback(
    (id: string, newPosition: Vector2) => {
      const endCell = getTokenCenterCell(newPosition, token.size);
      const grid = makeMoverGrid(occupiedCells, token.size);
      const path = findPath(centerCell, endCell, grid);
      if (path === null) return; // destination unreachable — abort silently
      startAnimation({ x: worldX, y: worldY }, path, newPosition, (fp) => onMove(id, fp));
    },
    [centerCell, token.size, occupiedCells, startAnimation, worldX, worldY, onMove],
  );

  const resolveTargetCell = useCallback(
    (raw: GridCell): GridCell => {
      const grid = makeMoverGrid(occupiedCells, token.size);
      // raw is a top-left cell; isPassable expects a center cell
      const center = getTokenCenterCell({ x: raw.col, y: raw.row }, token.size);
      if (grid.isPassable(center.col, center.row)) return raw;
      // Find nearest valid center cell, then convert back to top-left
      const nearestCenter = findNearestValidCell(center, grid, centerCell);
      if (!nearestCenter) return raw;
      const offset = token.size < 1 ? 0 : Math.floor((token.size - 1) / 2);
      return { col: nearestCenter.col - offset, row: nearestCenter.row - offset };
    },
    [occupiedCells, token.size, centerCell],
  );

  const {
    ghostScreenPos,
    dropZoneScreenPos,
    targetCell,
    handlePointerDown: rawHandlePointerDown,
  } = useTokenDrag({
    app,
    token,
    position,
    gridSize,
    camera,
    onMove: handleMove,
    tokenWorldSize,
    tokenScreenPos: { x: screenX, y: screenY },
    resolveTargetCell,
  });

  // Prevent starting a new drag while animating; intercept right-click for context menu.
  const handlePointerDown = useCallback(
    (e: FederatedPointerEvent) => {
      if (e.button === 2) {
        e.stopPropagation();
        onContextMenu?.(token, e.clientX, e.clientY);
        return;
      }
      if (isAnimating) return;
      rawHandlePointerDown(e);
    },
    [isAnimating, rawHandlePointerDown, onContextMenu, token],
  );

  // ---------------------------------------------------------------------------
  // Path for drag preview: A* from token's center cell to drop target
  // ---------------------------------------------------------------------------

  const dragPath = useMemo((): GridCell[] => {
    if (!targetCell) return [];
    const endCenterCell = getTokenCenterCell({ x: targetCell.col, y: targetCell.row }, token.size);
    const grid = makeMoverGrid(occupiedCells, token.size);
    return findPath(centerCell, endCenterCell, grid) ?? [];
  }, [targetCell, centerCell, token.size, occupiedCells]);

  // ---------------------------------------------------------------------------
  // PixiJS drawing callbacks
  // ---------------------------------------------------------------------------

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
    [texture, screenRadius],
  );

  // Draw the A* path as white lines between cell centres.
  // During drag: uses dragPath (from committed position to ghost target).
  // During animation: uses remainingPath (with origin at animated token centre).
  // The origin point is the geometric centre of the token's current rendered circle.
  const drawPath = useCallback(
    (g: Graphics) => {
      g.clear();

      const cells = isAnimating ? remainingPath : ghostScreenPos ? dragPath : [];
      if (cells.length === 0) return;

      // Origin = geometric centre of the rendered token circle in screen space.
      const originScreen = worldToScreen(
        {
          x: resolvedWorldX + tokenWorldSize / 2,
          y: resolvedWorldY + tokenWorldSize / 2,
        },
        camera,
      );

      g.setStrokeStyle({ width: 2, color: 0xffffff, alpha: 0.85 });
      g.moveTo(originScreen.x, originScreen.y);

      for (const cell of cells) {
        const cellCentreScreen = worldToScreen(
          {
            x: cell.col * gridSize + gridSize / 2,
            y: cell.row * gridSize + gridSize / 2,
          },
          camera,
        );
        g.lineTo(cellCentreScreen.x, cellCentreScreen.y);
      }

      g.stroke();
    },
    [
      isAnimating,
      remainingPath,
      ghostScreenPos,
      dragPath,
      resolvedWorldX,
      resolvedWorldY,
      tokenWorldSize,
      camera,
      gridSize,
    ],
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
      {/* A* path overlay — drawn beneath everything else */}
      <pixiGraphics draw={drawPath} />

      {/* Original/animated token — at committed or animated position */}
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

      {/* Ghost and snapped drop zone — hidden during animation */}
      {ghostScreenPos && !isAnimating && (
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
