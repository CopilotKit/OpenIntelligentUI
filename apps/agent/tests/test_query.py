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


def test_sample_rows_parse_into_the_header_columns():
    rows = query_data.invoke({'query': 'all'})['rows']
    columns = ['date', 'category', 'subcategory', 'amount', 'type', 'notes']
    # An unquoted comma in a field would shift values and add a None key.
    assert all(list(row) == columns for row in rows)
    assert rows[0]['notes'] == '3 new enterprise customers (Acme Corp, TechFlow, DataViz Inc)'
