from django.db import models
import string
import random

def code_generator():
    length = 6

    while True:
        code = ''.join(random.choices(string.ascii_uppercase, k=length))
        if Room.objects.filter(code=code).count() == 0:
            return code 

class Room(models.Model):
    code = models.CharField(unique=True , default=code_generator , max_length=10)
    host = models.CharField( unique=True ,  max_length=50 )
    guest_can_pause = models.BooleanField(null=False , default=False)
    vote_to_skip = models.IntegerField(null=False , default=1)
    created_at = models.DateTimeField(auto_now_add=True)