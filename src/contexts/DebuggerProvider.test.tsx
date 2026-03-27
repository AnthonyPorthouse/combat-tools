import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { useDebuggerOverlay } from "../hooks/useDebuggerOverlay";
import { DebuggerProvider } from "./DebuggerProvider";

function renderOverlay() {
  return renderHook(() => useDebuggerOverlay(), { wrapper: DebuggerProvider });
}

describe("DebuggerProvider", () => {
  it("initialises entries with grid set to (--, --)", () => {
    const { result } = renderOverlay();

    expect(result.current.entries.get("grid")).toBe("(--, --)");
  });

  it("set adds a new entry to the map", () => {
    const { result } = renderOverlay();

    act(() => {
      result.current.set("token", "Goblin");
    });

    expect(result.current.entries.get("token")).toBe("Goblin");
  });

  it("set updates an existing entry", () => {
    const { result } = renderOverlay();

    act(() => {
      result.current.set("token", "Goblin");
    });
    act(() => {
      result.current.set("token", "Orc");
    });

    expect(result.current.entries.get("token")).toBe("Orc");
  });

  it("remove deletes an existing entry", () => {
    const { result } = renderOverlay();

    act(() => {
      result.current.set("token", "Goblin");
    });
    act(() => {
      result.current.remove("token");
    });

    expect(result.current.entries.has("token")).toBe(false);
  });

  it("remove is a no-op and returns the same Map reference when the key does not exist", () => {
    const { result } = renderOverlay();

    const entriesBefore = result.current.entries;

    act(() => {
      result.current.remove("nonexistent");
    });

    expect(result.current.entries).toBe(entriesBefore);
  });

  it("set and remove are stable references across re-renders", () => {
    const { result, rerender } = renderOverlay();

    const { set, remove } = result.current;

    act(() => {
      result.current.set("x", "1");
    });
    rerender();

    expect(result.current.set).toBe(set);
    expect(result.current.remove).toBe(remove);
  });
});
