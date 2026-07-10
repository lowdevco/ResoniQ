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
        vote_to_skip: voteToSkipState,
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
        vote_to_skip: voteToSkipState,
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
    <div className={`flex flex-col gap-6 w-full ${update ? "" : "bg-[#181818] border border-[#282828] rounded-2xl p-8 max-w-md"}`}>
      <div className="text-center">
        {!update && <FaCrown className="text-3xl text-brand mx-auto mb-2" />}
        <h2 className="text-3xl font-bold text-white tracking-tight">
          {update ? "Session Settings" : "Host a Session"}
        </h2>
        {!update && <p className="text-[#b3b3b3] text-sm mt-1">Configure room permissions and controls</p>}
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

      {/* Guest Playback Permissions Toggle Buttons */}
      <div className="flex flex-col gap-2">
        <label className="text-xs uppercase tracking-wider text-[#b3b3b3] font-bold mb-1">
          Guest Playback Control
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setGuestCanPause(true)}
            className={`flex flex-col p-3 rounded-xl border text-center transition duration-150 items-center justify-center focus:outline-none ${
              guestCanPauseState
                ? "bg-brand/10 border-brand text-white"
                : "bg-[#2a2a2a] border-transparent text-[#b3b3b3] hover:border-white/10"
            }`}
          >
            <FaUnlock className="text-lg mb-1" />
            <span className="text-xs font-bold">Play / Pause</span>
          </button>

          <button
            type="button"
            onClick={() => setGuestCanPause(false)}
            className={`flex flex-col p-3 rounded-xl border text-center transition duration-150 items-center justify-center focus:outline-none ${
              !guestCanPauseState
                ? "bg-brand/10 border-brand text-white"
                : "bg-[#2a2a2a] border-transparent text-[#b3b3b3] hover:border-white/10"
            }`}
          >
            <FaLock className="text-lg mb-1" />
            <span className="text-xs font-bold">Host Only</span>
          </button>
        </div>
      </div>

      {/* Votes to Skip Slider */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <label className="text-xs uppercase tracking-wider text-[#b3b3b3] font-bold">
            Votes to Skip
          </label>
          <span className="bg-[#121212] px-2.5 py-0.5 rounded text-sm font-bold text-brand border border-[#282828]">
            {voteToSkipState}
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="10"
          value={voteToSkipState}
          onChange={handleVoteChange}
          className="w-full h-1 bg-[#535353] rounded-lg appearance-none cursor-pointer accent-brand"
        />
        <span className="text-[10px] text-[#b3b3b3] text-center">
          Number of user votes required to skip the active song
        </span>
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
      <div className="relative z-10 w-full flex justify-center">
        {content}
      </div>
    </div>
  );
}

export default CreateRoom;
