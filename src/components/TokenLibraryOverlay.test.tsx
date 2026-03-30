import { render, screen, fireEvent } from "@testing-library/react";
import { createRef } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import type { Token } from "../types/token";

import { TokenLibraryOverlay } from "./TokenLibraryOverlay";

const goblin: Token = { id: "t1", name: "Goblin", size: 1 };
const dragon: Token = { id: "t2", name: "Dragon", size: 2 };

function renderOverlay(overrides: Partial<React.ComponentProps<typeof TokenLibraryOverlay>> = {}) {
  const draggedTokenRef = createRef<Token | null>() as React.MutableRefObject<Token | null>;
  draggedTokenRef.current = null;
  const onDragEnd = vi.fn();
  const onCreateToken = vi.fn();
  const onTokenContextMenu = vi.fn();

  const result = render(
    <TokenLibraryOverlay
      tokens={[]}
      draggedTokenRef={draggedTokenRef}
      onDragEnd={onDragEnd}
      onCreateToken={onCreateToken}
      onTokenContextMenu={onTokenContextMenu}
      {...overrides}
    />,
  );

  return { ...result, draggedTokenRef, onDragEnd, onCreateToken, onTokenContextMenu };
}

describe("TokenLibraryOverlay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders the Create Token button", () => {
      renderOverlay();
      expect(screen.getByRole("button", { name: /Create Token/i })).toBeInTheDocument();
    });

    it("shows 'No tokens yet' when tokens array is empty", () => {
      renderOverlay();
      expect(screen.getByText("No tokens yet")).toBeInTheDocument();
    });

    it("does not show 'No tokens yet' when tokens are provided", () => {
      renderOverlay({ tokens: [goblin] });
      expect(screen.queryByText("No tokens yet")).toBeNull();
    });

    it("renders a TokenLibraryItem for each token", () => {
      renderOverlay({ tokens: [goblin, dragon] });
      expect(screen.getByText("Goblin")).toBeInTheDocument();
      expect(screen.getByText("Dragon")).toBeInTheDocument();
    });
  });

  describe("Create Token button", () => {
    it("calls onCreateToken when clicked", () => {
      const { onCreateToken } = renderOverlay();
      fireEvent.click(screen.getByRole("button", { name: /Create Token/i }));
      expect(onCreateToken).toHaveBeenCalledOnce();
    });

    it("does not call onDragEnd or onTokenContextMenu when Create Token is clicked", () => {
      const { onDragEnd, onTokenContextMenu } = renderOverlay();
      fireEvent.click(screen.getByRole("button", { name: /Create Token/i }));
      expect(onDragEnd).not.toHaveBeenCalled();
      expect(onTokenContextMenu).not.toHaveBeenCalled();
    });
  });

  describe("handleDragStart", () => {
    it("sets draggedTokenRef.current to the dragged token", () => {
      const { draggedTokenRef, container } = renderOverlay({ tokens: [goblin] });
      const draggable = container.querySelector("[draggable]")!;
      fireEvent.dragStart(draggable, { dataTransfer: { setData: vi.fn(), effectAllowed: "copy" } });
      expect(draggedTokenRef.current).toEqual(goblin);
    });

    it("sets draggedTokenRef.current to the correct token when multiple tokens exist", () => {
      const { draggedTokenRef, container } = renderOverlay({ tokens: [goblin, dragon] });
      const draggables = container.querySelectorAll("[draggable]");
      fireEvent.dragStart(draggables[1], {
        dataTransfer: { setData: vi.fn(), effectAllowed: "copy" },
      });
      expect(draggedTokenRef.current).toEqual(dragon);
    });
  });

  describe("event forwarding", () => {
    it("calls onDragEnd when drag ends on a token item", () => {
      const { onDragEnd, container } = renderOverlay({ tokens: [goblin] });
      const draggable = container.querySelector("[draggable]")!;
      fireEvent.dragEnd(draggable);
      expect(onDragEnd).toHaveBeenCalledOnce();
    });

    it("calls onTokenContextMenu with the token and coordinates on context-menu", () => {
      const { onTokenContextMenu, container } = renderOverlay({ tokens: [goblin] });
      const draggable = container.querySelector("[draggable]")!;
      fireEvent.contextMenu(draggable, { clientX: 50, clientY: 80 });
      expect(onTokenContextMenu).toHaveBeenCalledWith(goblin, 50, 80);
    });
  });
});
