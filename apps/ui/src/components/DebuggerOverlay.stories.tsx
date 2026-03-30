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
    entries: new Map([["grid", "(--, --)"]]),
  },
};

/** Shows grid coordinates when the cursor is tracked. */
export const WithGridCell: Story = {
  args: {
    entries: new Map([["grid", "(5, 3)"]]),
  },
};

/** Shows both grid position and the hovered token name. */
export const WithHoveredToken: Story = {
  args: {
    entries: new Map([
      ["grid", "(5, 3)"],
      ["token", "Goblin"],
    ]),
  },
};

/** Validates display with negative coordinates (camera panned left/up). */
export const NegativeCoordinates: Story = {
  args: {
    entries: new Map([["grid", "(-12, -7)"]]),
  },
};
