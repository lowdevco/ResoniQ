from django.urls import path
from .views import RoomView, CreateRoomView, GetRoomView  

urlpatterns = [
    path('home/', RoomView.as_view()),
    path('create-room', CreateRoomView.as_view()),  
    path('get-room', GetRoomView.as_view()),
]
