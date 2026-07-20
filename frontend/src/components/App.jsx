import React, { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import HomePage from "./HomePage";
import RoomJoin from "./RoomJoin";
import CreateRoom from "./CreateRoom";
import Room from "./Room";

const BACKEND_URL = process.env.BACKEND_URL || "https://resoniq.onrender.com";

const App = () => {
  const [backendReady, setBackendReady] = useState(false);
  const [loadingError, setLoadingError] = useState(false);

  useEffect(() => {
    const wakeBackend = async () => {
      try {

        // 15-second timeout to  Render cold start

        const response = await fetch(`${BACKEND_URL}/health/`, {
          signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) {
          throw new Error(`Health check failed: ${response.status}`);
        }
        await response.json();
        setBackendReady(true);
      } catch (err) {
        console.error("Wake-up error:", err);
        setLoadingError(true);
      }
    };

    wakeBackend();
  }, []);

  // error State

  if (loadingError) {
    return (
      <div style={{ textAlign: "center", marginTop: "50px" }}>
        <h2> Server is taking too long to wake up.</h2>
        <p>Please refresh or try again in a moment.</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "10px 30px",
            fontSize: "16px",
            marginTop: "10px",
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // loading State 

  if (!backendReady) {
    return (
      <div style={{ textAlign: "center", marginTop: "50px" }}>
        <h2> Waking up the server...</h2>
        <p style={{ color: "#666" }}>
          This might take 15-30 seconds on the first load.
        </p>
        <div className="loader-spinner"></div>
      </div>
    );
  }

  // App Rendering

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