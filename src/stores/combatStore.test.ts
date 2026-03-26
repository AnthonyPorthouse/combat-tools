import { beforeEach, describe, it, expect, vi } from "vitest";

import type { Token } from "../types/token";

vi.mock("zustand/middleware", async (importOriginal) => {
  const actual = await importOriginal<typeof import("zustand/middleware")>();
  return { ...actual, persist: (fn: unknown) => fn };
});

import { useCombatStore } from "./combatStore";

const goblin: Token = { id: "t1", name: "Goblin", size: 1 };
const dragon: Token = { id: "t2", name: "Dragon", size: 2 };

beforeEach(() => {
  useCombatStore.setState({ tokenPlacements: {} });
});

describe("useCombatStore", () => {
  describe("initial state", () => {
    it("starts with empty tokenPlacements", () => {
      expect(useCombatStore.getState().tokenPlacements).toEqual({});
    });
  });

  describe("addToken", () => {
    it("places a token at the given position", () => {
      useCombatStore.getState().addToken(goblin, { x: 1, y: 2 });
      const { tokenPlacements } = useCombatStore.getState();
      expect(tokenPlacements["t1"]).toEqual({ token: goblin, position: { x: 1, y: 2 } });
    });

    it("uses token.id as the key", () => {
      useCombatStore.getState().addToken(goblin, { x: 0, y: 0 });
      expect(useCombatStore.getState().tokenPlacements).toHaveProperty("t1");
    });

    it("adds multiple tokens independently", () => {
      useCombatStore.getState().addToken(goblin, { x: 0, y: 0 });
      useCombatStore.getState().addToken(dragon, { x: 5, y: 5 });
      const { tokenPlacements } = useCombatStore.getState();
      expect(Object.keys(tokenPlacements)).toHaveLength(2);
      expect(tokenPlacements["t2"].position).toEqual({ x: 5, y: 5 });
    });
  });

  describe("moveToken", () => {
    it("updates the position of an existing token", () => {
      useCombatStore.getState().addToken(goblin, { x: 0, y: 0 });
      useCombatStore.getState().moveToken("t1", { x: 3, y: 4 });
      expect(useCombatStore.getState().tokenPlacements["t1"].position).toEqual({ x: 3, y: 4 });
    });

    it("is a no-op when the id does not exist", () => {
      useCombatStore.getState().moveToken("nonexistent", { x: 1, y: 1 });
      expect(useCombatStore.getState().tokenPlacements).toEqual({});
    });
  });

  describe("removeToken", () => {
    it("deletes an existing placement", () => {
      useCombatStore.getState().addToken(goblin, { x: 0, y: 0 });
      useCombatStore.getState().removeToken("t1");
      expect(useCombatStore.getState().tokenPlacements).not.toHaveProperty("t1");
    });

    it("is a no-op when the id does not exist", () => {
      useCombatStore.getState().addToken(goblin, { x: 0, y: 0 });
      useCombatStore.getState().removeToken("nonexistent");
      expect(Object.keys(useCombatStore.getState().tokenPlacements)).toHaveLength(1);
    });

    it("leaves other placements intact", () => {
      useCombatStore.getState().addToken(goblin, { x: 0, y: 0 });
      useCombatStore.getState().addToken(dragon, { x: 5, y: 5 });
      useCombatStore.getState().removeToken("t1");
      const { tokenPlacements } = useCombatStore.getState();
      expect(tokenPlacements).not.toHaveProperty("t1");
      expect(tokenPlacements).toHaveProperty("t2");
    });
  });

  describe("updateToken", () => {
    it("replaces the token data on an existing placement", () => {
      useCombatStore.getState().addToken(goblin, { x: 0, y: 0 });
      const updated: Token = { ...goblin, name: "Elite Goblin" };
      useCombatStore.getState().updateToken(updated);
      expect(useCombatStore.getState().tokenPlacements["t1"].token.name).toBe("Elite Goblin");
    });

    it("preserves position when updating token data", () => {
      useCombatStore.getState().addToken(goblin, { x: 3, y: 7 });
      useCombatStore.getState().updateToken({ ...goblin, name: "Elite Goblin" });
      expect(useCombatStore.getState().tokenPlacements["t1"].position).toEqual({ x: 3, y: 7 });
    });

    it("does not create a new placement when the id is not found (no-op)", () => {
      useCombatStore.getState().updateToken({ id: "nonexistent", name: "Ghost", size: 1 });
      expect(useCombatStore.getState().tokenPlacements).toEqual({});
    });
  });
});
