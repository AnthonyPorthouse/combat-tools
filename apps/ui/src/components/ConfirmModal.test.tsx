import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { ConfirmModal } from "./ConfirmModal";

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onConfirm: vi.fn(),
  title: "Delete token?",
  description: "This action cannot be undone.",
};

describe("ConfirmModal", () => {
  describe("when isOpen is false", () => {
    it("renders nothing", () => {
      render(<ConfirmModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByText("Delete token?")).toBeNull();
    });
  });

  describe("when isOpen is true", () => {
    it("renders the title", () => {
      render(<ConfirmModal {...defaultProps} />);
      expect(screen.getByText("Delete token?")).toBeInTheDocument();
    });

    it("renders the description", () => {
      render(<ConfirmModal {...defaultProps} />);
      expect(screen.getByText("This action cannot be undone.")).toBeInTheDocument();
    });

    it("renders a Cancel button", () => {
      render(<ConfirmModal {...defaultProps} />);
      expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    });

    it("renders a Delete button", () => {
      render(<ConfirmModal {...defaultProps} />);
      expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    });
  });

  describe("Cancel button", () => {
    it("calls onClose when Cancel is clicked", () => {
      const onClose = vi.fn();
      render(<ConfirmModal {...defaultProps} onClose={onClose} />);
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(onClose).toHaveBeenCalledOnce();
    });

    it("does not call onConfirm when Cancel is clicked", () => {
      const onConfirm = vi.fn();
      render(<ConfirmModal {...defaultProps} onConfirm={onConfirm} />);
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(onConfirm).not.toHaveBeenCalled();
    });
  });

  describe("Delete button", () => {
    it("calls onConfirm when Delete is clicked", () => {
      const onConfirm = vi.fn();
      render(<ConfirmModal {...defaultProps} onConfirm={onConfirm} />);
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
      expect(onConfirm).toHaveBeenCalledOnce();
    });

    it("does not call onClose when Delete is clicked", () => {
      const onClose = vi.fn();
      render(<ConfirmModal {...defaultProps} onClose={onClose} />);
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("inherited Modal behaviour", () => {
    it("calls onClose when Escape is pressed", () => {
      const onClose = vi.fn();
      render(<ConfirmModal {...defaultProps} onClose={onClose} />);
      fireEvent.keyDown(document, { key: "Escape" });
      expect(onClose).toHaveBeenCalledOnce();
    });
  });
});
