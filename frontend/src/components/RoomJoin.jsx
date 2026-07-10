import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaSignInAlt } from "react-icons/fa";
import { apiFetch } from "../api";

function RoomJoin() {
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleTextFieldChange = (e) => {
    setRoomCode(e.target.value.toUpperCase());
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
        code: roomCode.trim(),
      }),
    };
    apiFetch("/api/join-room", requestOptions)
      .then((response) => {
        if (response.ok) {
          navigate(`/room/${roomCode.trim()}`);
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
    <div className="min-h-screen bg-[#080808] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-[#121212] border border-white/[0.06] rounded-2xl p-8 flex flex-col gap-6 shadow-xl">
          <div className="text-center">
            <FaSignInAlt className="text-3xl text-brand mx-auto mb-2" />
            <h2 className="text-3xl font-bold text-white tracking-tight">
              Join a Session
            </h2>
            <p className="text-[#b3b3b3] text-sm mt-1">
              Enter a code to connect with listeners
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="Enter Room Code"
              value={roomCode}
              onChange={handleTextFieldChange}
              maxLength={10}
              className={`w-full text-center spotify-input border ${
                error
                  ? "border-red-500 focus:border-red-500"
                  : "border-transparent"
              } rounded-xl px-4 py-3 font-mono text-xl tracking-widest text-white placeholder-slate-600 uppercase focus:outline-none focus:ring-1 focus:ring-slate-500 transition duration-150`}
            />
            {error && (
              <p className="text-red-400 text-xs text-center font-medium mt-1">
                {error}
              </p>
            )}
          </div>

          <button
            onClick={roomButtonPressed}
            className="w-full bg-brand hover:bg-brand-hover text-white font-bold py-3.5 px-4 rounded-full hover:scale-105 active:scale-95 transition duration-150 focus:outline-none"
          >
            Join Room
          </button>

          <div className="flex flex-col gap-2 border-t border-[#282828] pt-4">
            <Link
              to="/create"
              className="w-full text-center bg-transparent hover:bg-white/5 border border-[#535353] hover:border-white text-white font-bold py-2.5 px-4 rounded-full text-sm transition duration-150"
            >
              Create a Session instead
            </Link>
            <Link
              to="/"
              className="w-full text-center text-[#b3b3b3] hover:text-white font-semibold py-2 px-4 rounded-full text-sm transition duration-150"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoomJoin;
