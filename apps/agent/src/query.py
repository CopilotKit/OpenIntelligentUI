from langchain.tools import tool
from pathlib import Path
import csv

# Read data at module load time to avoid file I/O issues in
# LangGraph Cloud's sandboxed tool execution environment.
_csv_path = Path(__file__).parent / "db.csv"
with open(_csv_path) as _f:
    _cached_data = list(csv.DictReader(_f))

@tool
def query_data(query: str):
    """
    Return the bundled sample business dataset, NOT live business data.
    The query is context only; this tool returns all rows without filtering.
    Use only when the user wants sample data. Do not call for unrelated charts.
    """
    return {
        "source": "Bundled db.csv sample dataset",
        "is_sample": True,
        "query_applied": False,
        "rows": [dict(row) for row in _cached_data],
    }
