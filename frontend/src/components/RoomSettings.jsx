import React, { useState } from "react";
import ModePicker from "./ModePicker";
import { apiFetch } from "../api";

function RoomSettings({ roomCode, mode, onSaved }) {
  const [selectedMode, setSelectedMode] = useState(mode);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const save = () => {
    setSaving(true);
    setErrorMsg("");
    apiFetch("/api/update-room", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: roomCode, mode: selectedMode }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("Update failed");
        return response.json();
      })
      .then((data) => onSaved(data.mode))
      .catch(() => setErrorMsg("Couldn't save the room mode. Try again."))
      .finally(() => setSaving(false));
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      <h2 className="text-3xl font-bold text-white tracking-tight text-center">Session Settings</h2>

      {errorMsg && (
        <p role="alert" className="text-red-400 text-xs text-center font-medium bg-red-500/10 border border-red-500/20 py-2.5 px-4 rounded-xl">
          {errorMsg}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <p id="settings-mode-label" className="text-xs uppercase tracking-wider text-[#b3b3b3] font-bold mb-1">
          Room Mode
        </p>
        <ModePicker value={selectedMode} onChange={setSelectedMode} labelledBy="settings-mode-label" />
      </div>

      <button
        onClick={save}
        disabled={saving || selectedMode === mode}
        className="w-full bg-brand hover:bg-brand-hover disabled:opacity-50 disabled:hover:scale-100 text-white font-bold py-3.5 px-4 rounded-full hover:scale-105 active:scale-95 transition duration-150"
      >
        {saving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  );
}

export default RoomSettings;
