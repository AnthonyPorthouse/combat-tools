import type { Meta, StoryObj } from "@storybook/react-vite";

import { useRef } from "react";
import { fn } from "storybook/test";

import type { Token } from "../types/token";

import { createToken } from "../types/token";
import { TokenLibraryOverlay } from "./TokenLibraryOverlay";

const meta: Meta<typeof TokenLibraryOverlay> = {
  title: "Combat/TokenLibraryOverlay",
  component: TokenLibraryOverlay,
  parameters: {
    layout: "fullscreen",
    backgrounds: { default: "dark" },
  },
};

export default meta;
type Story = StoryObj<typeof TokenLibraryOverlay>;

function WithRef(props: { tokens: Token[]; onDragEnd: () => void; onCreateToken: () => void }) {
  const ref = useRef<Token | null>(null);
  return <TokenLibraryOverlay onTokenContextMenu={() => {}} {...props} draggedTokenRef={ref} />;
}

/** No tokens in the library yet. */
export const EmptyLibrary: Story = {
  render: ({ onDragEnd, onCreateToken }) => (
    <WithRef tokens={[]} onDragEnd={onDragEnd} onCreateToken={onCreateToken} />
  ),
  args: {
    onDragEnd: fn(),
    onCreateToken: fn(),
  },
};

/** Several tokens of varying sizes. */
export const WithTokens: Story = {
  render: ({ onDragEnd, onCreateToken }) => (
    <WithRef
      tokens={[
        createToken("Goblin", 1),
        createToken("Dragon", 4),
        createToken("Sprite", 0.5),
        createToken("Ogre", 2),
      ]}
      onDragEnd={onDragEnd}
      onCreateToken={onCreateToken}
    />
  ),
  args: {
    onDragEnd: fn(),
    onCreateToken: fn(),
  },
};

/** Many tokens — verifies scroll behaviour. */
export const LongList: Story = {
  render: ({ onDragEnd, onCreateToken }) => (
    <WithRef
      tokens={Array.from({ length: 20 }, (_, i) => createToken(`Token ${i + 1}`, 1))}
      onDragEnd={onDragEnd}
      onCreateToken={onCreateToken}
    />
  ),
  args: {
    onDragEnd: fn(),
    onCreateToken: fn(),
  },
};
