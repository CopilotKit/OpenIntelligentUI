"""Anthropic-specific message normalization, applied at model-call time so
graph state stays untouched.

1. Anthropic requires all system messages to be consecutive at the head of the
   conversation. CopilotKitMiddleware injects its "App Context" SystemMessage
   via the add_messages reducer, which appends it after the human turn — valid
   for OpenAI, rejected by langchain-anthropic.
2. Streaming a zero-length thinking block accumulates {type, signature} with
   no "thinking" key; Anthropic 400s on replay in the tool loop unless the
   empty text field is restored. A persisted null text value needs the same repair."""

from langchain.agents.middleware import AgentMiddleware, ModelRequest
from langchain_core.messages import AIMessage

_SYSTEM_TYPES = ("system", "developer")


def _repaired_message(message):
    if not isinstance(message, AIMessage) or not isinstance(message.content, list):
        return message
    if not any(
        isinstance(b, dict) and b.get("type") == "thinking" and b.get("thinking") is None
        for b in message.content
    ):
        return message
    content = [
        {**b, "thinking": ""}
        if isinstance(b, dict) and b.get("type") == "thinking" and b.get("thinking") is None
        else b
        for b in message.content
    ]
    return message.model_copy(update={"content": content})


def _reordered(request: ModelRequest) -> ModelRequest:
    messages = [_repaired_message(m) for m in request.messages]
    system = [m for m in messages if getattr(m, "type", None) in _SYSTEM_TYPES]
    rest = [m for m in messages if getattr(m, "type", None) not in _SYSTEM_TYPES]
    ordered = [*system, *rest]
    if ordered == list(request.messages):
        return request
    return request.override(messages=ordered)


class ConsecutiveSystemMessagesMiddleware(AgentMiddleware):
    def wrap_model_call(self, request, handler):
        return handler(_reordered(request))

    async def awrap_model_call(self, request, handler):
        return await handler(_reordered(request))
