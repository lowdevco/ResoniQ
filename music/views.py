import requests
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status


class SearchSong(APIView):
    def get(self, request, format=None):
        query = request.GET.get('q')
        if not query:
            return Response(
                {'error': 'No search query provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            response = requests.get(
                'https://itunes.apple.com/search',
                params={
                    'term': query,
                    'media': 'music',
                    'limit': 10,
                    'entity': 'song',
                },
                timeout=10
            )
            data = response.json()
            tracks = []
            for track in data.get('results', []):
                tracks.append({
                    'id': track['trackId'],
                    'title': track['trackName'],
                    'artist': track['artistName'],
                    'album': track['collectionName'],
                    'cover': track['artworkUrl100'],
                    'duration': track['trackTimeMillis'],
                    'preview': track.get('previewUrl'),
                })
            return Response(tracks, status=status.HTTP_200_OK)
        except Exception as e:
            print("Error:", str(e))
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
