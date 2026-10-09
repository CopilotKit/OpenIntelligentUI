"""Planning tool for visualization generation."""

from langchain.tools import tool


@tool
def plan_visualization(
    approach: str, technology: str, key_elements: list[str]
) -> str:
    """Optionally explain a complex visualization approach before building it.
    Use when planning helps the user understand scope; it is not required before
    generateSandboxedUi, pieChart, or barChart.

    Args:
        approach: One sentence describing the visualization strategy.
        technology: The primary technology (e.g. "inline SVG", "Chart.js",
            "HTML + Canvas", "Three.js", "Mermaid", "D3.js").
        key_elements: 2-4 concise bullet points describing what will be built.
    """
    elements = "\n".join(f"  - {e}" for e in key_elements)
    return f"Plan: {approach}\nTech: {technology}\n{elements}"
