# Deployment

This guide describes how to deploy Open Generative UI; it does not establish that a release is deployed. Keep existing service names and URLs intact when changing visible product branding.

## Render blueprint

The repository's `render.yaml` defines two services:

| Service                    | Runtime and root            | Build                                                                                                  | Start / health                                                   |
| -------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `open-generative-ui-agent` | Python 3.12.6, `apps/agent` | `pip install uv && uv sync`                                                                            | `uv run uvicorn main:app --host 0.0.0.0 --port $PORT`, `/health` |
| `open-generative-ui-app`   | Node 22, repository root    | `corepack enable && pnpm install --no-frozen-lockfile && pnpm exec turbo run build --filter=@repo/app` | `pnpm --filter @repo/app start`, `/api/health`                   |

The blueprint and Python factory default to `LLM_MODEL=chat-latest`, requiring `OPENAI_API_KEY`. Jev visualization routing additionally requires `TYPESAFE_API_KEY`; `JEV_MODEL` defaults to `jev-latest`. Verify access to the selected model before launch; a configured model name does not prove availability.

| Variable                                  | Service       | Purpose                                                                             |
| ----------------------------------------- | ------------- | ----------------------------------------------------------------------------------- |
| `LLM_MODEL`                               | Agent         | `claude-*` routes to Anthropic; `gpt-*` routes to OpenAI                            |
| `ANTHROPIC_API_KEY`                       | Agent         | Required when selecting Anthropic                                                   |
| `OPENAI_API_KEY`                          | Agent         | Required when selecting OpenAI                                                      |
| `LANGSMITH_API_KEY`                       | As configured | Optional tracing configuration                                                      |
| `LANGGRAPH_DEPLOYMENT_URL`                | Frontend      | Blueprint obtains agent host:port via `fromService`; runtime normalizes it to a URL |
| `RATE_LIMIT_ENABLED`                      | Frontend      | Defaults to `false` in blueprint                                                    |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | Frontend      | Request-limit configuration                                                         |
| `MCP_SERVER_URL`                          | Frontend      | Optional MCP integration                                                            |

The agent fails at startup for blank/unsupported model prefixes or missing/blank selected-provider keys. Never put provider keys in public frontend variables.

To deploy, connect your repository to a Render Blueprint, review its explicit model setting, supply the corresponding provider secret, and deploy the reviewed revision. The blueprint links the frontend to the agent; verify the resulting connection with an actual prompt.

Both services declare scaling from one to three instances. Agent checkpoints currently live in bounded process memory, and the frontend rate limiter is process-local. Scaling or restarting can lose/split conversation state and changes effective rate-limit behavior. Durable shared state and coordinated limits require additional infrastructure.

## Other hosts

Run the agent:

```bash
cd apps/agent
uv sync
uv run uvicorn main:app --host 0.0.0.0 --port 8123
```

Supply the provider key and optional `LLM_MODEL` in that service's environment. Run the frontend from the repository root:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm exec turbo run build --filter=@repo/app
LANGGRAPH_DEPLOYMENT_URL=http://your-agent-host:8123 pnpm --filter @repo/app start
```

Use a reachable agent URL appropriate to your network. Expose the frontend through your host's normal HTTPS routing. The optional MCP server is a separate deployment; see its [guide](../apps/mcp/README.md). A frontend Dockerfile is available at `docker/Dockerfile.app`.

## Verification and launch

1. Review the exact revision and provider configuration. Keep service identifiers stable and ensure secrets remain server-side.
2. Run the automated checks from the repository root:

   ```bash
   pnpm test
   uv run --directory apps/agent pytest
   pnpm lint
   pnpm build
   ```

   Turbo builds shared dependencies for workspace checks. For isolated MCP tests, build `@repo/design-system` first.

3. Check the chat layout at desktop and narrow widths. Exercise the composer, starter suggestions, and New chat. For generated tools, check keyboard controls, visible focus, numerical boundaries, and reset behavior.
4. Make real provider-backed requests for a direct text answer, an explainer, a comparison, and a working calculator. Verify streaming reaches the interactive final sandbox. Confirm current-data requests do not fabricate evidence.
5. Exercise a user-clicked follow-up with selected values. Confirm it starts a new turn/output, preserves earlier artifacts, and reports relevant errors. Check that ordinary controls do not send prompts.
6. Deploy the reviewed revision. Confirm both health endpoints return `{"status":"ok"}`, then repeat a real prompt against the deployed frontend. Health checks alone do not test provider authentication, streaming, or browser behavior.
7. Record the deployed revision, environment, checks actually performed, and remaining limitations. If validation fails, use the host's rollback workflow to restore a known working revision.

A rendered chat interface alone is not a model smoke test; verify a real response. Do not describe local test success as a deployed launch. See [Getting started](getting-started.md) and [Architecture](architecture.md) for setup and runtime details.

Set `APP_URL` on the frontend to the public custom-domain origin when using one. Social image metadata uses this value, then `RENDER_EXTERNAL_URL`, then the existing demo hostname.
