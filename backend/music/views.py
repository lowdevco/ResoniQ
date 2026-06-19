from ytmusicapi import YTMusic
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

ytmusic = YTMusic()


class SearchSong(APIView):
    def get(self, request, format=None):
        query = request.GET.get("q")

        if not query:
            return Response(
                {"error": "No search query provided"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            results = ytmusic.search(query, filter="songs")

            songs = []

            for song in results[:10]:
                songs.append({
                    "videoId": song.get("videoId"),
                    "title": song.get("title"),
                    "artist": ", ".join(
                        artist["name"]
                        for artist in song.get("artists", [])
                    ),
                    "duration": song.get("duration"),
                    "thumbnail": (
                        song.get("thumbnails", [{}])[-1].get("url")
                        if song.get("thumbnails")
                        else None
                    ),
                })

            return Response(songs)

        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
