"""Chat model factory for the agent."""

import json
import os
from contextlib import contextmanager

from langchain.agents.middleware import AgentMiddleware
from langchain_core.outputs import ChatGeneration, ChatGenerationChunk, ChatResult
from langchain_core.messages import AIMessageChunk
from pydantic import Field
from langchain_anthropic import ChatAnthropic
from langchain_core.language_models.chat_models import BaseChatModel

# The server default runs through a local Ollama daemon (cloud models need
# `ollama signin`). Visitor BYOK keys always use OpenAI's chat-latest instead.
DEFAULT_MODEL = "beam:cloud"
BYOK_MODEL = "chat-latest"
DEFAULT_OLLAMA_URL = "http://localhost:11434/v1"

# langchain-anthropic defaults max_tokens to 4096, which truncates
# generateSandboxedUi tool args mid-stream (jsFunctions/jsExpressions never
# arrive and the widget is stuck in its preview sandbox). Widget generation
# routinely needs tens of thousands of output tokens.
MAX_TOKENS = 64000


def provider_key_name(model_name: str) -> str | None:
    """Name the API key a model needs; None means an Ollama model or an invalid name."""
    if is_ollama_model(model_name):
        # Checked first: Ollama tags such as gpt-oss:20b-cloud are not OpenAI models.
        return None
    if model_name == "chat-latest" or model_name.startswith("gpt-"):
        return "OPENAI_API_KEY"
    if model_name.startswith("claude-"):
        return "ANTHROPIC_API_KEY"
    return None


def is_ollama_model(model_name: str) -> bool:
    # Ollama names carry an explicit tag (beam:cloud); this keeps typos
    # like "gemini-example" failing at startup instead of at the first request.
    name, _, tag = model_name.partition(":")
    return bool(name and tag) and not any(c.isspace() for c in model_name)


def build_model(*, allow_unconfigured: bool = False) -> BaseChatModel:
    model_name = os.environ.get("LLM_MODEL", DEFAULT_MODEL).strip()
    key_name = provider_key_name(model_name)
    if key_name is None and not is_ollama_model(model_name):
        raise ValueError(
            "LLM_MODEL must name a supported provider: an Ollama model with a tag "
            "(e.g. beam:cloud), claude-* (Anthropic) or gpt-*/chat-latest "
            "(OpenAI). Unset LLM_MODEL to use the default."
        )
    from langchain_openai import ChatOpenAI

    if key_name is None:
        # Ollama serves an OpenAI-compatible API; a local daemon ignores the key.
        return ChatOpenAI(
            model=model_name,
            base_url=os.environ.get("OLLAMA_BASE_URL", "").strip() or DEFAULT_OLLAMA_URL,
            api_key=os.environ.get("OLLAMA_API_KEY", "").strip() or "ollama",
            max_tokens=MAX_TOKENS,
        )
    if not os.environ.get(key_name, "").strip():
        if allow_unconfigured:
            return UnconfiguredModel()
        raise ValueError(
            f"{key_name} is required for the selected LLM_MODEL provider. "
            "Set it in the agent environment and restart the agent."
        )
    if key_name == "OPENAI_API_KEY":
        # chat-latest follows ChatGPT Instant; explicit gpt-* pins also work.
        return ChatOpenAI(model=model_name)
    return ChatAnthropic(
        model=model_name,
        max_tokens=MAX_TOKENS,
    )


class UnconfiguredModel(BaseChatModel):
    """Compile a BYOK-only graph without constructing a provider with fake credentials."""

    @property
    def _llm_type(self):
        return "unconfigured"

    def _generate(self, *args, **kwargs):
        raise ValueError("Provider credentials are required. Add OpenAI and Jev keys.")

    def bind_tools(self, tools, **kwargs):
        return self


def request_model(fallback):
    from src.credentials import current_credentials
    credentials = current_credentials.get()
    if credentials is None:
        return fallback
    from langchain_openai import ChatOpenAI
    from openai import AsyncOpenAI, OpenAI, DefaultAsyncHttpxClient, DefaultHttpxClient

    # SDK None defaults inherit server organization/project settings. Explicit
    # clients with empty scopes and isolated transports prevent that inheritance,
    # including server HTTP(S)_PROXY and OPENAI_PROXY settings.
    options = {
        "api_key": credentials.openai,
        "base_url": "https://api.openai.com/v1",
        "organization": "",
        "project": "",
    }
    sync_client = OpenAI(**options, http_client=DefaultHttpxClient(trust_env=False))
    async_client = AsyncOpenAI(
        **options, http_client=DefaultAsyncHttpxClient(trust_env=False)
    )
    # After construction, None omits these headers without rereading env vars.
    for client in (sync_client, async_client):
        client.organization = None
        client.project = None
        client.admin_api_key = None
        client.webhook_secret = None
        # The SDK merges OPENAI_CUSTOM_HEADERS even with default_headers={}.
        # Clear that merge before any request so host Authorization cannot win.
        client._custom_headers = {}
    model = ChatOpenAI(
        model=BYOK_MODEL,
        api_key=credentials.openai,
        base_url=options["base_url"],
        openai_proxy="",
        root_client=sync_client,
        client=sync_client.chat.completions,
        root_async_client=async_client,
        async_client=async_client.chat.completions,
    )
    # LangChain's metadata field separately inherits organization environment
    # values even when prebuilt SDK clients are supplied. Clear the inert field.
    model.openai_organization = None
    return model


@contextmanager
def provider_error_boundary():
    from src.credentials import current_credentials
    try:
        yield
    except Exception:
        if current_credentials.get() is None:
            raise
        raise ValueError("OpenAI request failed. Check your key and model access, or retry.") from None


class RequestModelMiddleware(AgentMiddleware):
    def wrap_model_call(self, request, handler):
        with provider_error_boundary():
            return handler(request.override(model=request_model(request.model)))

    async def awrap_model_call(self, request, handler):
        with provider_error_boundary():
            return await handler(request.override(model=request_model(request.model)))


class CredentialScopedModel(BaseChatModel):
    """Route DeepAgents' internal summary/subagent model calls through BYOK too."""

    fallback: BaseChatModel = Field(exclude=True)

    @property
    def _llm_type(self):
        return "credential-scoped"

    def bind_tools(self, tools, **kwargs):
        return self.bind(_credential_tools=tools, _credential_tool_options=kwargs)

    def _target(self, kwargs):
        model = request_model(self.fallback)
        options = dict(kwargs)
        tools = options.pop("_credential_tools", None)
        tool_options = options.pop("_credential_tool_options", {})
        if tools is not None:
            model = model.bind_tools(tools, **tool_options)
        return model, options

    def _generate(self, messages, stop=None, run_manager=None, **kwargs):
        with provider_error_boundary():
            model, options = self._target(kwargs)
            message = model.invoke(messages, stop=stop, **options)
            return ChatResult(generations=[ChatGeneration(message=message)])

    async def _agenerate(self, messages, stop=None, run_manager=None, **kwargs):
        with provider_error_boundary():
            model, options = self._target(kwargs)
            message = await model.ainvoke(messages, stop=stop, **options)
            return ChatResult(generations=[ChatGeneration(message=message)])

    def _stream(self, messages, stop=None, run_manager=None, **kwargs):
        with provider_error_boundary():
            model, options = self._target(kwargs)
            for chunk in model.stream(messages, stop=stop, config=INNER_STREAM, **options):
                for part in split_tool_call_chunk(as_chunk(chunk)):
                    yield ChatGenerationChunk(message=part)

    async def _astream(self, messages, stop=None, run_manager=None, **kwargs):
        with provider_error_boundary():
            model, options = self._target(kwargs)
            async for chunk in model.astream(messages, stop=stop, config=INNER_STREAM, **options):
                for part in split_tool_call_chunk(as_chunk(chunk)):
                    yield ChatGenerationChunk(message=part)


# The wrapped model's own stream events would reach AG-UI alongside this
# wrapper's, emitting every tool call twice; only the wrapper's are relayed.
INNER_STREAM = {"metadata": {"emit-messages": False, "emit-tool-calls": False}}


def as_chunk(message):
    if isinstance(message, AIMessageChunk):
        return message
    return AIMessageChunk(**message.model_dump(exclude={"type"}))


def split_tool_call_chunk(chunk):
    """Send a tool call's name before its arguments, as OpenAI streams them.

    Ollama delivers each tool call whole in one chunk, but AG-UI starts the
    call on its named chunk and drops any arguments that chunk carries.
    """
    calls = chunk.tool_call_chunks
    if len(calls) != 1 or not calls[0].get("name") or not calls[0].get("args"):
        return [chunk]
    call = calls[0]
    head = AIMessageChunk(
        content=chunk.content,
        id=chunk.id,
        additional_kwargs=chunk.additional_kwargs,
        response_metadata=chunk.response_metadata,
        usage_metadata=chunk.usage_metadata,
        tool_call_chunks=[{**call, "args": ""}],
    )
    args = AIMessageChunk(
        content="",
        id=chunk.id,
        tool_call_chunks=[
            {**call, "name": None, "id": None, "args": widget_args(call["name"], call["args"])}
        ],
    )
    return [head, args]


# CopilotKit's OpenGenerativeUIMiddleware creates the widget when it reads
# initialHeight and drops any css/html patches that arrive before it.
WIDGET_TOOL = "generateSandboxedUi"
DEFAULT_WIDGET_HEIGHT = 200
WIDGET_ARG_ORDER = ("initialHeight", "placeholderMessages", "css", "html", "jsFunctions", "jsExpressions")


def widget_args(name, args):
    """Put a whole widget call's arguments in the order the middleware needs.

    Ollama re-serializes arguments with its own key order, and smaller models
    sometimes send jsExpressions as one string instead of a list.
    """
    if name != WIDGET_TOOL:
        return args
    try:
        parsed = json.loads(args)
    except ValueError:
        return args
    if not isinstance(parsed, dict):
        return args
    if isinstance(parsed.get("jsExpressions"), str):
        parsed["jsExpressions"] = [parsed["jsExpressions"]]
    if not isinstance(parsed.get("initialHeight"), (int, float)):
        # Without it the middleware never creates the widget; the renderer
        # uses the same default and autosizes from there.
        parsed["initialHeight"] = DEFAULT_WIDGET_HEIGHT
    ordered = {key: parsed[key] for key in WIDGET_ARG_ORDER if key in parsed}
    ordered.update((key, value) for key, value in parsed.items() if key not in ordered)
    return json.dumps(ordered)
