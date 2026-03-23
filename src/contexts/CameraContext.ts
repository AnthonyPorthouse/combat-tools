import { createContext } from "react";
import type { CameraState } from "../utils/cameraMath";
import type { Vector2 } from "../lib/vector2";

export type CameraContextValue = {
  camera: CameraState;
  setPan: (pan: Vector2) => void;
  panBy: (delta: Vector2) => void;
  setZoom: (zoom: number) => void;
  zoomAt: (screen: Vector2, zoom: number) => void;
  minZoom: number;
  maxZoom: number;
};

export type CameraProviderOptions = {
  initialZoom?: number;
  initialPan?: Vector2;
  minZoom?: number;
  maxZoom?: number;
};

export const CameraContext = createContext<CameraContextValue | null>(null);
