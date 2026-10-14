import pytest
from langchain.agents.middleware import ModelRequest

from src.visualization_router import routed_request


@pytest.mark.parametrize(
    ("renderer", "allowed"),
    [("text", set()), ("a2ui", {"render_a2ui"}), ("open_generative_ui", {"generateSandboxedUi"})],
)
def test_openai_function_schemas_obey_the_selected_renderer(renderer, allowed):
    names = ["render_a2ui", "generateSandboxedUi", "barChart", "query_data"]
    tools = [
        {"type": "function", "function": {"name": name, "description": name, "parameters": {"type": "object", "properties": {}}}}
        for name in names
    ]
    request = ModelRequest(
        model=None, messages=[], tools=tools,
        state={"visualization_decision": {"renderer": renderer, "visualization": "text"}},
    )

    result = routed_request(request)

    assert {tool["function"]["name"] for tool in result.tools} == allowed | {"query_data"}
    assert all(tool in tools for tool in result.tools)


def test_flat_and_nested_function_schemas_can_be_mixed():
    data = {"name": "query_data"}
    renderer = {"type": "function", "function": {"name": "barChart"}}
    request = ModelRequest(
        model=None, messages=[], tools=[data, renderer],
        state={"visualization_decision": {"renderer": "text", "visualization": "text"}},
    )
    assert routed_request(request).tools == [data]
