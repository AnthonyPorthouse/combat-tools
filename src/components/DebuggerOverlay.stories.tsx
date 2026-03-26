import type { Meta, StoryObj } from "@storybook/react-vite";

import { DebuggerOverlay } from "./DebuggerOverlay";

const meta: Meta<typeof DebuggerOverlay> = {
  title: "Combat/DebuggerOverlay",
  component: DebuggerOverlay,
  parameters: {
    layout: "padded",
    backgrounds: { default: "dark" },
  },
};

export default meta;
type Story = StoryObj<typeof DebuggerOverlay>;

/** Default state: cursor not tracked, no token hovered. */
export const NoData: Story = {
  args: {
    gridCell: null,
    hoveredToken: null,
  },
};

/** Shows grid coordinates when the cursor is tracked. */
export const WithGridCell: Story = {
  args: {
    gridCell: { col: 5, row: 3 },
    hoveredToken: null,
  },
};

/** Shows both grid position and the hovered token name. */
export const WithHoveredToken: Story = {
  args: {
    gridCell: { col: 5, row: 3 },
    hoveredToken: "Goblin",
  },
};

/** Validates display with negative coordinates (camera panned left/up). */
export const NegativeCoordinates: Story = {
  args: {
    gridCell: { col: -12, row: -7 },
    hoveredToken: null,
  },
};
