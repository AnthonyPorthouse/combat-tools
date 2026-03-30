import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],

  framework: {
    name: "@storybook/react-vite",
    options: {},
  },

  viteFinal: (config) => {
    // The TanStack Router plugin scans route files — not needed in Storybook.
    // Filter it out to avoid startup noise/errors.
    config.plugins = (config.plugins ?? []).filter((plugin) => {
      if (!plugin || typeof plugin !== "object" || !("name" in plugin)) return true;
      return !(plugin as { name: string }).name.includes("tanstack-router");
    });
    return config;
  },

  addons: ["@storybook/addon-a11y", "@storybook/addon-docs", "@storybook/addon-vitest"],
};

export default config;
