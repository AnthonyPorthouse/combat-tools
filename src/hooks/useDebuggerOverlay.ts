import { useCallback, useEffect, useMemo, useState, type RefObject } from "react";

import type { Vector2 } from "../lib/vector2";

import { screenToWorld, worldToGridCell } from "../utils/cameraMath";
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

    globalThis.addEventListener("pointermove", handlePointerMove);

    return () => {
      globalThis.removeEventListener("pointermove", handlePointerMove);
    };
  }, [containerRef]);

  const gridCell = useMemo(() => {
    if (!screenPosition) {
      return null;
    }

    const world = screenToWorld(screenPosition, camera);
    return worldToGridCell(world, gridSize);
  }, [camera, gridSize, screenPosition]);

  const [entries, setEntries] = useState<Map<string, string>>(
    () => new Map([["grid", "(--, --)"]]),
  );

  useEffect(() => {
    const label = gridCell ? `(${gridCell.col}, ${gridCell.row})` : "(--, --)";
    setEntries((prev) => {
      const next = new Map(prev);
      next.set("grid", label);
      return next;
    });
  }, [gridCell]);

  const set = useCallback((key: string, value: string) => {
    setEntries((prev) => {
      const next = new Map(prev);
      next.set(key, value);
      return next;
    });
  }, []);

  const remove = useCallback((key: string) => {
    setEntries((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }, []);

  return {
    entries,
    set,
    remove,
  };
};
