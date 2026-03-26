import type { Application } from "pixi.js";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { Vector2 } from "../lib/vector2";
import type { Token } from "../types/token";

import {
  screenToWorld,
  worldToGridCell,
  worldToScreen,
  type CameraState,
  type GridCell,
} from "../utils/cameraMath";

export type UseTokenDragOptions = {
  app: Application | null;
  token: Token;
  position: Vector2;
  gridSize: number;
  camera: CameraState;
  onMove: (id: string, newPosition: Vector2) => void;
  /** Width/height of the token in world-space units (gridSize * token.size). */
  tokenWorldSize: number;
  /** Current top-left position of the token in screen space. */
  tokenScreenPos: Vector2;
  /**
   * Optional resolver applied to the raw computed target cell before it is
   * used for the drop zone indicator and passed to `onMove`. Use this to
   * redirect blocked cells to the nearest valid one.
   */
  resolveTargetCell?: (raw: GridCell) => GridCell;
};

export type UseTokenDragResult = {
  ghostScreenPos: Vector2 | null;
  dropZoneScreenPos: Vector2 | null;
  /** The snapped grid cell the ghost is currently hovering over, or null when not dragging. */
  targetCell: GridCell | null;
  handlePointerDown: (e: {
    button: number;
    stopPropagation: () => void;
    global: { x: number; y: number };
  }) => void;
};

export const useTokenDrag = ({
  app,
  token,
  position,
  gridSize,
  camera,
  onMove,
  tokenWorldSize,
  tokenScreenPos,
  resolveTargetCell,
}: UseTokenDragOptions): UseTokenDragResult => {
  const [ghostScreenPos, setGhostScreenPos] = useState<Vector2 | null>(null);
  const isDraggingRef = useRef(false);
  const ghostScreenPosRef = useRef<Vector2 | null>(null);
  const dragOffsetRef = useRef<Vector2 | null>(null);

  // Stable refs so stage-event closures always read the latest prop values without
  // needing to be re-registered when props change.
  const cameraRef = useRef(camera);
  const gridSizeRef = useRef(gridSize);
  const positionRef = useRef(position);
  const onMoveRef = useRef(onMove);
  const tokenIdRef = useRef(token.id);
  const lockedRef = useRef(token.locked);
  const tokenScreenPosRef = useRef(tokenScreenPos);
  const resolveTargetCellRef = useRef(resolveTargetCell);

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);
  useEffect(() => {
    gridSizeRef.current = gridSize;
  }, [gridSize]);
  useEffect(() => {
    positionRef.current = position;
  }, [position]);
  useEffect(() => {
    onMoveRef.current = onMove;
  }, [onMove]);
  useEffect(() => {
    tokenIdRef.current = token.id;
  }, [token.id]);
  useEffect(() => {
    lockedRef.current = token.locked;
  }, [token.locked]);
  useEffect(() => {
    tokenScreenPosRef.current = tokenScreenPos;
  }, [tokenScreenPos]);
  useEffect(() => {
    resolveTargetCellRef.current = resolveTargetCell;
  }, [resolveTargetCell]);

  useEffect(() => {
    if (!app) return;

    const onGlobalPointerMove = (e: { global: { x: number; y: number } }) => {
      if (!isDraggingRef.current) return;
      const offset = dragOffsetRef.current;
      if (!offset) return;
      const ghostPos = { x: e.global.x - offset.x, y: e.global.y - offset.y };
      ghostScreenPosRef.current = ghostPos;
      setGhostScreenPos(ghostPos);
    };

    const onPointerUp = () => {
      if (!isDraggingRef.current) return;
      const ghostPos = ghostScreenPosRef.current;
      const finalPos: Vector2 = ghostPos
        ? (() => {
            const world = screenToWorld(ghostPos, cameraRef.current);
            const raw = worldToGridCell(world, gridSizeRef.current);
            const cell = resolveTargetCellRef.current ? resolveTargetCellRef.current(raw) : raw;
            return { x: cell.col, y: cell.row };
          })()
        : positionRef.current;

      onMoveRef.current(tokenIdRef.current, finalPos);
      isDraggingRef.current = false;
      ghostScreenPosRef.current = null;
      dragOffsetRef.current = null;
      setGhostScreenPos(null);
    };

    app.stage.on("globalpointermove", onGlobalPointerMove);
    app.stage.on("pointerup", onPointerUp);
    app.stage.on("pointerupoutside", onPointerUp);

    return () => {
      app.stage?.off("globalpointermove", onGlobalPointerMove);
      app.stage?.off("pointerup", onPointerUp);
      app.stage?.off("pointerupoutside", onPointerUp);
    };
  }, [app]);

  const handlePointerDown = useCallback(
    (e: { button: number; stopPropagation: () => void; global: { x: number; y: number } }) => {
      if (e.button !== 0) return;
      if (lockedRef.current) return;
      e.stopPropagation();
      const offset = {
        x: e.global.x - tokenScreenPosRef.current.x,
        y: e.global.y - tokenScreenPosRef.current.y,
      };
      dragOffsetRef.current = offset;
      // Ghost starts exactly at the token's current screen position
      const ghostPos = { x: e.global.x - offset.x, y: e.global.y - offset.y };
      ghostScreenPosRef.current = ghostPos;
      isDraggingRef.current = true;
      setGhostScreenPos(ghostPos);
    },
    [],
  );

  const targetCell = useMemo<GridCell | null>(() => {
    if (!ghostScreenPos) return null;
    const raw = worldToGridCell(screenToWorld(ghostScreenPos, camera), gridSize);
    return resolveTargetCellRef.current ? resolveTargetCellRef.current(raw) : raw;
  }, [ghostScreenPos, camera, gridSize]);

  const dropZoneScreenPos = useMemo(() => {
    if (!targetCell) return null;

    const size = token.size;

    const cellWorldX =
      size === 0.5
        ? targetCell.col * gridSize + (gridSize - tokenWorldSize) / 2
        : targetCell.col * gridSize;

    const cellWorldY =
      size === 0.5
        ? targetCell.row * gridSize + (gridSize - tokenWorldSize) / 2
        : targetCell.row * gridSize;

    return worldToScreen({ x: cellWorldX, y: cellWorldY }, camera);
  }, [targetCell, camera, token.size, gridSize, tokenWorldSize]);

  return { ghostScreenPos, dropZoneScreenPos, targetCell, handlePointerDown };
};
