import { beforeEach, describe, it, expect, vi } from "vitest";

import type { Token } from "../types/token";

vi.mock("zustand/middleware", async (importOriginal) => {
  const actual = await importOriginal<typeof import("zustand/middleware")>();
  return { ...actual, persist: (fn: unknown) => fn };
});

import { useLibraryStore } from "./libraryStore";

const goblin: Token = { id: "t1", name: "Goblin", size: 1 };
const dragon: Token = { id: "t2", name: "Dragon", size: 2 };

beforeEach(() => {
  useLibraryStore.setState({ tokenLibrary: [] });
});

describe("useLibraryStore", () => {
  describe("initial state", () => {
    it("starts with an empty tokenLibrary", () => {
      const { tokenLibrary } = useLibraryStore.getState();
      expect(tokenLibrary).toEqual([]);
    });
  });

  describe("addToLibrary", () => {
    it("adds a token to an empty library", () => {
      useLibraryStore.getState().addToLibrary(goblin);
      expect(useLibraryStore.getState().tokenLibrary).toHaveLength(1);
      expect(useLibraryStore.getState().tokenLibrary[0]).toEqual(goblin);
    });

    it("adds multiple tokens in insertion order", () => {
      useLibraryStore.getState().addToLibrary(goblin);
      useLibraryStore.getState().addToLibrary(dragon);
      const { tokenLibrary } = useLibraryStore.getState();
      expect(tokenLibrary).toHaveLength(2);
      expect(tokenLibrary[0]).toEqual(goblin);
      expect(tokenLibrary[1]).toEqual(dragon);
    });
  });

  describe("removeFromLibrary", () => {
    it("removes an existing token by id", () => {
      useLibraryStore.getState().addToLibrary(goblin);
      useLibraryStore.getState().removeFromLibrary("t1");
      expect(useLibraryStore.getState().tokenLibrary).toHaveLength(0);
    });

    it("is a no-op when the id does not exist", () => {
      useLibraryStore.getState().addToLibrary(goblin);
      useLibraryStore.getState().removeFromLibrary("nonexistent");
      expect(useLibraryStore.getState().tokenLibrary).toHaveLength(1);
    });

    it("leaves other tokens intact when removing one", () => {
      useLibraryStore.getState().addToLibrary(goblin);
      useLibraryStore.getState().addToLibrary(dragon);
      useLibraryStore.getState().removeFromLibrary("t1");
      const { tokenLibrary } = useLibraryStore.getState();
      expect(tokenLibrary).toHaveLength(1);
      expect(tokenLibrary[0]).toEqual(dragon);
    });
  });

  describe("updateInLibrary", () => {
    it("updates the name of a matching token in place", () => {
      useLibraryStore.getState().addToLibrary(goblin);
      const updated: Token = { ...goblin, name: "Greater Goblin" };
      useLibraryStore.getState().updateInLibrary(updated);
      expect(useLibraryStore.getState().tokenLibrary[0].name).toBe("Greater Goblin");
    });

    it("does not add a token when the id is not found (no-op)", () => {
      useLibraryStore.getState().addToLibrary(goblin);
      useLibraryStore.getState().updateInLibrary({ id: "nonexistent", name: "Ghost", size: 1 });
      expect(useLibraryStore.getState().tokenLibrary).toHaveLength(1);
    });

    it("updates only the matching token when multiple tokens exist", () => {
      useLibraryStore.getState().addToLibrary(goblin);
      useLibraryStore.getState().addToLibrary(dragon);
      const updated: Token = { ...dragon, name: "Ancient Dragon" };
      useLibraryStore.getState().updateInLibrary(updated);
      const { tokenLibrary } = useLibraryStore.getState();
      expect(tokenLibrary[0]).toEqual(goblin);
      expect(tokenLibrary[1].name).toBe("Ancient Dragon");
    });
  });
});
