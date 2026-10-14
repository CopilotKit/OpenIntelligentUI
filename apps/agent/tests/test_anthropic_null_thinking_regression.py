import asyncio

import pytest
from anthropic.types.thinking_block import ThinkingBlock
from langchain.agents.middleware import ModelRequest
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import AIMessage, HumanMessage

from src.anthropic_compat import ConsecutiveSystemMessagesMiddleware


@pytest.mark.parametrize("use_async", [False, True])
def test_null_thinking_replays_as_valid_sdk_text_without_mutating_history(use_async):
    model = ChatAnthropic(model="claude-sonnet-4-5-20250929", api_key="test-key")
    original = AIMessage(id="replayed", content=[
        {"type": "thinking", "thinking": None, "signature": "signature", "cache_control": {"type": "ephemeral"}},
        {"type": "text", "text": "Ready"},
    ])
    request = ModelRequest(model=model, messages=[HumanMessage(content="Continue"), original])
    middleware = ConsecutiveSystemMessagesMiddleware()

    def verify(repaired):
        payload = model._get_request_payload(repaired.messages)
        block = payload["messages"][-1]["content"][0]
        ThinkingBlock.model_validate(block)
        assert block["thinking"] == ""
        assert block["signature"] == "signature"
        assert block["cache_control"] == {"type": "ephemeral"}
        assert repaired.messages[-1].id == "replayed"
        assert repaired.messages[-1].content[1] == original.content[1]
        return "verified"

    async def averify(repaired):
        return verify(repaired)

    if use_async:
        result = asyncio.run(middleware.awrap_model_call(request, averify))
    else:
        result = middleware.wrap_model_call(request, verify)
    assert result == "verified"
    assert original.content[0]["thinking"] is None
