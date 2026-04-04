import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

function Room() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const [voteToSkip, setVoteToSkip] = useState(2);
  const [guestCanPause, setGuestCanPause] = useState(false);
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    fetch("/api/get-room?code=" + roomCode)
      .then((response) => {
        if (!response.ok) {
          navigate("/");
          return;
        }
        return response.json();
      })
      .then((data) => {
        if (data) {
          setVoteToSkip(data.vote_to_skip);
          setGuestCanPause(data.guest_can_pause);
          setIsHost(data.is_host);
        }
      });
  }, [roomCode]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="bg-gray-800 rounded-2xl shadow-lg p-10 w-full max-w-md flex flex-col gap-4">
        <h2 className="text-3xl font-bold text-center">Room: {roomCode}</h2>
        <div className="bg-gray-700 rounded-lg p-4 flex flex-col gap-3">
          <p className="text-gray-300">
            Votes to Skip:{" "}
            <span className="text-white font-semibold">{voteToSkip}</span>
          </p>
          <p className="text-gray-300">
            Guest Can Pause:{" "}
            <span className="text-white font-semibold">
              {guestCanPause.toString()}
            </span>
          </p>
          <p className="text-gray-300">
            Host:{" "}
            <span className="text-white font-semibold">
              {isHost.toString()}
            </span>
          </p>
        </div>
        <button
          onClick={() => navigate("/")}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
        >
          Leave Room
        </button>
      </div>
    </div>
  );
}

export default Room;
