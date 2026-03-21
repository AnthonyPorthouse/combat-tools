import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useCallback, useState } from "react";
import type { Vector2 } from "../lib/vector2";
import { createToken } from "../types/token";
import type { Token } from "../types/token";
import { Board } from "./Board";
import { TokenDisplay } from "./Token";

/** Wraps Board stories in a full-viewport container so Pixi's resizeTo=window
 * has a measurable height to fill. */
const fullViewportDecorator: Decorator = (Story) => (
  <div style={{ width: "100%", height: "100vh", overflow: "hidden" }}>
    <Story />
  </div>
);

const GRID_SIZE = 64;

const meta: Meta<typeof Board> = {
  title: "Combat/Board",
  component: Board,
  decorators: [fullViewportDecorator],
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof Board>;

/** Renders the Board with no tokens — just the grid background. */
export const EmptyBoard: Story = {
  args: {
    gridSize: GRID_SIZE,
  },
};

type Placement = { token: Token; position: Vector2 };

/** A stateful wrapper that handles token movement callbacks for Board stories. */
function BoardWithTokens({
  gridSize,
  initialPlacements,
}: {
  gridSize: number;
  initialPlacements: Placement[];
}) {
  const [placements, setPlacements] = useState(initialPlacements);

  const handleMove = useCallback((id: string, newPosition: Vector2) => {
    setPlacements((prev) =>
      prev.map((p) => (p.token.id === id ? { ...p, position: newPosition } : p)),
    );
  }, []);

  return (
    <Board gridSize={gridSize}>
      {placements.map(({ token, position }) => (
        <TokenDisplay
          key={token.id}
          token={token}
          position={position}
          gridSize={gridSize}
          onMove={handleMove}
        />
      ))}
    </Board>
  );
}

/** A single standard (1×1) token — the baseline token story. */
export const SingleToken: Story = {
  render: () => (
    <BoardWithTokens
      gridSize={GRID_SIZE}
      initialPlacements={[{ token: createToken("Goblin", 1), position: { x: 2, y: 2 } }]}
    />
  ),
};

/** One token of each size (0.5, 1, 2, 3, 4) placed side by side. */
export const AllTokenSizes: Story = {
  render: () => (
    <BoardWithTokens
      gridSize={GRID_SIZE}
      initialPlacements={[
        { token: createToken("Tiny", 0.5), position: { x: 1, y: 2 } },
        { token: createToken("Small", 1), position: { x: 3, y: 2 } },
        { token: createToken("Medium", 2), position: { x: 5, y: 2 } },
        { token: createToken("Large", 3), position: { x: 8, y: 2 } },
        { token: createToken("Huge", 4), position: { x: 12, y: 2 } },
      ]}
    />
  ),
};

/** Multiple players vs. enemies with a large creature — a crowded encounter. */
export const GroupEncounter: Story = {
  render: () => (
    <BoardWithTokens
      gridSize={GRID_SIZE}
      initialPlacements={[
        { token: createToken("Player 1", 1), position: { x: 2, y: 3 } },
        { token: createToken("Player 2", 1), position: { x: 3, y: 3 } },
        { token: createToken("Player 3", 1), position: { x: 2, y: 4 } },
        { token: createToken("Goblin A", 1, "/tokens/goblin.png", true), position: { x: 6, y: 3 } },
        { token: createToken("Goblin B", 1, "/tokens/goblin.png", true), position: { x: 7, y: 3 } },
        { token: createToken("Goblin C", 1, "/tokens/goblin.png", true), position: { x: 6, y: 4 } },
        { token: createToken("Dragon", 4, undefined, true), position: { x: 5, y: 6 } },
      ]}
    />
  ),
};
