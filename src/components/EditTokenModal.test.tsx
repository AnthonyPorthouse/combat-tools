import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import type { Token } from "../types/token";

import { EditTokenModal } from "./EditTokenModal";

const defaultToken: Token = { id: "tok-1", name: "Goblin", size: 1, image: "", locked: false };

function renderModal(overrides: Partial<React.ComponentProps<typeof EditTokenModal>> = {}) {
  const onClose = vi.fn();
  const onSubmit = vi.fn();
  render(
    <EditTokenModal
      isOpen={true}
      onClose={onClose}
      onSubmit={onSubmit}
      initialToken={defaultToken}
      {...overrides}
    />,
  );
  return { onClose, onSubmit };
}

describe("EditTokenModal", () => {
  describe("when isOpen is false", () => {
    it("renders nothing", () => {
      renderModal({ isOpen: false });
      expect(screen.queryByText("Edit Token")).toBeNull();
    });
  });

  describe("when isOpen is true", () => {
    it("renders the Edit Token heading", () => {
      renderModal();
      expect(screen.getByText("Edit Token")).toBeInTheDocument();
    });

    it("pre-fills the name field from initialToken", () => {
      renderModal();
      expect(screen.getByLabelText("Name *")).toHaveValue("Goblin");
    });

    it("pre-fills the size select from initialToken", () => {
      renderModal();
      expect(screen.getByLabelText("Size *")).toHaveValue("1");
    });

    it("pre-fills the locked checkbox from initialToken", () => {
      const token: Token = { ...defaultToken, locked: true };
      renderModal({ initialToken: token });
      expect(screen.getByLabelText("Locked (cannot be dragged on the board)")).toBeChecked();
    });
  });

  describe("initialToken is null", () => {
    it("does not crash and does not pre-fill the form when initialToken is null", () => {
      renderModal({ initialToken: null });
      // Modal still renders — just no reset
      expect(screen.getByText("Edit Token")).toBeInTheDocument();
    });
  });

  describe("initialToken with optional fields undefined", () => {
    it("defaults image to empty string when initialToken.image is undefined", async () => {
      const token: Token = { id: "tok-2", name: "Orc", size: 1 }; // no image or locked
      renderModal({ initialToken: token });
      expect(screen.getByLabelText("Image URL")).toHaveValue("");
    });

    it("defaults locked to false when initialToken.locked is undefined", async () => {
      const token: Token = { id: "tok-2", name: "Orc", size: 1 };
      renderModal({ initialToken: token });
      expect(screen.getByLabelText("Locked (cannot be dragged on the board)")).not.toBeChecked();
    });
  });

  describe("form submission — valid data", () => {
    it("calls onSubmit with the updated token preserving original id", async () => {
      const user = userEvent.setup();
      const { onSubmit } = renderModal();

      const nameInput = screen.getByLabelText("Name *");
      await user.clear(nameInput);
      await user.type(nameInput, "Orc");
      await user.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ id: "tok-1", name: "Orc" }),
        );
      });
    });

    it("converts an empty image string to undefined on submit", async () => {
      const user = userEvent.setup();
      const { onSubmit } = renderModal();

      await user.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ image: undefined }));
      });
    });

    it("passes the locked value through on submit", async () => {
      const user = userEvent.setup();
      const token: Token = { ...defaultToken, locked: true };
      const { onSubmit } = renderModal({ initialToken: token });

      await user.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ locked: true }));
      });
    });
  });

  describe("handleFormSubmit guard — initialToken is null", () => {
    it("does not call onSubmit when initialToken becomes null after valid form fill", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const onClose = vi.fn();

      const { rerender } = render(
        <EditTokenModal
          isOpen={true}
          onClose={onClose}
          onSubmit={onSubmit}
          initialToken={defaultToken}
        />,
      );

      // Rerender with null — form retains the pre-filled valid name
      rerender(
        <EditTokenModal isOpen={true} onClose={onClose} onSubmit={onSubmit} initialToken={null} />,
      );

      await user.click(screen.getByRole("button", { name: "Save" }));

      // Form passes Zod validation (name="Goblin") but the guard fires
      await waitFor(() => {
        expect(onSubmit).not.toHaveBeenCalled();
      });
    });
  });

  describe("form validation errors", () => {
    it("shows a name validation error when name is cleared and form is submitted", async () => {
      const user = userEvent.setup();
      renderModal();

      const nameInput = screen.getByLabelText("Name *");
      await user.clear(nameInput);
      await user.click(screen.getByRole("button", { name: "Save" }));

      expect(await screen.findByText("Name is required")).toBeInTheDocument();
    });

    it("does not call onSubmit when the form is invalid", async () => {
      const user = userEvent.setup();
      const { onSubmit } = renderModal();

      await user.clear(screen.getByLabelText("Name *"));
      await user.click(screen.getByRole("button", { name: "Save" }));

      await screen.findByText("Name is required");
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe("Cancel button", () => {
    it("calls onClose when Cancel is clicked", () => {
      const { onClose } = renderModal();
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  describe("image URL validation error", () => {
    it("shows an image validation error when an invalid URL is entered", async () => {
      renderModal();
      const imageInput = screen.getByLabelText("Image URL");
      // fireEvent bypasses native HTML5 URL constraint validation in jsdom
      fireEvent.change(imageInput, { target: { value: "not-a-url" } });
      fireEvent.submit(imageInput.closest("form")!);
      expect(await screen.findByText("Must be a valid URL")).toBeInTheDocument();
    });
  });
});
