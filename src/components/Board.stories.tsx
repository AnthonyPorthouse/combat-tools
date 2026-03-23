import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import { useEffect } from "react";
import { Board } from "./Board";
import { useCamera } from "../hooks/useCamera";
import type { CameraState } from "../utils/cameraMath";

/** Wraps Board stories in a full-viewport container so Pixi's resizeTo=window
 * has a measurable height to fill. */
const fullViewportDecorator: Decorator = (Story) => (
  <div style={{ width: "100%", height: "100vh", overflow: "hidden" }}>
    <Story />
  </div>
);

const GRID_SIZE = 64;

/**
 * Mirrors live camera state into a plain object readable by Storybook play
 * functions (which run outside the Pixi tree). Must be rendered as a child of
 * Board so it sits inside CameraProvider.
 */
const cameraSnapshot: CameraState = { zoom: 1, pan: { x: 0, y: 0 } };

function CameraStateCapture() {
  const { camera } = useCamera();
  useEffect(() => {
    cameraSnapshot.zoom = camera.zoom;
    cameraSnapshot.pan = { ...camera.pan };
  }, [camera]);
  return null;
}

const meta: Meta<typeof Board> = {
  title: "Combat/Board",
  component: Board,
  decorators: [fullViewportDecorator],
  parameters: {
    layout: "fullscreen",
  },
  args: {
    gridSize: GRID_SIZE,
  },
};

export default meta;
type Story = StoryObj<typeof Board>;

/** Fires a wheel event on the canvas to adjust zoom.
 * `WHEEL_ZOOM_SENSITIVITY = 0.0015` so `zoomFactor = exp(-deltaY * 0.0015)`. */
function fireWheel(canvas: HTMLCanvasElement, deltaY: number) {
  const { left, top, width, height } = canvas.getBoundingClientRect();
  canvas.dispatchEvent(
    new WheelEvent("wheel", {
      deltaY,
      clientX: left + width / 2,
      clientY: top + height / 2,
      bubbles: true,
      cancelable: true,
    }),
  );
}

/** Fires a right-click drag sequence on the canvas to pan the view.
 * The camera pans by `(-delta / zoom)` world units, so moving the pointer
 * left/up shifts the visible area right/down. */
function firePan(
  canvas: HTMLCanvasElement,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
) {
  canvas.dispatchEvent(
    new PointerEvent("pointerdown", {
      button: 2,
      clientX: fromX,
      clientY: fromY,
      bubbles: true,
      isPrimary: true,
      pointerId: 1,
    }),
  );
  canvas.dispatchEvent(
    new PointerEvent("pointermove", {
      clientX: toX,
      clientY: toY,
      bubbles: true,
      isPrimary: true,
      pointerId: 1,
    }),
  );
  canvas.dispatchEvent(
    new PointerEvent("pointerup", {
      clientX: toX,
      clientY: toY,
      bubbles: true,
      isPrimary: true,
      pointerId: 1,
    }),
  );
}

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/**
 * The Board at its default state — zoom 1×, centred on the grid origin.
 *
 * **Camera controls:**
 * - **Scroll wheel** — zoom in / out (range: 0.1× – 8×)
 * - **Right-click drag** — pan across the infinite grid
 * - **W / A / S / D** or **Arrow keys** — pan at 700 world-units per second
 */
export const EmptyBoard: Story = {};

/**
 * The Board zoomed in to ~3× magnification.
 *
 * Five scroll-up events are fired during setup. At this zoom level grid lines
 * are spaced further apart on screen, making individual cells easier to work
 * with.
 */
export const ZoomedIn: Story = {
  render: (args) => (
    <Board {...args}>
      <CameraStateCapture />
    </Board>
  ),
  play: async ({ canvasElement }) => {
    const canvas = canvasElement.querySelector("canvas");
    if (!canvas) throw new Error("PixiJS canvas not found");

    // Wait for PixiJS to initialise its WebGL context and event system.
    await new Promise<void>((r) => setTimeout(r, 500));

    // Each event: zoomFactor = exp(-(-150) * 0.0015) ≈ 1.252
    // After 5 events: exp(1.125) ≈ 3.08×
    // Await between events so React can re-render and the wheel handler picks
    // up the updated camera.zoom before the next event fires.
    for (let i = 0; i < 5; i++) {
      fireWheel(canvas, -150);
      await new Promise<void>((r) => setTimeout(r, 50));
    }

    await waitFor(() => expect(cameraSnapshot.zoom).toBeCloseTo(3.08, 1));
  },
};

/**
 * The Board zoomed out to ~0.33× magnification.
 *
 * Five scroll-down events are fired during setup. At this zoom level many grid
 * cells are visible simultaneously, useful for navigating large battle maps.
 */
export const ZoomedOut: Story = {
  render: (args) => (
    <Board {...args}>
      <CameraStateCapture />
    </Board>
  ),
  play: async ({ canvasElement }) => {
    const canvas = canvasElement.querySelector("canvas");
    if (!canvas) throw new Error("PixiJS canvas not found");

    await new Promise<void>((r) => setTimeout(r, 500));

    // Each event: zoomFactor = exp(-(150) * 0.0015) ≈ 0.799
    // After 5 events: exp(-1.125) ≈ 0.32×
    // Await between events so React can re-render and the wheel handler picks
    // up the updated camera.zoom before the next event fires.
    for (let i = 0; i < 5; i++) {
      fireWheel(canvas, 150);
      await new Promise<void>((r) => setTimeout(r, 50));
    }

    await waitFor(() => expect(cameraSnapshot.zoom).toBeCloseTo(0.32, 1));
  },
};

/**
 * The Board panned ~10 cells right and ~5 cells down from the origin.
 *
 * A right-click drag is simulated during setup. The camera translates pointer
 * delta into world-space movement, so the infinite grid scrolls in all
 * directions without bounds.
 */
export const Panned: Story = {
  render: (args) => (
    <Board {...args}>
      <CameraStateCapture />
    </Board>
  ),
  play: async ({ canvasElement }) => {
    const canvas = canvasElement.querySelector("canvas");
    if (!canvas) throw new Error("PixiJS canvas not found");

    await new Promise<void>((r) => setTimeout(r, 500));

    const { left, top, width, height } = canvas.getBoundingClientRect();
    const cx = left + width / 2;
    const cy = top + height / 2;

    // Moving pointer 640px left / 320px up at zoom=1 pans the world
    // 640 / 1 = 640 world units right and 320 world units down
    // (10 × GRID_SIZE = 640, 5 × GRID_SIZE = 320)
    firePan(canvas, cx, cy, cx - 640, cy - 320);

    await waitFor(() => {
      expect(cameraSnapshot.pan.x).toBe(640);
      expect(cameraSnapshot.pan.y).toBe(320);
    });
  },
};
