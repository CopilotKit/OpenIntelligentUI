import httpx
import pytest
from src.trip_images import fetch_card, get_trip_stop_images


def client_for(image="https://upload.wikimedia.org/wikipedia/commons/a/ab/Test.jpg", license_name="CC BY-SA 4.0", original=None):
    def handle(request):
        if "summary" in request.url.path:
            return httpx.Response(200, json={"thumbnail": {"source": image}, "originalimage": {"source": original or image}})
        return httpx.Response(200, json={"query": {"pages": {"1": {"imageinfo": [{"extmetadata": {
            "Artist": {"value": '<a href="example">A Photographer</a>'},
            "LicenseShortName": {"value": license_name},
        }}]}}}})
    return httpx.Client(transport=httpx.MockTransport(handle))


def test_returns_verified_host_and_plain_attribution():
    with client_for() as client:
        result = fetch_card("Half Moon Bay, California", client)
    assert result["status"] == "available"
    assert result["artist"] == "A Photographer"
    assert result["license"] == "CC BY-SA 4.0"
    assert result["credit_url"].startswith("https://commons.wikimedia.org/wiki/File:")


def test_rejects_untrusted_image_host_and_unknown_license():
    with client_for(image="https://untrusted.example/photo.jpg") as client:
        with pytest.raises(ValueError): fetch_card("Place", client)
    with client_for(license_name="All rights reserved") as client:
        with pytest.raises(ValueError): fetch_card("Place", client)


def test_bounds_photo_requests():
    with pytest.raises(ValueError): get_trip_stop_images.invoke({"wikipedia_titles": ["Place"] * 9})


def test_original_image_can_itself_be_a_resized_thumbnail():
    image = "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Coastal_view.jpg/3840px-Coastal_view.jpg"
    with client_for(image=image) as client:
        result = fetch_card("Coast", client)
    assert result["credit_url"].endswith("File:Coastal_view.jpg")


def test_rejects_local_wikipedia_repository_images():
    with client_for(image="https://upload.wikimedia.org/wikipedia/en/a/ab/Test.jpg") as client:
        with pytest.raises(ValueError): fetch_card("Place", client)


def test_rejects_mismatched_photo_and_attribution_file():
    with client_for(original="https://upload.wikimedia.org/wikipedia/commons/a/ab/Other.jpg") as client:
        with pytest.raises(ValueError): fetch_card("Place", client)
