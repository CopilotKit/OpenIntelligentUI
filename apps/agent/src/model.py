"""Chat model factory for the agent."""

import os
from contextlib import contextmanager

from langchain.agents.middleware import AgentMiddleware
from langchain_core.outputs import ChatGeneration, ChatGenerationChunk, ChatResult
from langchain_core.messages import AIMessageChunk
from pydantic import Field
from langchain_anthropic import ChatAnthropic
from langchain_core.language_models.chat_models import BaseChatModel

DEFAULT_MODEL = "chat-latest"

# langchain-anthropic defaults max_tokens to 4096, which truncates
# generateSandboxedUi tool args mid-stream (jsFunctions/jsExpressions never
# arrive and the widget is stuck in its preview sandbox). Widget generation
# routinely needs tens of thousands of output tokens.
MAX_TOKENS = 64000


def build_model(*, allow_unconfigured: bool = False) -> BaseChatModel:
    model_name = os.environ.get("LLM_MODEL", DEFAULT_MODEL).strip()
    is_openai = model_name == "chat-latest" or model_name.startswith("gpt-")
    if not is_openai and not model_name.startswith("claude-"):
        raise ValueError(
            "LLM_MODEL must name a supported provider: claude-* (Anthropic) "
            "or gpt-*/chat-latest (OpenAI). Unset LLM_MODEL to use the default."
        )
    key_name = "OPENAI_API_KEY" if is_openai else "ANTHROPIC_API_KEY"
    if not os.environ.get(key_name, "").strip():
        if allow_unconfigured:
            return UnconfiguredModel()
        raise ValueError(
            f"{key_name} is required for the selected LLM_MODEL provider. "
            "Set it in the agent environment and restart the agent."
        )
    if is_openai:
        # chat-latest follows ChatGPT Instant; explicit gpt-* pins also work.
        from langchain_openai import ChatOpenAI

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
    model = ChatOpenAI(
        model=DEFAULT_MODEL,
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
            for chunk in model.stream(messages, stop=stop, **options):
                yield ChatGenerationChunk(message=as_chunk(chunk))

    async def _astream(self, messages, stop=None, run_manager=None, **kwargs):
        with provider_error_boundary():
            model, options = self._target(kwargs)
            async for chunk in model.astream(messages, stop=stop, **options):
                yield ChatGenerationChunk(message=as_chunk(chunk))


def as_chunk(message):
    if isinstance(message, AIMessageChunk):
        return message
    return AIMessageChunk(**message.model_dump(exclude={"type"}))
