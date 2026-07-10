# fmt: off
import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'resoniq.settings')

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

django_asgi_app = get_asgi_application()

from django.core.management import call_command
try:
    print("Running database migrations programmatically...")
    call_command("migrate", interactive=False)
    print("Database migrations applied successfully!")
except Exception as e:
    print(f"Error running migrations: {e}")

from room import routing  # type: ignore

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': AuthMiddlewareStack(
        URLRouter(
            routing.websocket_urlpatterns
        )
    ),
})
