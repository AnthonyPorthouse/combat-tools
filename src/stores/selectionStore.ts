import { create } from "zustand";

import type { Vector2 } from "../lib/vector2";
import type { GridCell } from "../utils/cameraMath";

/**
 * Real-time drag state published by the leader token every pointer-move.
 * Follower tokens subscribe to this to derive their own ghost/path/drop-zone.
 */
export type GroupDragState = {
  /** Screen-space top-left of the leader token at the start of the drag. */
  leaderTokenScreenPos: Vector2;
  /** Leader's current ghost screen position (follows the cursor). */
  ghostScreenPos: Vector2;
  /** Leader's committed grid position (top-left). */
  leaderPosition: Vector2;
  /** Leader's resolved target grid cell (after pathfinding validation), or null if none yet. */
  leaderTargetCell: GridCell | null;
};

type SelectionState = {
  selectedIds: Set<string>;
  setSelection: (ids: string[]) => void;
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
  /** Non-null while a multi-token group drag is in progress. */
  groupDragState: GroupDragState | null;
  setGroupDragState: (state: GroupDragState | null) => void;
};

/**
 * Module-level flag (not reactive store state) set synchronously by
 * `TokenDisplay` when it handles a left-click via PixiJS. The lasso selector
 * reads and resets this flag in its DOM bubble listener, which fires AFTER
 * PixiJS has processed the same canvas DOM event, to distinguish token clicks
 * from empty-area clicks.
 */
let _tokenPointerDownHandled = false;

export function flagTokenPointerDown(): void {
  _tokenPointerDownHandled = true;
}

/** Returns true and resets the flag if a token claimed the last pointer-down. */
export function consumeTokenPointerDownFlag(): boolean {
  const was = _tokenPointerDownHandled;
  _tokenPointerDownHandled = false;
  return was;
}

export const useSelectionStore = create<SelectionState>()((set) => ({
  selectedIds: new Set<string>(),

  setSelection: (ids) => set({ selectedIds: new Set(ids) }),

  toggleSelection: (id) =>
    set((state) => {
      const next = new Set(state.selectedIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { selectedIds: next };
    }),

  clearSelection: () => set({ selectedIds: new Set<string>() }),

  groupDragState: null,
  setGroupDragState: (state) => set({ groupDragState: state }),
}));
