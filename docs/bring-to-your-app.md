# Bring to Your App

This guide walks through adopting the CopilotKit + LangGraph patterns from this project into your own application.

## What You Need

- A React frontend (Next.js recommended)
- A Python backend (or willingness to add one)
- An LLM: a local [Ollama](https://ollama.com) model, or an OpenAI or Anthropic API key

## Step 1: Install Frontend Packages

```bash
npm install @copilotkit/react-core @copilotkit/runtime zod
```

## Step 2: Add the CopilotKit Provider

Wrap your app with the `<CopilotKit>` provider:

```tsx
// app/layout.tsx (Next.js App Router)
import { CopilotKit } from "@copilotkit/react-core";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <CopilotKit runtimeUrl="/api/copilotkit">
          {children}
        </CopilotKit>
      </body>
    </html>
  );
}
```

## Step 3: Create the API Route

```typescript
// app/api/copilotkit/route.ts
import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { LangGraphHttpAgent } from "@copilotkit/runtime/langgraph";
import { NextRequest } from "next/server";

const agent = new LangGraphHttpAgent({
  url: process.env.LANGGRAPH_DEPLOYMENT_URL || "http://localhost:8123",
});

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    endpoint: "/api/copilotkit",
    serviceAdapter: new ExperimentalEmptyAdapter(),
    runtime: new CopilotRuntime({
      agents: { default: agent },
    }),
  });
  return handleRequest(req);
};
```

## Step 4: Set Up the Python Agent

Install dependencies:

```bash
pip install copilotkit langgraph langchain langchain-anthropic fastapi uvicorn ag-ui-langgraph deepagents
```

Create the agent:

```python
# agent/main.py
import os
from dotenv import load_dotenv
from fastapi import FastAPI
from copilotkit import CopilotKitMiddleware, LangGraphAGUIAgent
from ag_ui_langgraph import add_langgraph_fastapi_endpoint
from deepagents import create_deep_agent
from langchain_anthropic import ChatAnthropic

load_dotenv()

agent = create_deep_agent(
    model=ChatAnthropic(model=os.environ.get("LLM_MODEL", "claude-fable-5")),
    tools=[],  # add your tools here
    middleware=[CopilotKitMiddleware()],
    system_prompt="You are a helpful assistant.",
)

app = FastAPI()

@app.get("/health")
def health():
    return {"status": "ok"}

add_langgraph_fastapi_endpoint(
    app=app,
    agent=LangGraphAGUIAgent(
        name="my_agent",
        description="My agent",
        graph=agent,
    ),
    path="/",
)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8123, reload=True)
```

## Step 5: Define Your State

```python
# agent/state.py
from langchain.agents import AgentState as BaseAgentState
from typing import TypedDict

class Item(TypedDict):
    id: str
    name: str
    done: bool

class AgentState(BaseAgentState):
    items: list[Item]
```

Pass it to the agent:

```python
from state import AgentState

agent = create_deep_agent(
    ...
    context_schema=AgentState,
)
```

## Step 6: Create Tools

```python
# agent/tools.py
from langchain.tools import tool, ToolRuntime
from langchain.messages import ToolMessage
from langgraph.types import Command

@tool
def update_items(items: list, runtime: ToolRuntime) -> Command:
    """Update the items list."""
    return Command(update={
        "items": items,
        "messages": [ToolMessage(content="Updated", tool_call_id=runtime.tool_call_id)]
    })

@tool
def get_items(runtime: ToolRuntime):
    """Get the current items."""
    return runtime.state.get("items", [])
```

Register them:

```python
from tools import update_items, get_items

agent = create_deep_agent(
    tools=[update_items, get_items],
    ...
)
```

## Step 7: Use Agent State in React

```tsx
import { useAgent, CopilotChat } from "@copilotkit/react-core/v2";

function MyPage() {
  const { agent } = useAgent();
  const items = agent.state?.items || [];

  return (
    <div>
      <ul>
        {items.map(item => (
          <li key={item.id}>
            <input
              type="checkbox"
              checked={item.done}
              onChange={() => {
                const updated = items.map(i =>
                  i.id === item.id ? { ...i, done: !i.done } : i
                );
                agent.setState({ items: updated });
              }}
            />
            {item.name}
          </li>
        ))}
      </ul>
      <CopilotChat />
    </div>
  );
}
```

## Step 8: Add Generative UI (Optional)

Register components the agent can render in the chat:

```tsx
import { useComponent } from "@copilotkit/react-core/v2";
import { z } from "zod";

useComponent({
  name: "statusCard",
  description: "Show a status card with a title and message.",
  parameters: z.object({
    title: z.string(),
    message: z.string(),
    type: z.enum(["info", "success", "error"]),
  }),
  render: ({ title, message, type }) => (
    <div className={`card card-${type}`}>
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  ),
});
```

## What to Keep vs. What's Demo-Specific

**Keep (core patterns):**
- CopilotKit provider + API route
- Agent state schema + `CopilotKitMiddleware`
- Tool pattern with `Command(update={...})`
- `useAgent()` for reading/writing state
- `useComponent()` / `useFrontendTool()` / `useHumanInTheLoop()`

**Demo-specific (replace with your own):**
- Todo state schema and tools
- Demo gallery and explainer cards
- Widget renderer and chart components
- Sample data (`db.csv`)
- Skills documents
- Animated background and glassmorphism styling

## Next Steps

- [Agent State](agent-state.md) — Deep dive into state sync
- [Generative UI](generative-ui.md) — All the hooks for rendering UI
- [Agent Tools](agent-tools.md) — Building backend tools
