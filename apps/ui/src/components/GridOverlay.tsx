import { useApplication } from "@pixi/react";
import { Graphics } from "pixi.js";
import { memo, useCallback, useEffect, useState } from "react";

import type { Vector2 } from "../lib/vector2";

import { useCamera } from "../hooks/useCamera";

type GridOverlayProps = {
  size?: number;
  zoom?: number;
  pan?: Vector2;
};

const DEFAULT_GRID_SIZE = 32;
const MIN_ZOOM = 0.1;
const MAX_VISIBLE_LINES = 4000;

const positiveModulo = (value: number, modulus: number) => {
  return ((value % modulus) + modulus) % modulus;
};

export const GridOverlay = memo(function GridOverlay({
  size = DEFAULT_GRID_SIZE,
}: Readonly<GridOverlayProps>) {
  const { app } = useApplication();
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const {
    camera: { zoom, pan },
  } = useCamera();

  useEffect(() => {
    const handleResize = () => {
      if (!app?.renderer) return;
      setViewport({
        width: app.screen.width,
        height: app.screen.height,
      });
    };

    handleResize();
    app.renderer?.on("resize", handleResize);

    return () => {
      app.renderer?.off("resize", handleResize);
    };
  }, [app, app?.renderer]);

  const drawCallback = useCallback(
    (graphics: Graphics) => {
      graphics.clear();

      const width = viewport.width;
      const height = viewport.height;

      const safeSize = Number.isFinite(size) && size > 0 ? size : DEFAULT_GRID_SIZE;
      const safeZoom = Number.isFinite(zoom) ? Math.max(zoom, MIN_ZOOM) : 1;
      const spacing = safeSize * safeZoom;

      const estimatedVerticalLines = Math.ceil(width / spacing) + 2;
      const estimatedHorizontalLines = Math.ceil(height / spacing) + 2;
      if (estimatedVerticalLines + estimatedHorizontalLines > MAX_VISIBLE_LINES) {
        return;
      }

      // Pan is treated as world-space units, so it scales into screen-space before offsetting lines.
      const panInScreenX = pan.x * safeZoom;
      const panInScreenY = pan.y * safeZoom;
      const startX = -positiveModulo(panInScreenX, spacing);
      const startY = -positiveModulo(panInScreenY, spacing);

      graphics.setStrokeStyle({ width: 1, color: "#4b5563", alpha: 0.45 });

      for (let x = startX; x <= width; x += spacing) {
        graphics.moveTo(x, 0);
        graphics.lineTo(x, height);
      }

      for (let y = startY; y <= height; y += spacing) {
        graphics.moveTo(0, y);
        graphics.lineTo(width, y);
      }

      graphics.stroke();
    },
    [pan.x, pan.y, size, viewport.height, viewport.width, zoom],
  );

  return <pixiGraphics draw={drawCallback} eventMode="none" />;
});
