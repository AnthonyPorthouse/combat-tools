import { useEffect, useMemo, useState, type RefObject } from "react";

import type { Vector2 } from "../lib/vector2";

import { screenToWorld, worldToGridCell, type GridCell } from "../utils/cameraMath";
import { useCamera } from "./useCamera";

type UseDebuggerOverlayOptions = {
  gridSize?: number;
  containerRef: RefObject<HTMLElement | null>;
};

export const useDebuggerOverlay = ({ gridSize = 32, containerRef }: UseDebuggerOverlayOptions) => {
  const { camera } = useCamera();
  const [screenPosition, setScreenPosition] = useState<Vector2 | null>(null);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const container = containerRef.current;
      const canvas = container?.querySelector("canvas");

      if (!canvas) {
        setScreenPosition(null);
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const isInsideX = event.clientX >= rect.left && event.clientX <= rect.right;
      const isInsideY = event.clientY >= rect.top && event.clientY <= rect.bottom;

      if (!isInsideX || !isInsideY) {
        setScreenPosition(null);
        return;
      }

      setScreenPosition({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    };

    window.addEventListener("pointermove", handlePointerMove);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, [containerRef]);

  const gridCell: GridCell | null = useMemo(() => {
    if (!screenPosition) {
      return null;
    }

    const world = screenToWorld(screenPosition, camera);
    return worldToGridCell(world, gridSize);
  }, [camera, gridSize, screenPosition]);

  return {
    gridCell,
  };
};
