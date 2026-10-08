# Visualization routing

The answer model defaults to `chat-latest`, the documented API alias for the latest ChatGPT Instant model. This is a moving alias, not a pinned `gpt-6-instant` snapshot. Its available model ID was verified using the configured OpenAI account. See [OpenAI's model documentation](https://developers.openai.com/api/docs/models/chat-latest).

Jev (`jev-latest`) makes one typed presentation decision for each new user message through [TypeSafe's System One API](https://docs.typesafe.ai/introduction/quickstart). It receives up to four recent user/assistant text messages, capped at 6,000 characters each. It does not receive API keys, system instructions, raw tool outputs, or generated tool code.

| Selected visualization | Renderer |
| --- | --- |
| Text | Normal chat answer |
| Table | A2UI Table catalog |
| Bar, line, scatter, distribution, part-to-whole chart | Open Generative UI |
| Flowchart, static or interactive diagram | Open Generative UI |
| Calculator | Open Generative UI |
| Map or animated itinerary | Open Generative UI |

The renderer is derived from Jev's validated choice, preventing contradictory renderer/type pairs. The selection is stored with the user message ID in thread state and reused during tool continuations. A new user message is classified again with conversation context. Middleware filters rendering tools after CopilotKit injects them; unrelated data/state tools remain available. The answer model receives the selected visualization type plus the relevant rendering contract.

The A2UI catalog supplies a semantic HTML table with column headers, a caption, keyboard-focusable horizontal scrolling, and a required provenance label. It accepts at most 12 columns and 200 rows and rejects mismatched row widths. React renders values as text. Charts and diagrams continue to use the existing isolated sandbox.

Set `OPENAI_API_KEY`, `TYPESAFE_API_KEY`, `LLM_MODEL=chat-latest`, and optionally `JEV_MODEL=jev-latest` on the agent server. Provider secrets never belong in browser variables. Existing `claude-*` and `gpt-*` overrides remain available. Jev authentication failures, invalid choices, and timeouts fail the turn with a retryable error; there is no silent fallback claiming that Jev made a decision. Successful health checks confirm the server is running, not provider access.

Routing is a model judgment, not a guarantee of the objectively best visualization. Missing source data still requires clarification or explicit illustrative assumptions. Live provider checks and browser checks complement the deterministic routing, error-path, continuation, and A2UI rendering tests.

## Maps and animated itineraries

Maps use Leaflet with live USGS topographic tiles. For trips, `get_trip_stop_images` retrieves Wikipedia destination photos with validated Wikimedia Commons attribution; unavailable photos remain text cards. These images are sourced photographs, not live camera feeds.

The sandbox and downloaded HTML include `createTripAnimator`. Its default six-second sequence drops numbered pins into place one at a time, reveals connections behind them, and synchronizes destination cards. Pause/resume, replay, manual stop selection, and reduced-motion behavior share the same controller. The map camera stays fixed during playback, and the chat does not auto-scroll to follow the animation.

Basemap tiles do not establish driving routes, traffic, or road closures. Connecting lines are explicitly illustrative unless backed by directions data; the agent must not invent verified mileage or driving times.
