import { useApplication } from "@pixi/react";
import { useEffect, useRef } from "react";

import type { Vector2 } from "../lib/vector2";

import { useCamera } from "../hooks/useCamera";

const SCREEN_PAN_SPEED = 700;
const WHEEL_ZOOM_SENSITIVITY = 0.0015;

export const CameraController = () => {
  const { camera, panBy, zoomAtByFactor } = useCamera();

  const { app } = useApplication();
  const draggingRef = useRef(false);
  const lastPointerRef = useRef<Vector2 | null>(null);
  const activeKeysRef = useRef(new Set<string>());

  useEffect(() => {
    if (!app?.renderer) return;
    const view = app.canvas as HTMLCanvasElement | undefined;
    if (!view) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 2) {
        return;
      }

      draggingRef.current = true;
      lastPointerRef.current = {
        x: event.clientX,
        y: event.clientY,
      };
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!draggingRef.current || !lastPointerRef.current) {
        return;
      }

      const deltaX = event.clientX - lastPointerRef.current.x;
      const deltaY = event.clientY - lastPointerRef.current.y;

      if (deltaX !== 0 || deltaY !== 0) {
        panBy({ x: -deltaX / camera.zoom, y: -deltaY / camera.zoom });
      }

      lastPointerRef.current = {
        x: event.clientX,
        y: event.clientY,
      };
    };

    const stopDrag = () => {
      draggingRef.current = false;
      lastPointerRef.current = null;
    };

    view.addEventListener("pointerdown", handlePointerDown);
    globalThis.addEventListener("pointermove", handlePointerMove);
    globalThis.addEventListener("pointerup", stopDrag);

    return () => {
      view.removeEventListener("pointerdown", handlePointerDown);
      globalThis.removeEventListener("pointermove", handlePointerMove);
      globalThis.removeEventListener("pointerup", stopDrag);
    };
  }, [app, app?.renderer, camera.zoom, panBy]);

  useEffect(() => {
    if (!app?.renderer) return;
    const view = app.canvas as HTMLCanvasElement | undefined;
    if (!view) return;
    const suppress = (e: MouseEvent) => e.preventDefault();
    view.addEventListener("contextmenu", suppress);
    return () => view.removeEventListener("contextmenu", suppress);
  }, [app, app?.renderer]);

  useEffect(() => {
    if (!app?.renderer) return;
    const view = app.canvas as HTMLCanvasElement | undefined;

    if (!view) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();

      const bounds = view.getBoundingClientRect();
      const screenX = event.clientX - bounds.left;
      const screenY = event.clientY - bounds.top;
      const zoomFactor = Math.exp(-event.deltaY * WHEEL_ZOOM_SENSITIVITY);

      zoomAtByFactor({ x: screenX, y: screenY }, zoomFactor);
    };

    view.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      view.removeEventListener("wheel", handleWheel);
    };
  }, [app, app?.renderer, zoomAtByFactor]);

  useEffect(() => {
    if (!app?.renderer) return;
    const keys = activeKeysRef.current;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
      }

      keys.add(event.code);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      keys.delete(event.code);
    };

    const handleBlur = () => {
      keys.clear();
    };

    const tick = () => {
      if (keys.size === 0) {
        return;
      }

      let xAxis = 0;
      let yAxis = 0;

      if (keys.has("KeyA") || keys.has("ArrowLeft")) {
        xAxis -= 1;
      }

      if (keys.has("KeyD") || keys.has("ArrowRight")) {
        xAxis += 1;
      }

      if (keys.has("KeyW") || keys.has("ArrowUp")) {
        yAxis -= 1;
      }

      if (keys.has("KeyS") || keys.has("ArrowDown")) {
        yAxis += 1;
      }

      if (xAxis === 0 && yAxis === 0) {
        return;
      }

      const length = Math.hypot(xAxis, yAxis) || 1;
      const normalizedX = xAxis / length;
      const normalizedY = yAxis / length;
      const deltaSeconds = app.ticker.deltaMS / 1000;
      const worldStep = (SCREEN_PAN_SPEED * deltaSeconds) / camera.zoom;

      panBy({ x: normalizedX * worldStep, y: normalizedY * worldStep });
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    globalThis.addEventListener("keyup", handleKeyUp);
    globalThis.addEventListener("blur", handleBlur);
    app.ticker.add(tick);

    return () => {
      globalThis.removeEventListener("keydown", handleKeyDown);
      globalThis.removeEventListener("keyup", handleKeyUp);
      globalThis.removeEventListener("blur", handleBlur);
      app.ticker?.remove(tick);
    };
  }, [app, app?.renderer, camera.zoom, panBy]);

  return null;
};
