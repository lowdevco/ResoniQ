from django.urls import path
from .views import RoomView, CreateRoomView, GetRoomView, JoinRoomView, UpdateRoom, UserInRoom, LeaveRoom

urlpatterns = [
    path('home/', RoomView.as_view()),
    path('create-room', CreateRoomView.as_view()),
    path('get-room', GetRoomView.as_view()),
    path('join-room', JoinRoomView.as_view()),
    path('user-in-room', UserInRoom.as_view()),
    path('leave-room', LeaveRoom.as_view()),
    path('update-room', UpdateRoom.as_view()),
]
