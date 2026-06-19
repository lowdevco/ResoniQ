import json
from channels.generic.websocket import AsyncWebsocketConsumer

# Track users per room
room_users = {}


class RoomConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_code = self.scope['url_route']['kwargs']['room_code']
        self.room_group_name = f'room_{self.room_code}'

        # Add to room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

        # Track user count
        if self.room_code not in room_users:
            room_users[self.room_code] = 0
        room_users[self.room_code] += 1

        # Broadcast updated count to everyone
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'update_user_count',
                'count': room_users[self.room_code],
            }
        )

    async def disconnect(self, close_code):
        # Decrease user count
        if self.room_code in room_users:
            room_users[self.room_code] = max(0, room_users[self.room_code] - 1)

        # Broadcast updated count
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'update_user_count',
                'count': room_users.get(self.room_code, 0),
            }
        )

        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        event_type = data.get('type')

        if event_type == 'play_song':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'sync_song',
                    'track': data.get('track'),
                    'currentTime': data.get('currentTime', 0),
                    'isPlaying': data.get('isPlaying', False),
                }
            )

        elif event_type == 'pause_song':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'sync_song',
                    'track': data.get('track'),
                    'currentTime': data.get('currentTime', 0),
                    'isPlaying': False,
                }
            )

        elif event_type == 'seek_song':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'sync_song',
                    'track': data.get('track'),
                    'currentTime': data.get('currentTime', 0),
                    'isPlaying': data.get('isPlaying', False),
                }
            )

    async def sync_song(self, event):
        await self.send(text_data=json.dumps({
            'type': 'sync_song',
            'track': event['track'],
            'currentTime': event['currentTime'],
            'isPlaying': event['isPlaying'],
        }))

    async def update_user_count(self, event):
        await self.send(text_data=json.dumps({
            'type': 'update_user_count',
            'count': event['count'],
        }))

    async def user_joined(self, event):
        await self.send(text_data=json.dumps({
            'type': 'user_joined',
            'message': event['message'],
        }))

    async def user_left(self, event):
        await self.send(text_data=json.dumps({
            'type': 'user_left',
            'message': event['message'],
        }))
