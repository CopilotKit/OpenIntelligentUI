import asyncio

import pytest
from langchain_core.messages import AIMessage, HumanMessage
from langgraph.graph.message import add_messages

import src.visualization_router as router


@pytest.mark.parametrize("use_async", [False, True])
def test_editing_a_human_message_reroutes_while_continuations_reuse_it(monkeypatch, use_async):
    calls = []

    def classify(context):
        calls.append(next(item["content"] for item in reversed(context) if item["role"] == "human"))
        return {"renderer": "text", "visualization": "text"}

    async def aclassify(context):
        return classify(context)

    monkeypatch.setattr(router, "route", classify)
    monkeypatch.setattr(router, "aroute", aclassify)
    middleware = router.JevVisualizationMiddleware()
    state = {"messages": [HumanMessage(content="Explain this", id="editable")]}

    def run():
        if use_async:
            return asyncio.run(middleware.abefore_agent(state, None))
        return middleware.before_agent(state, None)

    state.update(run())
    state["messages"] = add_messages(state["messages"], [AIMessage(content="Done", id="answer")])
    assert run() is None

    state["messages"] = add_messages(state["messages"], [HumanMessage(content="Put it in a table", id="editable")])
    update = run()
    assert update is not None
    state.update(update)
    assert run() is None
    assert calls == ["Explain this", "Put it in a table"]
