import json
from channels.generic.websocket import AsyncWebsocketConsumer


class RoomConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_code = self.scope['url_route']['kwargs']['room_code']
        self.room_group_name = f'room_{self.room_code}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

        # Notify everyone when  someone joins the room
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_joined',
                'message': 'A new user joined the room',
            }
        )

    async def disconnect(self, close_code):
        # Notify everyone  when someone left the room 

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_left',
                'message': 'A user left the room',
            }
        )

        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        event_type = data.get('type')

        if event_type == 'music_sync':
            # Broadcast music sync to all room members
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'music_sync',
                    'track': data.get('track'),
                    'is_playing': data.get('is_playing'),
                    'current_time': data.get('current_time'),
                }
            )

        elif event_type == 'user_count':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_count',
                    'count': data.get('count'),
                }
            )

    async def music_sync(self, event):
        await self.send(text_data=json.dumps({
            'type': 'music_sync',
            'track': event['track'],
            'is_playing': event['is_playing'],
            'current_time': event['current_time'],
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

    async def user_count(self, event):
        await self.send(text_data=json.dumps({
            'type': 'user_count',
            'count': event['count'],
        }))
