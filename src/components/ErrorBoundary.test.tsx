import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorBoundary } from "./ErrorBoundary";

function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error("test explosion");
  return <span>safe</span>;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("when no error occurs", () => {
    it("renders children normally", () => {
      render(
        <ErrorBoundary fallback={<span>fallback</span>}>
          <Bomb shouldThrow={false} />
        </ErrorBoundary>,
      );
      expect(screen.getByText("safe")).toBeDefined();
      expect(screen.queryByText("fallback")).toBeNull();
    });
  });

  describe("when a child throws during render", () => {
    it("renders the fallback instead of children", () => {
      render(
        <ErrorBoundary fallback={<span>fallback</span>}>
          <Bomb shouldThrow={true} />
        </ErrorBoundary>,
      );
      expect(screen.getByText("fallback")).toBeDefined();
      expect(screen.queryByText("safe")).toBeNull();
    });

    it("calls onError with the caught error and ErrorInfo", () => {
      const onError = vi.fn();
      render(
        <ErrorBoundary fallback={<span>fallback</span>} onError={onError}>
          <Bomb shouldThrow={true} />
        </ErrorBoundary>,
      );
      expect(onError).toHaveBeenCalledOnce();
      const [error, info] = onError.mock.calls[0];
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe("test explosion");
      expect(info).toHaveProperty("componentStack");
    });
  });

  describe("when onError is not provided", () => {
    it("renders the fallback without throwing", () => {
      render(
        <ErrorBoundary fallback={<span>fallback</span>}>
          <Bomb shouldThrow={true} />
        </ErrorBoundary>,
      );
      expect(screen.getByText("fallback")).toBeDefined();
    });
  });
});
