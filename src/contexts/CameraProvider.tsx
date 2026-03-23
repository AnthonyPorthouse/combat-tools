import { useCallback, useState, type PropsWithChildren } from "react";
import {
  clampZoom,
  MAX_CAMERA_ZOOM,
  MIN_CAMERA_ZOOM,
  zoomAtScreenPoint,
  type CameraState,
} from "../utils/cameraMath";
import { addVector2, type Vector2 } from "../lib/vector2";
import { CameraContext, type CameraProviderOptions } from "./CameraContext";

export function CameraProvider({
  children,
  initialZoom = 1,
  initialPan = { x: 0, y: 0 },
  minZoom = MIN_CAMERA_ZOOM,
  maxZoom = MAX_CAMERA_ZOOM,
}: PropsWithChildren<CameraProviderOptions>) {
  const [camera, setCamera] = useState<CameraState>(() => ({
    zoom: clampZoom(initialZoom, minZoom, maxZoom),
    pan: initialPan,
  }));

  const setPan = useCallback((pan: Vector2) => {
    setCamera((current) => ({ ...current, pan }));
  }, []);

  const panBy = useCallback((delta: Vector2) => {
    setCamera((current) => ({
      ...current,
      pan: addVector2(current.pan, delta),
    }));
  }, []);

  const setZoom = useCallback(
    (zoom: number) => {
      setCamera((current) => ({
        ...current,
        zoom: clampZoom(zoom, minZoom, maxZoom),
      }));
    },
    [maxZoom, minZoom],
  );

  const zoomAtByFactor = useCallback(
    (screen: Vector2, factor: number) => {
      setCamera((current) => {
        const oldZoom = clampZoom(current.zoom, minZoom, maxZoom);
        const nextZoom = clampZoom(oldZoom * factor, minZoom, maxZoom);
        if (oldZoom === nextZoom) return { ...current, zoom: nextZoom };
        return zoomAtScreenPoint({ ...current, zoom: oldZoom }, screen, nextZoom);
      });
    },
    [maxZoom, minZoom],
  );

  const zoomAt = useCallback(
    (screen: Vector2, zoom: number) => {
      setCamera((current) => {
        const oldZoom = clampZoom(current.zoom, minZoom, maxZoom);
        const nextZoom = clampZoom(zoom, minZoom, maxZoom);

        if (oldZoom === nextZoom) {
          return { ...current, zoom: nextZoom };
        }

        return zoomAtScreenPoint({ ...current, zoom: oldZoom }, screen, nextZoom);
      });
    },
    [maxZoom, minZoom],
  );

  return (
    <CameraContext.Provider
      value={{ camera, setPan, panBy, setZoom, zoomAt, zoomAtByFactor, minZoom, maxZoom }}
    >
      {children}
    </CameraContext.Provider>
  );
}
