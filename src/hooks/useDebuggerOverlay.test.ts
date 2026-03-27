import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { DebuggerProvider } from "../contexts/DebuggerProvider";
import { useDebuggerOverlay } from "./useDebuggerOverlay";

describe("useDebuggerOverlay", () => {
  it("returns the context value when rendered inside a DebuggerProvider", () => {
    const { result } = renderHook(() => useDebuggerOverlay(), {
      wrapper: DebuggerProvider,
    });

    expect(result.current.entries).toBeInstanceOf(Map);
    expect(typeof result.current.set).toBe("function");
    expect(typeof result.current.remove).toBe("function");
  });

  it("throws when rendered outside a DebuggerProvider", () => {
    expect(() => renderHook(() => useDebuggerOverlay())).toThrow(
      "useDebuggerOverlay must be used inside DebuggerProvider",
    );
  });
});
