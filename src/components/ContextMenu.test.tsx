import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import type { ContextMenuItem } from "./ContextMenu";

import { ContextMenu } from "./ContextMenu";

const makeItems = (): ContextMenuItem[] => [
  { label: "Edit", onClick: vi.fn() },
  { label: "Delete", onClick: vi.fn(), danger: true },
];

function renderMenu(overrides: Partial<React.ComponentProps<typeof ContextMenu>> = {}) {
  const onClose = vi.fn();
  const items = makeItems();
  render(
    <ContextMenu position={{ x: 100, y: 200 }} items={items} onClose={onClose} {...overrides} />,
  );
  return { onClose, items };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ContextMenu", () => {
  describe("rendering", () => {
    it("renders all item labels", () => {
      renderMenu();
      expect(screen.getByText("Edit")).toBeInTheDocument();
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    it("positions the menu via inline style", () => {
      render(<ContextMenu position={{ x: 100, y: 200 }} items={makeItems()} onClose={vi.fn()} />);
      // The portal renders to document.body, not the container
      const menu = document.body.querySelector<HTMLElement>("[style]");
      expect(menu).not.toBeNull();
      expect(menu!.style.left).toBe("100px");
      expect(menu!.style.top).toBe("200px");
    });

    it("applies danger text style to items with danger=true", () => {
      renderMenu();
      const deleteBtn = screen.getByRole("button", { name: "Delete" });
      expect(deleteBtn.className).toContain("text-red-400");
    });

    it("does not apply danger text style to normal items", () => {
      renderMenu();
      const editBtn = screen.getByRole("button", { name: "Edit" });
      expect(editBtn.className).not.toContain("text-red-400");
      expect(editBtn.className).toContain("text-slate-200");
    });
  });

  describe("item interaction", () => {
    it("calls item.onClick when an item button is clicked", () => {
      const { items } = renderMenu();
      fireEvent.click(screen.getByRole("button", { name: "Edit" }));
      expect(items[0].onClick).toHaveBeenCalledOnce();
    });

    it("calls onClose after an item is clicked", () => {
      const { onClose } = renderMenu();
      fireEvent.click(screen.getByRole("button", { name: "Edit" }));
      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  describe("Escape key", () => {
    it("calls onClose when Escape is pressed", () => {
      const { onClose } = renderMenu();
      fireEvent.keyDown(document, { key: "Escape" });
      expect(onClose).toHaveBeenCalledOnce();
    });

    it("does not call onClose for other keys", () => {
      const { onClose } = renderMenu();
      fireEvent.keyDown(document, { key: "Enter" });
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("outside-click (deferred mousedown)", () => {
    it("does NOT close when mousedown fires before the setTimeout fires", () => {
      const { onClose } = renderMenu();
      fireEvent.mouseDown(document.body);
      expect(onClose).not.toHaveBeenCalled();
    });

    it("closes when mousedown fires outside the menu after the setTimeout fires", () => {
      const { onClose } = renderMenu();
      vi.runAllTimers();
      fireEvent.mouseDown(document.body);
      expect(onClose).toHaveBeenCalledOnce();
    });

    it("does not close when mousedown fires inside the menu", () => {
      const { onClose } = renderMenu();
      vi.runAllTimers();
      fireEvent.mouseDown(screen.getByRole("button", { name: "Edit" }));
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("cleanup", () => {
    it("removes listeners on unmount without errors", () => {
      const { onClose, unmount } = (() => {
        const onClose = vi.fn();
        const { unmount } = render(
          <ContextMenu position={{ x: 0, y: 0 }} items={makeItems()} onClose={onClose} />,
        );
        return { onClose, unmount };
      })();
      unmount();
      vi.runAllTimers();
      fireEvent.keyDown(document, { key: "Escape" });
      fireEvent.mouseDown(document.body);
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
