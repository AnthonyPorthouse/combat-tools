import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";

const dirname =
  typeof __dirname !== "undefined" ? __dirname : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "json", "html"],
      include: ["src/**"],
      exclude: [
        "src/test/**",
        "src/routeTree.gen.ts",
        "src/main.tsx",
        // Story files are test infrastructure, not production code
        "src/**/*.stories.tsx",
        // Non-JS assets
        "src/assets/**",
        "src/**/*.css",
        // PixiJS components require a real WebGL context — covered by Storybook tests
        "src/components/Board.tsx",
        "src/components/Token.tsx",
        "src/components/CameraController.tsx",
        "src/components/GridOverlay.tsx",
        "src/components/LayoutResizer.tsx",
        "src/components/CursorTracker.tsx",
        // Route components are thin compositions of PixiJS components
        "src/routes/**",
      ],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
    },
    projects: [
      {
        plugins: [react()],
        test: {
          name: "unit",
          environment: "jsdom",
          setupFiles: ["./src/test/setup.ts"],
        },
      },
      {
        plugins: [storybookTest({ configDir: path.join(dirname, ".storybook") })],
        optimizeDeps: {
          include: ["storybook/test"],
        },
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
