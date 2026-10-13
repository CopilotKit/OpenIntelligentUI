import httpx
import pytest

import src.trip_images as images


IMAGE = 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Test.jpg'
METADATA = {'query': {'pages': {'1': {'imageinfo': [{'extmetadata': {
    'Artist': {'value': 'A Photographer'}, 'LicenseShortName': {'value': 'CC BY-SA 4.0'},
}}]}}}}


def test_original_image_is_usable_when_summary_has_no_thumbnail():
    def handle(request):
        payload = {'originalimage': {'source': IMAGE}} if 'summary' in request.url.path else METADATA
        return httpx.Response(200, json=payload)

    with httpx.Client(transport=httpx.MockTransport(handle)) as client:
        card = images.fetch_card('Coast', client)
    assert card['status'] == 'available'
    assert card['image_url'] == IMAGE
    assert card['credit_url'].endswith('File:Test.jpg')


@pytest.mark.parametrize(('summary', 'metadata'), [
    ([], METADATA),
    ({'thumbnail': {'source': IMAGE}, 'originalimage': {'source': IMAGE}}, {'query': []}),
    ({'thumbnail': {'source': IMAGE}, 'originalimage': {'source': IMAGE}}, {'query': {'pages': []}}),
    ({'thumbnail': {'source': IMAGE}, 'originalimage': {'source': IMAGE}}, {'query': {'pages': {'1': None}}}),
    ({'thumbnail': {'source': IMAGE}, 'originalimage': {'source': IMAGE}}, {'query': {'pages': {'1': {'imageinfo': [{'extmetadata': None}]}}}}),
])
def test_malformed_stop_does_not_abort_other_destination_cards(monkeypatch, summary, metadata):
    real_client = httpx.Client
    def make_client(**kwargs):
        current_title = None

        def handle(request):
            nonlocal current_title
            if 'summary' in request.url.path:
                current_title = request.url.path.rsplit('/', 1)[-1]
                return httpx.Response(200, json=summary if current_title == 'Broken' else {
                    'thumbnail': {'source': IMAGE}, 'originalimage': {'source': IMAGE},
                })
            return httpx.Response(200, json=metadata if current_title == 'Broken' else METADATA)

        return real_client(transport=httpx.MockTransport(handle))

    monkeypatch.setattr(images.httpx, 'Client', make_client)
    result = images.get_trip_stop_images.invoke({'wikipedia_titles': ['Broken', 'Healthy']})
    assert [stop['status'] for stop in result['stops']] == ['unavailable', 'available']
    assert result['stops'][0]['place'] == 'Broken'
    assert result['stops'][1]['image_url'] == IMAGE
