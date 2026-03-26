import type { Preview } from "@storybook/react-vite";

import "../src/index.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    backgrounds: {
      default: "dark",
      values: [
        { name: "dark", value: "#0f172a" },
        { name: "light", value: "#f8fafc" },
      ],
    },

    layout: "fullscreen",

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: "todo",
    },
  },
  tags: ["autodocs"],
};

export default preview;
