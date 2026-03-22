import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";
import { useCallback, useState } from "react";
import type { Vector2 } from "../lib/vector2";
import { createToken } from "../types/token";
import { Board } from "./Board";
import { TokenDisplay } from "./Token";

/** Wraps Token stories in a full-viewport container so Pixi's resizeTo=window
 * has a measurable height to fill. */
const fullViewportDecorator: Decorator = (Story) => (
  <div style={{ width: "100%", height: "100vh", overflow: "hidden" }}>
    <Story />
  </div>
);

const GRID_SIZE = 64;
const INITIAL_POSITION: Vector2 = { x: 2, y: 2 };

// Stable token instances at module level so play functions share the same ID.
const DRAG_TOKEN = createToken("Fighter");
const LOCKED_TOKEN = createToken("Paladin", 1, undefined, true);

type StoryArgs = {
  onMove: (id: string, newPosition: Vector2) => void;
  onHoverChange: (name: string | null) => void;
};

const meta: Meta<StoryArgs> = {
  title: "Combat/Token",
  decorators: [fullViewportDecorator],
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
 *  Drag cursor to (224, 160) → snapWorld=(192,128) → col=3, row=2
 */
const TOKEN_CENTER_X = 160;
const TOKEN_CENTER_Y = 160;
const DRAG_TARGET_X = 224; // one cell (64px) to the right
const DRAG_TARGET_Y = 160;

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
}: {
  token: typeof DRAG_TOKEN;
  onMove: StoryArgs["onMove"];
  onHoverChange: StoryArgs["onHoverChange"];
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

// ---------------------------------------------------------------------------
// Interaction tests
// ---------------------------------------------------------------------------

/** Drag a token one cell to the right and verify the onMove callback receives
 * the snapped grid position { x: 3, y: 2 }. */
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

    await expect(args.onMove).toHaveBeenCalledWith(DRAG_TOKEN.id, {
      x: 3,
      y: 2,
    });
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
