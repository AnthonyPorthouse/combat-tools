import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import type { Token } from "../types/token";

import { useTokenDrag } from "./useTokenDrag";

// pixi.js is only referenced as `import type` in useTokenDrag, so no mock needed.

/** Build a mock app whose stage captures and re-emits registered event handlers. */
function makeApp() {
  const handlers: Record<string, (arg?: unknown) => void> = {};
  return {
    stage: {
      on: vi.fn((event: string, handler: (arg?: unknown) => void) => {
        handlers[event] = handler;
      }),
      off: vi.fn(),
      /** Helper for tests: trigger a registered handler directly. */
      emit: (event: string, arg?: unknown) => handlers[event]?.(arg),
    },
  };
}

const defaultCamera = { zoom: 1, pan: { x: 0, y: 0 } };
const defaultToken: Token = { id: "t1", name: "Goblin", size: 1 };

// position(2,2) * gridSize(64) at zoom=1 pan=0 → screenX=128, screenY=128
const defaultTokenScreenPos = { x: 128, y: 128 };

function makeOptions(overrides: Partial<Parameters<typeof useTokenDrag>[0]> = {}) {
  return {
    app: makeApp() as unknown as Parameters<typeof useTokenDrag>[0]["app"],
    token: defaultToken,
    position: { x: 2, y: 2 },
    gridSize: 64,
    camera: defaultCamera,
    onMove: vi.fn(),
    tokenWorldSize: 64,
    tokenScreenPos: defaultTokenScreenPos,
    ...overrides,
  };
}

describe("useTokenDrag", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null for ghostScreenPos and dropZoneScreenPos initially", () => {
    const { result } = renderHook(() => useTokenDrag(makeOptions()));
    expect(result.current.ghostScreenPos).toBeNull();
    expect(result.current.dropZoneScreenPos).toBeNull();
  });

  it("handlePointerDown ignores non-left-button events", () => {
    const { result } = renderHook(() => useTokenDrag(makeOptions()));
    const e = { button: 2, stopPropagation: vi.fn(), global: { x: 148, y: 148 } };

    act(() => {
      result.current.handlePointerDown(e);
    });

    expect(result.current.ghostScreenPos).toBeNull();
    expect(e.stopPropagation).not.toHaveBeenCalled();
  });

  it("handlePointerDown ignores locked tokens", () => {
    const { result } = renderHook(() =>
      useTokenDrag(makeOptions({ token: { ...defaultToken, locked: true } })),
    );
    const e = { button: 0, stopPropagation: vi.fn(), global: { x: 148, y: 148 } };

    act(() => {
      result.current.handlePointerDown(e);
    });

    expect(result.current.ghostScreenPos).toBeNull();
  });

  it("handlePointerDown sets ghostScreenPos to tokenScreenPos on left click", () => {
    // Click at (148, 160) within the token — offset = (20, 32)
    // ghostPos = cursor - offset = (128, 128) = tokenScreenPos
    const { result } = renderHook(() => useTokenDrag(makeOptions()));
    const e = { button: 0, stopPropagation: vi.fn(), global: { x: 148, y: 160 } };

    act(() => {
      result.current.handlePointerDown(e);
    });

    expect(result.current.ghostScreenPos).toEqual({ x: 128, y: 128 });
    expect(e.stopPropagation).toHaveBeenCalled();
  });

  it("globalpointermove updates ghostScreenPos with preserved offset", () => {
    // Click at (148, 160) → offset=(20,32); move to (200,220) → ghost=(180,188)
    const app = makeApp();
    const { result } = renderHook(() => useTokenDrag(makeOptions({ app: app as never })));

    act(() => {
      result.current.handlePointerDown({
        button: 0,
        stopPropagation: vi.fn(),
        global: { x: 148, y: 160 },
      });
    });

    act(() => {
      app.stage.emit("globalpointermove", { global: { x: 200, y: 220 } });
    });

    expect(result.current.ghostScreenPos).toEqual({ x: 180, y: 188 });
  });

  it("globalpointermove is a no-op when not dragging", () => {
    const app = makeApp();
    const { result } = renderHook(() => useTokenDrag(makeOptions({ app: app as never })));

    act(() => {
      app.stage.emit("globalpointermove", { global: { x: 200, y: 200 } });
    });

    expect(result.current.ghostScreenPos).toBeNull();
  });

  it("dropZoneScreenPos is null when not dragging", () => {
    const { result } = renderHook(() => useTokenDrag(makeOptions()));
    expect(result.current.dropZoneScreenPos).toBeNull();
  });

  it("dropZoneScreenPos snaps the ghost top-left to the nearest grid cell", () => {
    // Click at (160,160) → offset=(32,32); move to (224,224) → ghost=(192,192)
    // world=(192,192) → cell=round(192/64)=3 → cellWorld=(192,192) → screen=(192,192)
    const app = makeApp();
    const { result } = renderHook(() => useTokenDrag(makeOptions({ app: app as never })));

    act(() => {
      result.current.handlePointerDown({
        button: 0,
        stopPropagation: vi.fn(),
        global: { x: 160, y: 160 },
      });
    });

    act(() => {
      app.stage.emit("globalpointermove", { global: { x: 224, y: 224 } });
    });

    expect(result.current.dropZoneScreenPos).toEqual({ x: 192, y: 192 });
  });

  it("pointerup calls onMove with the snapped grid cell and clears ghost state", () => {
    // Click at (160,160) → offset=(32,32); cursor at (160,100) → ghost=(128,68)
    // world=(128,68) → col=round(2)=2, row=round(1.0625)=1
    const onMove = vi.fn();
    const app = makeApp();
    const { result } = renderHook(() => useTokenDrag(makeOptions({ app: app as never, onMove })));

    act(() => {
      result.current.handlePointerDown({
        button: 0,
        stopPropagation: vi.fn(),
        global: { x: 160, y: 160 },
      });
    });

    act(() => {
      app.stage.emit("globalpointermove", { global: { x: 160, y: 100 } });
    });

    act(() => {
      app.stage.emit("pointerup");
    });

    expect(onMove).toHaveBeenCalledWith("t1", { x: 2, y: 1 });
    expect(result.current.ghostScreenPos).toBeNull();
  });

  it("skips registering stage listeners when app is null", () => {
    const { result } = renderHook(() => useTokenDrag(makeOptions({ app: null })));
    expect(result.current.ghostScreenPos).toBeNull();
    expect(result.current.dropZoneScreenPos).toBeNull();
  });

  it("pointerup is a no-op when not dragging", () => {
    const onMove = vi.fn();
    const app = makeApp();
    renderHook(() => useTokenDrag(makeOptions({ app: app as never, onMove })));

    act(() => {
      app.stage.emit("pointerup");
    });

    expect(onMove).not.toHaveBeenCalled();
  });

  it("dropZoneScreenPos centres a half-size token within its grid cell", () => {
    // tokenScreenPos=(160,160), click at (160,160) → offset={0,0}
    // move to (192,192) → ghostScreenPos=(192,192)
    // screenToWorld({192,192}, zoom=1 pan=0) → {192,192}
    // worldToGridCell({192,192}, 64) → col=3, row=3
    // size=0.5, tokenWorldSize=32: cellWorldX = 3×64 + (64−32)/2 = 192+16 = 208
    // worldToScreen({208,208}, zoom=1 pan=0) → {208,208}
    const app = makeApp();
    const halfToken: Token = { id: "t2", name: "Sprite", size: 0.5 };
    const { result } = renderHook(() =>
      useTokenDrag(
        makeOptions({
          app: app as never,
          token: halfToken,
          tokenWorldSize: 32,
          tokenScreenPos: { x: 160, y: 160 },
        }),
      ),
    );

    act(() => {
      result.current.handlePointerDown({
        button: 0,
        stopPropagation: vi.fn(),
        global: { x: 160, y: 160 },
      });
    });

    act(() => {
      app.stage.emit("globalpointermove", { global: { x: 192, y: 192 } });
    });

    expect(result.current.dropZoneScreenPos).toEqual({ x: 208, y: 208 });
  });

  it("targetCell is null when not dragging", () => {
    const { result } = renderHook(() => useTokenDrag(makeOptions()));
    expect(result.current.targetCell).toBeNull();
  });

  it("targetCell snaps to the correct grid cell during drag", () => {
    // ghost at screen (192, 192) → world (192, 192) → cell round(192/64)=3
    const app = makeApp();
    const { result } = renderHook(() => useTokenDrag(makeOptions({ app: app as never })));

    act(() => {
      result.current.handlePointerDown({
        button: 0,
        stopPropagation: vi.fn(),
        global: { x: 160, y: 160 },
      });
    });

    act(() => {
      app.stage.emit("globalpointermove", { global: { x: 224, y: 224 } });
    });

    expect(result.current.targetCell).toEqual({ col: 3, row: 3 });
  });

  it("targetCell updates when the ghost moves to a different cell", () => {
    const app = makeApp();
    const { result } = renderHook(() => useTokenDrag(makeOptions({ app: app as never })));

    act(() => {
      result.current.handlePointerDown({
        button: 0,
        stopPropagation: vi.fn(),
        global: { x: 160, y: 160 },
      });
    });

    act(() => {
      app.stage.emit("globalpointermove", { global: { x: 224, y: 224 } });
    });
    expect(result.current.targetCell).toEqual({ col: 3, row: 3 });

    act(() => {
      app.stage.emit("globalpointermove", { global: { x: 352, y: 352 } });
    });
    // click at (160,160) → offset=(32,32); cursor=(352,352) → ghost=(320,320)
    // world=(320,320) → cell=round(320/64)=5
    expect(result.current.targetCell).toEqual({ col: 5, row: 5 });
  });

  it("resolveTargetCell is applied to the onMove cell", () => {
    // raw cell: click at (160,160)→offset(32,32); move to (224,224)→ghost(192,192)→world(192,192)→cell(3,3)
    // resolver adds (10,10) → expect onMove called with (13,13)
    const onMove = vi.fn();
    const resolveTargetCell = vi.fn((raw: { col: number; row: number }) => ({
      col: raw.col + 10,
      row: raw.row + 10,
    }));
    const app = makeApp();
    const { result } = renderHook(() =>
      useTokenDrag(makeOptions({ app: app as never, onMove, resolveTargetCell })),
    );

    act(() => {
      result.current.handlePointerDown({
        button: 0,
        stopPropagation: vi.fn(),
        global: { x: 160, y: 160 },
      });
    });
    act(() => {
      app.stage.emit("globalpointermove", { global: { x: 224, y: 224 } });
    });
    act(() => {
      app.stage.emit("pointerup");
    });

    expect(resolveTargetCell).toHaveBeenCalledWith({ col: 3, row: 3 });
    expect(onMove).toHaveBeenCalledWith("t1", { x: 13, y: 13 });
  });

  it("targetCell reflects the resolved cell", () => {
    const resolveTargetCell = vi.fn(() => ({ col: 99, row: 99 }));
    const app = makeApp();
    const { result } = renderHook(() =>
      useTokenDrag(makeOptions({ app: app as never, resolveTargetCell })),
    );

    act(() => {
      result.current.handlePointerDown({
        button: 0,
        stopPropagation: vi.fn(),
        global: { x: 160, y: 160 },
      });
    });
    act(() => {
      app.stage.emit("globalpointermove", { global: { x: 224, y: 224 } });
    });

    expect(result.current.targetCell).toEqual({ col: 99, row: 99 });
  });

  it("stage listeners are removed on unmount", () => {
    const app = makeApp();
    const { unmount } = renderHook(() => useTokenDrag(makeOptions({ app: app as never })));

    unmount();

    expect(app.stage.off).toHaveBeenCalledWith("globalpointermove", expect.any(Function));
    expect(app.stage.off).toHaveBeenCalledWith("pointerup", expect.any(Function));
    expect(app.stage.off).toHaveBeenCalledWith("pointerupoutside", expect.any(Function));
  });
});
