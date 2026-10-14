from langchain_core.messages import AIMessage, HumanMessage

from src.visualization_router import message_text, routing_input


def test_plain_text_blocks_keep_the_latest_user_request():
    message = HumanMessage(content=["Compare these cities", {"type": "text", "text": "using a table"}])
    assert message_text(message) == "Compare these cities\nusing a table"
    _, context = routing_input({"messages": [message]})
    assert context == [{"role": "human", "content": "Compare these cities\nusing a table"}]


def test_nontext_blocks_remain_excluded_and_text_order_is_preserved():
    message = AIMessage(content=[
        {"type": "text", "text": "First"},
        {"type": "image_url", "image_url": {"url": "https://example.test/image.png"}},
        "Last",
    ])
    assert message_text(message) == "First\nLast"
