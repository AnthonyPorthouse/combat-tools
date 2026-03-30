import { temporal } from "zundo";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import type { Vector2 } from "../lib/vector2";
import type { Token } from "../types/token";
import type { TokenPlacement } from "../types/tokenPlacement";

export type { TokenPlacement };

type CombatState = {
  tokenPlacements: Record<string, TokenPlacement>;
  addToken: (token: Token, position: Vector2) => void;
  moveToken: (id: string, position: Vector2) => void;
  moveTokens: (moves: Record<string, Vector2>) => void;
  removeToken: (id: string) => void;
  updateToken: (token: Token) => void;
};

export const useCombatStore = create<CombatState>()(
  temporal(
    persist(
      immer((set) => ({
        tokenPlacements: {},

        addToken: (token, position) =>
          set((state) => {
            state.tokenPlacements[token.id] = { token, position };
          }),

        moveToken: (id, position) =>
          set((state) => {
            const placement = state.tokenPlacements[id];
            if (placement) {
              placement.position = position;
            }
          }),

        moveTokens: (moves) =>
          set((state) => {
            for (const [id, position] of Object.entries(moves)) {
              const placement = state.tokenPlacements[id];
              if (placement) {
                placement.position = position;
              }
            }
          }),

        removeToken: (id) =>
          set((state) => {
            delete state.tokenPlacements[id];
          }),

        updateToken: (token) =>
          set((state) => {
            if (state.tokenPlacements[token.id]) {
              state.tokenPlacements[token.id].token = token;
            }
          }),
      })),
      {
        name: "combat-store",
        partialize: (state) => ({ tokenPlacements: state.tokenPlacements }),
      },
    ),
    { partialize: (state) => ({ tokenPlacements: state.tokenPlacements }) },
  ),
);
