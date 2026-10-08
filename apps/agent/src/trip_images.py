"""Resolve destination imagery and attribution without exposing arbitrary fetches."""
from concurrent.futures import ThreadPoolExecutor
from html import unescape
import re
from urllib.parse import quote, unquote, urlsplit

import httpx
from langchain.tools import tool

HEADERS = {"User-Agent": "OpenGenerativeUI/1.0 (https://github.com/CopilotKit/OpenIntelligentUI)"}
IMAGE_HOSTS = {"upload.wikimedia.org", "thumb.wikimedia.org"}


def fetch_card(title: str, client: httpx.Client) -> dict:
    summary = client.get("https://en.wikipedia.org/api/rest_v1/page/summary/" + quote(title, safe=""))
    summary.raise_for_status()
    data = summary.json()
    image = data.get("thumbnail", {}).get("source", "")
    original = data.get("originalimage", {}).get("source", "")
    if any(urlsplit(url).scheme != "https" or urlsplit(url).hostname not in IMAGE_HOSTS
           for url in [image, original]):
        raise ValueError("No supported destination image was available.")
    def commons_filename(url):
        match = re.fullmatch(r"/wikipedia/commons/(?:thumb/)?[0-9a-f]/[0-9a-f]{2}/([^/]+)(?:/[^/]+)?", urlsplit(url).path)
        if not match:
            raise ValueError("Image is not backed by Wikimedia Commons.")
        return unquote(match.group(1)).replace(" ", "_")
    filename = commons_filename(original)
    if commons_filename(image) != filename:
        raise ValueError("Photo and attribution refer to different files.")
    metadata = client.get("https://commons.wikimedia.org/w/api.php", params={
        "action": "query", "format": "json", "prop": "imageinfo",
        "iiprop": "extmetadata", "titles": "File:" + filename,
    })
    metadata.raise_for_status()
    pages = metadata.json().get("query", {}).get("pages", {})
    info = next(iter(pages.values()), {}).get("imageinfo", [{}])[0].get("extmetadata", {})
    def plain(key):
        return unescape(re.sub(r"<[^>]*>", "", info.get(key, {}).get("value", ""))).strip()[:500]
    license_name = plain("LicenseShortName")
    artist = plain("Artist")
    if not artist or not license_name or not (license_name.startswith("CC") or license_name == "Public domain"):
        raise ValueError("Reusable image attribution was unavailable.")
    return {
        "status": "available", "place": title, "image_url": image,
        "artist": artist, "license": license_name,
        "credit_url": "https://commons.wikimedia.org/wiki/File:" + quote(filename, safe=""),
        "article_url": "https://en.wikipedia.org/wiki/" + quote(title, safe=""),
        "note": "Photo from this Wikipedia article; confirm the pictured subject fits the destination. It is not a live camera view.",
    }


@tool
def get_trip_stop_images(wikipedia_titles: list[str]) -> dict:
    """Fetch destination photos with creator, license and source links for itinerary cards.
    Pass 1–8 precise English Wikipedia article titles (for example Half Moon Bay, California).
    Render available images with visible creator/license credits linked to credit_url.
    Unavailable results must be acknowledged; do not invent photos or replace them with unrelated stock imagery.
    This retrieves images only, not driving directions, road conditions, mileage, or travel times.
    """
    if not 1 <= len(wikipedia_titles) <= 8 or any(not t.strip() or len(t) > 160 for t in wikipedia_titles):
        raise ValueError("Provide 1–8 nonempty Wikipedia titles, at most 160 characters each.")
    def fetch(title):
        try:
            with httpx.Client(timeout=12, headers=HEADERS) as client:
                return fetch_card(title.strip(), client)
        except (httpx.HTTPError, ValueError, KeyError, TypeError, IndexError):
            return {"status": "unavailable", "place": title, "reason": "The photo source or reusable attribution could not be retrieved. Use a text card for this stop."}
    with ThreadPoolExecutor(max_workers=4) as pool:
        return {"source": "Wikipedia / Wikimedia Commons", "stops": list(pool.map(fetch, wikipedia_titles))}
