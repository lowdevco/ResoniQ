import React from "react";
import { Routes, Route } from "react-router-dom";
import AppLayout from "./AppLayout";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />} />
      <Route path="/room/:roomCode" element={<AppLayout />} />
    </Routes>
  );
};

export default App;