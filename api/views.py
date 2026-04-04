from django.shortcuts import render
from rest_framework import generics
from .serializers import Roomserializers, CreateRoomSerializers
from .models import Room
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

# Create your views here.


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
                return Response(Roomserializers(room).data, status=status.HTTP_200_OK)
            else:
                room = Room(host=host, guest_can_pause=guest_can_pause,
                            vote_to_skip=vote_to_skip)
                room.save()
                return Response(Roomserializers(room).data, status=status.HTTP_201_CREATED)


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
