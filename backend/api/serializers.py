from rest_framework import serializers

from .models import Room


class Roomserializers(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = ('id', 'code', 'mode', 'created_at')


class CreateRoomSerializers(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = ('mode',)


class UpdateRoomSerializers(serializers.ModelSerializer):
    code = serializers.CharField(validators=[])

    class Meta:
        model = Room
        fields = ('mode', 'code')
