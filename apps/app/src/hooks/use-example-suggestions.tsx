import { useConfigureSuggestions } from "@copilotkit/react-core/v2";
import { DEMO_EXAMPLES } from "@/components/demo-gallery/demo-data";

export const useExampleSuggestions = () => {
  useConfigureSuggestions({
    suggestions: DEMO_EXAMPLES.filter(({ id }) =>
      ["demo-pitch-roll-yaw", "trip", "split", "map"].includes(id),
    ).map(({ title, prompt }) => ({
      title,
      message: prompt,
    })),
    available: "always",
  });
};
