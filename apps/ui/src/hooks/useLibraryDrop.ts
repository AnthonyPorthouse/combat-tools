import type { Vector2 } from "@combat-tools/vectors";
import type { DragEvent, RefObject } from "react";

import { useCallback } from "react";

import type { Token } from "../types/token";

import { createToken } from "../types/token";
import { screenToWorld, worldToGridCell } from "../utils/cameraMath";
import { useCamera } from "./useCamera";

export type UseLibraryDropOptions = {
  containerRef: RefObject<HTMLDivElement | null>;
  gridSize: number;
  draggedTokenRef: RefObject<Token | null>;
  onDrop: (token: Token, position: Vector2) => void;
};

export type UseLibraryDropResult = {
  dropAreaProps: {
    onDragOver: (e: DragEvent<HTMLDivElement>) => void;
    onDrop: (e: DragEvent<HTMLDivElement>) => void;
  };
};

export function useLibraryDrop({
  containerRef,
  gridSize,
  draggedTokenRef,
  onDrop,
}: Readonly<UseLibraryDropOptions>): UseLibraryDropResult {
  const { camera } = useCamera();

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();

      const template = draggedTokenRef.current;
      if (!template || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const screen: Vector2 = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const world = screenToWorld(screen, camera);
      const cell = worldToGridCell(world, gridSize);

      const newToken = createToken(template.name, template.size, template.image, template.locked);
      onDrop(newToken, { x: cell.col, y: cell.row });

      draggedTokenRef.current = null;
    },
    [camera, containerRef, draggedTokenRef, gridSize, onDrop],
  );

  return {
    dropAreaProps: {
      onDragOver: handleDragOver,
      onDrop: handleDrop,
    },
  };
}
