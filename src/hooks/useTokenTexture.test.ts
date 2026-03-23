import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useTokenTexture } from "./useTokenTexture";
import { Assets } from "pixi.js";

vi.mock("pixi.js", () => ({
  Assets: {
    load: vi.fn(),
  },
}));

describe("useTokenTexture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null initially", () => {
    vi.mocked(Assets.load).mockResolvedValue({});
    const { result } = renderHook(() => useTokenTexture({ imageUrl: "test.png" }));
    expect(result.current.texture).toBeNull();
  });

  it("returns null when imageUrl is undefined", async () => {
    const { result } = renderHook(() => useTokenTexture({ imageUrl: undefined }));
    await act(async () => {});
    expect(result.current.texture).toBeNull();
    expect(Assets.load).not.toHaveBeenCalled();
  });

  it("returns the loaded texture after async resolution", async () => {
    const fakeTexture = { id: "texture" };
    vi.mocked(Assets.load).mockResolvedValue(fakeTexture);

    const { result } = renderHook(() => useTokenTexture({ imageUrl: "test.png" }));

    await waitFor(() => {
      expect(result.current.texture).toBe(fakeTexture);
    });
  });

  it("returns null on Assets.load rejection", async () => {
    vi.mocked(Assets.load).mockRejectedValue(new Error("load failed"));

    const { result } = renderHook(() => useTokenTexture({ imageUrl: "bad.png" }));

    await waitFor(() => {
      expect(Assets.load).toHaveBeenCalled();
    });
    expect(result.current.texture).toBeNull();
  });

  it("does not update state after unmount", async () => {
    let resolveLoad!: (val: unknown) => void;
    const pendingLoad = new Promise((res) => {
      resolveLoad = res;
    });
    vi.mocked(Assets.load).mockReturnValue(pendingLoad as never);

    const { result, unmount } = renderHook(() => useTokenTexture({ imageUrl: "test.png" }));
    unmount();

    await act(async () => {
      resolveLoad({ id: "texture" });
      await pendingLoad;
    });

    expect(result.current.texture).toBeNull();
  });

  it("does not update state after unmount on load error", async () => {
    let rejectLoad!: (err: Error) => void;
    const pendingLoad = new Promise<never>((_, rej) => {
      rejectLoad = rej;
    });
    vi.mocked(Assets.load).mockReturnValue(pendingLoad as never);

    const { result, unmount } = renderHook(() => useTokenTexture({ imageUrl: "bad.png" }));
    unmount(); // sets cancelled = true

    await act(async () => {
      rejectLoad(new Error("fail"));
      await pendingLoad.catch(() => {});
    });

    expect(result.current.texture).toBeNull();
  });

  it("re-runs and updates texture when imageUrl changes", async () => {
    const textureA = { id: "a" };
    const textureB = { id: "b" };
    vi.mocked(Assets.load).mockResolvedValueOnce(textureA).mockResolvedValueOnce(textureB);

    let imageUrl = "a.png";
    const { result, rerender } = renderHook(() => useTokenTexture({ imageUrl }));

    await waitFor(() => expect(result.current.texture).toBe(textureA));

    imageUrl = "b.png";
    rerender();

    await waitFor(() => expect(result.current.texture).toBe(textureB));
  });
});
