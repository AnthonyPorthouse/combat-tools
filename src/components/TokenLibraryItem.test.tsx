import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import type { Token } from "../types/token";

import { TokenLibraryItem } from "./TokenLibraryItem";

const baseToken: Token = { id: "t1", name: "Goblin", size: 1 };

const defaultProps = {
  token: baseToken,
  onDragStart: vi.fn(),
  onDragEnd: vi.fn(),
  onContextMenu: vi.fn(),
};

describe("TokenLibraryItem", () => {
  describe("rendering", () => {
    it("displays the token name", () => {
      render(<TokenLibraryItem {...defaultProps} />);
      expect(screen.getByText("Goblin")).toBeInTheDocument();
    });

    it("displays the size label for size 1 (Medium)", () => {
      render(<TokenLibraryItem {...defaultProps} />);
      expect(screen.getByText("Medium")).toBeInTheDocument();
    });

    it("shows '· Locked' indicator when token.locked is true", () => {
      const token: Token = { ...baseToken, locked: true };
      render(<TokenLibraryItem {...defaultProps} token={token} />);
      expect(screen.getByText("Medium · Locked")).toBeInTheDocument();
    });

    it("does not show Locked when token.locked is falsy", () => {
      render(<TokenLibraryItem {...defaultProps} />);
      expect(screen.queryByText(/Locked/)).toBeNull();
    });

    it("shows first letter of name as fallback when no image", () => {
      render(<TokenLibraryItem {...defaultProps} />);
      expect(screen.getByText("G")).toBeInTheDocument();
    });

    it("does not render the letter fallback when image is set", () => {
      const token: Token = { ...baseToken, image: "https://example.com/token.png" };
      render(<TokenLibraryItem {...defaultProps} token={token} />);
      expect(screen.queryByText("G")).toBeNull();
    });

    it("applies background image style when token.image is set", () => {
      const token: Token = { ...baseToken, image: "https://example.com/token.png" };
      const { container } = render(<TokenLibraryItem {...defaultProps} token={token} />);
      const avatar = container.querySelector("[style]");
      expect(avatar?.getAttribute("style")).toContain("https://example.com/token.png");
    });
  });

  describe("drag events", () => {
    it("calls onDragStart with the token when drag starts", () => {
      const onDragStart = vi.fn();
      const { container } = render(
        <TokenLibraryItem {...defaultProps} onDragStart={onDragStart} />,
      );
      const draggable = container.firstElementChild!;
      fireEvent.dragStart(draggable, {
        dataTransfer: { setData: vi.fn(), effectAllowed: "copy" },
      });
      expect(onDragStart).toHaveBeenCalledWith(baseToken);
    });

    it("calls onDragEnd when drag ends", () => {
      const onDragEnd = vi.fn();
      const { container } = render(<TokenLibraryItem {...defaultProps} onDragEnd={onDragEnd} />);
      const draggable = container.firstElementChild!;
      fireEvent.dragEnd(draggable);
      expect(onDragEnd).toHaveBeenCalledOnce();
    });
  });

  describe("context menu", () => {
    it("calls onContextMenu with the token and event coordinates on right-click", () => {
      const onContextMenu = vi.fn();
      const { container } = render(
        <TokenLibraryItem {...defaultProps} onContextMenu={onContextMenu} />,
      );
      const draggable = container.firstElementChild!;
      fireEvent.contextMenu(draggable, { clientX: 50, clientY: 80 });
      expect(onContextMenu).toHaveBeenCalledWith(baseToken, 50, 80);
    });

    it("prevents the default context menu", () => {
      const { container } = render(<TokenLibraryItem {...defaultProps} />);
      const draggable = container.firstElementChild!;
      const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
      draggable.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    });
  });
});
