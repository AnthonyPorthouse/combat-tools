import { beforeEach, describe, it, expect } from "vitest";

import type { GroupDragState } from "./selectionStore";

import {
  useSelectionStore,
  flagTokenPointerDown,
  consumeTokenPointerDownFlag,
} from "./selectionStore";

beforeEach(() => {
  useSelectionStore.setState({ selectedIds: new Set<string>(), groupDragState: null });
  // Drain any leftover module-level flag state
  consumeTokenPointerDownFlag();
});

describe("useSelectionStore", () => {
  describe("initial state", () => {
    it("starts with an empty selectedIds set", () => {
      expect(useSelectionStore.getState().selectedIds.size).toBe(0);
    });

    it("starts with groupDragState as null", () => {
      expect(useSelectionStore.getState().groupDragState).toBeNull();
    });
  });

  describe("setSelection", () => {
    it("replaces selectedIds with the provided ids", () => {
      useSelectionStore.getState().setSelection(["a", "b"]);
      expect(useSelectionStore.getState().selectedIds).toEqual(new Set(["a", "b"]));
    });

    it("clears all ids when passed an empty array", () => {
      useSelectionStore.getState().setSelection(["a", "b"]);
      useSelectionStore.getState().setSelection([]);
      expect(useSelectionStore.getState().selectedIds.size).toBe(0);
    });

    it("overwrites a previous selection entirely", () => {
      useSelectionStore.getState().setSelection(["a"]);
      useSelectionStore.getState().setSelection(["b", "c"]);
      const { selectedIds } = useSelectionStore.getState();
      expect(selectedIds).toEqual(new Set(["b", "c"]));
      expect(selectedIds.has("a")).toBe(false);
    });
  });

  describe("toggleSelection", () => {
    it("adds an id that is not currently selected", () => {
      useSelectionStore.getState().toggleSelection("x");
      expect(useSelectionStore.getState().selectedIds.has("x")).toBe(true);
    });

    it("removes an id that is currently selected", () => {
      useSelectionStore.getState().setSelection(["x"]);
      useSelectionStore.getState().toggleSelection("x");
      expect(useSelectionStore.getState().selectedIds.has("x")).toBe(false);
    });

    it("leaves other ids intact when toggling one", () => {
      useSelectionStore.getState().setSelection(["a", "b"]);
      useSelectionStore.getState().toggleSelection("a");
      expect(useSelectionStore.getState().selectedIds.has("b")).toBe(true);
    });
  });

  describe("clearSelection", () => {
    it("empties selectedIds when called", () => {
      useSelectionStore.getState().setSelection(["a", "b"]);
      useSelectionStore.getState().clearSelection();
      expect(useSelectionStore.getState().selectedIds.size).toBe(0);
    });

    it("is a no-op when selection is already empty", () => {
      useSelectionStore.getState().clearSelection();
      expect(useSelectionStore.getState().selectedIds.size).toBe(0);
    });
  });

  describe("setGroupDragState", () => {
    const sampleState: GroupDragState = {
      leaderTokenScreenPos: { x: 10, y: 20 },
      ghostScreenPos: { x: 15, y: 25 },
      leaderPosition: { x: 1, y: 2 },
      leaderTargetCell: { col: 3, row: 4 },
    };

    it("sets groupDragState to the provided object", () => {
      useSelectionStore.getState().setGroupDragState(sampleState);
      expect(useSelectionStore.getState().groupDragState).toEqual(sampleState);
    });

    it("clears groupDragState when called with null", () => {
      useSelectionStore.getState().setGroupDragState(sampleState);
      useSelectionStore.getState().setGroupDragState(null);
      expect(useSelectionStore.getState().groupDragState).toBeNull();
    });

    it("accepts a GroupDragState with leaderTargetCell as null", () => {
      useSelectionStore.getState().setGroupDragState({ ...sampleState, leaderTargetCell: null });
      expect(useSelectionStore.getState().groupDragState?.leaderTargetCell).toBeNull();
    });
  });
});

describe("flagTokenPointerDown / consumeTokenPointerDownFlag", () => {
  beforeEach(() => {
    consumeTokenPointerDownFlag();
  });

  it("consumeTokenPointerDownFlag returns false before any flag is set", () => {
    expect(consumeTokenPointerDownFlag()).toBe(false);
  });

  it("returns true after flagTokenPointerDown is called", () => {
    flagTokenPointerDown();
    expect(consumeTokenPointerDownFlag()).toBe(true);
  });

  it("resets to false on a second consume", () => {
    flagTokenPointerDown();
    consumeTokenPointerDownFlag();
    expect(consumeTokenPointerDownFlag()).toBe(false);
  });

  it("flagging twice still returns true on first consume", () => {
    flagTokenPointerDown();
    flagTokenPointerDown();
    expect(consumeTokenPointerDownFlag()).toBe(true);
  });
});
