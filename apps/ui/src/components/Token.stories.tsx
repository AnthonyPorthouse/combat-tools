import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { useCallback, useState } from "react";
import { expect, fn, waitFor } from "storybook/test";

import type { Vector2 } from "../lib/vector2";

import { CameraProvider } from "../contexts/CameraProvider";
import { createToken, type Token, type TokenSize } from "../types/token";
import { Board } from "./Board";
import { TokenDisplay } from "./Token";

/** Wraps Token stories in a full-viewport container so Pixi's resizeTo=window
 * has a measurable height to fill. */
const fullViewportDecorator: Decorator = (Story) => (
  <div style={{ width: "100%", height: "100vh", overflow: "hidden" }}>
    <Story />
  </div>
);

const cameraProviderDecorator: Decorator = (Story) => (
  <CameraProvider>
    <Story />
  </CameraProvider>
);

const GRID_SIZE = 64;
const INITIAL_POSITION: Vector2 = { x: 2, y: 2 };

// Stable token instances at module level so play functions share the same ID.
const DRAG_TOKEN = createToken("Fighter");
const LOCKED_TOKEN = createToken("Paladin", 1, undefined, true);
const ANIM_TOKEN = createToken("Ranger");
const MOVER_TOKEN = createToken("Warden");
const OBSTACLE_TOKEN = createToken("Goblin");
const LARGE_PATH_TOKEN = createToken("Dragon", 3);
const NARROW_GAP_WALL_NORTH = createToken("Wall N", 1, undefined, true);
const NARROW_GAP_WALL_SOUTH = createToken("Wall S", 1, undefined, true);
const SNAP_TOKEN = createToken("Snap Token");
const SNAP_OBSTACLE = createToken("Wall", 1, undefined, true);

type StoryArgs = {
  onMove: (id: string, newPosition: Vector2) => void;
  onHoverChange: (token: Token | null) => void;
};

const meta: Meta<StoryArgs> = {
  title: "Combat/Token",
  decorators: [fullViewportDecorator, cameraProviderDecorator],
  parameters: {
    layout: "fullscreen",
  },
  args: {
    onMove: fn(),
    onHoverChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Coordinate reference (GRID_SIZE=64, zoom=1, pan={0,0}):
 *  Token at grid (2,2) → screenX=128, screenY=128, screenRadius=32
 *  Token centre on screen: (160, 160)
 *  click → offset=(32,32)
 *
 *  Drag to cell (3,2): ghost=(192,128) → cursor=(224,160)
 *  Drag to cell (4,2): ghost=(256,128) → cursor=(288,160)
 */
const TOKEN_CENTER_X = 160;
const TOKEN_CENTER_Y = 160;
const DRAG_TARGET_X = 224; // one cell (64px) to the right → cell (3,2)
const DRAG_TARGET_Y = 160;
// Obstacle at (3,2); routing to cell (4,2) requires A* to path around it.
const OBSTACLE_ROUTE_TARGET_X = 288;
const OBSTACLE_ROUTE_TARGET_Y = 160;
/** Large-token (size=3) at grid (0,1):
 *  worldPos=(0,64), screenPos=(0,64), screenRadius=96, screen centre=(96,160)
 *  Drag to cell (6,1): ghost=(384,64) → cursor=(384+96, 64+96)=(480,160) */
const LARGE_TOKEN_CENTER_X = 96;
const LARGE_TOKEN_CENTER_Y = 160;
const LARGE_TOKEN_DRAG_TARGET_X = 480;
const LARGE_TOKEN_DRAG_TARGET_Y = 160;

/** Fires a pointer event on the canvas at the given client coordinates. */
function firePointer(canvas: HTMLCanvasElement, type: string, x: number, y: number, button = 0) {
  canvas.dispatchEvent(
    new PointerEvent(type, {
      clientX: x,
      clientY: y,
      button,
      bubbles: true,
      isPrimary: true,
      pointerId: 1,
    }),
  );
}

/** Stateful wrapper that syncs position after a move callback, and also
 * forwards the call to the provided spy so interaction tests can assert on it. */
function TokenWithState({
  token,
  onMove,
  onHoverChange,
  movementSpeed,
}: {
  token: typeof DRAG_TOKEN;
  onMove: StoryArgs["onMove"];
  onHoverChange: StoryArgs["onHoverChange"];
  movementSpeed?: number;
}) {
  const [position, setPosition] = useState<Vector2>(INITIAL_POSITION);

  const handleMove = useCallback(
    (id: string, newPosition: Vector2) => {
      setPosition(newPosition);
      onMove(id, newPosition);
    },
    [onMove],
  );

  return (
    <Board gridSize={GRID_SIZE}>
      <TokenDisplay
        token={token}
        position={position}
        gridSize={GRID_SIZE}
        onMove={handleMove}
        onHoverChange={onHoverChange}
        movementSpeed={movementSpeed}
      />
    </Board>
  );
}

/** Stateful wrapper for two tokens — mover and obstacle — each aware of the other.
 *  MOVER_TOKEN starts at (2,2); OBSTACLE_TOKEN sits at (3,2) blocking the direct path. */
function MultiTokenWithState({ onMove, onHoverChange }: StoryArgs) {
  const [positions, setPositions] = useState<Map<string, Vector2>>(
    () =>
      new Map([
        [MOVER_TOKEN.id, { x: 2, y: 2 }],
        [OBSTACLE_TOKEN.id, { x: 3, y: 2 }],
      ]),
  );

  const handleMove = useCallback(
    (id: string, newPosition: Vector2) => {
      setPositions((prev) => {
        const next = new Map(prev);
        next.set(id, newPosition);
        return next;
      });
      onMove(id, newPosition);
    },
    [onMove],
  );

  const placements = [
    { token: MOVER_TOKEN, position: positions.get(MOVER_TOKEN.id)! },
    { token: OBSTACLE_TOKEN, position: positions.get(OBSTACLE_TOKEN.id)! },
  ];

  return (
    <Board gridSize={GRID_SIZE}>
      {placements.map(({ token, position }) => (
        <TokenDisplay
          key={token.id}
          token={token}
          position={position}
          gridSize={GRID_SIZE}
          onMove={handleMove}
          onHoverChange={onHoverChange}
          movementSpeed={20}
          obstacles={placements
            .filter((p) => p.token.id !== token.id)
            .map((p) => ({ position: p.position, size: p.token.size }))}
        />
      ))}
    </Board>
  );
}

/** Stateful wrapper: SNAP_TOKEN at (2,2) with a locked SNAP_OBSTACLE at (3,2).
 *  Dropping the mover directly onto the obstacle cell should snap to the nearest free cell. */
function BlockedDropState({ onMove, onHoverChange }: StoryArgs) {
  const [snapPos, setSnapPos] = useState<Vector2>({ x: 2, y: 2 });
  const obstaclePos: Vector2 = { x: 3, y: 2 };

  const handleMove = useCallback(
    (id: string, newPosition: Vector2) => {
      setSnapPos(newPosition);
      onMove(id, newPosition);
    },
    [onMove],
  );

  return (
    <Board gridSize={GRID_SIZE}>
      <TokenDisplay
        token={SNAP_TOKEN}
        position={snapPos}
        gridSize={GRID_SIZE}
        onMove={handleMove}
        onHoverChange={onHoverChange}
        movementSpeed={20}
        obstacles={[{ position: obstaclePos, size: SNAP_OBSTACLE.size }]}
      />
      <TokenDisplay
        token={SNAP_OBSTACLE}
        position={obstaclePos}
        gridSize={GRID_SIZE}
        onMove={onMove}
        onHoverChange={onHoverChange}
      />
    </Board>
  );
}

/** Stateful wrapper: 3×3 Dragon at (0,1) with two locked 1×1 wall tokens at (4,2) and (4,4).
 *  The 1-cell gap between the walls at column 4 is too narrow for the Dragon's footprint. */
function LargeTokenNarrowGapState({ onMove, onHoverChange }: StoryArgs) {
  const [dragonPos, setDragonPos] = useState<Vector2>({ x: 0, y: 1 });

  const wallNorthPos: Vector2 = { x: 4, y: 2 };
  const wallSouthPos: Vector2 = { x: 4, y: 4 };

  const handleMove = useCallback(
    (id: string, newPosition: Vector2) => {
      setDragonPos(newPosition);
      onMove(id, newPosition);
    },
    [onMove],
  );

  const wallObstacles = [
    { position: wallNorthPos, size: NARROW_GAP_WALL_NORTH.size },
    { position: wallSouthPos, size: NARROW_GAP_WALL_SOUTH.size },
  ];

  return (
    <Board gridSize={GRID_SIZE}>
      <TokenDisplay
        token={LARGE_PATH_TOKEN}
        position={dragonPos}
        gridSize={GRID_SIZE}
        onMove={handleMove}
        onHoverChange={onHoverChange}
        movementSpeed={20}
        obstacles={wallObstacles}
      />
      <TokenDisplay
        token={NARROW_GAP_WALL_NORTH}
        position={wallNorthPos}
        gridSize={GRID_SIZE}
        onMove={onMove}
        onHoverChange={onHoverChange}
      />
      <TokenDisplay
        token={NARROW_GAP_WALL_SOUTH}
        position={wallSouthPos}
        gridSize={GRID_SIZE}
        onMove={onMove}
        onHoverChange={onHoverChange}
      />
    </Board>
  );
}

// ---------------------------------------------------------------------------
// Visual stories
// ---------------------------------------------------------------------------

/** A standard unlocked 1×1 token — white circle with name label. */
export const Default: Story = {
  render: ({ onMove, onHoverChange }) => (
    <Board gridSize={GRID_SIZE}>
      <TokenDisplay
        token={createToken("Ranger")}
        position={INITIAL_POSITION}
        gridSize={GRID_SIZE}
        onMove={onMove}
        onHoverChange={onHoverChange}
      />
    </Board>
  ),
};

/** A locked token — pointer stays as "default" and the token cannot be dragged. */
export const Locked: Story = {
  render: ({ onMove, onHoverChange }) => (
    <Board gridSize={GRID_SIZE}>
      <TokenDisplay
        token={createToken("Goblin King", 1, undefined, true)}
        position={INITIAL_POSITION}
        gridSize={GRID_SIZE}
        onMove={onMove}
        onHoverChange={onHoverChange}
      />
    </Board>
  ),
};

/** A half-cell (size 0.5) token centred within its grid cell. */
export const SmallToken: Story = {
  render: ({ onMove, onHoverChange }) => (
    <Board gridSize={GRID_SIZE}>
      <TokenDisplay
        token={createToken("Sprite", 0.5)}
        position={INITIAL_POSITION}
        gridSize={GRID_SIZE}
        onMove={onMove}
        onHoverChange={onHoverChange}
      />
    </Board>
  ),
};

/** A size-4 token occupying a 4×4 cell area. */
export const LargeToken: Story = {
  render: ({ onMove, onHoverChange }) => (
    <Board gridSize={GRID_SIZE}>
      <TokenDisplay
        token={createToken("Dragon", 4)}
        position={INITIAL_POSITION}
        gridSize={GRID_SIZE}
        onMove={onMove}
        onHoverChange={onHoverChange}
      />
    </Board>
  ),
};

/** A token with a portrait image — verifies texture scaling fills the circle. */
export const WithImage: StoryObj<StoryArgs & { size?: TokenSize }> = {
  argTypes: {
    size: {
      options: [0.5, 1, 2, 3, 4],
      control: { type: "select" },
    },
  },

  args: {
    size: 1,
  },

  render: ({ onMove, onHoverChange, size = 1 }) => (
    <Board gridSize={GRID_SIZE}>
      <TokenDisplay
        token={createToken("Goblin", size, "/tokens/goblin.png")}
        position={INITIAL_POSITION}
        gridSize={GRID_SIZE}
        onMove={onMove}
        onHoverChange={onHoverChange}
      />
    </Board>
  ),
};

/** Two tokens — MOVER_TOKEN at (2,2) and OBSTACLE_TOKEN at (3,2).
 *  Drag the left token rightward to see the white A* path route around
 *  the obstacle. No automated assertions; intended for manual inspection. */
export const WithObstacleToken: Story = {
  render: ({ onMove, onHoverChange }) => (
    <MultiTokenWithState onMove={onMove} onHoverChange={onHoverChange} />
  ),
};

// ---------------------------------------------------------------------------
// Interaction tests
// ---------------------------------------------------------------------------

/** Drag a token one cell to the right and verify the onMove callback receives
 * the snapped grid position { x: 3, y: 2 } once the slide animation completes. */
export const DragAndDrop: Story = {
  render: ({ onMove, onHoverChange }) => (
    <TokenWithState token={DRAG_TOKEN} onMove={onMove} onHoverChange={onHoverChange} />
  ),
  play: async ({ canvasElement, args }) => {
    const canvas = canvasElement.querySelector("canvas");
    if (!canvas) throw new Error("PixiJS canvas not found");

    // Wait for PixiJS to initialise its WebGL context and event system.
    await new Promise<void>((r) => setTimeout(r, 500));

    firePointer(canvas, "pointerdown", TOKEN_CENTER_X, TOKEN_CENTER_Y);
    firePointer(canvas, "pointermove", DRAG_TARGET_X, DRAG_TARGET_Y);
    firePointer(canvas, "pointerup", DRAG_TARGET_X, DRAG_TARGET_Y);

    // onMove is deferred until the slide animation completes.
    await waitFor(() => expect(args.onMove).toHaveBeenCalledWith(DRAG_TOKEN.id, { x: 3, y: 2 }));
  },
};

/** Attempt to drag a locked token — onMove must never be called. */
export const LockedCannotDrag: Story = {
  render: ({ onMove, onHoverChange }) => (
    <TokenWithState token={LOCKED_TOKEN} onMove={onMove} onHoverChange={onHoverChange} />
  ),
  play: async ({ canvasElement, args }) => {
    const canvas = canvasElement.querySelector("canvas");
    if (!canvas) throw new Error("PixiJS canvas not found");

    await new Promise<void>((r) => setTimeout(r, 500));

    firePointer(canvas, "pointerdown", TOKEN_CENTER_X, TOKEN_CENTER_Y);
    firePointer(canvas, "pointermove", DRAG_TARGET_X, DRAG_TARGET_Y);
    firePointer(canvas, "pointerup", DRAG_TARGET_X, DRAG_TARGET_Y);

    await expect(args.onMove).not.toHaveBeenCalled();
  },
};

/** Drop a token and verify onMove is called only after the slide animation
 * finishes — not at the moment of pointer-up.
 * movementSpeed=20 keeps the animation under 60ms so the test is fast. */
export const AnimatedMove: Story = {
  render: ({ onMove, onHoverChange }) => (
    <TokenWithState
      token={ANIM_TOKEN}
      onMove={onMove}
      onHoverChange={onHoverChange}
      movementSpeed={20}
    />
  ),
  play: async ({ canvasElement, args }) => {
    const canvas = canvasElement.querySelector("canvas");
    if (!canvas) throw new Error("PixiJS canvas not found");

    await new Promise<void>((r) => setTimeout(r, 500));

    firePointer(canvas, "pointerdown", TOKEN_CENTER_X, TOKEN_CENTER_Y);
    firePointer(canvas, "pointermove", DRAG_TARGET_X, DRAG_TARGET_Y);
    firePointer(canvas, "pointerup", DRAG_TARGET_X, DRAG_TARGET_Y);

    // onMove must NOT be called synchronously at pointer-up.
    await expect(args.onMove).not.toHaveBeenCalled();

    // After animation (≤60ms at speed 20), onMove fires with the target cell.
    await waitFor(() => expect(args.onMove).toHaveBeenCalledWith(ANIM_TOKEN.id, { x: 3, y: 2 }));
  },
};

/** MOVER_TOKEN at (2,2) with OBSTACLE_TOKEN at (3,2) blocking the direct route.
 *  Drag the mover to cell (4,2). A* routes around the obstacle; onMove is
 *  called with { x: 4, y: 2 } once the animated path is complete. */
export const PathAroundObstacle: Story = {
  render: ({ onMove, onHoverChange }) => (
    <MultiTokenWithState onMove={onMove} onHoverChange={onHoverChange} />
  ),
  play: async ({ canvasElement, args }) => {
    const canvas = canvasElement.querySelector("canvas");
    if (!canvas) throw new Error("PixiJS canvas not found");

    await new Promise<void>((r) => setTimeout(r, 500));

    // Click mover at (160,160); cursor (288,160) → ghost (256,128) → cell (4,2)
    firePointer(canvas, "pointerdown", TOKEN_CENTER_X, TOKEN_CENTER_Y);
    firePointer(canvas, "pointermove", OBSTACLE_ROUTE_TARGET_X, OBSTACLE_ROUTE_TARGET_Y);
    firePointer(canvas, "pointerup", OBSTACLE_ROUTE_TARGET_X, OBSTACLE_ROUTE_TARGET_Y);

    await waitFor(() => expect(args.onMove).toHaveBeenCalledWith(MOVER_TOKEN.id, { x: 4, y: 2 }));
  },
};

/** 3×3 Dragon at (0,1) with 1-wide gap between wall tokens at (4,2) and (4,4).
 *  Drag the Dragon rightward — the path lines should route around the gap, not through it. */
export const LargeTokenNarrowGap: Story = {
  render: ({ onMove, onHoverChange }) => (
    <LargeTokenNarrowGapState onMove={onMove} onHoverChange={onHoverChange} />
  ),
};

/** Drag the 3×3 Dragon from (0,1) to (6,1) with a 1-wide gap at column 4.
 *  The Dragon's footprint cannot fit through the gap; A* must route around it.
 *  onMove is called with { x: 6, y: 1 } once the animated path completes. */
export const LargeTokenRoutesAroundNarrowGap: Story = {
  render: ({ onMove, onHoverChange }) => (
    <LargeTokenNarrowGapState onMove={onMove} onHoverChange={onHoverChange} />
  ),
  play: async ({ canvasElement, args }) => {
    const canvas = canvasElement.querySelector("canvas");
    if (!canvas) throw new Error("PixiJS canvas not found");

    await new Promise<void>((r) => setTimeout(r, 500));

    firePointer(canvas, "pointerdown", LARGE_TOKEN_CENTER_X, LARGE_TOKEN_CENTER_Y);
    firePointer(canvas, "pointermove", LARGE_TOKEN_DRAG_TARGET_X, LARGE_TOKEN_DRAG_TARGET_Y);
    firePointer(canvas, "pointerup", LARGE_TOKEN_DRAG_TARGET_X, LARGE_TOKEN_DRAG_TARGET_Y);

    await waitFor(
      () => expect(args.onMove).toHaveBeenCalledWith(LARGE_PATH_TOKEN.id, { x: 6, y: 1 }),
      { timeout: 3000 },
    );
  },
};

/** Drop a token to start its animation, then immediately attempt a second drag.
 *  The second drag should be blocked (isAnimating=true). onMove is called
 *  exactly once — for the original drop — when the animation finishes. */
export const DragBlockedDuringAnimation: Story = {
  render: ({ onMove, onHoverChange }) => (
    <TokenWithState
      token={ANIM_TOKEN}
      onMove={onMove}
      onHoverChange={onHoverChange}
      movementSpeed={20}
    />
  ),
  play: async ({ canvasElement, args }) => {
    const canvas = canvasElement.querySelector("canvas");
    if (!canvas) throw new Error("PixiJS canvas not found");

    await new Promise<void>((r) => setTimeout(r, 500));

    // First drag — drops the token and starts animation.
    firePointer(canvas, "pointerdown", TOKEN_CENTER_X, TOKEN_CENTER_Y);
    firePointer(canvas, "pointermove", DRAG_TARGET_X, DRAG_TARGET_Y);
    firePointer(canvas, "pointerup", DRAG_TARGET_X, DRAG_TARGET_Y);

    // Wait one frame for React to re-render with isAnimating=true.
    await new Promise<void>((r) => setTimeout(r, 16));

    // Second drag attempt — should be blocked by isAnimating guard.
    firePointer(canvas, "pointerdown", TOKEN_CENTER_X, TOKEN_CENTER_Y);
    firePointer(canvas, "pointermove", 0, 0);
    firePointer(canvas, "pointerup", 0, 0);

    // Animation completes; onMove was called exactly once (first drag only).
    await waitFor(() => {
      expect(args.onMove).toHaveBeenCalledTimes(1);
      expect(args.onMove).toHaveBeenCalledWith(ANIM_TOKEN.id, { x: 3, y: 2 });
    });
  },
};

/** Drag SNAP_TOKEN directly onto the SNAP_OBSTACLE cell (3,2). The drop zone and
 *  the committed move must both snap to the nearest free cell — never the blocked one. */
export const DropOnBlockedCellSnapsToNearest: Story = {
  render: ({ onMove, onHoverChange }) => (
    <BlockedDropState onMove={onMove} onHoverChange={onHoverChange} />
  ),
  play: async ({ canvasElement, args }) => {
    const canvas = canvasElement.querySelector("canvas");
    if (!canvas) throw new Error("PixiJS canvas not found");

    await new Promise<void>((r) => setTimeout(r, 500));

    // Drag SNAP_TOKEN from its centre (160,160) onto the obstacle at (3,2) → cursor (224,160)
    firePointer(canvas, "pointerdown", TOKEN_CENTER_X, TOKEN_CENTER_Y);
    firePointer(canvas, "pointermove", DRAG_TARGET_X, DRAG_TARGET_Y);
    firePointer(canvas, "pointerup", DRAG_TARGET_X, DRAG_TARGET_Y);

    // onMove must be called once, and never with the blocked cell (3,2)
    await waitFor(() => {
      expect(args.onMove).toHaveBeenCalledTimes(1);
    });
    expect(args.onMove).not.toHaveBeenCalledWith(SNAP_TOKEN.id, { x: 3, y: 2 });
  },
};
