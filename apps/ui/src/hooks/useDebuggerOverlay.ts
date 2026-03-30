import { useContext } from "react";

import { DebuggerContext } from "../contexts/DebuggerContext";

export function useDebuggerOverlay() {
  const ctx = useContext(DebuggerContext);
  if (!ctx) throw new Error("useDebuggerOverlay must be used inside DebuggerProvider");
  return ctx;
}
