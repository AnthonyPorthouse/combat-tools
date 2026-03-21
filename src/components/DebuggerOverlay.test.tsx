import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DebuggerOverlay } from "./DebuggerOverlay";
import type { GridCell } from "../utils/cameraMath";

describe("DebuggerOverlay", () => {
  describe("grid cell display", () => {
    it("shows placeholder dashes when gridCell is null", () => {
      render(<DebuggerOverlay gridCell={null} hoveredToken={null} />);
      expect(screen.getByText("Grid: (--, --)")).toBeInTheDocument();
    });

    it("shows the column and row when gridCell is provided", () => {
      const gridCell: GridCell = { col: 3, row: 7 };
      render(<DebuggerOverlay gridCell={gridCell} hoveredToken={null} />);
      expect(screen.getByText("Grid: (3, 7)")).toBeInTheDocument();
    });

    it("shows negative coordinates correctly", () => {
      const gridCell: GridCell = { col: -2, row: -5 };
      render(<DebuggerOverlay gridCell={gridCell} hoveredToken={null} />);
      expect(screen.getByText("Grid: (-2, -5)")).toBeInTheDocument();
    });

    it("shows (0, 0) for the origin cell", () => {
      const gridCell: GridCell = { col: 0, row: 0 };
      render(<DebuggerOverlay gridCell={gridCell} hoveredToken={null} />);
      expect(screen.getByText("Grid: (0, 0)")).toBeInTheDocument();
    });
  });

  describe("hovered token display", () => {
    it("does not render a token name when hoveredToken is null", () => {
      render(<DebuggerOverlay gridCell={null} hoveredToken={null} />);
      expect(screen.queryByText(/Token:/)).not.toBeInTheDocument();
    });

    it("renders the token name when hoveredToken is provided", () => {
      render(<DebuggerOverlay gridCell={null} hoveredToken="Goblin" />);
      expect(screen.getByText("Token: Goblin")).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it('has an aria-live="polite" region for screen readers', () => {
      render(<DebuggerOverlay gridCell={null} hoveredToken={null} />);
      const region = screen.getByText("Grid: (--, --)").closest("[aria-live]");
      expect(region).toHaveAttribute("aria-live", "polite");
    });
  });
});
