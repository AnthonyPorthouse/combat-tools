import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { Modal } from "./Modal";

describe("Modal", () => {
  describe("when isOpen is false", () => {
    it("renders nothing", () => {
      render(
        <Modal isOpen={false} onClose={vi.fn()}>
          <span>modal content</span>
        </Modal>,
      );
      expect(screen.queryByText("modal content")).toBeNull();
    });
  });

  describe("when isOpen is true", () => {
    it("renders children into the document body via portal", () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()}>
          <span>portal child</span>
        </Modal>,
      );
      expect(document.body).toContainElement(screen.getByText("portal child"));
    });
  });

  describe("Escape key handling", () => {
    it("calls onClose when Escape is pressed while open", () => {
      const onClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={onClose}>
          <span>content</span>
        </Modal>,
      );
      fireEvent.keyDown(document, { key: "Escape" });
      expect(onClose).toHaveBeenCalledOnce();
    });

    it("does not call onClose when a different key is pressed", () => {
      const onClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={onClose}>
          <span>content</span>
        </Modal>,
      );
      fireEvent.keyDown(document, { key: "Enter" });
      expect(onClose).not.toHaveBeenCalled();
    });

    it("does not call onClose when modal is closed and Escape is pressed", () => {
      const onClose = vi.fn();
      render(
        <Modal isOpen={false} onClose={onClose}>
          <span>content</span>
        </Modal>,
      );
      fireEvent.keyDown(document, { key: "Escape" });
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("backdrop click handling", () => {
    it("calls onClose when the backdrop is clicked", () => {
      const onClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={onClose}>
          <span>inner content</span>
        </Modal>,
      );
      // The backdrop is the parent of the inner content wrapper
      const inner = screen.getByText("inner content");
      const contentBox = inner.parentElement!; // the w-[320px] div
      const backdrop = contentBox.parentElement!; // the fixed inset-0 div
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalledOnce();
    });

    it("does not call onClose when the inner content div is clicked", () => {
      const onClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={onClose}>
          <span>inner content</span>
        </Modal>,
      );
      const inner = screen.getByText("inner content");
      const contentBox = inner.parentElement!; // the w-[320px] div — has stopPropagation
      fireEvent.click(contentBox);
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("cleanup", () => {
    it("removes the keydown listener on unmount", () => {
      const onClose = vi.fn();
      const { unmount } = render(
        <Modal isOpen={true} onClose={onClose}>
          <span>content</span>
        </Modal>,
      );
      unmount();
      fireEvent.keyDown(document, { key: "Escape" });
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
