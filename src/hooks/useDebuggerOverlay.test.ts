import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebuggerOverlay } from "./useDebuggerOverlay";
import type { RefObject } from "react";
import type { CameraState } from "../utils/cameraMath";

const identityCamera: CameraState = { zoom: 1, pan: { x: 0, y: 0 } };

/** Build a container div with a canvas child whose bounding rect is configured. */
function makeContainerWithCanvas(rect: DOMRect) {
  const container = document.createElement("div");
  const canvas = document.createElement("canvas");
  canvas.getBoundingClientRect = () => rect;
  container.appendChild(canvas);
  document.body.appendChild(container);
  return container;
}

/** Fire a PointerEvent on window at the given client coordinates. */
function firePointerMove(clientX: number, clientY: number) {
  window.dispatchEvent(new PointerEvent("pointermove", { clientX, clientY }));
}

/** Create a ref-shaped object pointing at the given element. */
function makeRef<T extends HTMLElement>(el: T): RefObject<T | null> {
  return { current: el };
}

describe("useDebuggerOverlay", () => {
  let container: HTMLDivElement;
  const canvasRect = new DOMRect(100, 100, 400, 300); // left=100 top=100 right=500 bottom=400

  beforeEach(() => {
    container = makeContainerWithCanvas(canvasRect);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it("returns gridCell as null initially", () => {
    const { result } = renderHook(() =>
      useDebuggerOverlay({ camera: identityCamera, containerRef: makeRef(container) }),
    );

    expect(result.current.gridCell).toBeNull();
  });

  it("returns null when there is no canvas in the container", () => {
    const emptyContainer = document.createElement("div");
    document.body.appendChild(emptyContainer);

    const { result } = renderHook(() =>
      useDebuggerOverlay({ camera: identityCamera, containerRef: makeRef(emptyContainer) }),
    );

    act(() => {
      firePointerMove(200, 200);
    });

    expect(result.current.gridCell).toBeNull();
    document.body.removeChild(emptyContainer);
  });

  it("returns a GridCell when the pointer moves inside the canvas", () => {
    const { result } = renderHook(() =>
      useDebuggerOverlay({
        camera: identityCamera,
        gridSize: 64,
        containerRef: makeRef(container),
      }),
    );

    act(() => {
      // clientX=164, clientY=164 → screenX=64, screenY=64 → world (64,64) → cell (1,1)
      firePointerMove(164, 164);
    });

    expect(result.current.gridCell).toEqual({ col: 1, row: 1 });
  });

  it("returns null when the pointer moves outside the canvas horizontally", () => {
    const { result } = renderHook(() =>
      useDebuggerOverlay({ camera: identityCamera, containerRef: makeRef(container) }),
    );

    act(() => {
      firePointerMove(164, 164); // inside first
    });
    act(() => {
      firePointerMove(50, 200); // outside left edge (left=100)
    });

    expect(result.current.gridCell).toBeNull();
  });

  it("returns null when the pointer moves outside the canvas vertically", () => {
    const { result } = renderHook(() =>
      useDebuggerOverlay({ camera: identityCamera, containerRef: makeRef(container) }),
    );

    act(() => {
      firePointerMove(164, 164); // inside first
    });
    act(() => {
      firePointerMove(200, 50); // above top edge (top=100)
    });

    expect(result.current.gridCell).toBeNull();
  });

  it("recalculates the grid cell when the camera changes", () => {
    const { result, rerender } = renderHook(
      ({ camera }: { camera: CameraState }) =>
        useDebuggerOverlay({ camera, gridSize: 64, containerRef: makeRef(container) }),
      { initialProps: { camera: identityCamera } },
    );

    act(() => {
      // screenX=64, screenY=64 → world (64,64) at zoom=1, pan=0 → cell (1,1)
      firePointerMove(164, 164);
    });

    expect(result.current.gridCell).toEqual({ col: 1, row: 1 });

    // With pan=64 the world point shifts: world.x = 64/1 + 64 = 128 → col=2
    rerender({ camera: { zoom: 1, pan: { x: 64, y: 64 } } });

    expect(result.current.gridCell).toEqual({ col: 2, row: 2 });
  });

  it("removes the pointermove event listener on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() =>
      useDebuggerOverlay({ camera: identityCamera, containerRef: makeRef(container) }),
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith("pointermove", expect.any(Function));

    removeEventListenerSpy.mockRestore();
  });
});
