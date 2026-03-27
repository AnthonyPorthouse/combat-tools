import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { DebuggerOverlay } from "./DebuggerOverlay";

function makeEntries(obj: Record<string, string> = {}): Map<string, string> {
  return new Map(Object.entries(obj));
}

describe("DebuggerOverlay", () => {
  describe("grid entry display", () => {
    it("shows placeholder dashes when grid entry is (--, --)", () => {
      render(<DebuggerOverlay entries={makeEntries({ grid: "(--, --)" })} />);
      expect(screen.getByText("grid: (--, --)")).toBeInTheDocument();
    });

    it("shows the column and row when grid entry is set", () => {
      render(<DebuggerOverlay entries={makeEntries({ grid: "(3, 7)" })} />);
      expect(screen.getByText("grid: (3, 7)")).toBeInTheDocument();
    });

    it("shows negative coordinates correctly", () => {
      render(<DebuggerOverlay entries={makeEntries({ grid: "(-2, -5)" })} />);
      expect(screen.getByText("grid: (-2, -5)")).toBeInTheDocument();
    });

    it("shows (0, 0) for the origin cell", () => {
      render(<DebuggerOverlay entries={makeEntries({ grid: "(0, 0)" })} />);
      expect(screen.getByText("grid: (0, 0)")).toBeInTheDocument();
    });
  });

  describe("token entry display", () => {
    it("does not render a token entry when not set", () => {
      render(<DebuggerOverlay entries={makeEntries({ grid: "(--, --)" })} />);
      expect(screen.queryByText(/^token:/)).not.toBeInTheDocument();
    });

    it("renders the token entry when set", () => {
      render(<DebuggerOverlay entries={makeEntries({ grid: "(5, 3)", token: "Goblin" })} />);
      expect(screen.getByText("token: Goblin")).toBeInTheDocument();
    });
  });

  describe("sort order", () => {
    it("renders entries sorted by key descending (Z→A)", () => {
      render(<DebuggerOverlay entries={makeEntries({ grid: "(1, 1)", token: "Orc" })} />);
      const items = screen.getAllByText(/: /);
      expect(items[0]).toHaveTextContent("token: Orc");
      expect(items[1]).toHaveTextContent("grid: (1, 1)");
    });

    it("renders an empty overlay when entries map is empty", () => {
      const { container } = render(<DebuggerOverlay entries={new Map()} />);
      expect(container.firstChild).toBeEmptyDOMElement();
    });
  });

  describe("accessibility", () => {
    it('has an aria-live="polite" region for screen readers', () => {
      render(<DebuggerOverlay entries={makeEntries({ grid: "(--, --)" })} />);
      const region = screen.getByText("grid: (--, --)").closest("[aria-live]");
      expect(region).toHaveAttribute("aria-live", "polite");
    });
  });
});
