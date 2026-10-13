from copy import deepcopy

import pytest
from langchain.tools import ToolRuntime

from src.todos import manage_todos


def runtime():
    return ToolRuntime(state={"messages": [], "todos": []}, context=None, config={},
                       stream_writer=lambda _: None, tool_call_id="todo-call", store=None)


def todo(id, title):
    return {"id": id, "title": title, "description": "", "emoji": "", "status": "pending"}


def test_duplicate_supplied_ids_are_rejected_before_state_update():
    items = [todo("", "New"), todo("same", "First"), todo("same", "Second")]
    original = deepcopy(items)
    with pytest.raises(ValueError, match="unique"):
        manage_todos.func(items, runtime())
    assert items == original


def test_unique_supplied_ids_are_stable_in_state_update():
    items = [todo("one", "First"), todo("two", "Second")]
    result = manage_todos.func(items, runtime())
    assert result.update["todos"] == items
    assert result.update["messages"][0].tool_call_id == "todo-call"


def test_new_todos_receive_distinct_nonempty_ids():
    result = manage_todos.func([todo("", "First"), todo("", "Second")], runtime())
    ids = [item["id"] for item in result.update["todos"]]
    assert all(ids)
    assert len(set(ids)) == 2
