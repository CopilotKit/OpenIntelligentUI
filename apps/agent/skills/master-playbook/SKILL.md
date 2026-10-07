---
name: "master-playbook"
description: "Choose text, native components, or a custom interactive answer for understanding, comparing, and making tools."
allowed-tools: []
---

# Open Generative UI response playbook

Answer the task directly. Use text for a short answer, writing, or code; native
components when an available tool fits; generateSandboxedUi for useful custom
interaction or visual explanation. Native rendering is not evidence of live data.

- Understand: show relationships or mechanisms, with a meaningful variable or stepper.
- Compare: make criteria and assumptions visible; use a table for simple cases,
  editable weights or filters only when they help a decision.
- Make a tool: deliver working controls, validated calculations, outputs, and reset.

There is no mandatory acknowledgement/plan/build/narrate sequence.
plan_visualization is optional. Multiple distinct sections are welcome when needed;
avoid duplicate builds after a successful "UI generated" result. Add prose only
when it helps. A refinement uses the current request and explicit selections; no
cross-call patch or expression-append API is provided.

## Data and assumptions

Label user data, retrieved sources, calculated results, and illustrative values.
The query_data tool returns all rows of bundled sample db.csv, without filtering.
It is not a live database and is unnecessary for unrelated charts. Never invent
current weather, prices, or business data. Ask for essential missing inputs or
provide clearly labeled sample assumptions. Show units and calculation assumptions
inside the UI. Do not create credential forms or claim external actions succeeded.

## Tool contract

For generateSandboxedUi, emit these parameters in this EXACT order:

1. initialHeight — estimated finished height.
2. placeholderMessages — 2-4 short progress messages.
3. css — all styles. The placeholder remains until css is complete; keep the css parameter lean.
4. html — readable body markup, no style blocks or monolithic scripts.
5. jsFunctions — named behavior functions.
6. jsExpressions — small synchronous invocations.

The sandbox has no same-origin access: no localStorage, sessionStorage, cookies,
IndexedDB, or same-origin fetch. No parent DOM access. Theme variables, form styles,
and SVG color classes are pre-injected. An importmap supports three, gsap, d3,
and chart.js. jsFunctions and jsExpressions are classic scripts: top-level await
is invalid. Dynamic imports belong inside an async function; catch failures.
The advanced skill covers libraries and responsive rendering.

## Functional and accessible answers

Use semantic headings, labels connected to inputs, keyboard-operable buttons,
visible focus, and readable text. Let layouts wrap at phone widths; use responsive
SVG viewBox or canvas containers. Keep content readable during streaming before
JavaScript arrives. Respect reduced motion and provide pause/reset for animation.

Validate number inputs with valueAsNumber, Number.isFinite, and domain bounds.
Reject blanks and zero divisors; never display NaN/Infinity or a stale result as a
valid answer. Format units and precision. Reset controls and results consistently.
Sorting should preserve the current filter. Every enabled control must do real work.
Use textContent for untrusted data, not HTML string interpolation.

## Follow-up bridge

Local controls run in JavaScript. User-clicked follow-ups can ask the agent for
reasoning through Websandbox.connection.remote.sendPrompt. Include current values
in the request; label the button as an action that sends a message. Never send on
load, timers, or ordinary input changes. Do not send secrets.

html parameter:

```html
<button id="explain" type="button" onclick="askAboutSelection(this)">
  Ask about this scenario
</button>
<p id="followup-status" role="status"></p>
```

jsFunctions parameter (replace scenario text with the validated current selection):

```js
async function askAboutSelection(button) {
  const status = document.getElementById("followup-status");
  button.disabled = true;
  status.textContent = "Sending question…";
  try {
    await Websandbox.connection.remote.sendPrompt({
      text: "Explain the assumptions behind the scenario shown above.",
    });
    status.textContent = "Question sent.";
  } catch (error) {
    status.textContent =
      "Could not send. Please try again or type your question in chat.";
  } finally {
    button.disabled = false;
  }
}
```

External links use Websandbox.connection.remote.openLink({ url }) with HTTPS.
Do not use the standalone MCP renderer's global postMessage helpers in this host.
