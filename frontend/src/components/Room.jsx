import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CreateRoom from "./CreateRoom";

function Room() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const [voteToSkip, setVoteToSkip] = useState(2);
  const [guestCanPause, setGuestCanPause] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    getRoomDetails();
  }, [roomCode]);

  const getRoomDetails = () => {
    fetch("/api/get-room?code=" + roomCode)
      .then((response) => {
        if (!response.ok) {
          leaveRoom();
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
  };

  const leaveRoom = () => {
    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    };
    fetch("/api/leave-room", requestOptions)
      .then((response) => response.json())
      .then(() => {
        navigate("/");
      });
  };

  // Settings Room view

  if (showSettings) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white px-4">
        <div className="bg-gray-800 rounded-2xl shadow-lg p-10 w-full max-w-md flex flex-col gap-6">
          <h2 className="text-3xl font-bold text-center">Room Settings</h2>
          <CreateRoom
            update={true}
            voteToSkip={voteToSkip}
            guestCanPause={guestCanPause}
            roomCode={roomCode}
            updateCallback={getRoomDetails}
          />
          <button
            onClick={() => setShowSettings(false)}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Main room view

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white px-4">
      <div className="bg-gray-800 rounded-2xl shadow-lg p-10 w-full max-w-md flex flex-col gap-4">
        <h2 className="text-3xl font-bold text-center">
          Room: <span className="text-blue-400">{roomCode}</span>
        </h2>

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

        {/* Shows up only for HOST  */}

        {isHost && (
          <button
            onClick={() => setShowSettings(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
          >
            Settings
          </button>
        )}

        <button
          onClick={leaveRoom}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
        >
          Leave Room
        </button>
      </div>
    </div>
  );
}

export default Room;
