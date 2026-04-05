import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

function HomePage() {
  const [roomCode, setRoomCode] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/user-in-room")
      .then((response) => response.json())
      .then((data) => {
        if (data.code) {
          setRoomCode(data.code);
          navigate(`/room/${data.code}`);
        }
      });
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white px-4">
      <div className="flex flex-col items-center gap-8">
        <h1 className="text-6xl font-bold tracking-tight text-white">
          Resoniq
        </h1>
        <p className="text-gray-400 text-lg text-center">
          Listen to music together, in real time.
        </p>

        <div className="flex gap-4">
          <Link
            to="/join"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition duration-200"
          >
            Join a Room
          </Link>
          <Link
            to="/create"
            className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-8 rounded-lg transition duration-200"
          >
            Create a Room
          </Link>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
