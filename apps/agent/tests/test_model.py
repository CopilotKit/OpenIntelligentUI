"""Model defaults and provider-specific validation."""

import json
import os

import pytest

os.environ.setdefault("ANTHROPIC_API_KEY", "test-key")
os.environ.setdefault("OPENAI_API_KEY", "test-key")

from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI

from src.model import build_model


def test_default_model_is_beam_through_local_ollama(monkeypatch):
    monkeypatch.delenv("LLM_MODEL", raising=False)
    monkeypatch.delenv("OLLAMA_BASE_URL", raising=False)
    model = build_model()
    assert isinstance(model, ChatOpenAI)
    assert model.model_name == "beam:cloud"
    assert model.openai_api_base == "http://localhost:11434/v1"
    assert model.max_tokens >= 32000


def test_ollama_models_need_no_provider_key(monkeypatch):
    monkeypatch.setenv("LLM_MODEL", "qwen3:8b")
    monkeypatch.setenv("OLLAMA_BASE_URL", "http://gpu-box:11434/v1")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    model = build_model()
    assert model.model_name == "qwen3:8b"
    assert model.openai_api_base == "http://gpu-box:11434/v1"


def test_ollama_gpt_oss_tag_is_not_routed_to_openai(monkeypatch):
    from src.model import provider_key_name

    assert provider_key_name("gpt-oss:20b-cloud") is None
    assert provider_key_name("gpt-5.4-2026-03-05") == "OPENAI_API_KEY"


def test_llm_model_env_override(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("LLM_MODEL", "claude-opus-4-6")
    model = build_model()
    assert model.model == "claude-opus-4-6"


def test_gpt_model_names_route_to_openai_fallback(monkeypatch: pytest.MonkeyPatch):
    # Production fallback: flipping LLM_MODEL to a gpt-* name in the Render
    # dashboard must work without a code change.
    monkeypatch.setenv("LLM_MODEL", "gpt-5.4-2026-03-05")
    model = build_model()
    assert isinstance(model, ChatOpenAI)
    assert model.model_name == "gpt-5.4-2026-03-05"


def test_claude_model_names_route_to_anthropic(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("LLM_MODEL", "claude-opus-4-6")
    assert isinstance(build_model(), ChatAnthropic)


def test_max_tokens_fits_full_widget_generation(monkeypatch):
    monkeypatch.setenv("LLM_MODEL", "claude-fable-5")
    # langchain-anthropic's default (4096) truncates generateSandboxedUi args
    # mid-stream: css+html arrive but jsFunctions/jsExpressions are cut off, so
    # htmlComplete never fires and the widget never leaves the preview sandbox.
    model = build_model()
    assert model.max_tokens >= 32000


def test_main_uses_build_model():
    import ast
    from pathlib import Path

    main_src = Path(__file__).parent.parent / "main.py"
    tree = ast.parse(main_src.read_text())
    names = {n.id for n in ast.walk(tree) if isinstance(n, ast.Name)}
    assert "build_model" in names
    assert "ChatOpenAI" not in main_src.read_text()


@pytest.mark.parametrize("name", ["", "   ", "gemini-example", "typo-model"])
def test_invalid_model_configuration_fails_before_client_creation(monkeypatch, name):
    monkeypatch.setenv("LLM_MODEL", name)
    with pytest.raises(ValueError, match="LLM_MODEL"):
        build_model()


@pytest.mark.parametrize(
    ("model", "key"),
    [
        ("claude-opus-4-6", "ANTHROPIC_API_KEY"),
        ("gpt-5.4-2026-03-05", "OPENAI_API_KEY"),
        ("chat-latest", "OPENAI_API_KEY"),
    ],
)
@pytest.mark.parametrize("value", [None, "", "   "])
def test_missing_provider_key_has_actionable_error(monkeypatch, model, key, value):
    monkeypatch.setenv("LLM_MODEL", model)
    if value is None:
        monkeypatch.delenv(key, raising=False)
    else:
        monkeypatch.setenv(key, value)
    with pytest.raises(ValueError, match=key):
        build_model()


def whole_tool_call_chunk():
    from langchain_core.messages import AIMessageChunk

    return AIMessageChunk(
        content="",
        id="run-1",
        tool_call_chunks=[
            {"name": "generateSandboxedUi", "args": '{"initialHeight": 300, "html": "<p>Hi</p>"}', "id": "call_1", "index": 0}
        ],
    )


def test_whole_ollama_tool_call_streams_name_before_arguments():
    from src.model import split_tool_call_chunk

    head, args = split_tool_call_chunk(whole_tool_call_chunk())
    assert head.tool_call_chunks[0]["name"] == "generateSandboxedUi"
    assert head.tool_call_chunks[0]["args"] == ""
    assert args.tool_call_chunks[0]["name"] is None
    assert json.loads(args.tool_call_chunks[0]["args"]) == {"initialHeight": 300, "html": "<p>Hi</p>"}
    assert (head + args).tool_calls == whole_tool_call_chunk().tool_calls


def test_streamed_tool_calls_reach_ag_ui_once():
    import asyncio
    from langchain_core.language_models.chat_models import BaseChatModel
    from langchain_core.outputs import ChatGenerationChunk
    from src.model import CredentialScopedModel

    class WholeToolCallModel(BaseChatModel):
        @property
        def _llm_type(self):
            return "whole-tool-call"

        def _generate(self, *args, **kwargs):
            raise NotImplementedError

        def _stream(self, *args, **kwargs):
            yield ChatGenerationChunk(message=whole_tool_call_chunk())

    async def relayed_chunks():
        model = CredentialScopedModel(fallback=WholeToolCallModel())
        return [
            event["data"]["chunk"]
            async for event in model.astream_events("Build it", version="v2")
            if event["event"] == "on_chat_model_stream"
            # AG-UI drops events carrying these flags.
            and event["metadata"].get("emit-tool-calls", True)
            and event["data"]["chunk"].tool_call_chunks
        ]

    chunks = asyncio.run(relayed_chunks())
    assert [c.tool_call_chunks[0]["name"] for c in chunks] == ["generateSandboxedUi", None]


def test_widget_arguments_reach_copilotkit_in_streaming_order():
    from src.model import widget_args

    whole = json.dumps({
        "css": "p{}",
        "html": "<canvas></canvas>",
        "initialHeight": 520,
        "jsExpressions": "draw()",
        "jsFunctions": "function draw(){}",
        "placeholderMessages": ["Drawing"],
    })
    args = json.loads(widget_args("generateSandboxedUi", whole))
    # initialHeight creates the widget; html sent before it would be dropped.
    assert list(args) == ["initialHeight", "placeholderMessages", "css", "html", "jsFunctions", "jsExpressions"]
    assert args["jsExpressions"] == ["draw()"]


def test_widget_without_initial_height_still_gets_created():
    from src.model import widget_args

    args = json.loads(widget_args("generateSandboxedUi", '{"jsFunctions":"f()"}'))
    assert list(args) == ["initialHeight", "jsFunctions"]
    assert args["initialHeight"] == 200


@pytest.mark.parametrize(
    ("name", "args"),
    [("query_data", '{"query":"revenue"}'), ("generateSandboxedUi", '{"html":"<p>cut off')],
)
def test_other_tools_and_unparseable_widget_arguments_pass_through(name, args):
    from src.model import widget_args

    assert widget_args(name, args) == args
