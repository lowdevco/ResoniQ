from django.urls import path

from .views import (
    CreateRoomView,
    GetRoomView,
    Health,
    JoinRoomView,
    LeaveRoom,
    UpdateRoom,
    UserInRoom,
)

urlpatterns = [
    path('health', Health.as_view()),
    path('create-room', CreateRoomView.as_view()),
    path('get-room', GetRoomView.as_view()),
    path('join-room', JoinRoomView.as_view()),
    path('user-in-room', UserInRoom.as_view()),
    path('leave-room', LeaveRoom.as_view()),
    path('update-room', UpdateRoom.as_view()),
]
