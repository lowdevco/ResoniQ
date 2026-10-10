import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import {
  FaMusic,
  FaBars,
  FaTimes,
  FaSignOutAlt,
  FaCrown,
  FaHeadphones,
  FaUserFriends,
  FaCog
} from "react-icons/fa";
import YoutubeMusicSearch from "./YoutubeMusicSearch";
import CreateRoom from "./CreateRoom";
import RoomLobby from "./RoomLobby";
import useRoom from "./Hook/UseRoom";
import { apiFetch } from "../api";

function AppLayout() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [isHost, setIsHost] = useState(!roomCode); // True by default in solo mode
  const [guestCanPause, setGuestCanPause] = useState(false);
  const [voteToSkip, setVoteToSkip] = useState(2);
  const [copied, setCopied] = useState(false);

  const { userCount, syncedTrack, syncedTime, syncedIsPlaying, sendMessage } = useRoom(roomCode);

  const isSettingsPage = location.pathname.endsWith("/settings");

  useEffect(() => {
    if (roomCode) {
      getRoomDetails();
    } else {
      setIsHost(true); // Always host in solo mode
    }
  }, [roomCode]);

  const getRoomDetails = () => {
    apiFetch(`/api/get-room?code=${roomCode}`)
      .then((response) => {
        if (!response.ok) {
          leaveRoom();
        }
        return response.json();
      })
      .then((data) => {
        setGuestCanPause(data.guest_can_pause);
        setVoteToSkip(data.votes_to_skip);
        setIsHost(data.is_host);
      })
      .catch((err) => console.log(err));
  };

  const leaveRoom = () => {
    if (!roomCode) return;
    
    apiFetch("/api/leave-room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }).then(() => {
      navigate("/");
    });
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderSidebarContent = () => {
    if (!roomCode) {
      return (
        <div className="flex flex-col gap-6 w-full mt-4">
          {leftSidebarOpen && <RoomLobby />}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6 w-full">
        {leftSidebarOpen && (
          <>
            <div
              onClick={copyRoomCode}
              className="bg-black/30 hover:bg-black/50 border border-white/[0.04] hover:border-brand/30 rounded-xl p-5 cursor-pointer transition duration-200 relative group select-none flex flex-col items-center gap-1 mt-4"
              title="Click to copy room code"
            >
              <span className="text-[10px] uppercase tracking-wider text-[#b3b3b3] font-bold">
                Room Code
              </span>
              <p className="text-3xl font-mono font-bold text-brand mt-1 tracking-widest group-hover:scale-105 transition-transform duration-200">
                {roomCode}
              </p>
              <p className="text-[9px] text-[#a7a7a7] mt-1 transition-all opacity-60 group-hover:opacity-100">
                {copied ? "Copied to clipboard" : "Click to copy code"}
              </p>
            </div>

            <div className="bg-black/30 border border-white/[0.04] rounded-xl p-5 flex flex-col items-center gap-1 select-none text-center">
              <span className="text-[10px] uppercase tracking-wider text-[#b3b3b3] font-bold">
                Active Listeners
              </span>
              <div className="flex items-center justify-center gap-3 mt-1">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand"></span>
                </span>
                <p className="text-3xl font-bold text-white leading-none">
                  {userCount}
                </p>
              </div>
            </div>

            <div className="bg-black/30 border border-white/[0.04] rounded-xl p-5 flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-[#282828] pb-2">
                <h3 className="font-bold text-xs uppercase tracking-wider text-brand">
                  Session Rules
                </h3>
                {isHost && (
                  <Link
                    to={isSettingsPage ? `/room/${roomCode}` : `/room/${roomCode}/settings`}
                    className="text-[#b3b3b3] hover:text-white transition"
                  >
                    <FaCog />
                  </Link>
                )}
              </div>
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#b3b3b3] font-bold">
                    Votes to Skip
                  </p>
                  <p className="text-sm font-bold text-white mt-0.5">
                    {voteToSkip}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#b3b3b3] font-bold">
                    Guest Controls
                  </p>
                  <p className="text-sm font-bold text-white mt-0.5">
                    {guestCanPause ? "Play & Pause Allowed" : "Host Only"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#b3b3b3] font-bold">
                    Your Role
                  </p>
                  <p className="text-sm font-bold text-brand mt-0.5 flex items-center gap-1.5">
                    {isHost ? (
                      <>
                        <FaCrown /> Host
                      </>
                    ) : (
                      <>
                        <FaHeadphones /> Listener
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#080808] font-sans selection:bg-brand/30 selection:text-white">
      {/* Top Navbar */}
      <nav className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-black border-b border-white/[0.05] z-40 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
            className="hidden lg:block text-[#b3b3b3] hover:text-white transition duration-200 focus:outline-none"
          >
            <FaBars className="text-xl" />
          </button>
          
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden text-[#b3b3b3] hover:text-white transition duration-200 focus:outline-none"
          >
            <FaBars className="text-xl" />
          </button>

          <Link to="/" className="flex items-center gap-2 group cursor-pointer">
            <div className="bg-brand text-white rounded-full p-2 flex items-center justify-center shadow-lg shadow-brand/20 group-hover:scale-105 transition-transform">
              <FaMusic className="text-sm sm:text-base" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white group-hover:text-brand transition-colors">
              Resoniq
            </h1>
          </Link>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 bg-[#121212] h-full flex flex-col shadow-2xl overflow-y-auto animate-slide-in p-6">
            <div className="flex items-center justify-between border-b border-white/[0.05] pb-4">
              <h2 className="text-white font-bold tracking-wider uppercase text-sm">
                {roomCode ? "Room Settings" : "Menu"}
              </h2>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-[#b3b3b3] hover:text-white focus:outline-none"
              >
                <FaTimes className="text-lg" />
              </button>
            </div>
            
            <div className="flex-1 mt-4">
              {/* Force leftSidebarOpen to true for mobile rendering */}
              {React.cloneElement(renderSidebarContent(), { leftSidebarOpen: true })}
            </div>

            {roomCode && (
              <button
                onClick={leaveRoom}
                className="mt-6 w-full bg-transparent hover:bg-[#e91429]/10 border border-[#e91429] text-[#e91429] hover:text-white font-bold transition-all duration-150 py-3 rounded-full text-sm flex items-center justify-center gap-2 focus:outline-none"
              >
                <FaSignOutAlt />
                Leave Room
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 w-full flex gap-2 p-2 pb-[88px] sm:pb-[104px] overflow-hidden min-h-0">
        {/* Left Sidebar */}
        <aside
          className={`hidden lg:flex flex-col justify-between shrink-0 transition-all duration-300 bg-[#121212] border border-white/[0.04] rounded-xl overflow-y-auto overflow-x-hidden ${
            leftSidebarOpen ? "w-72 p-4" : "w-16 py-4 px-2 items-center"
          }`}
        >
          {renderSidebarContent()}

          {roomCode && (
            <button
              onClick={leaveRoom}
              className={`bg-transparent hover:bg-[#e91429]/10 border border-[#e91429] text-[#e91429] hover:text-white font-bold transition-all duration-150 focus:outline-none flex items-center justify-center ${
                leftSidebarOpen
                  ? "w-full py-2.5 rounded-full text-sm gap-2 mt-4"
                  : "w-10 h-10 rounded-full text-lg mt-4"
              }`}
              title="Leave Room"
            >
              <FaSignOutAlt />
              {leftSidebarOpen && <span>Leave Room</span>}
            </button>
          )}
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 bg-[#121212] border border-white/[0.04] rounded-xl overflow-y-auto px-6 pb-6 min-h-0 relative">
          <div className="max-w-5xl mx-auto flex flex-col gap-6">
            {roomCode && isSettingsPage && isHost && (
              <div className="animate-fade-in pt-6">
                <CreateRoom
                  update={true}
                  voteToSkip={voteToSkip}
                  guestCanPause={guestCanPause}
                  roomCode={roomCode}
                  updateCallback={getRoomDetails}
                />
              </div>
            )}

            <YoutubeMusicSearch
              sendMessage={sendMessage}
              syncedTrack={syncedTrack}
              syncedTime={syncedTime}
              syncedIsPlaying={syncedIsPlaying}
              isHost={isHost}
              guestCanPause={guestCanPause}
              inRoom={!!roomCode}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
