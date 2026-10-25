import secrets
import string

from django.db import models
from django.utils import timezone

CODE_LENGTH = 6
CODE_ALPHABET = string.ascii_uppercase


def code_generator():
    return ''.join(secrets.choice(CODE_ALPHABET) for _ in range(CODE_LENGTH))


class Room(models.Model):
    class Mode(models.TextChoices):
        OPEN = 'open', 'Open Party'
        LISTENING = 'listening', 'Listening Party'

    code = models.CharField(unique=True, default=code_generator, max_length=10)
    host = models.CharField(unique=True, max_length=50)
    mode = models.CharField(max_length=10, choices=Mode.choices, default=Mode.LISTENING)
    created_at = models.DateTimeField(auto_now_add=True)

    current_track = models.JSONField(null=True, blank=True)
    position = models.FloatField(default=0)
    is_playing = models.BooleanField(default=False)
    state_updated_at = models.DateTimeField(default=timezone.now)
    last_active_at = models.DateTimeField(default=timezone.now)

    def can_control(self, session_key):
        if not session_key:
            return False
        return session_key == self.host or self.mode == self.Mode.OPEN


class RoomConnection(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='connections')
    channel_name = models.CharField(max_length=255, unique=True)
    session_key = models.CharField(max_length=50, blank=True)
    connected_at = models.DateTimeField(auto_now_add=True)
