from unittest.mock import patch

from django.test import TestCase

from .models import Room


class RoomListRemovedTests(TestCase):
    def test_room_list_endpoint_is_gone(self):
        self.assertEqual(self.client.get('/api/home/').status_code, 404)


class RoomApiTests(TestCase):
    def create(self, **body):
        body = {'mode': 'open', **body}
        return self.client.post('/api/create-room', body, content_type='application/json')

    def test_room_details_do_not_expose_host_session(self):
        code = self.create().json()['code']
        data = self.client.get('/api/get-room', {'code': code}).json()
        self.assertNotIn('host', data)
        self.assertTrue(data['is_host'])
        self.assertEqual(data['mode'], 'open')

    def test_codes_are_case_insensitive(self):
        code = self.create().json()['code']
        response = self.client.get('/api/get-room', {'code': code.lower()})
        self.assertEqual(response.status_code, 200)

    def test_invalid_mode_is_rejected(self):
        self.assertEqual(self.create(mode='chaos').status_code, 400)

    def test_only_host_can_update_mode(self):
        code = self.create(mode='listening').json()['code']
        other = self.client_class()
        response = other.patch('/api/update-room', {'code': code, 'mode': 'open'},
                               content_type='application/json')
        self.assertEqual(response.status_code, 403)
        response = self.client.patch('/api/update-room', {'code': code, 'mode': 'open'},
                                     content_type='application/json')
        self.assertEqual(response.json()['mode'], 'open')

    def test_code_collision_is_retried(self):
        Room.objects.create(code='AAAAAA', host='someone-else')
        with patch('api.views.code_generator', side_effect=['AAAAAA', 'BBBBBB']):
            response = self.create()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['code'], 'BBBBBB')


class HealthTests(TestCase):
    def test_health_is_ok_without_a_session(self):
        response = self.client.get('/api/health')
        self.assertEqual(response.json(), {'status': 'ok'})
        self.assertNotIn('sessionid', response.cookies)
