from datetime import timedelta
from io import StringIO

from channels.db import database_sync_to_async
from channels.testing import WebsocketCommunicator
from django.conf import settings
from django.contrib.sessions.backends.db import SessionStore
from django.core.management import call_command
from django.test import Client, TestCase, TransactionTestCase
from django.utils import timezone

from api.models import Room, RoomConnection
from resoniq.asgi import application
from room import consumers

ORIGIN = settings.CORS_ALLOWED_ORIGINS[0]
TRACK = {'videoId': 'abc', 'title': 'Song', 'artist': 'A', 'thumbnail': 'http://img'}
OTHER_TRACK = {'videoId': 'xyz', 'title': 'Other'}


@database_sync_to_async
def make_session():
    session = SessionStore()
    session.create()
    return session.session_key


@database_sync_to_async
def make_room(host, **kwargs):
    return Room.objects.create(host=host, **kwargs)


@database_sync_to_async
def reload(room):
    room.refresh_from_db()
    return room


@database_sync_to_async
def set_mode(room, mode):
    Room.objects.filter(pk=room.pk).update(mode=mode)


@database_sync_to_async
def connection_count():
    return RoomConnection.objects.count()


async def connect(code, session_key=None, origin=ORIGIN):
    headers = [(b'origin', origin.encode())]
    if session_key:
        cookie = f'{settings.SESSION_COOKIE_NAME}={session_key}'
        headers.append((b'cookie', cookie.encode()))
    communicator = WebsocketCommunicator(application, f'/ws/room/{code}/', headers=headers)
    connected, _ = await communicator.connect()
    return communicator, connected


class RoomConsumerTests(TransactionTestCase):
    async def join(self, room, session_key=None, *others):
        ws, connected = await connect(room.code, session_key)
        self.assertTrue(connected)
        msg = await ws.receive_json_from()
        while msg['type'] != 'update_user_count':
            msg = await ws.receive_json_from()
        for other in others:
            self.assertEqual((await other.receive_json_from())['type'], 'update_user_count')
        return ws

    async def setup_room(self, **room_kwargs):
        host = await make_session()
        room = await make_room(host, **room_kwargs)
        host_ws = await self.join(room, host)
        guest_ws = await self.join(room, await make_session(), host_ws)
        return room, host_ws, guest_ws

    async def close_all(self, *sockets):
        for ws in sockets:
            await ws.disconnect()

    async def test_unknown_room_is_closed_with_not_found_code(self):
        ws, connected = await connect('NOPE')
        self.assertTrue(connected)
        self.assertEqual(await ws.receive_output(), {'type': 'websocket.close', 'code': 4404})

    async def test_foreign_origin_is_rejected(self):
        room = await make_room(await make_session())
        _, connected = await connect(room.code, origin='https://evil.example')
        self.assertFalse(connected)

    async def test_user_count_tracks_connections(self):
        room, host_ws, guest_ws = await self.setup_room()
        self.assertEqual(await connection_count(), 2)
        await guest_ws.disconnect()
        self.assertEqual((await host_ws.receive_json_from())['count'], 1)
        self.assertEqual(await connection_count(), 1)
        await host_ws.disconnect()

    async def test_host_controls_are_broadcast_and_saved(self):
        room, host_ws, guest_ws = await self.setup_room()
        await host_ws.send_json_to(
            {'type': 'play_song', 'track': TRACK, 'currentTime': 5, 'isPlaying': True})
        msg = await guest_ws.receive_json_from()
        self.assertEqual(msg['track'], TRACK)
        self.assertTrue(msg['isPlaying'])
        self.assertGreaterEqual(msg['currentTime'], 5)

        room = await reload(room)
        self.assertEqual(room.current_track, TRACK)
        self.assertTrue(room.is_playing)
        await self.close_all(host_ws, guest_ws)

    async def test_track_payload_is_sanitized(self):
        room, host_ws, guest_ws = await self.setup_room()
        await host_ws.send_json_to({
            'type': 'play_song',
            'track': {**TRACK, 'evil': 'x' * 10_000, 'title': 'y' * 10_000},
            'currentTime': 'not a number',
        })
        msg = await guest_ws.receive_json_from()
        self.assertNotIn('evil', msg['track'])
        self.assertEqual(len(msg['track']['title']), 500)
        self.assertLess(msg['currentTime'], 1)
        await self.close_all(host_ws, guest_ws)

    async def test_late_joiner_receives_current_position(self):
        host = await make_session()
        room = await make_room(
            host, current_track=TRACK, position=30, is_playing=True,
            state_updated_at=timezone.now() - timedelta(seconds=10))
        ws, _ = await connect(room.code, await make_session())
        self.assertEqual(
            await ws.receive_json_from(), {'type': 'room_updated', 'mode': 'listening'})
        msg = await ws.receive_json_from()
        self.assertEqual(msg['type'], 'sync_song')
        self.assertEqual(msg['track'], TRACK)
        self.assertAlmostEqual(msg['currentTime'], 40, delta=1)
        await ws.disconnect()

    async def test_paused_position_does_not_advance(self):
        room = await make_room(
            await make_session(), current_track=TRACK, position=30, is_playing=False,
            state_updated_at=timezone.now() - timedelta(seconds=10))
        ws, _ = await connect(room.code)
        await ws.receive_json_from()
        msg = await ws.receive_json_from()
        self.assertEqual(msg['currentTime'], 30)
        self.assertFalse(msg['isPlaying'])
        await ws.disconnect()

    async def test_listening_party_guest_cannot_control(self):
        room, host_ws, guest_ws = await self.setup_room(mode=Room.Mode.LISTENING)
        for event in ('play_song', 'pause_song', 'seek_song'):
            await guest_ws.send_json_to(
                {'type': event, 'track': OTHER_TRACK, 'currentTime': 99})
        self.assertTrue(await host_ws.receive_nothing())
        await self.close_all(host_ws, guest_ws)

    async def test_open_party_guest_can_change_song_and_seek(self):
        room, host_ws, guest_ws = await self.setup_room(mode=Room.Mode.OPEN)
        await guest_ws.send_json_to(
            {'type': 'play_song', 'track': OTHER_TRACK, 'currentTime': 0, 'isPlaying': True})
        msg = await host_ws.receive_json_from()
        self.assertEqual(msg['track'], OTHER_TRACK)
        self.assertTrue(msg['isPlaying'])
        await guest_ws.receive_json_from()

        await guest_ws.send_json_to(
            {'type': 'seek_song', 'currentTime': 42, 'isPlaying': False})
        msg = await host_ws.receive_json_from()
        self.assertEqual(msg['track'], OTHER_TRACK)
        self.assertEqual(msg['currentTime'], 42)
        await self.close_all(host_ws, guest_ws)

    async def test_anonymous_client_cannot_control_open_party(self):
        host = await make_session()
        room = await make_room(host, mode=Room.Mode.OPEN, current_track=TRACK)
        host_ws = await self.join(room, host)
        anon_ws = await self.join(room, None, host_ws)
        await anon_ws.send_json_to({'type': 'seek_song', 'track': OTHER_TRACK})
        self.assertTrue(await host_ws.receive_nothing())
        await self.close_all(host_ws, anon_ws)

    async def test_mode_change_takes_effect_immediately(self):
        room, host_ws, guest_ws = await self.setup_room(mode=Room.Mode.OPEN)
        await set_mode(room, Room.Mode.LISTENING)
        await guest_ws.send_json_to({'type': 'play_song', 'track': OTHER_TRACK})
        self.assertTrue(await host_ws.receive_nothing())
        await self.close_all(host_ws, guest_ws)

    async def test_flooding_is_rate_limited(self):
        room = await make_room(await make_session())
        ws = await self.join(room, room.host)
        for i in range(30):
            await ws.send_json_to({'type': 'seek_song', 'track': TRACK, 'currentTime': i})
        received = 0
        while not await ws.receive_nothing(timeout=0.3):
            await ws.receive_json_from()
            received += 1
        self.assertEqual(received, consumers.RATE_LIMIT_MESSAGES)
        await ws.disconnect()

    async def test_host_leaving_closes_room_for_guests(self):
        client = Client()
        await database_sync_to_async(client.post)(
            '/api/create-room', {'mode': 'open'}, content_type='application/json')
        host_key = client.session.session_key
        room = await database_sync_to_async(Room.objects.get)(host=host_key)
        host_ws = await self.join(room, host_key)
        guest_ws = await self.join(room, await make_session(), host_ws)

        await database_sync_to_async(client.post)('/api/leave-room')
        self.assertEqual(await guest_ws.receive_json_from(), {'type': 'room_closed'})
        self.assertEqual(await guest_ws.receive_output(), {'type': 'websocket.close', 'code': 4404})
        await host_ws.disconnect()

    async def test_mode_update_is_pushed_to_listeners(self):
        client = Client()
        await database_sync_to_async(client.post)(
            '/api/create-room', {'mode': 'listening'}, content_type='application/json')
        host_key = client.session.session_key
        room = await database_sync_to_async(Room.objects.get)(host=host_key)
        guest_ws = await self.join(room, await make_session())

        await database_sync_to_async(client.patch)(
            '/api/update-room', {'code': room.code, 'mode': 'open'},
            content_type='application/json')
        self.assertEqual(
            await guest_ws.receive_json_from(), {'type': 'room_updated', 'mode': 'open'})
        await guest_ws.disconnect()

    async def test_malformed_messages_are_ignored(self):
        room = await make_room(await make_session())
        ws = await self.join(room, room.host)
        await ws.send_to(text_data='not json')
        await ws.send_to(text_data='[1, 2]')
        self.assertTrue(await ws.receive_nothing())
        await ws.send_json_to({'type': 'ping'})
        self.assertEqual(await ws.receive_json_from(), {'type': 'pong'})
        await ws.disconnect()


class CleanupRoomsTests(TestCase):
    def test_deletes_only_idle_empty_rooms(self):
        old = timezone.now() - timedelta(hours=48)
        idle = Room.objects.create(host='a', last_active_at=old)
        busy = Room.objects.create(host='b', last_active_at=old)
        fresh = Room.objects.create(host='c')
        RoomConnection.objects.create(room=busy, channel_name='x')

        call_command('cleanup_rooms', stdout=StringIO())
        remaining = set(Room.objects.values_list('pk', flat=True))
        self.assertEqual(remaining, {busy.pk, fresh.pk})
        self.assertFalse(Room.objects.filter(pk=idle.pk).exists())

    def test_reset_connections(self):
        room = Room.objects.create(host='a')
        RoomConnection.objects.create(room=room, channel_name='x')
        call_command('cleanup_rooms', '--reset-connections', stdout=StringIO())
        self.assertFalse(RoomConnection.objects.exists())
