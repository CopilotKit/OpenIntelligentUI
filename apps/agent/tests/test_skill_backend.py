"""Exercise actual Deep Agents discovery and filesystem backends without an LLM."""
import asyncio

import pytest
from deepagents.middleware.skills import SkillsMiddleware
from langchain.tools import ToolRuntime
from langgraph.runtime import Runtime

from src.skill_backend import SKILL_SOURCES, build_agent_backend


def make_runtime(files=None):
    return ToolRuntime(state={'messages': [], 'files': files or {}}, context=None,
                       config={}, stream_writer=lambda _: None, tool_call_id=None, store=None)


@pytest.mark.parametrize('asynchronous', [False, True])
def test_real_skills_middleware_discovers_all_bundled_skills(asynchronous):
    middleware = SkillsMiddleware(backend=build_agent_backend, sources=SKILL_SOURCES)
    state = {'messages': [], 'files': {}}
    if asynchronous:
        result = asyncio.run(middleware.abefore_agent(state, Runtime(), {}))
    else:
        result = middleware.before_agent(state, Runtime(), {})
    skills = result['skills_metadata']
    assert {s['name'] for s in skills} == {'master-playbook', 'advanced-visualization', 'svg-diagrams'}
    backend = build_agent_backend(make_runtime())
    for skill in skills:
        assert skill['path'].startswith('/skills/')
        content = backend.download_files([skill['path']])[0]
        assert content.error is None
        assert b'generateSandboxedUi' in content.content
        assert 'generateSandboxedUi' in backend.read(skill['path'])


def test_skill_namespace_rejects_mutation_and_state_shadowing():
    path = '/skills/master-playbook/SKILL.md'
    runtime = make_runtime()
    backend = build_agent_backend(runtime)
    original = backend.download_files([path])[0].content
    assert backend.write(path, 'replacement').error
    assert backend.write('/skills/new/SKILL.md', 'new').error
    assert backend.edit(path, 'Open Generative UI', 'replacement').error
    assert backend.upload_files([(path, b'replacement')])[0].error == 'permission_denied'
    assert asyncio.run(backend.awrite(path, 'replacement')).error
    assert asyncio.run(backend.aedit(path, 'Open Generative UI', 'replacement')).error
    assert asyncio.run(backend.aupload_files([(path, b'replacement')]))[0].error == 'permission_denied'
    runtime.state['files'][path] = {'content': ['injected'], 'created_at': '', 'modified_at': ''}
    assert backend.download_files([path])[0].content == original


def test_scratch_files_remain_writable_and_thread_local():
    runtime = make_runtime()
    backend = build_agent_backend(runtime)
    result = backend.write('/scratch/note.txt', 'first')
    assert result.error is None
    runtime.state['files'].update(result.files_update)
    edited = backend.edit('/scratch/note.txt', 'first', 'second')
    assert edited.error is None
    runtime.state['files'].update(edited.files_update)
    assert 'second' in backend.read('/scratch/note.txt')
    assert 'not found' in build_agent_backend(make_runtime()).read('/scratch/note.txt')


def test_no_host_filesystem_or_traversal_access():
    backend = build_agent_backend(make_runtime())
    for path in ['/etc/passwd', '/skills/../../.env', '/skills/../main.py']:
        result = backend.download_files([path])[0]
        assert result.error == 'file_not_found'
        assert result.content is None
    assert backend.glob_info('**/.env', '/') == []


def test_main_graph_discovers_skills_on_a_real_agent_turn(monkeypatch):
    import importlib
    import sys
    from langchain_core.language_models.fake_chat_models import FakeMessagesListChatModel
    from langchain_core.messages import AIMessage, HumanMessage
    import src.model
    import src.visualization_router

    monkeypatch.setattr(src.visualization_router, "route", lambda context: {"renderer": "text", "visualization": "text", "confidence": 1, "source": "jev"})

    class ToolCapableFakeModel(FakeMessagesListChatModel):
        def bind_tools(self, tools, **kwargs):
            return self

    monkeypatch.setattr(src.model, 'build_model', lambda **kwargs: ToolCapableFakeModel(
        responses=[AIMessage(content='Ready')],
    ))
    # Import the real graph configuration, replacing only the network model.
    sys.modules.pop('main', None)
    try:
        main = importlib.import_module('main')
        config = {'configurable': {'thread_id': 'skills-discovery-test'}}
        main.agent.invoke({'messages': [HumanMessage(content='Hello')]}, config)
        state = main.agent.get_state(config).values
        assert {s['name'] for s in state['skills_metadata']} == {
            'master-playbook', 'advanced-visualization', 'svg-diagrams',
        }
    finally:
        sys.modules.pop('main', None)
