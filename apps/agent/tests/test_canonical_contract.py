"""Tests pinning the prompt contract to the canonical generateSandboxedUi tool."""

import inspect

import src.templates as templates
from src.plan import plan_visualization
from src.prompt import SYSTEM_PROMPT
from src.templates import apply_template


def test_prompt_uses_generate_sandboxed_ui_not_widget_renderer():
    assert "generateSandboxedUi" in SYSTEM_PROMPT
    assert "widgetRenderer" not in SYSTEM_PROMPT


def test_prompt_documents_ordered_params():
    # Anchored numbered-list needles pin the full documented stream order —
    # any reordering of the six params breaks the monotone index chain.
    anchored = [
        "1. initialHeight",
        "2. placeholderMessages",
        "3. css",
        "4. html",
        "5. jsFunctions",
        "6. jsExpressions",
    ]
    indices = []
    for needle in anchored:
        idx = SYSTEM_PROMPT.find(needle)
        assert idx >= 0, f"missing ordered param doc: {needle}"
        indices.append(idx)
    assert indices == sorted(indices), "param docs out of order"
    assert "parameter order" in SYSTEM_PROMPT.lower()
    # The order requirement itself must be flagged as exact/critical.
    assert "EXACT order" in SYSTEM_PROMPT


def test_prompt_documents_sandbox_bridge_and_restrictions():
    assert "Websandbox.connection.remote" in SYSTEM_PROMPT
    assert "localStorage" in SYSTEM_PROMPT
    assert "cookies" in SYSTEM_PROMPT.lower()
    assert "same-origin fetch" in SYSTEM_PROMPT.lower()


def test_prompt_documents_library_imports_for_sandbox():
    assert "await import('three')" in SYSTEM_PROMPT
    assert '<script type="module">' in SYSTEM_PROMPT
    assert "bare" in SYSTEM_PROMPT.lower()
    assert "importmap" in SYSTEM_PROMPT.lower().replace(" ", "")


def test_prompt_forbids_top_level_await_in_js_channels():
    # jsFunctions/jsExpressions are executed via websandbox runCode as classic
    # scripts, where top-level await is a SyntaxError that fails silently. The
    # prompt must direct dynamic imports inside async functions.
    normalized = " ".join(SYSTEM_PROMPT.lower().split())
    assert "top-level `await`" in normalized or "top-level await" in normalized
    assert "classic script" in normalized
    assert "inside an async function" in normalized


def test_plan_visualization_docstring_names_canonical_tool():
    assert "generateSandboxedUi" in plan_visualization.description
    assert "widgetRenderer" not in plan_visualization.description


def test_templates_docstrings_name_canonical_tool():
    assert "generateSandboxedUi" in apply_template.description
    assert "widgetRenderer" not in apply_template.description
    assert "widgetRenderer" not in inspect.getsource(templates)


def test_seed_templates_use_sandbox_bridge_not_global_send_prompt():
    invoice = next(t for t in templates.SEED_TEMPLATES if t["id"] == "seed-invoice-001")
    assert invoice["html"], "seed html should load from the frontend source"
    assert "sendPrompt('" not in invoice["html"]
    assert "Websandbox.connection.remote.sendPrompt" in invoice["html"]


class _FakeRuntime:
    state: dict = {}
    tool_call_id = "test-call"


def test_apply_template_appends_canonical_translation_note():
    result = apply_template.func(runtime=_FakeRuntime(), name="Invoice Card")
    assert "error" not in result
    note = result.get("usage_note", "")
    assert "css parameter" in note
    assert "jsFunctions" in note
    assert "Websandbox.connection.remote.sendPrompt" in note
