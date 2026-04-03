from rest_framework import serializers
from .models import Room

class Roomserializers(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = ('id' , 'code', 'host' , 'guest_can_pause' , 'vote_to_skip' , 'created_at' )


class CreateRoomSerializers(serializers.ModelSerializer):
    class Meta:
        model = Room
        feilds = ('guest_can_pause','vote_to_skip')