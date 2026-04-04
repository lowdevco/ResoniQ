from django.urls import path
from . import views

urlpatterns = [
    path('', views.index),
    path('home', views.index),
    path('create', views.index),
    path('join', views.index),
    path('room/<str:roomCode>', views.index),
]
