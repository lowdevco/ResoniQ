import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaMusic, FaLock, FaUnlock } from "react-icons/fa";
import { apiFetch } from "../api";

function RoomLobby() {
  const [activeTab, setActiveTab] = useState("join");
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [guestCanPause, setGuestCanPause] = useState(false);
  const [voteToSkip, setVoteToSkip] = useState(2);
  const navigate = useNavigate();

  const handleJoin = (e) => {
    e.preventDefault();
    if (!joinCode) return;
    setJoinLoading(true);

    apiFetch("/api/join-room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: joinCode }),
    })
      .then((response) => {
        if (response.ok) {
          navigate(`/room/${joinCode}`);
        } else {
          setJoinError("Room not found");
        }
      })
      .catch(() => setJoinError("Failed to connect"))
      .finally(() => setJoinLoading(false));
  };

  const handleCreate = (e) => {
    e.preventDefault();
    setCreateLoading(true);

    apiFetch("/api/create-room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vote_to_skip: guestCanPause ? 1 : 9999,
        guest_can_pause: guestCanPause,
      }),
    })
      .then((response) => response.json())
      .then((data) => navigate(`/room/${data.code}`))
      .catch(() => console.error("Error creating room"))
      .finally(() => setCreateLoading(false));
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      <div className="flex bg-[#0b0b0b] p-1 rounded-full border border-white/[0.04]">
        <button
          onClick={() => setActiveTab("join")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-full transition duration-150 focus:outline-none ${
            activeTab === "join"
              ? "bg-brand text-white"
              : "text-[#b3b3b3] hover:text-white"
          }`}
        >
          Join Room
        </button>
        <button
          onClick={() => setActiveTab("create")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-full transition duration-150 focus:outline-none ${
            activeTab === "create"
              ? "bg-brand text-white"
              : "text-[#b3b3b3] hover:text-white"
          }`}
        >
          Create Room
        </button>
      </div>

      {activeTab === "join" && (
        <form onSubmit={handleJoin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-wider text-[#b3b3b3] font-bold">
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
                joinError
                  ? "border-red-500 focus:border-red-500"
                  : "border-transparent focus:border-white/10"
              } rounded-lg px-3 py-2 font-mono text-lg tracking-widest text-white placeholder-slate-600 uppercase focus:outline-none transition duration-150`}
            />
            {joinError && (
              <p className="text-red-400 text-[10px] text-center font-medium mt-1">
                {joinError}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={joinLoading || !joinCode}
            className="w-full bg-brand hover:bg-brand-hover disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg text-sm transition duration-150 focus:outline-none"
          >
            {joinLoading ? "Connecting..." : "Join Room"}
          </button>
        </form>
      )}

      {activeTab === "create" && (
        <form onSubmit={handleCreate} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-wider text-[#b3b3b3] font-bold mb-0.5">
              Room Mode
            </label>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setGuestCanPause(true)}
                className={`flex flex-col p-3 rounded-lg border text-center transition duration-150 items-center justify-center focus:outline-none ${
                  guestCanPause
                    ? "bg-brand/10 border-brand"
                    : "bg-[#2a2a2a] border-transparent hover:border-white/10"
                }`}
              >
                <FaUnlock className={`text-base mb-1 ${guestCanPause ? 'text-brand' : 'text-[#b3b3b3]'}`} />
                <span className={`text-[11px] font-bold mb-0.5 ${guestCanPause ? 'text-white' : 'text-[#b3b3b3]'}`}>Open Party</span>
                <span className={`text-[9px] ${guestCanPause ? 'text-brand' : 'text-[#535353]'}`}>Guests can search, play, and skip</span>
              </button>
              <button
                type="button"
                onClick={() => setGuestCanPause(false)}
                className={`flex flex-col p-3 rounded-lg border text-center transition duration-150 items-center justify-center focus:outline-none ${
                  !guestCanPause
                    ? "bg-brand/10 border-brand"
                    : "bg-[#2a2a2a] border-transparent hover:border-white/10"
                }`}
              >
                <FaLock className={`text-base mb-1 ${!guestCanPause ? 'text-brand' : 'text-[#b3b3b3]'}`} />
                <span className={`text-[11px] font-bold mb-0.5 ${!guestCanPause ? 'text-white' : 'text-[#b3b3b3]'}`}>Listening Party</span>
                <span className={`text-[9px] ${!guestCanPause ? 'text-brand' : 'text-[#535353]'}`}>Host-only control. Immersive view.</span>
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={createLoading}
            className="w-full bg-brand hover:bg-brand-hover disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg text-sm transition duration-150 focus:outline-none"
          >
            {createLoading ? "Creating..." : "Create Room"}
          </button>
        </form>
      )}
    </div>
  );
}

export default RoomLobby;
