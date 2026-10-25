import hashlib
import logging

from django.core.cache import cache
from rest_framework import status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from ytmusicapi import YTMusic

logger = logging.getLogger(__name__)
ytmusic = YTMusic()

MAX_QUERY_LENGTH = 200
CACHE_SECONDS = 10 * 60


def search_songs(query):
    results = ytmusic.search(query, filter="songs")

    seen_ids = set()
    songs = []

    for song in results:
        video_id = song.get("videoId")
        if not video_id or video_id in seen_ids:
            continue

        thumbnails = song.get("thumbnails", [])
        if not thumbnails:
            continue

        best_thumb = thumbnails[-1]
        width = best_thumb.get("width", 1)
        height = best_thumb.get("height", 1) or 1

        # Official studio tracks have square album art (~1:1 aspect ratio)
        # Unofficial YouTube videos/mixes have 16:9 or 4:3 thumbnails.
        if abs(width / height - 1.0) > 0.1:
            continue

        thumbnail = best_thumb.get("url")

        if not thumbnail:
            continue

        seen_ids.add(video_id)
        songs.append({
            "videoId": video_id,
            "title": song.get("title"),
            "artist": ", ".join(
                artist["name"]
                for artist in song.get("artists", [])
            ),
            "duration": song.get("duration"),
            "thumbnail": thumbnail,
        })

        if len(songs) >= 30:
            break

    return songs


class SearchSong(APIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "search"

    def get(self, request, format=None):
        query = (request.GET.get("q") or "").strip()

        if not query:
            return Response(
                {"error": "No search query provided"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(query) > MAX_QUERY_LENGTH:
            return Response(
                {"error": "Search query is too long"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        digest = hashlib.sha256(query.lower().encode()).hexdigest()
        cache_key = f"music-search:{digest}"
        songs = cache.get(cache_key)
        if songs is not None:
            return Response(songs)

        try:
            songs = search_songs(query)
        except Exception:
            logger.exception("Song search failed for query %r", query)
            return Response(
                {"error": "Search is temporarily unavailable. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        cache.set(cache_key, songs, CACHE_SECONDS)
        return Response(songs)
