import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaCrown, FaLock, FaUnlock } from "react-icons/fa";
import { apiFetch } from "../api";

const DEFAULT_VOTE_TO_SKIP = 2;

function CreateRoom({
  update = false,
  voteToSkip = DEFAULT_VOTE_TO_SKIP,
  guestCanPause = true,
  roomCode = null,
  updateCallback = () => {},
}) {
  const [guestCanPauseState, setGuestCanPause] = useState(guestCanPause);
  const [voteToSkipState, setVoteToSkip] = useState(voteToSkip);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();

  const handleVoteChange = (e) => {
    setVoteToSkip(parseInt(e.target.value));
  };

  const handleRoomButtonPressed = () => {
    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vote_to_skip: guestCanPauseState ? 1 : 9999,
        guest_can_pause: guestCanPauseState,
      }),
    };
    apiFetch("/api/create-room", requestOptions)
      .then((response) => response.json())
      .then((data) => {
        navigate(`/room/${data.code}`);
      })
      .catch((err) => console.error("Error creating room:", err));
  };

  const handleUpdateButtonPressed = () => {
    const requestOptions = {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vote_to_skip: guestCanPauseState ? 1 : 9999,
        guest_can_pause: guestCanPauseState,
        code: roomCode,
      }),
    };
    apiFetch("/api/update-room", requestOptions).then((response) => {
      if (response.ok) {
        setSuccessMsg("Room updated successfully!");
        setErrorMsg("");
        updateCallback();
      } else {
        setErrorMsg("Failed to update room.");
        setSuccessMsg("");
      }
    });
  };

  const content = (
    <div
      className={`flex flex-col gap-6 w-full ${update ? "" : "bg-[#181818] border border-[#282828] rounded-2xl p-8 max-w-md"}`}
    >
      <div className="text-center">
        {!update && <FaCrown className="text-3xl text-brand mx-auto mb-2" />}
        <h2 className="text-3xl font-bold text-white tracking-tight">
          {update ? "Session Settings" : "Host a Session"}
        </h2>
        {!update && (
          <p className="text-[#b3b3b3] text-sm mt-1">
            Configure room permissions and controls
          </p>
        )}
      </div>

      {successMsg && (
        <p className="text-green-400 text-xs text-center font-medium bg-green-500/10 border border-green-500/20 py-2.5 px-4 rounded-xl">
          {successMsg}
        </p>
      )}
      {errorMsg && (
        <p className="text-red-400 text-xs text-center font-medium bg-red-500/10 border border-red-500/20 py-2.5 px-4 rounded-xl">
          {errorMsg}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-xs uppercase tracking-wider text-[#b3b3b3] font-bold mb-1">
          Room Mode
        </label>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setGuestCanPause(true)}
            className={`flex flex-col p-4 rounded-xl border text-center transition duration-150 items-center justify-center focus:outline-none ${
              guestCanPauseState
                ? "bg-brand/10 border-brand"
                : "bg-[#2a2a2a] border-transparent hover:border-white/10"
            }`}
          >
            <FaUnlock className={`text-xl mb-2 ${guestCanPauseState ? 'text-brand' : 'text-[#b3b3b3]'}`} />
            <span className={`text-sm font-bold mb-1 ${guestCanPauseState ? 'text-white' : 'text-[#b3b3b3]'}`}>Open Party</span>
            <span className={`text-xs ${guestCanPauseState ? 'text-brand' : 'text-[#535353]'}`}>Guests can search, play, pause, and skip songs</span>
          </button>

          <button
            type="button"
            onClick={() => setGuestCanPause(false)}
            className={`flex flex-col p-4 rounded-xl border text-center transition duration-150 items-center justify-center focus:outline-none ${
              !guestCanPauseState
                ? "bg-brand/10 border-brand"
                : "bg-[#2a2a2a] border-transparent hover:border-white/10"
            }`}
          >
            <FaLock className={`text-xl mb-2 ${!guestCanPauseState ? 'text-brand' : 'text-[#b3b3b3]'}`} />
            <span className={`text-sm font-bold mb-1 ${!guestCanPauseState ? 'text-white' : 'text-[#b3b3b3]'}`}>Listening Party (Host Only)</span>
            <span className={`text-xs ${!guestCanPauseState ? 'text-brand' : 'text-[#535353]'}`}>Only you control music. Guests get an immersive Now Playing view</span>
          </button>
        </div>
      </div>

      <button
        onClick={update ? handleUpdateButtonPressed : handleRoomButtonPressed}
        className="w-full bg-brand hover:bg-brand-hover text-white font-bold py-3.5 px-4 rounded-full hover:scale-105 active:scale-95 transition duration-150 focus:outline-none"
      >
        {update ? "Save Settings" : "Create Room"}
      </button>

      {!update && (
        <div className="flex flex-col gap-2 border-t border-[#282828] pt-4">
          <Link
            to="/join"
            className="w-full text-center bg-transparent hover:bg-white/5 border border-[#535353] hover:border-white text-white font-bold py-2.5 px-4 rounded-full text-sm transition duration-150"
          >
            Join a Session instead
          </Link>
          <Link
            to="/"
            className="w-full text-center text-[#b3b3b3] hover:text-white font-semibold py-2 px-4 rounded-full text-sm transition duration-150"
          >
            Back to Home
          </Link>
        </div>
      )}
    </div>
  );

  if (update) {
    return content;
  }

  return (
    <div className="relative min-h-screen bg-[#121212] text-white flex items-center justify-center p-6 overflow-hidden">
      <div className="relative z-10 w-full flex justify-center">{content}</div>
    </div>
  );
}

export default CreateRoom;
