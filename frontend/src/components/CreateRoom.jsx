import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

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
    setVoteToSkip(e.target.value);
  };

  const handleGuestCanPauseChange = (e) => {
    setGuestCanPause(e.target.value === "true");
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
    fetch("/api/create-room", requestOptions)
      .then((response) => response.json())
      .then((data) => {
        navigate(`/room/${data.code}`);
      });
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
    fetch("/api/update-room", requestOptions).then((response) => {
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

  return (
    <div
      className={`flex flex-col items-center gap-6 w-full ${!update ? "justify-center min-h-screen bg-gray-900 px-4" : ""}`}
    >
      <div className="bg-gray-800 rounded-2xl shadow-lg p-10 w-full max-w-md flex flex-col gap-6">
        <h4 className="text-3xl font-bold text-center text-white">
          {update ? "Update Room" : "Create A Room"}
        </h4>

        {successMsg && (
          <p className="text-green-400 text-sm text-center">{successMsg}</p>
        )}
        {errorMsg && (
          <p className="text-red-400 text-sm text-center">{errorMsg}</p>
        )}

        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-gray-400 text-center">
            Guest Control of Playback State
          </p>
          <div className="flex gap-6">
            <label className="flex flex-col items-center gap-1 cursor-pointer">
              <input
                type="radio"
                name="guestCanPause"
                value="true"
                defaultChecked={guestCanPauseState}
                onChange={handleGuestCanPauseChange}
                className="accent-blue-500 w-4 h-4"
              />
              <span className="text-sm text-gray-300">Play/Pause</span>
            </label>
            <label className="flex flex-col items-center gap-1 cursor-pointer">
              <input
                type="radio"
                name="guestCanPause"
                value="false"
                defaultChecked={!guestCanPauseState}
                onChange={handleGuestCanPauseChange}
                className="accent-red-500 w-4 h-4"
              />
              <span className="text-sm text-gray-300">No Control</span>
            </label>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <input
            type="number"
            min="1"
            defaultValue={voteToSkipState}
            onChange={handleVoteChange}
            className="w-24 text-center bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-sm text-gray-400 text-center">
            Votes Required To Skip Song
          </p>
        </div>

        <button
          onClick={update ? handleUpdateButtonPressed : handleRoomButtonPressed}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
        >
          {update ? "Update Room" : "Create A Room"}
        </button>

        {/* Back Button shows up for Host  */}

        {!update && (
          <Link
            to="/"
            className="w-full text-center bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
          >
            Back
          </Link>
        )}
      </div>
    </div>
  );
}

export default CreateRoom;
