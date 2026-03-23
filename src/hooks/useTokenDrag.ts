import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Application } from "pixi.js";
import {
  screenToWorld,
  worldToGridCell,
  worldToScreen,
  type CameraState,
} from "../utils/cameraMath";
import type { Vector2 } from "../lib/vector2";
import type { Token } from "../types/token";

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
};

export type UseTokenDragResult = {
  ghostScreenPos: Vector2 | null;
  dropZoneScreenPos: Vector2 | null;
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
            const cell = worldToGridCell(world, gridSizeRef.current);
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

  const dropZoneScreenPos = useMemo(() => {
    if (!ghostScreenPos) return null;

    const world = screenToWorld(ghostScreenPos, camera);
    const cell = worldToGridCell(world, gridSize);
    const size = token.size;

    const cellWorldX =
      size === 0.5 ? cell.col * gridSize + (gridSize - tokenWorldSize) / 2 : cell.col * gridSize;

    const cellWorldY =
      size === 0.5 ? cell.row * gridSize + (gridSize - tokenWorldSize) / 2 : cell.row * gridSize;

    return worldToScreen({ x: cellWorldX, y: cellWorldY }, camera);
  }, [ghostScreenPos, camera, token.size, gridSize, tokenWorldSize]);

  return { ghostScreenPos, dropZoneScreenPos, handlePointerDown };
};
