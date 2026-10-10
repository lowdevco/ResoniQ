import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import {
  FaMusic,
  FaBars,
  FaTimes,
  FaSignOutAlt,
  FaCrown,
  FaHeadphones,
  FaCog,
  FaSearch
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
  const [searchInput, setSearchInput] = useState("");
  const [activeSearchQuery, setActiveSearchQuery] = useState("");

  const [isHost, setIsHost] = useState(!roomCode);
  const [guestCanPause, setGuestCanPause] = useState(false);
  const [voteToSkip, setVoteToSkip] = useState(2);
  const [copied, setCopied] = useState(false);

  const { userCount, syncedTrack, syncedTime, syncedIsPlaying, sendMessage } = useRoom(roomCode);

  const isSettingsPage = location.pathname.endsWith("/settings");

  useEffect(() => {
    if (roomCode) {
      getRoomDetails();
    } else {
      setIsHost(true);
    }
  }, [roomCode]);

  const getRoomDetails = () => {
    apiFetch(`/api/get-room?code=${roomCode}`)
      .then((response) => {
        if (!response.ok) leaveRoom();
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
    apiFetch("/api/leave-room", { method: "POST" }).then(() => navigate("/"));
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setActiveSearchQuery(searchInput);
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
                  <p className="text-[10px] uppercase tracking-wider text-[#b3b3b3] font-bold">Votes to Skip</p>
                  <p className="text-sm font-bold text-white mt-0.5">{voteToSkip}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#b3b3b3] font-bold">Guest Controls</p>
                  <p className="text-sm font-bold text-white mt-0.5">{guestCanPause ? "Play & Pause Allowed" : "Host Only"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#b3b3b3] font-bold">Your Role</p>
                  <p className="text-sm font-bold text-brand mt-0.5 flex items-center gap-1.5">
                    {isHost ? <><FaCrown /> Host</> : <><FaHeadphones /> Listener</>}
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
    <div className="flex flex-col h-screen overflow-hidden bg-[#050505] font-sans selection:bg-brand/30 selection:text-white">
      {/* Top Navbar */}
      <nav className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-[#0a0a0a] border-b border-white/[0.05] z-40 shrink-0">
        <div className="flex items-center gap-4 w-1/4">
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
          <Link to="/" className="flex items-center gap-2 group cursor-pointer" onClick={() => { setSearchInput(""); setActiveSearchQuery(""); }}>
            <div className="bg-brand text-white rounded-full p-2 flex items-center justify-center shadow-lg shadow-brand/20 group-hover:scale-105 transition-transform">
              <FaMusic className="text-sm sm:text-base" />
            </div>
            <h1 className="hidden sm:block text-lg sm:text-xl font-bold tracking-tight text-white group-hover:text-brand transition-colors">
              Resoniq
            </h1>
          </Link>
        </div>

        {/* Central Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-lg mx-4 relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#b3b3b3] group-focus-within:text-brand transition-colors">
            <FaSearch />
          </div>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="What do you want to play?"
            className="w-full bg-[#1a1a1a] hover:bg-[#222222] focus:bg-[#222222] border border-white/[0.05] focus:border-brand/50 rounded-full py-3 pl-11 pr-4 text-sm text-white placeholder-[#b3b3b3] focus:outline-none transition-all duration-200 shadow-inner"
          />
        </form>

        <div className="w-1/4 flex justify-end">
          {/* Empty space for future premium/profile buttons */}
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-72 bg-[#0a0a0a] h-full flex flex-col shadow-2xl overflow-y-auto animate-slide-in p-6">
            <div className="flex items-center justify-between border-b border-white/[0.05] pb-4">
              <h2 className="text-white font-bold tracking-wider uppercase text-sm">
                {roomCode ? "Room Settings" : "Menu"}
              </h2>
              <button onClick={() => setMobileMenuOpen(false)} className="text-[#b3b3b3] hover:text-white focus:outline-none">
                <FaTimes className="text-lg" />
              </button>
            </div>
            <div className="flex-1 mt-4">
              {React.cloneElement(renderSidebarContent(), { leftSidebarOpen: true })}
            </div>
            {roomCode && (
              <button
                onClick={leaveRoom}
                className="mt-6 w-full bg-transparent hover:bg-[#e91429]/10 border border-[#e91429] text-[#e91429] hover:text-white font-bold transition-all duration-150 py-3 rounded-full text-sm flex items-center justify-center gap-2 focus:outline-none"
              >
                <FaSignOutAlt /> Leave Room
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 w-full flex gap-2 p-2 pb-[88px] sm:pb-[104px] overflow-hidden min-h-0">
        {/* Left Sidebar */}
        <aside
          className={`hidden lg:flex flex-col justify-between shrink-0 transition-all duration-300 bg-[#0a0a0a] rounded-xl overflow-y-auto overflow-x-hidden ${
            leftSidebarOpen ? "w-72 p-4" : "w-16 py-4 px-2 items-center"
          }`}
        >
          {renderSidebarContent()}
          {roomCode && (
            <button
              onClick={leaveRoom}
              className={`bg-transparent hover:bg-[#e91429]/10 border border-[#e91429] text-[#e91429] hover:text-white font-bold transition-all duration-150 focus:outline-none flex items-center justify-center ${
                leftSidebarOpen ? "w-full py-2.5 rounded-full text-sm gap-2 mt-4" : "w-10 h-10 rounded-full text-lg mt-4"
              }`}
              title="Leave Room"
            >
              <FaSignOutAlt />
              {leftSidebarOpen && <span>Leave Room</span>}
            </button>
          )}
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/15 via-[#0a0a0a] to-[#0a0a0a] rounded-xl overflow-y-auto min-h-0 relative">
          <div className="max-w-[1400px] mx-auto flex flex-col gap-6 p-6">
            {roomCode && isSettingsPage && isHost && (
              <div className="animate-fade-in mb-4">
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
              activeSearchQuery={activeSearchQuery}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
