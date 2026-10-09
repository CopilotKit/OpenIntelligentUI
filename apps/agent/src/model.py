"""Chat model factory for the agent."""

import os

from langchain_anthropic import ChatAnthropic
from langchain_core.language_models.chat_models import BaseChatModel

DEFAULT_MODEL = "chat-latest"

# langchain-anthropic defaults max_tokens to 4096, which truncates
# generateSandboxedUi tool args mid-stream (jsFunctions/jsExpressions never
# arrive and the widget is stuck in its preview sandbox). Widget generation
# routinely needs tens of thousands of output tokens.
MAX_TOKENS = 64000


def build_model() -> BaseChatModel:
    model_name = os.environ.get("LLM_MODEL", DEFAULT_MODEL).strip()
    is_openai = model_name == "chat-latest" or model_name.startswith("gpt-")
    if not is_openai and not model_name.startswith("claude-"):
        raise ValueError(
            "LLM_MODEL must name a supported provider: claude-* (Anthropic) "
            "or gpt-*/chat-latest (OpenAI). Unset LLM_MODEL to use the default."
        )
    key_name = "OPENAI_API_KEY" if is_openai else "ANTHROPIC_API_KEY"
    if not os.environ.get(key_name, "").strip():
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
