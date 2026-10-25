import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


def guest_can_pause_to_mode(apps, schema_editor):
    Room = apps.get_model('api', 'Room')
    Room.objects.filter(guest_can_pause=True).update(mode='open')


def mode_to_guest_can_pause(apps, schema_editor):
    Room = apps.get_model('api', 'Room')
    Room.objects.filter(mode='open').update(guest_can_pause=True)


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_alter_room_code'),
    ]

    operations = [
        migrations.AddField(
            model_name='room',
            name='mode',
            field=models.CharField(
                choices=[('open', 'Open Party'), ('listening', 'Listening Party')],
                default='listening', max_length=10),
        ),
        migrations.RunPython(guest_can_pause_to_mode, mode_to_guest_can_pause),
        migrations.RemoveField(model_name='room', name='guest_can_pause'),
        migrations.RemoveField(model_name='room', name='vote_to_skip'),
        migrations.AddField(
            model_name='room',
            name='current_track',
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='room',
            name='position',
            field=models.FloatField(default=0),
        ),
        migrations.AddField(
            model_name='room',
            name='is_playing',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='room',
            name='state_updated_at',
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
        migrations.AddField(
            model_name='room',
            name='last_active_at',
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
        migrations.CreateModel(
            name='RoomConnection',
            fields=[
                ('id', models.BigAutoField(
                    auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('channel_name', models.CharField(max_length=255, unique=True)),
                ('session_key', models.CharField(blank=True, max_length=50)),
                ('connected_at', models.DateTimeField(auto_now_add=True)),
                ('room', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='connections', to='api.room')),
            ],
        ),
    ]
