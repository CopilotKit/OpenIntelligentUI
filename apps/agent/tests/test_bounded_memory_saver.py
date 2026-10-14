"""BoundedMemorySaver must cap stored threads without dropping live ones."""
from langchain_core.messages import AIMessage, HumanMessage
from langgraph.graph import END, START, MessagesState, StateGraph

from src.bounded_memory_saver import BoundedMemorySaver


def _graph(saver):
    builder = StateGraph(MessagesState)
    builder.add_node('answer', lambda state: {'messages': [AIMessage(content='OK')]})
    builder.add_edge(START, 'answer')
    builder.add_edge('answer', END)
    return builder.compile(checkpointer=saver)


def _config(thread_id):
    return {'configurable': {'thread_id': thread_id}}


def test_eviction_drops_all_data_for_evicted_threads():
    saver = BoundedMemorySaver(max_threads=2)
    graph = _graph(saver)
    for index in range(5):
        graph.invoke({'messages': [HumanMessage(content='Hello')]}, _config(f't{index}'))

    assert set(saver.storage) == {'t3', 't4'}
    assert {key[0] for key in saver.blobs} <= {'t3', 't4'}
    assert {key[0] for key in saver.writes} <= {'t3', 't4'}


def test_reading_unknown_threads_does_not_evict_the_thread_just_written():
    saver = BoundedMemorySaver(max_threads=2)
    graph = _graph(saver)
    # Reading a thread that has no checkpoint still creates an empty entry in
    # MemorySaver.storage, as the AG-UI adapter does before every run.
    for index in range(3):
        assert graph.get_state(_config(f'unknown-{index}')).values == {}

    graph.invoke({'messages': [HumanMessage(content='Hello')]}, _config('real'))

    messages = graph.get_state(_config('real')).values['messages']
    assert [message.content for message in messages] == ['Hello', 'OK']
