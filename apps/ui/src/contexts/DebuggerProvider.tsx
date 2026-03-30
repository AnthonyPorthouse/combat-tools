import { useCallback, useState, type PropsWithChildren } from "react";

import { DebuggerContext } from "./DebuggerContext";

export function DebuggerProvider({ children }: Readonly<PropsWithChildren>) {
  const [entries, setEntries] = useState<Map<string, string>>(
    () => new Map([["grid", "(--, --)"]]),
  );

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

  return (
    <DebuggerContext.Provider value={{ entries, set, remove }}>{children}</DebuggerContext.Provider>
  );
}
