import { useApplication } from "@pixi/react";
import { useEffect, useRef } from "react";
import type { Vector2 } from "../lib/vector2";
import { useCamera } from "../hooks/useCamera";

const SCREEN_PAN_SPEED = 700;
const WHEEL_ZOOM_SENSITIVITY = 0.0015;

export const CameraController = () => {
  const { camera, panBy, zoomAt } = useCamera();

  const { app } = useApplication();
  const draggingRef = useRef(false);
  const lastPointerRef = useRef<Vector2 | null>(null);
  const activeKeysRef = useRef(new Set<string>());

  useEffect(() => {
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
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDrag);

    return () => {
      view.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDrag);
    };
  }, [app, camera.zoom, panBy]);

  useEffect(() => {
    if (!app) return;
    const view = app.canvas as HTMLCanvasElement | undefined;
    if (!view) return;
    const suppress = (e: MouseEvent) => e.preventDefault();
    view.addEventListener("contextmenu", suppress);
    return () => view.removeEventListener("contextmenu", suppress);
  }, [app]);

  useEffect(() => {
    if (!app) return;
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

      zoomAt({ x: screenX, y: screenY }, camera.zoom * zoomFactor);
    };

    view.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      view.removeEventListener("wheel", handleWheel);
    };
  }, [app, camera.zoom, zoomAt]);

  useEffect(() => {
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

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    app.ticker.add(tick);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
      app.ticker?.remove(tick);
    };
  }, [app, camera.zoom, panBy]);

  return null;
};
