import React from "react";
import { Routes, Route } from "react-router-dom";
import HomePage from "./HomePage";
import RoomJoin from "./RoomJoin";
import CreateRoom from "./CreateRoom";
import Room from "./Room";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/create" element={<CreateRoom />} />
      <Route path="/join" element={<RoomJoin />} />
      <Route path="/room/:roomCode" element={<Room />} />
      <Route path="/room/:roomCode/settings" element={<Room />} />
    </Routes>
  );
};

export default App;