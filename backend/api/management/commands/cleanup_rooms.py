from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from api.models import Room, RoomConnection


class Command(BaseCommand):
    help = "Delete rooms nobody is connected to and that have been idle for a while."

    def add_arguments(self, parser):
        parser.add_argument(
            '--hours', type=float, default=24,
            help="Delete empty rooms idle for longer than this (default: 24).")
        parser.add_argument(
            '--reset-connections', action='store_true',
            help="Forget all recorded WebSocket connections first. Only safe at "
                 "startup of a single-instance deployment, when none can be open.")

    def handle(self, *args, hours, reset_connections, **options):
        if reset_connections:
            deleted, _ = RoomConnection.objects.all().delete()
            self.stdout.write(f"Cleared {deleted} stale connection(s).")

        cutoff = timezone.now() - timedelta(hours=hours)
        stale = Room.objects.filter(last_active_at__lt=cutoff, connections__isnull=True)
        deleted, _ = stale.delete()
        self.stdout.write(f"Deleted {deleted} idle room record(s).")
