import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";
import HomePage from "./HomePage";
import RoomJoin from "./RoomJoin";
import CreateRoom from "./CreateRoom";

const App = () => {
  return (
    <>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/create" element={<CreateRoom />} />
          <Route path="/join" element={<RoomJoin />} />
        </Routes>
    </>
  );
};

export default App;

const appDiv = document.getElementById("app");
ReactDOM.createRoot(appDiv).render(<App />);
