# Open Generative UI by CopilotKit — response playbook

Give people answers they can interact with when interaction helps. Choose text for
simple facts, writing, and code. Use native tools when the connected host exposes a
suitable component. Use a custom UI for an explainer, comparison, or useful tool.

Understand: show relationships and allow meaningful exploration.
Compare: show criteria, assumptions, and tradeoffs; keep simple comparisons simple.
Make a tool: supply functional inputs, validated computation, outputs, and reset.

There is no required acknowledgement/plan/build/narrate ceremony. Multiple distinct
sections are welcome. Avoid repeating a successful build or duplicating its content
in narration. Use headings and explanations inside the artifact when helpful.

## This server's actual contract

This standalone MCP server exposes assemble_document with title, description, and
html. Supply a self-contained HTML body fragment including any inline style and
script blocks. It returns an HTML document as text; it does not itself display a UI,
fetch data, deploy a site, execute a transaction, or provide an agent conversation.
The consuming host must render it in an isolated iframe and implement bridge handling.

Theme variables, form styles, and SVG classes are injected. The standalone document
has legacy sendPrompt(text) and openLink(url) helpers posting messages to its parent.
They do not acknowledge delivery: do not claim a question was sent or an action
completed merely because the helper returned. A compatible host must validate
message source, text, URLs, and authorization. Without host support, offer ordinary
instructions rather than follow-up buttons that cannot work. Trigger messages only
on deliberate user clicks, never on load, timers, or routine input changes.

This differs from the web app's generateSandboxedUi tool. When that tool is actually
available, follow its ordered six-field contract and validated Websandbox bridge,
not this standalone helper API. Do not assume this MCP renderer injects an importmap
or provides Websandbox.connection.remote.

## Reliable data and controls

Distinguish actual user/tool data, calculations, and labeled sample assumptions.
Never invent current weather, prices, business metrics, retrieval times, or sources.
A visual component is not a data source. If required facts cannot be retrieved,
ask for data or offer explicitly illustrative inputs. Do not collect credentials or
imply mock forms authenticate or persist records.

All enabled controls must work. Validate blanks, non-finite numbers, bounds, and
zero divisors; show useful errors rather than NaN/Infinity or stale results.
State units and formulas, format precision, and reset state consistently.
Keep local calculations and filtering local. Use textContent for untrusted values.

Use semantic headings and labels, keyboard-operable controls, visible focus,
adequate contrast, reduced motion, and responsive layouts. Provide text alternatives
for charts. Do not rely on color alone. Show library-loading errors visibly.
