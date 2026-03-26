import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";

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
import { useTokenLibrary } from "../hooks/useTokenLibrary";
import { createToken } from "../types/token";

export const Route = createFileRoute("/combat")({
  component: RouteComponent,
});

/** Grid cell size in world-space units — must match the value passed to GridOverlay. */
const GRID_SIZE = 64;

/** Token movement speed in cells per second. */
const MOVEMENT_SPEED = 5;

type TokenPlacement = {
  token: Token;
  position: Vector2;
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
  const { gridCell } = useDebuggerOverlay({
    gridSize: GRID_SIZE,
    containerRef: combatContainerRef,
  });

  const [showCursorTracker, _setShowCursorTracker] = useState(false);

  const [seedTokens] = useState<Token[]>(() => [
    createToken("Goblin", 1),
    createToken("Sprite", 0.5),
  ]);

  const [tokenPlacements, setTokenPlacements] = useState<Map<string, TokenPlacement>>(() => {
    const map = new Map<string, TokenPlacement>();
    map.set(seedTokens[0].id, { token: seedTokens[0], position: { x: 0, y: 0 } });
    map.set(seedTokens[1].id, { token: seedTokens[1], position: { x: 2, y: 0 } });
    return map;
  });

  const [hoveredTokenName, setHoveredTokenName] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { tokenLibrary, addToLibrary } = useTokenLibrary(seedTokens);
  const draggedTokenRef = useRef<Token | null>(null);

  const handleTokenHover = useCallback((name: string | null) => {
    setHoveredTokenName(name);
  }, []);

  const handleTokenMove = useCallback((id: string, newPosition: Vector2) => {
    setTokenPlacements((prev) => {
      const placement = prev.get(id);
      if (!placement) return prev;
      const next = new Map(prev);
      next.set(id, { ...placement, position: newPosition });
      return next;
    });
  }, []);

  const handleLibraryDrop = useCallback((token: Token, position: Vector2) => {
    setTokenPlacements((prev) => {
      const next = new Map(prev);
      next.set(token.id, { token, position });
      return next;
    });
  }, []);

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

  const tokenPlacementsList = useMemo(() => [...tokenPlacements.values()], [tokenPlacements]);

  return (
    <div ref={combatContainerRef} className="relative flex-grow" {...dropAreaProps}>
      <Board container={combatContainerRef} gridSize={GRID_SIZE}>
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
