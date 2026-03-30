import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

import type { Vector2 } from "../lib/vector2";
import type { Token } from "../types/token";

import { Board } from "../components/Board";
import { ConfirmModal } from "../components/ConfirmModal";
import { ContextMenu } from "../components/ContextMenu";
import { CreateTokenModal } from "../components/CreateTokenModal";
import { CursorTracker } from "../components/CursorTracker";
import { DebuggerOverlay } from "../components/DebuggerOverlay";
import { EditTokenModal } from "../components/EditTokenModal";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { LassoSelector } from "../components/LassoSelector";
import { TokenDisplay } from "../components/Token";
import { TokenLibraryOverlay } from "../components/TokenLibraryOverlay";
import { CameraProvider } from "../contexts/CameraProvider";
import { DebuggerProvider } from "../contexts/DebuggerProvider";
import { useCamera } from "../hooks/useCamera";
import { useDebuggerOverlay } from "../hooks/useDebuggerOverlay";
import { useLibraryDrop } from "../hooks/useLibraryDrop";
import { useUndoRedo } from "../hooks/useUndoRedo";
import { useCombatStore } from "../stores/combatStore";
import { useLibraryStore } from "../stores/libraryStore";
import { useSelectionStore } from "../stores/selectionStore";
import { screenToWorld, worldToGridCell } from "../utils/cameraMath";

export const Route = createFileRoute("/combat")({
  component: RouteComponent,
});

/** Grid cell size in world-space units — must match the value passed to GridOverlay. */
const GRID_SIZE = 64;

const BOARD_FALLBACK = (
  <div className="flex flex-grow flex-col items-center justify-center gap-3 rounded-md border border-slate-400/45 bg-slate-900/80 font-mono">
    <p className="text-sm text-slate-200">The game board failed to load.</p>
    <p className="text-xs text-slate-500">WebGL may be unavailable. Try refreshing the page.</p>
  </div>
);

/** Token movement speed in cells per second. */
const MOVEMENT_SPEED = 5;

type ContextMenuState = {
  token: Token;
  x: number;
  y: number;
  source: "library" | "board";
};

function RouteComponent() {
  return (
    <CameraProvider>
      <DebuggerProvider>
        <CombatContent />
      </DebuggerProvider>
    </CameraProvider>
  );
}

function CombatContent() {
  const combatContainerRef = useRef<HTMLDivElement | null>(null);
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);

  const handleCombatContainerRef = useCallback((el: HTMLDivElement | null) => {
    combatContainerRef.current = el;
    setContainerEl(el);
  }, []);

  const { camera } = useCamera();
  const { entries, set, remove } = useDebuggerOverlay();

  const cameraRef = useRef(camera);
  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const canvas = combatContainerRef.current?.querySelector("canvas");
      if (!canvas) {
        set("grid", "(--, --)");
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      if (!inside) {
        set("grid", "(--, --)");
        return;
      }
      const screen = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const cell = worldToGridCell(screenToWorld(screen, cameraRef.current), GRID_SIZE);
      set("grid", `(${cell.col}, ${cell.row})`);
    };
    globalThis.addEventListener("pointermove", handlePointerMove);
    return () => globalThis.removeEventListener("pointermove", handlePointerMove);
  }, [combatContainerRef, set]);

  // Undo/redo keyboard bindings (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl+Y)
  useUndoRedo();

  const [showCursorTracker, _setShowCursorTracker] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [editingToken, setEditingToken] = useState<{
    token: Token;
    source: "library" | "board";
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    token: Token;
    source: "library" | "board";
  } | null>(null);

  const tokenPlacements = useCombatStore((state) => state.tokenPlacements);
  const addToken = useCombatStore((state) => state.addToken);
  const moveToken = useCombatStore((state) => state.moveToken);
  const moveTokens = useCombatStore((state) => state.moveTokens);
  const removeToken = useCombatStore((state) => state.removeToken);
  const updateToken = useCombatStore((state) => state.updateToken);

  const tokenLibrary = useLibraryStore((state) => state.tokenLibrary);
  const addToLibrary = useLibraryStore((state) => state.addToLibrary);
  const removeFromLibrary = useLibraryStore((state) => state.removeFromLibrary);
  const updateInLibrary = useLibraryStore((state) => state.updateInLibrary);

  // ---------------------------------------------------------------------------
  // Selection
  // ---------------------------------------------------------------------------

  const selectedIds = useSelectionStore((state) => state.selectedIds);
  const setSelection = useSelectionStore((state) => state.setSelection);
  const clearSelection = useSelectionStore((state) => state.clearSelection);

  // ---------------------------------------------------------------------------
  // Group move coordination
  // ---------------------------------------------------------------------------

  /**
   * Tracks a pending group move: all tokens in the group, their target
   * positions, and how many animations are still outstanding.
   *
   * When `pendingCount` reaches 0, `moveTokens` is called once with all
   * targets — a single undo step for the entire group move.
   */
  const pendingGroupMoveRef = useRef<{
    targets: Record<string, Vector2>;
    pendingCount: number;
  } | null>(null);

  /** Targets dispatched to non-leader followers so their animations start. */
  const [groupMoveTargets, setGroupMoveTargets] = useState<Record<string, Vector2>>({});

  /**
   * Called by the leader `TokenDisplay` just before it starts animating.
   * Computes and dispatches targets to all other selected (non-locked) tokens.
   */
  const handleGroupMoveInitiate = useCallback(
    (leaderId: string, leaderNewPos: Vector2) => {
      const leaderPlacement = tokenPlacements[leaderId];
      if (!leaderPlacement || selectedIds.size <= 1) return;

      const delta = {
        x: leaderNewPos.x - leaderPlacement.position.x,
        y: leaderNewPos.y - leaderPlacement.position.y,
      };

      const targets: Record<string, Vector2> = { [leaderId]: leaderNewPos };
      const followerTargets: Record<string, Vector2> = {};

      for (const id of selectedIds) {
        if (id === leaderId) continue;
        const p = tokenPlacements[id];
        if (!p || p.token.locked) continue;
        const target = { x: p.position.x + delta.x, y: p.position.y + delta.y };
        targets[id] = target;
        followerTargets[id] = target;
      }

      pendingGroupMoveRef.current = {
        targets,
        pendingCount: Object.keys(targets).length,
      };
      setGroupMoveTargets(followerTargets);
    },
    [tokenPlacements, selectedIds],
  );

  /**
   * Called when a follower token cannot reach its group-move target (path === null).
   * Decrements the pending count and commits the group if all others have settled.
   */
  const handleGroupMemberSkipped = useCallback(
    (id: string) => {
      const pending = pendingGroupMoveRef.current;
      if (!pending || !(id in pending.targets)) return;
      delete pending.targets[id];
      pending.pendingCount--;
      if (pending.pendingCount === 0) {
        const targets = { ...pending.targets };
        pendingGroupMoveRef.current = null;
        moveTokens(targets);
      }
    },
    [moveTokens],
  );

  // ---------------------------------------------------------------------------
  // Token move commit
  // ---------------------------------------------------------------------------

  /**
   * Called by each `TokenDisplay` when its animation completes.
   *
   * For group moves: all tokens in the group skip individual commits; the last
   * one to finish triggers a single `moveTokens` call — one undo step total.
   *
   * For single-token moves: delegates directly to `moveToken`.
   */
  const handleTokenMove = useCallback(
    (id: string, newPosition: Vector2) => {
      const pending = pendingGroupMoveRef.current;
      if (pending && id in pending.targets) {
        pending.pendingCount--;
        if (pending.pendingCount === 0) {
          const targets = { ...pending.targets };
          pendingGroupMoveRef.current = null;
          moveTokens(targets);
        }
        // Skip individual commit — group commit will handle it.
        return;
      }
      moveToken(id, newPosition);
    },
    [moveToken, moveTokens],
  );

  // ---------------------------------------------------------------------------
  // Library drag-drop
  // ---------------------------------------------------------------------------

  const draggedTokenRef = useRef<Token | null>(null);

  const handleTokenHover = useCallback(
    (token: Token | null) => {
      if (token !== null) {
        set("token/id", token.id);
        set("token/name", token.name);
      } else {
        remove("token/id");
        remove("token/name");
      }
    },
    [set, remove],
  );

  const handleLibraryDrop = useCallback(
    (token: Token, position: Vector2) => {
      addToken(token, position);
    },
    [addToken],
  );

  const handleCreateToken = useCallback(
    (token: Token) => {
      addToLibrary(token);
      setIsCreateModalOpen(false);
    },
    [addToLibrary],
  );

  const handleTokenContextMenu = useCallback(
    (token: Token, x: number, y: number, source: "library" | "board") => {
      setContextMenu({ token, x, y, source });
    },
    [],
  );

  const handleEditSubmit = useCallback(
    (token: Token) => {
      if (!editingToken) return;
      if (editingToken.source === "library") {
        updateInLibrary(token);
      } else {
        updateToken(token);
      }
      setEditingToken(null);
    },
    [editingToken, updateInLibrary, updateToken],
  );

  const handleConfirmDelete = useCallback(() => {
    if (!confirmDelete) return;
    if (confirmDelete.source === "library") {
      removeFromLibrary(confirmDelete.token.id);
    } else {
      removeToken(confirmDelete.token.id);
    }
    setConfirmDelete(null);
  }, [confirmDelete, removeFromLibrary, removeToken]);

  const { dropAreaProps } = useLibraryDrop({
    containerRef: combatContainerRef,
    gridSize: GRID_SIZE,
    draggedTokenRef,
    onDrop: handleLibraryDrop,
  });

  const tokenPlacementsList = Object.values(tokenPlacements);

  const contextMenuItems = contextMenu
    ? [
        {
          label: "Edit",
          onClick: () => {
            setEditingToken({ token: contextMenu.token, source: contextMenu.source });
          },
        },
        {
          label: "Delete",
          danger: true,
          onClick: () => {
            setConfirmDelete({ token: contextMenu.token, source: contextMenu.source });
          },
        },
      ]
    : [];

  return (
    <div ref={handleCombatContainerRef} className="relative h-full" {...dropAreaProps}>
      {containerEl && (
        <ErrorBoundary fallback={BOARD_FALLBACK}>
          <Board container={containerEl} gridSize={GRID_SIZE}>
            {tokenPlacementsList.map(({ token, position }) => {
              const isSelected = selectedIds.has(token.id);
              const obstacles = tokenPlacementsList
                .filter((p) => {
                  if (p.token.id === token.id) return false;
                  if (isSelected && selectedIds.has(p.token.id)) return false;
                  return true;
                })
                .map((p) => ({ position: p.position, size: p.token.size }));

              return (
                <TokenDisplay
                  key={token.id}
                  token={token}
                  position={position}
                  gridSize={GRID_SIZE}
                  onMove={handleTokenMove}
                  isSelected={selectedIds.has(token.id)}
                  onGroupMoveInitiate={handleGroupMoveInitiate}
                  forceMoveTarget={groupMoveTargets[token.id] ?? null}
                  onGroupMemberSkipped={handleGroupMemberSkipped}
                  onHoverChange={handleTokenHover}
                  movementSpeed={MOVEMENT_SPEED}
                  obstacles={obstacles}
                  onContextMenu={(t, x, y) => handleTokenContextMenu(t, x, y, "board")}
                />
              );
            })}
            <LassoSelector
              tokenPlacements={tokenPlacements}
              gridSize={GRID_SIZE}
              onLassoSelect={(ids) => {
                if (ids.length > 0) {
                  setSelection(ids);
                } else {
                  clearSelection();
                }
              }}
            />
            {showCursorTracker && <CursorTracker />}
          </Board>
        </ErrorBoundary>
      )}

      <DebuggerOverlay entries={entries} />
      <TokenLibraryOverlay
        tokens={tokenLibrary}
        draggedTokenRef={draggedTokenRef}
        onDragEnd={() => {
          draggedTokenRef.current = null;
        }}
        onCreateToken={() => setIsCreateModalOpen(true)}
        onTokenContextMenu={(token, x, y) => handleTokenContextMenu(token, x, y, "library")}
      />

      {contextMenu && (
        <ContextMenu
          position={{ x: contextMenu.x, y: contextMenu.y }}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}

      <CreateTokenModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateToken}
      />

      <EditTokenModal
        isOpen={editingToken !== null}
        onClose={() => setEditingToken(null)}
        onSubmit={handleEditSubmit}
        initialToken={editingToken?.token ?? null}
      />

      <ConfirmModal
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Token"
        description={
          confirmDelete
            ? confirmDelete.source === "library"
              ? `Remove "${confirmDelete.token.name}" from the library? This won't affect tokens already on the board.`
              : `Remove "${confirmDelete.token.name}" from the board?`
            : ""
        }
      />
    </div>
  );
}
