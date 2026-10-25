from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase
from rest_framework.throttling import ScopedRateThrottle

SONG = {
    'videoId': 'abc',
    'title': 'Song',
    'artists': [{'name': 'Artist'}],
    'duration': '3:00',
    'thumbnails': [{'url': 'http://img', 'width': 120, 'height': 120}],
}


class SearchSongTests(TestCase):
    def setUp(self):
        cache.clear()

    def test_errors_do_not_leak_exception_text(self):
        error = RuntimeError('secret internal detail')
        with patch('music.views.ytmusic.search', side_effect=error), \
                self.assertLogs('music.views', level='ERROR'):
            response = self.client.get('/music/search', {'q': 'hello'})
        self.assertEqual(response.status_code, 500)
        self.assertNotIn('secret internal detail', response.content.decode())

    def test_results_are_cached(self):
        with patch('music.views.ytmusic.search', return_value=[SONG]) as search:
            first = self.client.get('/music/search', {'q': 'Hello'})
            second = self.client.get('/music/search', {'q': 'hello '})
        self.assertEqual(first.json(), second.json())
        self.assertEqual(first.json()[0]['videoId'], 'abc')
        search.assert_called_once()

    def test_query_length_is_limited(self):
        response = self.client.get('/music/search', {'q': 'x' * 201})
        self.assertEqual(response.status_code, 400)

    def test_search_is_rate_limited(self):
        with patch.dict(ScopedRateThrottle.THROTTLE_RATES, {'search': '2/min'}), \
                patch('music.views.ytmusic.search', return_value=[]):
            codes = [self.client.get('/music/search', {'q': f'q{i}'}).status_code
                     for i in range(3)]
        self.assertEqual(codes, [200, 200, 429])
