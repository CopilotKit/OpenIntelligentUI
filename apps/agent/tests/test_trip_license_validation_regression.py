import httpx
import pytest

from src.trip_images import fetch_card


def card_for(license_name):
    image = "https://upload.wikimedia.org/wikipedia/commons/a/ab/Test.jpg"

    def handle(request):
        if "summary" in request.url.path:
            return httpx.Response(200, json={"thumbnail": {"source": image}, "originalimage": {"source": image}})
        return httpx.Response(200, json={"query": {"pages": {"1": {"imageinfo": [{"extmetadata": {
            "Artist": {"value": "A Photographer"}, "LicenseShortName": {"value": license_name},
        }}]}}}})

    with httpx.Client(transport=httpx.MockTransport(handle)) as client:
        return fetch_card("Coast", client)


@pytest.mark.parametrize("license_name", [
    "CC BY-NC 4.0", "CC BY-ND 4.0", "CC BY-NC-SA 4.0",
    "CC All rights reserved", "CC BY-SA 99.0", "CC BY 3.0 ZZ", "CC SA 4.0",
    "CC BY-SA 1.0 IGO", "CC BY 1.0 US", "CC BY 2.1", "CC BY-SA 3.0 JP", "CC BY-SA 2.0 IGO",
])
def test_unknown_and_restricted_license_names_are_not_marked_reusable(license_name):
    with pytest.raises(ValueError, match="Reusable image attribution"):
        card_for(license_name)


@pytest.mark.parametrize("license_name", [
    "CC BY 4.0", "CC BY-SA 3.0", "CC by 2.0 fr", "CC BY-SA 2.1 JP",
    "CC SA 1.0", "CC0", "CC0 1.0", "Public domain",
    "CC BY 2.1 ES", "CC BY-SA 2.1 CA", "CC BY 3.0 EE", "CC BY-SA 3.0 GE",
    "CC BY 3.0 IE", "CC SA 1.0 FI", "CC SA 2.0 JP",
])
def test_supported_commons_names_keep_the_original_credit(license_name):
    card = card_for(license_name)
    assert card["status"] == "available"
    assert card["license"] == license_name
