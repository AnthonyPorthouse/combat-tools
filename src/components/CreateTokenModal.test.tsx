import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { CreateTokenModal } from "./CreateTokenModal";

function renderModal(overrides: Partial<React.ComponentProps<typeof CreateTokenModal>> = {}) {
  const onClose = vi.fn();
  const onSubmit = vi.fn();
  render(<CreateTokenModal isOpen={true} onClose={onClose} onSubmit={onSubmit} {...overrides} />);
  return { onClose, onSubmit };
}

describe("CreateTokenModal", () => {
  describe("when isOpen is false", () => {
    it("renders nothing", () => {
      renderModal({ isOpen: false });
      expect(screen.queryByText("Create Token")).toBeNull();
    });
  });

  describe("when isOpen is true", () => {
    it("renders the Create Token heading", () => {
      renderModal();
      expect(screen.getByRole("heading", { name: "Create Token" })).toBeInTheDocument();
    });

    it("renders the Name field", () => {
      renderModal();
      expect(screen.getByLabelText("Name *")).toBeInTheDocument();
    });

    it("renders the Size select", () => {
      renderModal();
      expect(screen.getByLabelText("Size *")).toBeInTheDocument();
    });

    it("renders the Image URL field", () => {
      renderModal();
      expect(screen.getByLabelText("Image URL")).toBeInTheDocument();
    });

    it("renders the Locked checkbox", () => {
      renderModal();
      expect(screen.getByLabelText("Locked (cannot be dragged on the board)")).toBeInTheDocument();
    });

    it("name field is empty by default", () => {
      renderModal();
      expect(screen.getByLabelText("Name *")).toHaveValue("");
    });

    it("size defaults to 1", () => {
      renderModal();
      expect(screen.getByLabelText("Size *")).toHaveValue("1");
    });

    it("locked checkbox is unchecked by default", () => {
      renderModal();
      expect(screen.getByLabelText("Locked (cannot be dragged on the board)")).not.toBeChecked();
    });
  });

  describe("form submission — valid data", () => {
    it("calls onSubmit with a token containing the entered name and default size", async () => {
      const user = userEvent.setup();
      const { onSubmit } = renderModal();

      await user.type(screen.getByLabelText("Name *"), "Goblin");
      await user.click(screen.getByRole("button", { name: "Create" }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: "Goblin", size: 1 }));
      });
    });

    it("the created token has a generated id (not empty)", async () => {
      const user = userEvent.setup();
      const { onSubmit } = renderModal();

      await user.type(screen.getByLabelText("Name *"), "Goblin");
      await user.click(screen.getByRole("button", { name: "Create" }));

      await waitFor(() => {
        const [token] = onSubmit.mock.calls[0];
        expect(token.id).toBeTruthy();
      });
    });

    it("converts an empty image string to undefined", async () => {
      const user = userEvent.setup();
      const { onSubmit } = renderModal();

      await user.type(screen.getByLabelText("Name *"), "Goblin");
      await user.click(screen.getByRole("button", { name: "Create" }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ image: undefined }));
      });
    });

    it("passes locked=true when the checkbox is checked", async () => {
      const user = userEvent.setup();
      const { onSubmit } = renderModal();

      await user.type(screen.getByLabelText("Name *"), "Goblin");
      await user.click(screen.getByLabelText("Locked (cannot be dragged on the board)"));
      await user.click(screen.getByRole("button", { name: "Create" }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ locked: true }));
      });
    });
  });

  describe("form validation errors", () => {
    it("shows a name validation error when name is empty and form is submitted", async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByRole("button", { name: "Create" }));

      expect(await screen.findByText("Name is required")).toBeInTheDocument();
    });

    it("does not call onSubmit when name is empty", async () => {
      const user = userEvent.setup();
      const { onSubmit } = renderModal();

      await user.click(screen.getByRole("button", { name: "Create" }));

      await screen.findByText("Name is required");
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("shows an image URL validation error when an invalid URL is entered", async () => {
      renderModal();
      const imageInput = screen.getByLabelText("Image URL");
      fireEvent.change(imageInput, { target: { value: "not-a-url" } });
      fireEvent.submit(imageInput.closest("form")!);
      expect(await screen.findByText("Must be a valid URL")).toBeInTheDocument();
    });
  });

  describe("Cancel button", () => {
    it("calls onClose when Cancel is clicked", () => {
      const { onClose } = renderModal();
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(onClose).toHaveBeenCalledOnce();
    });
  });
});
