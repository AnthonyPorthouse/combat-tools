import type { Decorator, Preview } from "@storybook/react-vite";

import "../src/index.css";
import { useCombatStore } from "../src/stores/combatStore";
import { useLibraryStore } from "../src/stores/libraryStore";

const resetStoresDecorator: Decorator = (Story) => {
  useCombatStore.persist.clearStorage();
  useLibraryStore.persist.clearStorage();
  useCombatStore.setState({ tokenPlacements: {} }, true);
  useLibraryStore.setState({ tokenLibrary: [] }, true);
  return <Story />;
};

const preview: Preview = {
  decorators: [resetStoresDecorator],

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
