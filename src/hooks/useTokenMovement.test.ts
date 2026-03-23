import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTokenMovement, cellCenterToTopLeftWorldPos } from "./useTokenMovement";
import type { UseTokenMovementOptions } from "./useTokenMovement";

// ---------------------------------------------------------------------------
// Ticker mock — mirrors the stage mock pattern in useTokenDrag.test.ts
// ---------------------------------------------------------------------------

function makeTicker() {
  let registeredFn: ((ticker: { deltaMS: number }) => void) | null = null;
  return {
    ticker: {
      add: vi.fn((fn: (ticker: { deltaMS: number }) => void) => {
        registeredFn = fn;
      }),
      remove: vi.fn(() => {
        registeredFn = null;
      }),
    },
    /** Simulate a single animation frame of deltaMS milliseconds. */
    tick: (deltaMS: number) => registeredFn?.({ deltaMS }),
  };
}

const GRID_SIZE = 64;

function makeOptions(overrides: Partial<UseTokenMovementOptions> = {}): UseTokenMovementOptions {
  const mock = makeTicker();
  return {
    app: { ticker: mock.ticker } as unknown as UseTokenMovementOptions["app"],
    gridSize: GRID_SIZE,
    tokenSize: 1,
    movementSpeed: 5,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// cellCenterToTopLeftWorldPos (pure helper)
// ---------------------------------------------------------------------------

describe("cellCenterToTopLeftWorldPos", () => {
  it("size 1: returns col * gridSize, row * gridSize (offset 0)", () => {
    expect(cellCenterToTopLeftWorldPos({ col: 3, row: 2 }, 64, 1)).toEqual({ x: 192, y: 128 });
  });

  it("size 2: offset=0, returns col * gridSize", () => {
    expect(cellCenterToTopLeftWorldPos({ col: 3, row: 2 }, 64, 2)).toEqual({ x: 192, y: 128 });
  });

  it("size 3: offset=1, returns (col-1) * gridSize", () => {
    expect(cellCenterToTopLeftWorldPos({ col: 3, row: 2 }, 64, 3)).toEqual({ x: 128, y: 64 });
  });

  it("size 0.5: centers token within cell", () => {
    // tokenWorldSize = 0.5 * 64 = 32; topLeft = col*64 + (64-32)/2 = col*64 + 16
    expect(cellCenterToTopLeftWorldPos({ col: 2, row: 1 }, 64, 0.5)).toEqual({ x: 144, y: 80 });
  });
});

// ---------------------------------------------------------------------------
// useTokenMovement
// ---------------------------------------------------------------------------

describe("useTokenMovement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts idle — animatedWorldPos is null and isAnimating is false", () => {
    const { result } = renderHook(() => useTokenMovement(makeOptions()));
    expect(result.current.animatedWorldPos).toBeNull();
    expect(result.current.isAnimating).toBe(false);
    expect(result.current.remainingPath).toEqual([]);
  });

  it("skips registering ticker when app is null", () => {
    const mock = makeTicker();
    renderHook(() => useTokenMovement(makeOptions({ app: null })));
    expect(mock.ticker.add).not.toHaveBeenCalled();
  });

  it("startAnimation with empty path calls onMoveCommit immediately without animating", () => {
    const { result } = renderHook(() => useTokenMovement(makeOptions()));
    const onMoveCommit = vi.fn();

    act(() => {
      result.current.startAnimation({ x: 0, y: 0 }, [], { x: 1, y: 1 }, onMoveCommit);
    });

    expect(onMoveCommit).toHaveBeenCalledWith({ x: 1, y: 1 });
    expect(result.current.animatedWorldPos).toBeNull();
    expect(result.current.isAnimating).toBe(false);
  });

  it("startAnimation sets animatedWorldPos to startWorldPos and isAnimating to true", () => {
    const { result } = renderHook(() => useTokenMovement(makeOptions()));

    act(() => {
      result.current.startAnimation(
        { x: 64, y: 64 },
        [{ col: 2, row: 1 }],
        { x: 2, y: 1 },
        vi.fn(),
      );
    });

    expect(result.current.animatedWorldPos).toEqual({ x: 64, y: 64 });
    expect(result.current.isAnimating).toBe(true);
  });

  it("remainingPath is set to the full path on startAnimation", () => {
    const { result } = renderHook(() => useTokenMovement(makeOptions()));
    const path = [
      { col: 2, row: 1 },
      { col: 3, row: 1 },
    ];

    act(() => {
      result.current.startAnimation({ x: 64, y: 64 }, path, { x: 3, y: 1 }, vi.fn());
    });

    expect(result.current.remainingPath).toEqual(path);
  });

  it("animated position advances toward the first path cell each frame", () => {
    // speed=5 cells/sec, gridSize=64 → worldPerMs = 5*64/1000 = 0.32 world/ms
    // Start at (0, 0), target = cellCenterToTopLeftWorldPos({col:1, row:0}, 64, 1) = (64, 0)
    // After 100ms: dist = 64, distThisFrame = 0.32*100 = 32 → move half way to (32, 0)
    let ticker: ReturnType<typeof makeTicker>;
    const { result } = renderHook(() => {
      ticker = makeTicker();
      return useTokenMovement({
        app: { ticker: ticker.ticker } as unknown as UseTokenMovementOptions["app"],
        gridSize: GRID_SIZE,
        tokenSize: 1,
        movementSpeed: 5,
      });
    });

    act(() => {
      result.current.startAnimation({ x: 0, y: 0 }, [{ col: 1, row: 0 }], { x: 1, y: 0 }, vi.fn());
    });

    act(() => {
      ticker!.tick(100);
    });

    const pos = result.current.animatedWorldPos!;
    expect(pos.x).toBeCloseTo(32, 1);
    expect(pos.y).toBeCloseTo(0, 1);
  });

  it("snaps to waypoint when distThisFrame >= remaining distance", () => {
    // Start at (0,0), target (64,0). One frame of 1000ms → distThisFrame=320 > 64 → snap.
    let ticker: ReturnType<typeof makeTicker>;
    const { result } = renderHook(() => {
      ticker = makeTicker();
      return useTokenMovement({
        app: { ticker: ticker.ticker } as unknown as UseTokenMovementOptions["app"],
        gridSize: GRID_SIZE,
        tokenSize: 1,
        movementSpeed: 5,
      });
    });

    const onMoveCommit = vi.fn();
    act(() => {
      result.current.startAnimation(
        { x: 0, y: 0 },
        [{ col: 1, row: 0 }],
        { x: 1, y: 0 },
        onMoveCommit,
      );
    });

    act(() => {
      ticker!.tick(1000);
    });

    // Single-cell path — animation should be complete.
    expect(onMoveCommit).toHaveBeenCalledWith({ x: 1, y: 0 });
    expect(result.current.animatedWorldPos).toBeNull();
    expect(result.current.isAnimating).toBe(false);
  });

  it("remainingPath shrinks by one entry when a waypoint is reached", () => {
    let ticker: ReturnType<typeof makeTicker>;
    const { result } = renderHook(() => {
      ticker = makeTicker();
      return useTokenMovement({
        app: { ticker: ticker.ticker } as unknown as UseTokenMovementOptions["app"],
        gridSize: GRID_SIZE,
        tokenSize: 1,
        movementSpeed: 5,
      });
    });

    const path = [
      { col: 1, row: 0 },
      { col: 2, row: 0 },
    ];
    act(() => {
      result.current.startAnimation({ x: 0, y: 0 }, path, { x: 2, y: 0 }, vi.fn());
    });

    expect(result.current.remainingPath).toHaveLength(2);

    // Big frame to snap past first waypoint.
    act(() => {
      ticker!.tick(1000);
    });

    expect(result.current.remainingPath).toHaveLength(1);
    expect(result.current.remainingPath[0]).toEqual({ col: 2, row: 0 });
  });

  it("onMoveCommit is called with finalPosition after the last waypoint", () => {
    let ticker: ReturnType<typeof makeTicker>;
    const { result } = renderHook(() => {
      ticker = makeTicker();
      return useTokenMovement({
        app: { ticker: ticker.ticker } as unknown as UseTokenMovementOptions["app"],
        gridSize: GRID_SIZE,
        tokenSize: 1,
        movementSpeed: 5,
      });
    });

    const onMoveCommit = vi.fn();
    const path = [
      { col: 1, row: 0 },
      { col: 2, row: 0 },
    ];
    act(() => {
      result.current.startAnimation({ x: 0, y: 0 }, path, { x: 2, y: 0 }, onMoveCommit);
    });

    // Two big frames to blow past both waypoints.
    act(() => {
      ticker!.tick(2000);
    });
    act(() => {
      ticker!.tick(2000);
    });

    expect(onMoveCommit).toHaveBeenCalledTimes(1);
    expect(onMoveCommit).toHaveBeenCalledWith({ x: 2, y: 0 });
  });

  it("animatedWorldPos is null and remainingPath is empty after animation completes", () => {
    let ticker: ReturnType<typeof makeTicker>;
    const { result } = renderHook(() => {
      ticker = makeTicker();
      return useTokenMovement({
        app: { ticker: ticker.ticker } as unknown as UseTokenMovementOptions["app"],
        gridSize: GRID_SIZE,
        tokenSize: 1,
        movementSpeed: 5,
      });
    });

    act(() => {
      result.current.startAnimation({ x: 0, y: 0 }, [{ col: 1, row: 0 }], { x: 1, y: 0 }, vi.fn());
    });
    act(() => {
      ticker!.tick(2000);
    });

    expect(result.current.animatedWorldPos).toBeNull();
    expect(result.current.remainingPath).toEqual([]);
    expect(result.current.isAnimating).toBe(false);
  });

  it("ticker listener is removed on unmount", () => {
    const mock = makeTicker();
    const { unmount } = renderHook(() =>
      useTokenMovement({
        app: { ticker: mock.ticker } as unknown as UseTokenMovementOptions["app"],
        gridSize: GRID_SIZE,
        tokenSize: 1,
      }),
    );

    unmount();

    expect(mock.ticker.remove).toHaveBeenCalledWith(expect.any(Function));
  });

  it("does not call onMoveCommit if unmounted during animation", () => {
    let ticker: ReturnType<typeof makeTicker>;
    const { result, unmount } = renderHook(() => {
      ticker = makeTicker();
      return useTokenMovement({
        app: { ticker: ticker.ticker } as unknown as UseTokenMovementOptions["app"],
        gridSize: GRID_SIZE,
        tokenSize: 1,
        movementSpeed: 5,
      });
    });

    const onMoveCommit = vi.fn();
    act(() => {
      result.current.startAnimation(
        { x: 0, y: 0 },
        [{ col: 1, row: 0 }],
        { x: 1, y: 0 },
        onMoveCommit,
      );
    });

    unmount();

    // Tick after unmount — ticker was removed, so tickFn never fires. Commit must not be called.
    ticker!.tick(2000);

    expect(onMoveCommit).not.toHaveBeenCalled();
  });

  it("movementSpeed=10 covers twice the distance per frame compared to movementSpeed=5", () => {
    const makeMockedHook = (speed: number) => {
      const mock = makeTicker();
      const hook = renderHook(() =>
        useTokenMovement({
          app: { ticker: mock.ticker } as unknown as UseTokenMovementOptions["app"],
          gridSize: GRID_SIZE,
          tokenSize: 1,
          movementSpeed: speed,
        }),
      );
      return { hook, mock };
    };

    const slow = makeMockedHook(5);
    const fast = makeMockedHook(10);

    const path = [{ col: 5, row: 0 }]; // far enough to not complete in one frame

    act(() => {
      slow.hook.result.current.startAnimation({ x: 0, y: 0 }, path, { x: 5, y: 0 }, vi.fn());
      fast.hook.result.current.startAnimation({ x: 0, y: 0 }, path, { x: 5, y: 0 }, vi.fn());
    });

    act(() => {
      slow.mock.tick(100);
      fast.mock.tick(100);
    });

    const slowX = slow.hook.result.current.animatedWorldPos?.x ?? 0;
    const fastX = fast.hook.result.current.animatedWorldPos?.x ?? 0;
    expect(fastX).toBeCloseTo(slowX * 2, 0);
  });
});
