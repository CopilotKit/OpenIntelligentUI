"""Expose only bundled skill snapshots read-only; keep scratch files in state.

Deep Agents 0.3.3 discovers skills through backend APIs, not host paths. Loading
these known package files at startup avoids granting the agent filesystem access.
"""

from pathlib import Path

from deepagents.backends.composite import CompositeBackend
from deepagents.backends.protocol import EditResult, FileUploadResponse, WriteResult
from deepagents.backends.state import StateBackend
from deepagents.backends.utils import create_file_data
from langchain.tools import ToolRuntime

SKILL_SOURCES = ["/skills/"]
_SKILL_NAMES = ("master-playbook", "advanced-visualization", "svg-diagrams")
_SKILL_ROOT = Path(__file__).resolve().parents[1] / "skills"
# Fail at startup if a required bundled document is missing. No agent-controlled
# path is ever passed to the host filesystem.
_SKILL_TEXT = {
    f"/{name}/SKILL.md": (_SKILL_ROOT / name / "SKILL.md").read_text(encoding="utf-8")
    for name in _SKILL_NAMES
}


class BundledSkillsBackend(StateBackend):
    """Read/search support from StateBackend with an isolated, immutable namespace."""

    def __init__(self) -> None:
        super().__init__(ToolRuntime(
            state={"files": {path: create_file_data(text) for path, text in _SKILL_TEXT.items()}},
            context=None,
            config={},
            stream_writer=lambda _: None,
            tool_call_id=None,
            store=None,
        ))

    def write(self, file_path: str, content: str) -> WriteResult:
        return WriteResult(error="Bundled skills are read-only. Write scratch files outside /skills/.")

    def edit(self, file_path: str, old_string: str, new_string: str,
             replace_all: bool = False) -> EditResult:
        return EditResult(error="Bundled skills are read-only. Write scratch files outside /skills/.")

    def upload_files(self, files: list[tuple[str, bytes]]) -> list[FileUploadResponse]:
        return [FileUploadResponse(path=path, error="permission_denied") for path, _ in files]


def build_agent_backend(runtime: ToolRuntime) -> CompositeBackend:
    """Route trusted skill reads separately from normal per-thread scratch state."""
    return CompositeBackend(
        default=StateBackend(runtime),
        routes={"/skills/": BundledSkillsBackend()},
    )
