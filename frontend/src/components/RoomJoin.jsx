import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function RoomJoin() {
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleTextFieldChange = (e) => {
    setRoomCode(e.target.value);
    setError("");
  };

  const roomButtonPressed = () => {

    if (roomCode.trim() === "") {
      setError("Please enter a room code.");
      return;
    }

    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: roomCode,
      }),
    };
    fetch("/api/join-room", requestOptions)
      .then((response) => {
        if (response.ok) {
          navigate(`/room/${roomCode}`);
        } else {
          setError("Room not found.");
        }
      })
      .catch((error) => {
        console.log(error);
        setError("Something went wrong. Please try again.");
      });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white px-4">
      <div className="bg-gray-800 rounded-2xl shadow-lg p-10 w-full max-w-md flex flex-col gap-6">
        <h4 className="text-3xl font-bold text-center text-white">
          Join a Room
        </h4>

        <div className="flex flex-col gap-1">
          <input
            type="text"
            placeholder="Enter a Room Code"
            value={roomCode}
            onChange={handleTextFieldChange}
            className={`w-full text-center bg-gray-700 text-white border ${
              error ? "border-red-500" : "border-gray-600"
            } rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        </div>

        <button
          onClick={roomButtonPressed}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
        >
          Join Room
        </button>

        <Link
          to="/create"
          className="w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
        >
          Create Room
        </Link>

        <Link
          to="/"
          className="w-full text-center bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
        >
          Back
        </Link>
      </div>
    </div>
  );
}

export default RoomJoin;
