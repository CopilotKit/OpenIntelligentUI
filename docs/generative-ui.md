# Generative UI

Generative UI lets the agent render React components directly in the chat. Instead of responding with text, the agent can produce charts, interactive widgets, visualizations, and custom UI.

Hook-based generative UI in this project is registered in `apps/app/src/hooks/use-generative-ui-examples.tsx`. Free-form sandboxed widgets use the runtime-level **Open Generative UI** rail (see below), wired up in `apps/app/src/app/layout.tsx`.

## Hooks Overview

| Hook | Purpose |
|------|---------|
| `useComponent` | Register a named React component the agent can render with parameters |
| `useFrontendTool` | Register a tool the agent can call that runs in the browser |
| `useRenderTool` | Custom renderer for a specific backend tool |
| `useDefaultRenderTool` | Fallback renderer for any tool without a custom renderer |
| `useHumanInTheLoop` | Interactive component that pauses the agent for user input |

All hooks are imported from `@copilotkit/react-core/v2`. Sandboxed streaming widgets are not hook-registered — they ride the runtime's `openGenerativeUI` option and the provider's `renderActivityMessages` prop.

## useComponent — Agent-Rendered Components

Register a React component with a name, description, Zod schema, and render function. The agent decides when to use it based on the description.

### Chart Example

```tsx
import { z } from "zod";
import { useComponent } from "@copilotkit/react-core/v2";

const PieChartProps = z.object({
  title: z.string(),
  description: z.string(),
  data: z.array(z.object({
    label: z.string(),
    value: z.number(),
  })),
});

useComponent({
  name: "pieChart",
  description: "Displays data as a pie chart.",
  parameters: PieChartProps,
  render: PieChart, // your React component
});
```

## Open Generative UI — Sandboxed Streaming Widgets

Free-form HTML/SVG widgets use CopilotKit's canonical **Open Generative UI** rail instead of a custom component. The agent streams a whole UI — styles, markup, and behavior — and the frontend renders it live in a sandboxed iframe. See the [Open Generative UI docs](https://docs.copilotkit.ai/generative-ui/open-generative-ui) for the full reference.

How the pieces connect:

1. **Runtime** — the CopilotKit API route enables the rail with `openGenerativeUI: true` (`apps/app/src/lib/copilotkit-runtime-options.ts`). This injects the `generateSandboxedUi` tool for the agent.
2. **Tool** — the agent calls `generateSandboxedUi` with parameters streamed in a fixed order: `initialHeight` → `placeholderMessages` → `css` → `html` → `jsFunctions` → `jsExpressions`. CSS arrives first so the UI never renders unstyled; expressions arrive last so the user watches each behavior take effect.
3. **Middleware** — the runtime's `OpenGenerativeUIMiddleware` turns the streaming tool call into `open-generative-ui` activity events.
4. **Renderer** — the demo registers a custom activity renderer (`apps/app/src/components/generative-ui/open-generative-ui/`) via the provider's `renderActivityMessages` prop. While html streams it morphs each update into a preview iframe with Idiomorph (no flicker); once html completes it boots a [websandbox](https://github.com/jetbrains/websandbox) iframe with the shared design-system CSS and CDN importmap injected, runs `jsFunctions` then each `jsExpression`, and continuously autosizes from a ResizeObserver inside the frame.
5. **Sandbox bridge** — generated UI calls back into the host through Zod-validated sandbox functions (`apps/app/src/lib/sandbox/sandbox-functions.ts`): `await Websandbox.connection.remote.sendPrompt({ text })` and `await Websandbox.connection.remote.openLink({ url })`.

```tsx
// app/layout.tsx
const renderActivityMessages = [OPEN_GEN_UI_ACTIVITY_RENDERER];

const openGenerativeUI = {
  sandboxFunctions: [...SANDBOX_FUNCTIONS], // sendPrompt, openLink
  designSkill: OPEN_GEN_UI_DESIGN_SKILL,    // teaches the agent the design system
};

<CopilotKit
  runtimeUrl="/api/copilotkit"
  renderActivityMessages={renderActivityMessages}
  openGenerativeUI={openGenerativeUI}
>
```

The iframe environment includes:

**ES Module Libraries** (importmap pre-injected; use `<script type="module">` with bare imports in html, or `await import(...)` inside an async function in `jsFunctions` — the js channels run as classic scripts, so top-level `await` is not allowed):
- `three` — 3D graphics (`import * as THREE from "three"`)
- `gsap` — Animation (`import gsap from "gsap"`)
- `d3` — Data visualization (`import * as d3 from "d3"`)
- `chart.js/auto` — Charts

**CSS Variables** for theming (light/dark mode):
```css
var(--color-background-primary)
var(--color-background-secondary)
var(--color-text-primary)
var(--color-text-secondary)
var(--color-border-primary)
var(--font-sans)
var(--border-radius-md)
```

**Pre-built SVG Classes:**
`.c-purple`, `.c-teal`, `.c-coral`, `.c-pink`, `.c-gray`, `.c-blue`, `.c-green`, `.c-amber`, `.c-red`

## useFrontendTool — Browser-Side Actions

Register a tool that the agent can call but that executes in the browser:

```tsx
import { useFrontendTool } from "@copilotkit/react-core/v2";

useFrontendTool({
  name: "toggleTheme",
  description: "Toggle the app between light and dark mode.",
  parameters: z.object({}),
  handler: async () => {
    setTheme(theme === "dark" ? "light" : "dark");
  },
}, [theme, setTheme]);
```

The agent sees this as a callable tool. When it invokes `toggleTheme`, the handler runs in the browser.

## useRenderTool — Custom Tool Renderers

Override how a specific backend tool is displayed in the chat:

```tsx
import { useRenderTool } from "@copilotkit/react-core/v2";

useRenderTool({
  name: "plan_visualization",
  parameters: z.object({
    approach: z.string(),
    technology: z.string(),
    key_elements: z.array(z.string()),
  }),
  render: ({ status, parameters }) => (
    <PlanCard
      status={status}
      approach={parameters.approach}
      technology={parameters.technology}
      keyElements={parameters.key_elements}
    />
  ),
});
```

The `status` parameter is `"executing"` while the tool runs and `"complete"` when done.

## useDefaultRenderTool — Fallback Renderer

Handle any tool that doesn't have a custom renderer:

```tsx
import { useDefaultRenderTool } from "@copilotkit/react-core/v2";

useDefaultRenderTool({
  render: ({ name, status, parameters }) => {
    if (ignoredTools.includes(name)) return <></>;
    return <ToolReasoning name={name} status={status} args={parameters} />;
  },
});
```

## Registering Everything

Call all hooks inside a custom hook, then invoke it in your page:

```tsx
// hooks/use-generative-ui-examples.tsx
export const useGenerativeUIExamples = () => {
  useFrontendTool({ ... });
  useComponent({ ... });
  useRenderTool({ ... });
  useDefaultRenderTool({ ... });
  useHumanInTheLoop({ ... });
};

// app/page.tsx
export default function HomePage() {
  useGenerativeUIExamples();
  // ...
}
```

## Next Steps

- [Agent Tools](agent-tools.md) — Create the backend tools that drive generative UI
- [Human in the Loop](human-in-the-loop.md) — Pause the agent for user decisions
