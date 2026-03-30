import { useContext } from "react";

import { CameraContext } from "../contexts/CameraContext";

export type { CameraContextValue, CameraProviderOptions } from "../contexts/CameraContext";

export function useCamera() {
  const ctx = useContext(CameraContext);
  if (!ctx) throw new Error("useCamera must be used inside CameraProvider");
  return ctx;
}
