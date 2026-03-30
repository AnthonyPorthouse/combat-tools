import type { RefObject } from "react";
import type { DragEvent } from "react";

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import type { Token } from "../types/token";

import { CameraProvider } from "../contexts/CameraProvider";
import { useLibraryDrop } from "./useLibraryDrop";

// Default camera: zoom=1, pan={0,0}
// screenToWorld(screen) = screen
// worldToGridCell(world, 64) = { col: Math.round(world.x / 64), row: Math.round(world.y / 64) }

function makeContainerRef(rectOverrides: Partial<DOMRect> = {}): RefObject<HTMLDivElement | null> {
  const div = document.createElement("div");
  vi.spyOn(div, "getBoundingClientRect").mockReturnValue({
    left: 0,
    top: 0,
    right: 200,
    bottom: 200,
    width: 200,
    height: 200,
    x: 0,
    y: 0,
    toJSON: () => ({}),
    ...rectOverrides,
  } as DOMRect);
  return { current: div } as RefObject<HTMLDivElement | null>;
}

function makeDraggedTokenRef(token: Token | null = null): RefObject<Token | null> {
  return { current: token } as RefObject<Token | null>;
}

function makeDragEvent(overrides: Partial<{ clientX: number; clientY: number }> = {}) {
  return {
    preventDefault: vi.fn(),
    dataTransfer: { dropEffect: "" },
    clientX: 128,
    clientY: 64,
    ...overrides,
  } as unknown as DragEvent<HTMLDivElement>;
}

const goblin: Token = { id: "t1", name: "Goblin", size: 1 };

function renderDrop(
  overrides: Partial<{
    containerRef: RefObject<HTMLDivElement | null>;
    draggedTokenRef: RefObject<Token | null>;
    onDrop: ReturnType<typeof vi.fn>;
  }> = {},
) {
  const containerRef = overrides.containerRef ?? makeContainerRef();
  const draggedTokenRef = overrides.draggedTokenRef ?? makeDraggedTokenRef();
  const onDrop = overrides.onDrop ?? vi.fn();

  const hook = renderHook(
    () =>
      useLibraryDrop({
        containerRef,
        gridSize: 64,
        draggedTokenRef,
        onDrop,
      }),
    {
      wrapper: ({ children }) => <CameraProvider>{children}</CameraProvider>,
    },
  );

  return { ...hook, containerRef, draggedTokenRef, onDrop };
}

describe("useLibraryDrop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("onDragOver", () => {
    it("calls e.preventDefault()", () => {
      const { result } = renderDrop();
      const e = makeDragEvent();
      act(() => {
        result.current.dropAreaProps.onDragOver(e);
      });
      expect(e.preventDefault).toHaveBeenCalled();
    });

    it("sets e.dataTransfer.dropEffect to 'copy'", () => {
      const { result } = renderDrop();
      const e = makeDragEvent();
      act(() => {
        result.current.dropAreaProps.onDragOver(e);
      });
      expect(e.dataTransfer.dropEffect).toBe("copy");
    });
  });

  describe("onDrop — early returns", () => {
    it("does not call onDrop callback when draggedTokenRef.current is null", () => {
      const onDrop = vi.fn();
      const { result } = renderDrop({ draggedTokenRef: makeDraggedTokenRef(null), onDrop });
      const e = makeDragEvent();
      act(() => {
        result.current.dropAreaProps.onDrop(e);
      });
      expect(onDrop).not.toHaveBeenCalled();
    });

    it("still calls e.preventDefault() even when draggedTokenRef is null", () => {
      const { result } = renderDrop({ draggedTokenRef: makeDraggedTokenRef(null) });
      const e = makeDragEvent();
      act(() => {
        result.current.dropAreaProps.onDrop(e);
      });
      expect(e.preventDefault).toHaveBeenCalled();
    });

    it("does not call onDrop callback when containerRef.current is null", () => {
      const onDrop = vi.fn();
      const nullContainerRef = { current: null } as RefObject<HTMLDivElement | null>;
      const { result } = renderDrop({
        containerRef: nullContainerRef,
        draggedTokenRef: makeDraggedTokenRef(goblin),
        onDrop,
      });
      const e = makeDragEvent();
      act(() => {
        result.current.dropAreaProps.onDrop(e);
      });
      expect(onDrop).not.toHaveBeenCalled();
    });
  });

  describe("onDrop — successful drop", () => {
    it("calls e.preventDefault()", () => {
      const { result } = renderDrop({ draggedTokenRef: makeDraggedTokenRef(goblin) });
      const e = makeDragEvent();
      act(() => {
        result.current.dropAreaProps.onDrop(e);
      });
      expect(e.preventDefault).toHaveBeenCalled();
    });

    it("calls onDrop with a token derived from the template and correct cell position", () => {
      // clientX=128, clientY=64, rect.left=0, rect.top=0
      // screen=(128,64) → world=(128,64) → cell={col:2, row:1}
      const onDrop = vi.fn();
      const { result } = renderDrop({
        draggedTokenRef: makeDraggedTokenRef(goblin),
        onDrop,
      });
      const e = makeDragEvent({ clientX: 128, clientY: 64 });
      act(() => {
        result.current.dropAreaProps.onDrop(e);
      });
      expect(onDrop).toHaveBeenCalledWith(expect.objectContaining({ name: "Goblin", size: 1 }), {
        x: 2,
        y: 1,
      });
    });

    it("the new token has a different id from the template", () => {
      const onDrop = vi.fn();
      const { result } = renderDrop({
        draggedTokenRef: makeDraggedTokenRef(goblin),
        onDrop,
      });
      act(() => {
        result.current.dropAreaProps.onDrop(makeDragEvent());
      });
      const [droppedToken] = onDrop.mock.calls[0];
      expect(droppedToken.id).not.toBe("t1");
    });

    it("snaps to the correct grid cell", () => {
      // clientX=192, clientY=192 → world=(192,192) → col=round(3)=3, row=3
      const onDrop = vi.fn();
      const { result } = renderDrop({
        draggedTokenRef: makeDraggedTokenRef(goblin),
        onDrop,
      });
      act(() => {
        result.current.dropAreaProps.onDrop(makeDragEvent({ clientX: 192, clientY: 192 }));
      });
      expect(onDrop).toHaveBeenCalledWith(expect.anything(), { x: 3, y: 3 });
    });

    it("accounts for container rect offset in screen coordinate calculation", () => {
      // rect.left=50, rect.top=30, clientX=178, clientY=94
      // screen=(128, 64) → world=(128,64) → col=2, row=1
      const onDrop = vi.fn();
      const containerRef = makeContainerRef({ left: 50, top: 30 });
      const { result } = renderDrop({
        containerRef,
        draggedTokenRef: makeDraggedTokenRef(goblin),
        onDrop,
      });
      act(() => {
        result.current.dropAreaProps.onDrop(makeDragEvent({ clientX: 178, clientY: 94 }));
      });
      expect(onDrop).toHaveBeenCalledWith(expect.anything(), { x: 2, y: 1 });
    });

    it("resets draggedTokenRef.current to null after drop", () => {
      const draggedTokenRef = makeDraggedTokenRef(goblin);
      const { result } = renderDrop({ draggedTokenRef });
      act(() => {
        result.current.dropAreaProps.onDrop(makeDragEvent());
      });
      expect((draggedTokenRef as React.MutableRefObject<Token | null>).current).toBeNull();
    });

    it("passes image from template to the new token", () => {
      const tokenWithImage: Token = { ...goblin, image: "data:image/png;base64,abc" };
      const onDrop = vi.fn();
      const { result } = renderDrop({
        draggedTokenRef: makeDraggedTokenRef(tokenWithImage),
        onDrop,
      });
      act(() => {
        result.current.dropAreaProps.onDrop(makeDragEvent());
      });
      expect(onDrop).toHaveBeenCalledWith(
        expect.objectContaining({ image: "data:image/png;base64,abc" }),
        expect.anything(),
      );
    });

    it("passes locked flag from template to the new token", () => {
      const lockedToken: Token = { ...goblin, locked: true };
      const onDrop = vi.fn();
      const { result } = renderDrop({
        draggedTokenRef: makeDraggedTokenRef(lockedToken),
        onDrop,
      });
      act(() => {
        result.current.dropAreaProps.onDrop(makeDragEvent());
      });
      expect(onDrop).toHaveBeenCalledWith(
        expect.objectContaining({ locked: true }),
        expect.anything(),
      );
    });
  });
});
