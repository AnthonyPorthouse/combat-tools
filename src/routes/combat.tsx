import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";

import type { Vector2 } from "../lib/vector2";
import type { Token } from "../types/token";

import { Board } from "../components/Board";
import { CreateTokenModal } from "../components/CreateTokenModal";
import { CursorTracker } from "../components/CursorTracker";
import { DebuggerOverlay } from "../components/DebuggerOverlay";
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
  const [isModalOpen, setIsModalOpen] = useState(false);

  const tokenPlacements = useCombatStore((state) => state.tokenPlacements);
  const addToken = useCombatStore((state) => state.addToken);
  const moveToken = useCombatStore((state) => state.moveToken);

  const tokenLibrary = useLibraryStore((state) => state.tokenLibrary);
  const addToLibrary = useLibraryStore((state) => state.addToLibrary);

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
      setIsModalOpen(false);
    },
    [addToLibrary],
  );

  const { dropAreaProps } = useLibraryDrop({
    containerRef: combatContainerRef,
    gridSize: GRID_SIZE,
    draggedTokenRef,
    onDrop: handleLibraryDrop,
  });

  const tokenPlacementsList = Object.values(tokenPlacements);

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
        onCreateToken={() => setIsModalOpen(true)}
      />
      <CreateTokenModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateToken}
      />
    </div>
  );
}
