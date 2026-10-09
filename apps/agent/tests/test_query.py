"""The bundled data tool must identify its source without inventing live access."""
from src.query import query_data


def test_sample_query_reports_provenance_and_unfiltered_rows():
    result = query_data.invoke({'query': 'Show only last week'})
    assert result['is_sample'] is True
    assert result['source'] == 'Bundled db.csv sample dataset'
    assert result['query_applied'] is False
    assert result['rows']


def test_sample_query_returns_independent_rows():
    first = query_data.invoke({'query': 'all'})
    first['rows'][0]['injected'] = 'changed'
    second = query_data.invoke({'query': 'all'})
    assert 'injected' not in second['rows'][0]
