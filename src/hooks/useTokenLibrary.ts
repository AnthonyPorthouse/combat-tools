import { useCallback, useState } from "react";
import type { Token } from "../types/token";

export type UseTokenLibraryResult = {
  tokenLibrary: Token[];
  addToLibrary: (token: Token) => void;
  removeFromLibrary: (id: string) => void;
};

export function useTokenLibrary(initialTokens: Token[] = []): UseTokenLibraryResult {
  const [tokenLibrary, setTokenLibrary] = useState<Token[]>(() => initialTokens);

  const addToLibrary = useCallback((token: Token) => {
    setTokenLibrary((prev) => [...prev, token]);
  }, []);

  const removeFromLibrary = useCallback((id: string) => {
    setTokenLibrary((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { tokenLibrary, addToLibrary, removeFromLibrary };
}
