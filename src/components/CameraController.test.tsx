import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { CameraController } from "./CameraController";
import { useApplication } from "@pixi/react";
import { useCamera } from "../hooks/useCamera";
import { MIN_CAMERA_ZOOM, MAX_CAMERA_ZOOM } from "../utils/cameraMath";

vi.mock("@pixi/react", () => ({
  useApplication: vi.fn(),
}));

vi.mock("../hooks/useCamera", () => ({
  useCamera: vi.fn(),
}));

function makeTicker() {
  const handlers = new Set<() => void>();
  return {
    add: vi.fn((fn: () => void) => {
      handlers.add(fn);
    }),
    remove: vi.fn((fn: () => void) => {
      handlers.delete(fn);
    }),
    deltaMS: 16,
    /** Fire all registered tick handlers once. */
    _fire: () => {
      handlers.forEach((fn) => fn());
    },
  };
}

function makeCameraCtx(zoom = 1) {
  return {
    camera: { zoom, pan: { x: 0, y: 0 } },
    panBy: vi.fn(),
    zoomAt: vi.fn(),
    setPan: vi.fn(),
    setZoom: vi.fn(),
    minZoom: MIN_CAMERA_ZOOM,
    maxZoom: MAX_CAMERA_ZOOM,
  };
}

describe("CameraController", () => {
  let canvas: HTMLCanvasElement;
  let ticker: ReturnType<typeof makeTicker>;
  let ctx: ReturnType<typeof makeCameraCtx>;

  beforeEach(() => {
    canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    ticker = makeTicker();
    ctx = makeCameraCtx();
    vi.mocked(useApplication).mockReturnValue({ app: { canvas, ticker } } as never);
    vi.mocked(useCamera).mockReturnValue(ctx);
  });

  afterEach(() => {
    document.body.removeChild(canvas);
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Right-click drag panning
  // ---------------------------------------------------------------------------

  describe("right-click drag panning", () => {
    it("calls panBy when right-click dragging", () => {
      render(<CameraController />);

      canvas.dispatchEvent(
        new PointerEvent("pointerdown", { button: 2, clientX: 100, clientY: 100, bubbles: true }),
      );
      window.dispatchEvent(new PointerEvent("pointermove", { clientX: 200, clientY: 150 }));

      // delta = (100, 50); panBy receives -delta / zoom(1)
      expect(ctx.panBy).toHaveBeenCalledWith({ x: -100, y: -50 });
    });

    it("ignores left-click drags", () => {
      render(<CameraController />);

      canvas.dispatchEvent(
        new PointerEvent("pointerdown", { button: 0, clientX: 100, clientY: 100, bubbles: true }),
      );
      window.dispatchEvent(new PointerEvent("pointermove", { clientX: 200, clientY: 150 }));

      expect(ctx.panBy).not.toHaveBeenCalled();
    });

    it("stops panning after pointerup", () => {
      render(<CameraController />);

      canvas.dispatchEvent(
        new PointerEvent("pointerdown", { button: 2, clientX: 100, clientY: 100, bubbles: true }),
      );
      window.dispatchEvent(new PointerEvent("pointerup"));
      window.dispatchEvent(new PointerEvent("pointermove", { clientX: 200, clientY: 150 }));

      expect(ctx.panBy).not.toHaveBeenCalled();
    });

    it("divides the pointer delta by camera zoom", () => {
      ctx = makeCameraCtx(2);
      vi.mocked(useCamera).mockReturnValue(ctx);
      render(<CameraController />);

      canvas.dispatchEvent(
        new PointerEvent("pointerdown", { button: 2, clientX: 100, clientY: 100, bubbles: true }),
      );
      // Move diagonally so both axes have a real delta (avoids -0 vs 0 comparison issues)
      window.dispatchEvent(new PointerEvent("pointermove", { clientX: 200, clientY: 150 }));

      // deltaX=100 / zoom=2 → x=-50; deltaY=50 / zoom=2 → y=-25
      expect(ctx.panBy).toHaveBeenCalledWith({ x: -50, y: -25 });
    });

    it("accumulates deltas across multiple moves", () => {
      render(<CameraController />);

      canvas.dispatchEvent(
        new PointerEvent("pointerdown", { button: 2, clientX: 100, clientY: 100, bubbles: true }),
      );
      window.dispatchEvent(new PointerEvent("pointermove", { clientX: 160, clientY: 110 }));
      window.dispatchEvent(new PointerEvent("pointermove", { clientX: 200, clientY: 120 }));

      expect(ctx.panBy).toHaveBeenCalledTimes(2);
      expect(ctx.panBy).toHaveBeenNthCalledWith(1, { x: -60, y: -10 });
      expect(ctx.panBy).toHaveBeenNthCalledWith(2, { x: -40, y: -10 });
    });

    it("removes pointer event listeners on unmount", () => {
      const canvasSpy = vi.spyOn(canvas, "removeEventListener");
      const windowSpy = vi.spyOn(window, "removeEventListener");

      const { unmount } = render(<CameraController />);
      unmount();

      expect(canvasSpy).toHaveBeenCalledWith("pointerdown", expect.any(Function));
      expect(windowSpy).toHaveBeenCalledWith("pointermove", expect.any(Function));
      expect(windowSpy).toHaveBeenCalledWith("pointerup", expect.any(Function));

      canvasSpy.mockRestore();
      windowSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  // Wheel zoom
  // ---------------------------------------------------------------------------

  describe("wheel zoom", () => {
    it("calls zoomAt on scroll-up (zoom in)", () => {
      render(<CameraController />);

      // getBoundingClientRect returns zeros in jsdom, so screenX = clientX - 0 = clientX
      canvas.dispatchEvent(
        new WheelEvent("wheel", {
          deltaY: -150,
          clientX: 50,
          clientY: 80,
          bubbles: true,
          cancelable: true,
        }),
      );

      expect(ctx.zoomAt).toHaveBeenCalledWith({ x: 50, y: 80 }, expect.any(Number));
      const [, nextZoom] = vi.mocked(ctx.zoomAt).mock.calls[0];
      expect(nextZoom).toBeGreaterThan(1); // scroll up → zoom in
    });

    it("calls zoomAt on scroll-down (zoom out)", () => {
      render(<CameraController />);

      canvas.dispatchEvent(
        new WheelEvent("wheel", {
          deltaY: 150,
          clientX: 50,
          clientY: 80,
          bubbles: true,
          cancelable: true,
        }),
      );

      const [, nextZoom] = vi.mocked(ctx.zoomAt).mock.calls[0];
      expect(nextZoom).toBeLessThan(1); // scroll down → zoom out
    });

    it("uses the cursor position as the zoom anchor", () => {
      render(<CameraController />);

      canvas.dispatchEvent(
        new WheelEvent("wheel", {
          deltaY: -100,
          clientX: 320,
          clientY: 240,
          bubbles: true,
          cancelable: true,
        }),
      );

      const [screenPoint] = vi.mocked(ctx.zoomAt).mock.calls[0];
      expect(screenPoint).toEqual({ x: 320, y: 240 });
    });

    it("removes the wheel listener on unmount", () => {
      const spy = vi.spyOn(canvas, "removeEventListener");
      const { unmount } = render(<CameraController />);
      unmount();

      expect(spy).toHaveBeenCalledWith("wheel", expect.any(Function));
      spy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  // Keyboard panning (via ticker tick)
  // ---------------------------------------------------------------------------

  describe("keyboard panning", () => {
    it("pans right on KeyD", () => {
      render(<CameraController />);

      window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyD" }));
      ticker._fire();

      expect(ctx.panBy).toHaveBeenCalledOnce();
      const [{ x, y }] = vi.mocked(ctx.panBy).mock.calls[0];
      expect(x).toBeGreaterThan(0);
      expect(y).toBe(0);
    });

    it("pans right on ArrowRight", () => {
      render(<CameraController />);

      window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowRight" }));
      ticker._fire();

      const [{ x }] = vi.mocked(ctx.panBy).mock.calls[0];
      expect(x).toBeGreaterThan(0);
    });

    it("pans left on KeyA", () => {
      render(<CameraController />);

      window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyA" }));
      ticker._fire();

      const [{ x, y }] = vi.mocked(ctx.panBy).mock.calls[0];
      expect(x).toBeLessThan(0);
      expect(y).toBe(0);
    });

    it("pans up on KeyW", () => {
      render(<CameraController />);

      window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));
      ticker._fire();

      const [{ x, y }] = vi.mocked(ctx.panBy).mock.calls[0];
      expect(x).toBe(0);
      expect(y).toBeLessThan(0);
    });

    it("pans down on ArrowDown", () => {
      render(<CameraController />);

      window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowDown" }));
      ticker._fire();

      const [{ x, y }] = vi.mocked(ctx.panBy).mock.calls[0];
      expect(x).toBe(0);
      expect(y).toBeGreaterThan(0);
    });

    it("normalises diagonal movement so speed is equal in all directions", () => {
      render(<CameraController />);

      // Holding both right and down simultaneously
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyD" }));
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyS" }));
      ticker._fire();

      const [{ x, y }] = vi.mocked(ctx.panBy).mock.calls[0];
      // Diagonal: |x| should equal |y| and be less than the axis-only worldStep
      expect(x).toBeGreaterThan(0);
      expect(y).toBeGreaterThan(0);
      expect(x).toBeCloseTo(y, 5);
    });

    it("does not call panBy when no keys are held", () => {
      render(<CameraController />);
      ticker._fire();
      expect(ctx.panBy).not.toHaveBeenCalled();
    });

    it("stops panning after keyup", () => {
      render(<CameraController />);

      window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyD" }));
      window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyD" }));
      ticker._fire();

      expect(ctx.panBy).not.toHaveBeenCalled();
    });

    it("clears all held keys on window blur", () => {
      render(<CameraController />);

      window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyD" }));
      window.dispatchEvent(new Event("blur"));
      ticker._fire();

      expect(ctx.panBy).not.toHaveBeenCalled();
    });

    it("removes keyboard and ticker listeners on unmount", () => {
      const windowSpy = vi.spyOn(window, "removeEventListener");
      const { unmount } = render(<CameraController />);
      unmount();

      expect(windowSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
      expect(windowSpy).toHaveBeenCalledWith("keyup", expect.any(Function));
      expect(windowSpy).toHaveBeenCalledWith("blur", expect.any(Function));
      expect(ticker.remove).toHaveBeenCalled();

      windowSpy.mockRestore();
    });
  });
});
