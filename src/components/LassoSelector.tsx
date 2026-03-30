import { useApplication } from "@pixi/react";
import { Graphics } from "pixi.js";
import { useCallback, useEffect, useRef, useState } from "react";

import type { Vector2 } from "../lib/vector2";
import type { TokenPlacement } from "../stores/combatStore";

import { useCamera } from "../hooks/useCamera";
import { worldToScreen } from "../utils/cameraMath";

/** Minimum pointer travel (px) required to activate the lasso vs. treating as a click. */
const DRAG_THRESHOLD = 5;

type Rect = { x: number; y: number; width: number; height: number };

function normalizeRect(a: Vector2, b: Vector2): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  };
}

type LassoSelectorProps = {
  tokenPlacements: Record<string, TokenPlacement>;
  gridSize: number;
  onLassoSelect: (ids: string[]) => void;
};

/**
 * Invisible PixiJS component that adds lasso-selection to the board.
 *
 * Attaches stage-level pointer listeners. Because `TokenDisplay` calls
 * `e.stopPropagation()` on left-click, the stage only receives events when
 * the user clicks on empty canvas area (or locked tokens). A short drag draws
 * a blue selection rectangle; releasing selects all tokens whose screen-space
 * centre falls within it. A sub-threshold release (click) clears the selection.
 */
export function LassoSelector({
  tokenPlacements,
  gridSize,
  onLassoSelect,
}: Readonly<LassoSelectorProps>) {
  const { app } = useApplication();
  const { camera } = useCamera();

  const [lassoStart, setLassoStart] = useState<Vector2 | null>(null);
  const [lassoEnd, setLassoEnd] = useState<Vector2 | null>(null);

  // Stable refs so event-closure callbacks always see the latest values.
  const lassoStartRef = useRef<Vector2 | null>(null);
  const cameraRef = useRef(camera);
  const tokenPlacementsRef = useRef(tokenPlacements);
  const gridSizeRef = useRef(gridSize);
  const onLassoSelectRef = useRef(onLassoSelect);

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);
  useEffect(() => {
    tokenPlacementsRef.current = tokenPlacements;
  }, [tokenPlacements]);
  useEffect(() => {
    gridSizeRef.current = gridSize;
  }, [gridSize]);
  useEffect(() => {
    onLassoSelectRef.current = onLassoSelect;
  }, [onLassoSelect]);

  useEffect(() => {
    if (!app) return;

    const onPointerDown = (e: { button: number; global: { x: number; y: number } }) => {
      if (e.button !== 0) return;
      const pos = { x: e.global.x, y: e.global.y };
      lassoStartRef.current = pos;
      setLassoStart(pos);
      setLassoEnd(pos);
    };

    const onPointerMove = (e: { global: { x: number; y: number } }) => {
      if (!lassoStartRef.current) return;
      const pos = { x: e.global.x, y: e.global.y };
      setLassoEnd(pos);
    };

    const onPointerUp = (e: { global: { x: number; y: number } }) => {
      const start = lassoStartRef.current;
      if (!start) return;

      const end = { x: e.global.x, y: e.global.y };
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const isDrag = Math.hypot(dx, dy) >= DRAG_THRESHOLD;

      if (isDrag) {
        const rect = normalizeRect(start, end);
        const selected = findTokensInRect(
          tokenPlacementsRef.current,
          rect,
          cameraRef.current,
          gridSizeRef.current,
        );
        onLassoSelectRef.current(selected);
      } else {
        // Click on empty area — clear selection.
        onLassoSelectRef.current([]);
      }

      lassoStartRef.current = null;
      setLassoStart(null);
      setLassoEnd(null);
    };

    app.stage.on("pointerdown", onPointerDown);
    app.stage.on("globalpointermove", onPointerMove);
    app.stage.on("pointerup", onPointerUp);
    app.stage.on("pointerupoutside", onPointerUp);

    return () => {
      app.stage?.off("pointerdown", onPointerDown);
      app.stage?.off("globalpointermove", onPointerMove);
      app.stage?.off("pointerup", onPointerUp);
      app.stage?.off("pointerupoutside", onPointerUp);
    };
  }, [app]);

  const drawLasso = useCallback(
    (g: Graphics) => {
      g.clear();
      if (!lassoStart || !lassoEnd) return;
      const rect = normalizeRect(lassoStart, lassoEnd);
      if (rect.width < 1 && rect.height < 1) return;
      g.setFillStyle({ color: 0x3b82f6, alpha: 0.1 });
      g.setStrokeStyle({ width: 1, color: 0x3b82f6, alpha: 0.8 });
      g.rect(rect.x, rect.y, rect.width, rect.height);
      g.fill();
      g.stroke();
    },
    [lassoStart, lassoEnd],
  );

  return <pixiGraphics draw={drawLasso} eventMode="none" />;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type CameraState = { zoom: number; pan: Vector2 };

function findTokensInRect(
  tokenPlacements: Record<string, TokenPlacement>,
  rect: Rect,
  camera: CameraState,
  gridSize: number,
): string[] {
  const selected: string[] = [];

  for (const [id, { token, position }] of Object.entries(tokenPlacements)) {
    const tokenWorldSize = gridSize * token.size;

    // World-space top-left (same logic as Token.tsx)
    const worldX =
      token.size === 0.5
        ? position.x * gridSize + (gridSize - tokenWorldSize) / 2
        : position.x * gridSize;
    const worldY =
      token.size === 0.5
        ? position.y * gridSize + (gridSize - tokenWorldSize) / 2
        : position.y * gridSize;

    // Screen-space centre of the token
    const centre = worldToScreen(
      { x: worldX + tokenWorldSize / 2, y: worldY + tokenWorldSize / 2 },
      camera,
    );

    if (
      centre.x >= rect.x &&
      centre.x <= rect.x + rect.width &&
      centre.y >= rect.y &&
      centre.y <= rect.y + rect.height
    ) {
      selected.push(id);
    }
  }

  return selected;
}
