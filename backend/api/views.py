from django.shortcuts import render
from rest_framework import generics
from .serializers import Roomserializers, CreateRoomSerializers, UpdateRoomSerializers
from .models import Room
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods


class RoomView(generics.ListAPIView):
    queryset = Room.objects.all()
    serializer_class = Roomserializers


class CreateRoomView(APIView):
    serializer_class = CreateRoomSerializers

    def post(self, request, format=None):
        if not self.request.session.exists(self.request.session.session_key):
            self.request.session.create()

        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            guest_can_pause = serializer.data.get('guest_can_pause', True)
            vote_to_skip = serializer.data.get('vote_to_skip', 2)
            host = self.request.session.session_key
            queryset = Room.objects.filter(host=host)
            if queryset.exists():
                room = queryset[0]
                room.guest_can_pause = guest_can_pause
                room.vote_to_skip = vote_to_skip
                room.save(update_fields=['guest_can_pause', 'vote_to_skip'])
                self.request.session['room_code'] = room.code
                return Response(Roomserializers(room).data, status=status.HTTP_200_OK)
            else:
                room = Room(host=host, guest_can_pause=guest_can_pause,
                            vote_to_skip=vote_to_skip)
                room.save()
                self.request.session['room_code'] = room.code
                return Response(Roomserializers(room).data, status=status.HTTP_201_CREATED)

        return Response(
            {'Bad Request': 'Invalid data...'},
            status=status.HTTP_400_BAD_REQUEST
        )


class GetRoomView(APIView):
    def get(self, request, format=None):
        code = request.GET.get('code')
        if code is None:
            return Response(
                {'error': 'Code not provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        queryset = Room.objects.filter(code=code)
        if not queryset.exists():
            return Response(
                {'error': 'Room not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        room = queryset[0]
        data = Roomserializers(room).data
        data['is_host'] = self.request.session.session_key == room.host
        return Response(data, status=status.HTTP_200_OK)


class JoinRoomView(APIView):
    def post(self, request, format=None):
        if not self.request.session.exists(self.request.session.session_key):
            self.request.session.create()

        code = request.data.get('code')
        if code is None:
            return Response(
                {'error': 'Code not provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        queryset = Room.objects.filter(code=code)
        if not queryset.exists():
            return Response(
                {'error': 'Room not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        self.request.session['room_code'] = code
        return Response(
            {'message': 'Room joined!'},
            status=status.HTTP_200_OK
        )


class UserInRoom(APIView):
    def get(self, request, format=None):
        if not self.request.session.exists(self.request.session.session_key):
            self.request.session.create()

        data = {
            'code': self.request.session.get('room_code')
        }
        return Response(data, status=status.HTTP_200_OK)


class LeaveRoom(APIView):
    def post(self, request, format=None):
        if 'room_code' in self.request.session:
            self.request.session.pop('room_code')
            host_id = self.request.session.session_key
            room_results = Room.objects.filter(host=host_id)
            if room_results.exists():
                room = room_results[0]
                room.delete()
        return Response({'Message': 'Success'}, status=status.HTTP_200_OK)


class UpdateRoom(APIView):
    serializer_class = UpdateRoomSerializers

    def patch(self, request, format=None):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            guest_can_pause = serializer.data.get('guest_can_pause')
            vote_to_skip = serializer.data.get('vote_to_skip')
            code = serializer.data.get('code')

            queryset = Room.objects.filter(code=code)
            if not queryset.exists():
                return Response(
                    {'error': 'Room not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )

            room = queryset[0]
            user_id = self.request.session.session_key
            if room.host != user_id:
                return Response(
                    {'error': 'You are not the host of this room.'},
                    status=status.HTTP_403_FORBIDDEN
                )

            room.guest_can_pause = guest_can_pause
            room.vote_to_skip = vote_to_skip
            room.save(update_fields=['guest_can_pause', 'vote_to_skip'])
            return Response(Roomserializers(room).data, status=status.HTTP_200_OK)

        return Response(
            {'Bad Request': 'Invalid data...'},
            status=status.HTTP_400_BAD_REQUEST
        )

# Render Backend Cold Start 

@require_http_methods(["GET"])
def healthcheck(request):
    return JsonResponse({"status": "ok"})