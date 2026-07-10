import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaMusic, FaUsers, FaCrown, FaLock, FaUnlock } from "react-icons/fa";
import { apiFetch } from "../api";

function HomePage() {
  const [roomCode, setRoomCode] = useState(null);
  const [activeTab, setActiveTab] = useState("join");
  const navigate = useNavigate();

  // Join States
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);

  // Create States
  const [guestCanPause, setGuestCanPause] = useState(true);
  const [voteToSkip, setVoteToSkip] = useState(2);
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    apiFetch("/api/user-in-room")
      .then((response) => response.json())
      .then((data) => {
        if (data.code) {
          setRoomCode(data.code);
          navigate(`/room/${data.code}`);
        }
      })
      .catch((err) => console.log("Session lookup failed:", err));
  }, [navigate]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setJoinError("Enter a room code");
      return;
    }
    setJoinLoading(true);
    setJoinError("");

    apiFetch("/api/join-room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: joinCode.trim() }),
    })
      .then((response) => {
        if (response.ok) {
          navigate(`/room/${joinCode.trim()}`);
        } else {
          setJoinError("Room not found");
        }
      })
      .catch(() => setJoinError("Connection error"))
      .finally(() => setJoinLoading(false));
  };

  const handleCreate = (e) => {
    e.preventDefault();
    setCreateLoading(true);

    apiFetch("/api/create-room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vote_to_skip: voteToSkip,
        guest_can_pause: guestCanPause,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        navigate(`/room/${data.code}`);
      })
      .catch(() => console.error("Error creating room"))
      .finally(() => setCreateLoading(false));
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col justify-between p-6 md:p-12 overflow-y-auto">
      {/* Top spacing / invisible helper */}
      <div className="hidden md:block"></div>

      {/* Main Centered Content */}
      <div className="w-full max-w-md mx-auto flex flex-col items-center gap-8 py-8">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="bg-brand text-white rounded-full p-3 flex items-center justify-center shadow-lg shadow-brand/10 animate-pulse-slow">
            <FaMusic className="text-2xl" />
          </div>
          <div className="flex flex-col gap-1 mt-1">
            <h1 className="text-4xl font-extrabold tracking-tight text-white">
              Resoniq
            </h1>
            <p className="text-[#a7a7a7] text-xs uppercase tracking-widest font-semibold">
              Co-listening In Sync
            </p>
          </div>
        </div>

        {/* Centered Tabbed Form Box */}
        <div className="bg-[#121212] border border-white/[0.06] rounded-2xl p-8 flex flex-col gap-6 shadow-2xl w-full">
          
          {/* Tab switch buttons */}
          <div className="flex bg-[#0b0b0b] p-1 rounded-full border border-white/[0.04]">
            <button
              onClick={() => setActiveTab("join")}
              className={`flex-1 py-2 text-sm font-bold rounded-full transition duration-150 focus:outline-none ${
                activeTab === "join"
                  ? "bg-brand text-white"
                  : "text-[#b3b3b3] hover:text-white"
              }`}
            >
              Join Room
            </button>
            <button
              onClick={() => setActiveTab("create")}
              className={`flex-1 py-2 text-sm font-bold rounded-full transition duration-150 focus:outline-none ${
                activeTab === "create"
                  ? "bg-brand text-white"
                  : "text-[#b3b3b3] hover:text-white"
              }`}
            >
              Create Room
            </button>
          </div>

          {/* Tab: Join Room */}
          {activeTab === "join" && (
            <form onSubmit={handleJoin} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-wider text-[#b3b3b3] font-bold">
                  Enter Room Code
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => {
                    setJoinCode(e.target.value.toUpperCase());
                    setJoinError("");
                  }}
                  placeholder="e.g. AB12CD"
                  maxLength={10}
                  className={`w-full text-center bg-[#2a2a2a] border ${
                    joinError ? "border-red-500 focus:border-red-500" : "border-transparent focus:border-white/10"
                  } rounded-xl px-4 py-3 font-mono text-xl tracking-widest text-white placeholder-slate-600 uppercase focus:outline-none transition duration-150`}
                />
                {joinError && (
                  <p className="text-red-400 text-xs text-center font-medium mt-1">
                    {joinError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={joinLoading}
                className="w-full bg-brand hover:bg-brand-hover disabled:opacity-50 disabled:hover:bg-brand disabled:cursor-not-allowed text-white font-bold py-3.5 px-4 rounded-full hover:scale-[1.02] active:scale-[0.98] transition duration-150 focus:outline-none"
              >
                {joinLoading ? "Connecting..." : "Join Room"}
              </button>
            </form>
          )}

          {/* Tab: Create Room */}
          {activeTab === "create" && (
            <form onSubmit={handleCreate} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-wider text-[#b3b3b3] font-bold mb-1">
                  Guest Playback Control
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setGuestCanPause(true)}
                    className={`flex flex-col p-3 rounded-xl border text-center transition duration-150 items-center justify-center focus:outline-none ${
                      guestCanPause
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
                      !guestCanPause
                        ? "bg-brand/10 border-brand text-white"
                        : "bg-[#2a2a2a] border-transparent text-[#b3b3b3] hover:border-white/10"
                    }`}
                  >
                    <FaLock className="text-lg mb-1" />
                    <span className="text-xs font-bold">Host Only</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs uppercase tracking-wider text-[#b3b3b3] font-bold">
                    Votes to Skip
                  </label>
                  <span className="bg-[#0b0b0b] px-2.5 py-0.5 rounded text-sm font-bold text-brand border border-white/[0.04]">
                    {voteToSkip}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={voteToSkip}
                  onChange={(e) => setVoteToSkip(parseInt(e.target.value))}
                  className="w-full h-1 bg-[#535353] rounded-lg appearance-none cursor-pointer accent-brand"
                />
                <span className="text-[10px] text-[#b3b3b3] text-center">
                  Number of user votes required to skip the active song
                </span>
              </div>

              <button
                type="submit"
                disabled={createLoading}
                className="w-full bg-brand hover:bg-brand-hover disabled:opacity-50 disabled:hover:bg-brand disabled:cursor-not-allowed text-white font-bold py-3.5 px-4 rounded-full hover:scale-[1.02] active:scale-[0.98] transition duration-150 focus:outline-none"
              >
                {createLoading ? "Creating..." : "Create Room"}
              </button>
            </form>
          )}
          
        </div>
      </div>

      {/* Footer System Features */}
      <footer className="text-center py-4 flex items-center justify-center gap-4 text-[10px] uppercase tracking-wider text-[#737373] font-bold select-none">
        <span>Real-Time Sync</span>
        <span className="text-white/10">•</span>
        <span>Host Control</span>
        <span className="text-white/10">•</span>
        <span>Synced Rooms</span>
      </footer>
    </div>
  );
}

export default HomePage;
