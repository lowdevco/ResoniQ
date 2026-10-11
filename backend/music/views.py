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
                height = best_thumb.get("height", 1)
                
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

            return Response(songs)

        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
