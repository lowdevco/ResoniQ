from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import IntegrityError, transaction
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Room, code_generator
from .serializers import CreateRoomSerializers, Roomserializers, UpdateRoomSerializers


def create_room(host, mode, attempts=5):
    for attempt in range(attempts):
        try:
            with transaction.atomic():
                return Room.objects.create(code=code_generator(), host=host, mode=mode)
        except IntegrityError:
            if attempt == attempts - 1 or Room.objects.filter(host=host).exists():
                raise


def normalize_code(code):
    return code.strip().upper() if isinstance(code, str) else None


def notify_room(code, event):
    async_to_sync(get_channel_layer().group_send)(f'room_{code}', event)


def ensure_session(request):
    if not request.session.exists(request.session.session_key):
        request.session.create()
    return request.session.session_key


def error(message, code):
    return Response({'error': message}, status=code)


class CreateRoomView(APIView):
    def post(self, request, format=None):
        host = ensure_session(request)
        serializer = CreateRoomSerializers(data=request.data)
        if not serializer.is_valid():
            return error('Invalid room settings', status.HTTP_400_BAD_REQUEST)
        mode = serializer.validated_data.get('mode', Room.Mode.LISTENING)

        room = Room.objects.filter(host=host).first()
        if room is not None:
            room.mode = mode
            room.save(update_fields=['mode'])
            notify_room(room.code, {'type': 'room_updated', 'mode': room.mode})
            created = False
        else:
            room = create_room(host, mode)
            created = True

        request.session['room_code'] = room.code
        return Response(
            Roomserializers(room).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class GetRoomView(APIView):
    def get(self, request, format=None):
        code = normalize_code(request.GET.get('code'))
        if not code:
            return error('Code not provided', status.HTTP_400_BAD_REQUEST)

        room = Room.objects.filter(code=code).first()
        if room is None:
            return error('Room not found', status.HTTP_404_NOT_FOUND)

        data = Roomserializers(room).data
        data['is_host'] = request.session.session_key == room.host
        return Response(data, status=status.HTTP_200_OK)


class JoinRoomView(APIView):
    def post(self, request, format=None):
        ensure_session(request)
        code = normalize_code(request.data.get('code'))
        if not code:
            return error('Code not provided', status.HTTP_400_BAD_REQUEST)

        if not Room.objects.filter(code=code).exists():
            return error('Room not found', status.HTTP_404_NOT_FOUND)

        request.session['room_code'] = code
        return Response({'message': 'Room joined!', 'code': code}, status=status.HTTP_200_OK)


class UserInRoom(APIView):
    def get(self, request, format=None):
        ensure_session(request)
        return Response({'code': request.session.get('room_code')}, status=status.HTTP_200_OK)


class LeaveRoom(APIView):
    def post(self, request, format=None):
        request.session.pop('room_code', None)
        session_key = request.session.session_key
        room = Room.objects.filter(host=session_key).first() if session_key else None
        if room is not None:
            code = room.code
            room.delete()
            notify_room(code, {'type': 'room_closed'})
        return Response({'message': 'Success'}, status=status.HTTP_200_OK)


class UpdateRoom(APIView):
    def patch(self, request, format=None):
        serializer = UpdateRoomSerializers(data=request.data)
        if not serializer.is_valid():
            return error('Invalid room settings', status.HTTP_400_BAD_REQUEST)

        code = normalize_code(serializer.validated_data['code'])
        room = Room.objects.filter(code=code).first()
        if room is None:
            return error('Room not found', status.HTTP_404_NOT_FOUND)

        if room.host != request.session.session_key:
            return error('You are not the host of this room.', status.HTTP_403_FORBIDDEN)

        room.mode = serializer.validated_data.get('mode', room.mode)
        room.save(update_fields=['mode'])
        notify_room(room.code, {'type': 'room_updated', 'mode': room.mode})
        return Response(Roomserializers(room).data, status=status.HTTP_200_OK)


class Health(APIView):
    authentication_classes = []

    def get(self, request, format=None):
        response = Response({'status': 'ok'}, status=status.HTTP_200_OK)
        response['Cache-Control'] = 'no-store'
        return response
