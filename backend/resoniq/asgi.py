import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'resoniq.settings')

from django.core.asgi import get_asgi_application

django_asgi_app = get_asgi_application()

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import OriginValidator
from django.conf import settings

from room import routing

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': OriginValidator(
        AuthMiddlewareStack(
            URLRouter(
                routing.websocket_urlpatterns
            )
        ),
        settings.CORS_ALLOWED_ORIGINS,
    ),
})
