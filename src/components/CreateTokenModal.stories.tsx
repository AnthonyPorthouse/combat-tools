import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, fn, userEvent, within } from "storybook/test";

import { CreateTokenModal } from "./CreateTokenModal";

const meta: Meta<typeof CreateTokenModal> = {
  title: "Combat/CreateTokenModal",
  component: CreateTokenModal,
  parameters: {
    layout: "fullscreen",
    backgrounds: { default: "dark" },
  },
  args: {
    onClose: fn(),
    onSubmit: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof CreateTokenModal>;

/** Modal is open and ready for input. */
export const Open: Story = {
  args: { isOpen: true },
};

/** Modal is closed — renders nothing. */
export const Closed: Story = {
  args: { isOpen: false },
};

/** Submitting with an empty name shows a validation error. */
export const ValidationError: Story = {
  args: { isOpen: true },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    // The portal renders into document.body, so query from there
    const body = within(document.body);
    const submit = body.getByRole("button", { name: /create/i });
    await userEvent.click(submit);
    await expect(body.getByText(/name is required/i)).toBeInTheDocument();
    await expect(args.onSubmit).not.toHaveBeenCalled();
    // suppress unused warning
    void canvas;
  },
};

/** Filling all fields and submitting calls onSubmit with a valid token. */
export const SuccessfulSubmit: Story = {
  args: { isOpen: true },
  play: async ({ canvasElement, args }) => {
    const body = within(document.body);
    void canvasElement;

    await userEvent.type(body.getByLabelText(/name/i), "Test Hero");
    await userEvent.selectOptions(body.getByLabelText(/size/i), "2");
    await userEvent.click(body.getByRole("button", { name: /^create$/i }));

    await expect(args.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Test Hero", size: 2 }),
    );
  },
};
