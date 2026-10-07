# Product and agent behavior

**Open Generative UI by CopilotKit: answers you can interact with.** The experience helps people understand something, compare options, or make a useful tool for the moment.

## Choosing the response

| User task                                    | Useful response                                               |
| -------------------------------------------- | ------------------------------------------------------------- |
| A quick fact, writing, code, or conversation | Direct text                                                   |
| A supported structured presentation          | Available native component                                    |
| Understand a mechanism or relationship       | Diagram or interactive explainer                              |
| Compare options                              | Table, criteria, and tradeoffs; adjustable weights if helpful |
| Make a tool                                  | Functional inputs, computation, outputs, and reset            |

The agent can combine text and multiple distinct sections. It does not need to announce a plan or narrate a completed UI back to the user. `plan_visualization` remains available for work where an explicit plan helps. A successful “UI generated” result is not a reason to rebuild the same answer.

## Chat and generated answers

The interface is a chat with three starter suggestions for understanding, comparing, and making a tool. Users can choose a suggestion or type any request. Each submission starts agent generation, subject to the configured provider and available tools. The header provides New chat and links to GitHub and CopilotKit.

Generated UI must have functional controls, readable labels, keyboard access, responsive layout, reduced-motion support, and clear loading/error states. Numeric tools must reject blank, non-finite, out-of-range, and zero-divisor inputs; show units and assumptions; and avoid NaN, Infinity, and misleading stale outputs.

## Provenance

Distinguish user-provided values, retrieved evidence, calculated results, and illustrative assumptions. Label sample values inside the UI where users see them. `query_data` returns:

```text
source: Bundled db.csv sample dataset
is_sample: true
query_applied: false
rows: all bundled sample records
```

The tool is not a live business database and does not filter by its query. No built-in live weather feed is implied by the visual components. If essential evidence is unavailable, the agent should ask for inputs or explain the limitation. It must not invent current data, sources, authentication, saved records, or external actions.

## Follow-up snapshots

Treat each generated answer as its own conversation artifact. A follow-up is a new turn and can produce a new snapshot; it does not silently rewrite earlier outputs through an assumed patch API. “Snapshot” describes the generated answer, not frozen controls: users can still interact with a rendered tool locally.

The sandbox's control state is not automatically agent memory. A deliberate “Ask about this scenario” action should include validated current selections in `Websandbox.connection.remote.sendPrompt({ text })`. Ordinary filters and sliders run locally. Never auto-send messages on load, timers, or input changes. Use clear action labels and error feedback.

## Technical contract and scope

The ordered streaming contract and sandbox rules are documented in [Architecture](architecture.md). The local model factory uses existing LangChain provider clients; product positioning does not establish native GPT-6 API support or change pinned models.

Existing repository URLs, package names, runtime options, activity/event names, and deployment service names retain their established identifiers. Product copy changes should not break those integration surfaces.

Use the [launch workflow](deployment.md#verification-and-launch) to verify the experience. A passing build, a working provider-backed conversation, and a deployed service are different states and should be reported separately.
