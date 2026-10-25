import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import ModePicker from "./ModePicker";
import { LISTENING } from "../lib/roomModes";
import { apiFetch } from "../api";

function RoomLobby() {
  const [activeTab, setActiveTab] = useState("join");
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [mode, setMode] = useState(LISTENING);
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
          setJoinError("No room with that code. Check the code and try again.");
        }
      })
      .catch(() => setJoinError("Couldn't reach the server. Check your connection and try again."))
      .finally(() => setJoinLoading(false));
  };

  const handleCreate = (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError("");

    apiFetch("/api/create-room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Create failed");
        const data = await response.json();
        navigate(`/room/${data.code}`);
      })
      .catch(() => setCreateError("Could not create the room. Please try again."))
      .finally(() => setCreateLoading(false));
  };

  const switchTabWithArrows = (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next = activeTab === "join" ? "create" : "join";
    setActiveTab(next);
    document.getElementById(`lobby-tab-${next}`)?.focus();
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      <div
        role="tablist"
        aria-label="Room options"
        onKeyDown={switchTabWithArrows}
        className="flex bg-[#0b0b0b] p-1 rounded-full border border-white/[0.04]"
      >
        <button
          type="button"
          role="tab"
          id="lobby-tab-join"
          aria-selected={activeTab === "join"}
          aria-controls="lobby-panel-join"
          tabIndex={activeTab === "join" ? 0 : -1}
          onClick={() => setActiveTab("join")}
          className={`flex-1 py-2 text-xs font-bold rounded-full transition duration-150 ${
            activeTab === "join"
              ? "bg-brand text-white"
              : "text-[#b3b3b3] hover:text-white"
          }`}
        >
          Join Room
        </button>
        <button
          type="button"
          role="tab"
          id="lobby-tab-create"
          aria-selected={activeTab === "create"}
          aria-controls="lobby-panel-create"
          tabIndex={activeTab === "create" ? 0 : -1}
          onClick={() => setActiveTab("create")}
          className={`flex-1 py-2 text-xs font-bold rounded-full transition duration-150 ${
            activeTab === "create"
              ? "bg-brand text-white"
              : "text-[#b3b3b3] hover:text-white"
          }`}
        >
          Create Room
        </button>
      </div>

      {activeTab === "join" && (
        <form onSubmit={handleJoin} id="lobby-panel-join" role="tabpanel" aria-labelledby="lobby-tab-join" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="join-code" className="text-[11px] uppercase tracking-wider text-[#b3b3b3] font-bold">
              Enter Room Code
            </label>
            <input
              id="join-code"
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              aria-invalid={joinError ? true : undefined}
              aria-describedby={joinError ? "join-code-error" : undefined}
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
              } rounded-lg px-3 py-2 font-mono text-lg tracking-widest text-white placeholder-[#a7a7a7] uppercase transition duration-150`}
            />
            {joinError && (
              <p id="join-code-error" role="alert" className="text-red-400 text-xs text-center font-medium mt-1">
                {joinError}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={joinLoading || !joinCode}
            className="w-full bg-brand hover:bg-brand-hover disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg text-sm transition duration-150"
          >
            {joinLoading ? "Connecting..." : "Join Room"}
          </button>
        </form>
      )}

      {activeTab === "create" && (
        <form onSubmit={handleCreate} id="lobby-panel-create" role="tabpanel" aria-labelledby="lobby-tab-create" className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p id="create-mode-label" className="text-[11px] uppercase tracking-wider text-[#b3b3b3] font-bold mb-0.5">
              Room Mode
            </p>
            <ModePicker value={mode} onChange={setMode} labelledBy="create-mode-label" compact />
          </div>
          <button
            type="submit"
            disabled={createLoading}
            className="w-full bg-brand hover:bg-brand-hover disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg text-sm transition duration-150"
          >
            {createLoading ? "Creating..." : "Create Room"}
          </button>
          {createError && (
            <p role="alert" className="text-red-400 text-xs text-center font-medium">{createError}</p>
          )}
        </form>
      )}
    </div>
  );
}

export default RoomLobby;
