from django.urls import path
from .views import SearchSong

urlpatterns = [
    path('search', SearchSong.as_view()),
]
