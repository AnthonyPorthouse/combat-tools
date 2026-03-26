import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";

import type { Vector2 } from "../lib/vector2";
import type { Token } from "../types/token";

import { Board } from "../components/Board";
import { ConfirmModal } from "../components/ConfirmModal";
import { ContextMenu } from "../components/ContextMenu";
import { CreateTokenModal } from "../components/CreateTokenModal";
import { CursorTracker } from "../components/CursorTracker";
import { DebuggerOverlay } from "../components/DebuggerOverlay";
import { EditTokenModal } from "../components/EditTokenModal";
import { TokenDisplay } from "../components/Token";
import { TokenLibraryOverlay } from "../components/TokenLibraryOverlay";
import { CameraProvider } from "../contexts/CameraProvider";
import { useDebuggerOverlay } from "../hooks/useDebuggerOverlay";
import { useLibraryDrop } from "../hooks/useLibraryDrop";
import { useCombatStore } from "../stores/combatStore";
import { useLibraryStore } from "../stores/libraryStore";

export const Route = createFileRoute("/combat")({
  component: RouteComponent,
});

/** Grid cell size in world-space units — must match the value passed to GridOverlay. */
const GRID_SIZE = 64;

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
      <CombatContent />
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

  const { gridCell } = useDebuggerOverlay({
    gridSize: GRID_SIZE,
    containerRef: combatContainerRef,
  });

  const [showCursorTracker, _setShowCursorTracker] = useState(false);
  const [hoveredTokenName, setHoveredTokenName] = useState<string | null>(null);
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
  const removeToken = useCombatStore((state) => state.removeToken);
  const updateToken = useCombatStore((state) => state.updateToken);

  const tokenLibrary = useLibraryStore((state) => state.tokenLibrary);
  const addToLibrary = useLibraryStore((state) => state.addToLibrary);
  const removeFromLibrary = useLibraryStore((state) => state.removeFromLibrary);
  const updateInLibrary = useLibraryStore((state) => state.updateInLibrary);

  const draggedTokenRef = useRef<Token | null>(null);

  const handleTokenHover = useCallback((name: string | null) => {
    setHoveredTokenName(name);
  }, []);

  const handleTokenMove = useCallback(
    (id: string, newPosition: Vector2) => {
      moveToken(id, newPosition);
    },
    [moveToken],
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
    <div ref={handleCombatContainerRef} className="relative flex-grow" {...dropAreaProps}>
      {containerEl && (
        <Board container={containerEl} gridSize={GRID_SIZE}>
          {tokenPlacementsList.map(({ token, position }) => {
            const obstacles = tokenPlacementsList
              .filter((p) => p.token.id !== token.id)
              .map((p) => ({ position: p.position, size: p.token.size }));

            return (
              <TokenDisplay
                key={token.id}
                token={token}
                position={position}
                gridSize={GRID_SIZE}
                onMove={handleTokenMove}
                onHoverChange={handleTokenHover}
                movementSpeed={MOVEMENT_SPEED}
                obstacles={obstacles}
                onContextMenu={(t, x, y) => handleTokenContextMenu(t, x, y, "board")}
              />
            );
          })}
          {showCursorTracker && <CursorTracker />}
        </Board>
      )}

      <DebuggerOverlay gridCell={gridCell} hoveredToken={hoveredTokenName} />
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
