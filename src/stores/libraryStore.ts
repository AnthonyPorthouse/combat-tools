import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import type { Token } from "../types/token";

type LibraryState = {
  tokenLibrary: Token[];
  addToLibrary: (token: Token) => void;
  removeFromLibrary: (id: string) => void;
  updateInLibrary: (token: Token) => void;
};

export const useLibraryStore = create<LibraryState>()(
  persist(
    immer((set) => ({
      tokenLibrary: [],

      addToLibrary: (token) =>
        set((state) => {
          state.tokenLibrary.push(token);
        }),

      removeFromLibrary: (id) =>
        set((state) => {
          state.tokenLibrary = state.tokenLibrary.filter((t) => t.id !== id);
        }),

      updateInLibrary: (token) =>
        set((state) => {
          const index = state.tokenLibrary.findIndex((t) => t.id === token.id);
          if (index !== -1) state.tokenLibrary[index] = token;
        }),
    })),
    {
      name: "library-store",
      partialize: (state) => ({ tokenLibrary: state.tokenLibrary }),
    },
  ),
);
