import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { createToken } from "../types/token";
import { useTokenLibrary } from "./useTokenLibrary";

describe("useTokenLibrary", () => {
  it("initialises with an empty library", () => {
    const { result } = renderHook(() => useTokenLibrary());
    expect(result.current.tokenLibrary).toEqual([]);
  });

  it("adds a token to the library", () => {
    const { result } = renderHook(() => useTokenLibrary());
    const token = createToken("Goblin");

    act(() => {
      result.current.addToLibrary(token);
    });

    expect(result.current.tokenLibrary).toHaveLength(1);
    expect(result.current.tokenLibrary[0]).toBe(token);
  });

  it("appends multiple tokens in order", () => {
    const { result } = renderHook(() => useTokenLibrary());
    const a = createToken("A");
    const b = createToken("B");

    act(() => {
      result.current.addToLibrary(a);
      result.current.addToLibrary(b);
    });

    expect(result.current.tokenLibrary).toHaveLength(2);
    expect(result.current.tokenLibrary[0]).toBe(a);
    expect(result.current.tokenLibrary[1]).toBe(b);
  });

  it("removes a token by id", () => {
    const { result } = renderHook(() => useTokenLibrary());
    const a = createToken("A");
    const b = createToken("B");

    act(() => {
      result.current.addToLibrary(a);
      result.current.addToLibrary(b);
    });

    act(() => {
      result.current.removeFromLibrary(a.id);
    });

    expect(result.current.tokenLibrary).toHaveLength(1);
    expect(result.current.tokenLibrary[0]).toBe(b);
  });

  it("does nothing when removing a non-existent id", () => {
    const { result } = renderHook(() => useTokenLibrary());
    const token = createToken("Goblin");

    act(() => {
      result.current.addToLibrary(token);
    });

    act(() => {
      result.current.removeFromLibrary("non-existent-id");
    });

    expect(result.current.tokenLibrary).toHaveLength(1);
  });
});
