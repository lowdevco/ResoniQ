import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CreateRoom from "./CreateRoom";
import MusicSearch from "./MusicSearch";
import useRoom from "./Hook/UseRoom.js";

function Room() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const [voteToSkip, setVoteToSkip] = useState(2);
  const [guestCanPause, setGuestCanPause] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const { userCount, syncedTrack, syncedTime, syncedIsPlaying, sendMessage } =
    useRoom(roomCode);

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
      .then(() => navigate("/"));
  };

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

  return (
    <div className="min-h-screen bg-gray-900 text-white px-4 py-10">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        {/* Room Info Card */}
        <div className="bg-gray-800 rounded-2xl shadow-lg p-8 flex flex-col gap-4">
          {/* Room header with user count */}
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold">
              Room: <span className="text-blue-400">{roomCode}</span>
            </h2>

            {/*   user count */}
            <div className="flex items-center gap-2 bg-gray-700 px-4 py-2 rounded-full">
              <span className="text-green-400 text-lg">👥</span>
              <span className="text-white font-semibold">{userCount}</span>
              <span className="text-gray-400 text-sm">
                {userCount === 1 ? "listener" : "listeners"}
              </span>
            </div>
          </div>

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

          <div className="flex gap-3">
            {isHost && (
              <button
                onClick={() => setShowSettings(true)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
              >
                Settings
              </button>
            )}
            <button
              onClick={leaveRoom}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
            >
              Leave Room
            </button>
          </div>
        </div>

        {/* Music Search with WebSocket syncing */}
        <div className="bg-gray-800 rounded-2xl shadow-lg p-6 w-full">
          <h3 className="text-white font-bold text-xl mb-4">🎵 Search Music</h3>
          <MusicSearch
            sendMessage={sendMessage}
            syncedTrack={syncedTrack}
            syncedTime={syncedTime}
            syncedIsPlaying={syncedIsPlaying}
            isHost={isHost}
            guestCanPause={guestCanPause}
          />
        </div>
      </div>
    </div>
  );
}

export default Room;
