import { fireEvent } from "@testing-library/dom";
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, it, expect, vi } from "vitest";

const undo = vi.fn();
const redo = vi.fn();

vi.mock("../stores/combatStore", () => ({
  useCombatStore: {
    temporal: { getState: () => ({ undo, redo }) },
  },
}));

import { useUndoRedo } from "./useUndoRedo";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useUndoRedo", () => {
  it("calls undo on Cmd+Z", () => {
    renderHook(() => useUndoRedo());
    fireEvent.keyDown(window, { key: "z", metaKey: true });
    expect(undo).toHaveBeenCalledOnce();
    expect(redo).not.toHaveBeenCalled();
  });

  it("calls undo on Ctrl+Z", () => {
    renderHook(() => useUndoRedo());
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(undo).toHaveBeenCalledOnce();
    expect(redo).not.toHaveBeenCalled();
  });

  it("does not call undo when neither metaKey nor ctrlKey is held", () => {
    renderHook(() => useUndoRedo());
    fireEvent.keyDown(window, { key: "z" });
    expect(undo).not.toHaveBeenCalled();
    expect(redo).not.toHaveBeenCalled();
  });

  it("calls redo on Cmd+Shift+Z", () => {
    renderHook(() => useUndoRedo());
    fireEvent.keyDown(window, { key: "z", metaKey: true, shiftKey: true });
    expect(redo).toHaveBeenCalledOnce();
    expect(undo).not.toHaveBeenCalled();
  });

  it("calls redo on Cmd+Y", () => {
    renderHook(() => useUndoRedo());
    fireEvent.keyDown(window, { key: "y", metaKey: true });
    expect(redo).toHaveBeenCalledOnce();
    expect(undo).not.toHaveBeenCalled();
  });

  it("calls redo on Ctrl+Y", () => {
    renderHook(() => useUndoRedo());
    fireEvent.keyDown(window, { key: "y", ctrlKey: true });
    expect(redo).toHaveBeenCalledOnce();
  });

  it("does not call redo on Shift+Z without a modifier", () => {
    renderHook(() => useUndoRedo());
    fireEvent.keyDown(window, { key: "z", shiftKey: true });
    expect(undo).not.toHaveBeenCalled();
    expect(redo).not.toHaveBeenCalled();
  });

  it("prevents default on Cmd+Z", () => {
    renderHook(() => useUndoRedo());
    const event = new KeyboardEvent("keydown", {
      key: "z",
      metaKey: true,
      cancelable: true,
      bubbles: true,
    });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("prevents default on Cmd+Shift+Z", () => {
    renderHook(() => useUndoRedo());
    const event = new KeyboardEvent("keydown", {
      key: "z",
      metaKey: true,
      shiftKey: true,
      cancelable: true,
      bubbles: true,
    });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("removes the keydown listener on unmount", () => {
    const { unmount } = renderHook(() => useUndoRedo());
    unmount();
    fireEvent.keyDown(window, { key: "z", metaKey: true });
    expect(undo).not.toHaveBeenCalled();
  });
});
