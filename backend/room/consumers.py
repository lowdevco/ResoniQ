import json
import math
import time

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.utils import timezone

from api.models import Room, RoomConnection

ROOM_NOT_FOUND = 4404
MAX_POSITION = 24 * 60 * 60
TRACK_FIELDS = ('videoId', 'title', 'artist', 'duration', 'thumbnail')
MAX_FIELD_LENGTH = 500
CONTROL_EVENTS = ('play_song', 'pause_song', 'seek_song')


RATE_LIMIT_MESSAGES = 20
RATE_LIMIT_WINDOW = 5.0


def clean_track(track):
    if not isinstance(track, dict):
        return None
    video_id = track.get('videoId')
    if not isinstance(video_id, str) or not 0 < len(video_id) <= 32:
        return None
    cleaned = {}
    for field in TRACK_FIELDS:
        value = track.get(field)
        if value is not None:
            cleaned[field] = str(value)[:MAX_FIELD_LENGTH]
    return cleaned


def clean_position(value):
    try:
        value = float(value)
    except (TypeError, ValueError):
        return 0.0
    if not math.isfinite(value):
        return 0.0
    return min(max(value, 0.0), MAX_POSITION)


def state_event(room):
    return {
        'type': 'sync_song',
        'track': room.current_track,
        'position': room.position,
        'isPlaying': room.is_playing,
        'updatedAt': room.state_updated_at.timestamp(),
    }


@database_sync_to_async
def get_room(code):
    return Room.objects.filter(code=code).first()


@database_sync_to_async
def add_connection(room, channel_name, session_key):
    RoomConnection.objects.create(
        room=room, channel_name=channel_name, session_key=session_key or '')
    Room.objects.filter(pk=room.pk).update(last_active_at=timezone.now())
    return room.connections.count()


@database_sync_to_async
def remove_connection(channel_name, room_code):
    RoomConnection.objects.filter(channel_name=channel_name).delete()
    Room.objects.filter(code=room_code).update(last_active_at=timezone.now())
    return RoomConnection.objects.filter(room__code=room_code).count()


@database_sync_to_async
def save_state(room, track, position, is_playing):
    if track is not None:
        room.current_track = track
    room.position = position
    room.is_playing = is_playing
    room.state_updated_at = timezone.now()
    room.last_active_at = room.state_updated_at
    room.save(update_fields=[
        'current_track', 'position', 'is_playing',
        'state_updated_at', 'last_active_at'])
    return room


class RoomConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_code = self.scope['url_route']['kwargs']['room_code'].upper()
        self.room_group_name = f'room_{self.room_code}'
        self.joined = False
        self.recent_messages = []

        room = await get_room(self.room_code)
        await self.accept()
        if room is None:
            await self.close(code=ROOM_NOT_FOUND)
            return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        count = await add_connection(room, self.channel_name, self.session_key)
        self.joined = True

        await self.send_json({'type': 'room_updated', 'mode': room.mode})
        if room.current_track:
            await self.sync_song(state_event(room))

        await self.channel_layer.group_send(
            self.room_group_name,
            {'type': 'update_user_count', 'count': count},
        )

    async def disconnect(self, close_code):
        if not self.joined:
            return
        self.joined = False

        count = await remove_connection(self.channel_name, self.room_code)
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        await self.channel_layer.group_send(
            self.room_group_name,
            {'type': 'update_user_count', 'count': count},
        )

    @property
    def session_key(self):
        session = self.scope.get('session')
        return session.session_key if session is not None else None

    def rate_limited(self):
        now = time.monotonic()
        self.recent_messages = [t for t in self.recent_messages if now - t < RATE_LIMIT_WINDOW]
        if len(self.recent_messages) >= RATE_LIMIT_MESSAGES:
            return True
        self.recent_messages.append(now)
        return False

    async def send_json(self, data):
        await self.send(text_data=json.dumps(data))

    async def receive(self, text_data=None, bytes_data=None):
        try:
            data = json.loads(text_data)
        except (TypeError, ValueError):
            return
        if not isinstance(data, dict):
            return

        event_type = data.get('type')
        if event_type == 'ping':
            await self.send_json({'type': 'pong'})
            return
        if event_type not in CONTROL_EVENTS or self.rate_limited():
            return

        room = await get_room(self.room_code)
        if room is None:
            await self.close(code=ROOM_NOT_FOUND)
            return

        if not room.can_control(self.session_key):
            return

        track = clean_track(data.get('track'))
        if track is None and not room.current_track:
            return

        is_playing = event_type == 'play_song' or (
            event_type == 'seek_song' and bool(data.get('isPlaying')))
        room = await save_state(room, track, clean_position(data.get('currentTime')), is_playing)
        await self.channel_layer.group_send(self.room_group_name, state_event(room))


    async def sync_song(self, event):
        position = event['position']
        if event['isPlaying']:
            position += max(0.0, timezone.now().timestamp() - event['updatedAt'])
        await self.send_json({
            'type': 'sync_song',
            'track': event['track'],
            'currentTime': position,
            'isPlaying': event['isPlaying'],
        })

    async def update_user_count(self, event):
        await self.send_json({'type': 'update_user_count', 'count': event['count']})

    async def room_updated(self, event):
        await self.send_json({'type': 'room_updated', 'mode': event['mode']})

    async def room_closed(self, event):
        await self.send_json({'type': 'room_closed'})
        await self.close(code=ROOM_NOT_FOUND)
