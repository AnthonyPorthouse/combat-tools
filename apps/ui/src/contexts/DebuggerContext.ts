import { createContext } from "react";

export type DebuggerContextValue = {
  entries: Map<string, string>;
  set: (key: string, value: string) => void;
  remove: (key: string) => void;
};

export const DebuggerContext = createContext<DebuggerContextValue | null>(null);
