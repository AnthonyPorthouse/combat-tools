import { renderHook } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { useInert } from "./useInert";

describe("useInert", () => {
  let root: HTMLDivElement;

  beforeEach(() => {
    root = document.createElement("div");
    root.id = "root";
    document.body.appendChild(root);
  });

  afterEach(() => {
    root.remove();
  });

  it("does not set inert when inactive", () => {
    renderHook(() => useInert(false));
    expect(root.hasAttribute("inert")).toBe(false);
  });

  it("sets inert on #root when active", () => {
    renderHook(() => useInert(true));
    expect(root.hasAttribute("inert")).toBe(true);
  });

  it("removes inert when transitioning from active to inactive", () => {
    const { rerender } = renderHook(({ active }) => useInert(active), {
      initialProps: { active: true },
    });
    expect(root.hasAttribute("inert")).toBe(true);
    rerender({ active: false });
    expect(root.hasAttribute("inert")).toBe(false);
  });

  it("adds inert when transitioning from inactive to active", () => {
    const { rerender } = renderHook(({ active }) => useInert(active), {
      initialProps: { active: false },
    });
    expect(root.hasAttribute("inert")).toBe(false);
    rerender({ active: true });
    expect(root.hasAttribute("inert")).toBe(true);
  });

  it("removes inert on unmount when active", () => {
    const { unmount } = renderHook(() => useInert(true));
    expect(root.hasAttribute("inert")).toBe(true);
    unmount();
    expect(root.hasAttribute("inert")).toBe(false);
  });
});
