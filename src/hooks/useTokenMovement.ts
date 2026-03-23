import { useCallback, useEffect, useRef, useState } from "react";
import type { Application, Ticker } from "pixi.js";
import type { GridCell } from "../utils/cameraMath";
import type { Vector2 } from "../lib/vector2";

const DEFAULT_MOVEMENT_SPEED = 5; // cells per second

type AnimPhase = "idle" | "animating";

type AnimState = {
  phase: AnimPhase;
  path: GridCell[];
  currentWorldPos: Vector2;
  targetWorldPos: Vector2;
  onCommit: ((fp: Vector2) => void) | null;
  finalPosition: Vector2 | null;
};

/**
 * Converts a center-cell A* path node to the world-space top-left position
 * used for rendering (same coordinate system as `worldX`/`worldY` in Token.tsx).
 *
 * For size >= 1: offset = Math.floor((size - 1) / 2), topLeft = (col - offset) * gridSize
 * For size  < 1: topLeft = col * gridSize + (gridSize - gridSize * size) / 2
 */
export function cellCenterToTopLeftWorldPos(
  cell: GridCell,
  gridSize: number,
  tokenSize: number,
): Vector2 {
  if (tokenSize < 1) {
    const tokenWorldSize = gridSize * tokenSize;
    return {
      x: cell.col * gridSize + (gridSize - tokenWorldSize) / 2,
      y: cell.row * gridSize + (gridSize - tokenWorldSize) / 2,
    };
  }
  const offset = Math.floor((tokenSize - 1) / 2);
  return {
    x: (cell.col - offset) * gridSize,
    y: (cell.row - offset) * gridSize,
  };
}

export type UseTokenMovementOptions = {
  app: Application | null;
  gridSize: number;
  tokenSize: number;
  movementSpeed?: number;
};

export type UseTokenMovementResult = {
  /** Current animated world-space top-left position, or null when idle. */
  animatedWorldPos: Vector2 | null;
  /** Remaining path cells (updates per waypoint, not per frame — safe for JSX deps). */
  remainingPath: GridCell[];
  /** True while animation is in progress — use to block new drags. */
  isAnimating: boolean;
  /**
   * Begin animating the token along `path` starting from `startWorldPos`.
   * When the last waypoint is reached, `onMoveCommit(finalPosition)` is called.
   * If `path` is empty, `onMoveCommit` is called immediately (no animation).
   */
  startAnimation: (
    startWorldPos: Vector2,
    path: GridCell[],
    finalPosition: Vector2,
    onMoveCommit: (fp: Vector2) => void,
  ) => void;
};

export function useTokenMovement({
  app,
  gridSize,
  tokenSize,
  movementSpeed = DEFAULT_MOVEMENT_SPEED,
}: UseTokenMovementOptions): UseTokenMovementResult {
  const [animatedWorldPos, setAnimatedWorldPos] = useState<Vector2 | null>(null);
  const [remainingPath, setRemainingPath] = useState<GridCell[]>([]);

  const stateRef = useRef<AnimState>({
    phase: "idle",
    path: [],
    currentWorldPos: { x: 0, y: 0 },
    targetWorldPos: { x: 0, y: 0 },
    onCommit: null,
    finalPosition: null,
  });

  // Keep latest options accessible inside the ticker closure.
  const gridSizeRef = useRef(gridSize);
  const tokenSizeRef = useRef(tokenSize);
  const movementSpeedRef = useRef(movementSpeed);

  useEffect(() => {
    gridSizeRef.current = gridSize;
  }, [gridSize]);
  useEffect(() => {
    tokenSizeRef.current = tokenSize;
  }, [tokenSize]);
  useEffect(() => {
    movementSpeedRef.current = movementSpeed;
  }, [movementSpeed]);

  useEffect(() => {
    if (!app) return;

    const tickFn = (ticker: Ticker) => {
      const s = stateRef.current;
      if (s.phase !== "animating") return;

      const worldPerMs = (movementSpeedRef.current * gridSizeRef.current) / 1000;
      const distThisFrame = worldPerMs * ticker.deltaMS;

      const dx = s.targetWorldPos.x - s.currentWorldPos.x;
      const dy = s.targetWorldPos.y - s.currentWorldPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (distThisFrame >= dist) {
        // Arrived at this waypoint — snap to it and advance.
        s.currentWorldPos = { ...s.targetWorldPos };
        s.path = s.path.slice(1);

        if (s.path.length === 0) {
          // Animation complete.
          s.phase = "idle";
          const commit = s.onCommit;
          const fp = s.finalPosition!;
          s.onCommit = null;
          s.finalPosition = null;
          setAnimatedWorldPos(null);
          setRemainingPath([]);
          commit?.(fp);
        } else {
          // Move to next waypoint.
          s.targetWorldPos = cellCenterToTopLeftWorldPos(
            s.path[0],
            gridSizeRef.current,
            tokenSizeRef.current,
          );
          setAnimatedWorldPos({ ...s.currentWorldPos });
          setRemainingPath([...s.path]);
        }
      } else {
        // Interpolate toward target.
        const ratio = distThisFrame / dist;
        s.currentWorldPos = {
          x: s.currentWorldPos.x + dx * ratio,
          y: s.currentWorldPos.y + dy * ratio,
        };
        setAnimatedWorldPos({ ...s.currentWorldPos });
      }
    };

    app.ticker.add(tickFn);
    return () => {
      app.ticker?.remove(tickFn);
    };
  }, [app]);

  const startAnimation = useCallback(
    (
      startWorldPos: Vector2,
      path: GridCell[],
      finalPosition: Vector2,
      onMoveCommit: (fp: Vector2) => void,
    ) => {
      if (path.length === 0) {
        onMoveCommit(finalPosition);
        return;
      }

      const firstTarget = cellCenterToTopLeftWorldPos(
        path[0],
        gridSizeRef.current,
        tokenSizeRef.current,
      );

      stateRef.current = {
        phase: "animating",
        path: [...path],
        currentWorldPos: { ...startWorldPos },
        targetWorldPos: firstTarget,
        onCommit: onMoveCommit,
        finalPosition,
      };

      setAnimatedWorldPos({ ...startWorldPos });
      setRemainingPath([...path]);
    },
    [],
  );

  return {
    animatedWorldPos,
    remainingPath,
    isAnimating: animatedWorldPos !== null,
    startAnimation,
  };
}
