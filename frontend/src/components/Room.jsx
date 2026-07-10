import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { FaMusic, FaUsers, FaCrown, FaHeadphones, FaSearch, FaTimes, FaBars, FaSignOutAlt, FaCog } from "react-icons/fa";
import CreateRoom from "./CreateRoom";
import YoutubeMusicSearch from "./YoutubeMusicSearch.jsx";
import useRoom from "./Hook/UseRoom.js";
import { apiFetch } from "../api";

function Room() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [voteToSkip, setVoteToSkip] = useState(2);
  const [guestCanPause, setGuestCanPause] = useState(false);
  const [isHost, setIsHost] = useState(false);

  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { userCount, syncedTrack, syncedTime, syncedIsPlaying, sendMessage } =
    useRoom(roomCode);

  const isSettingsPage = location.pathname.endsWith("/settings");

  useEffect(() => {
    getRoomDetails();
  }, [roomCode]);

  const getRoomDetails = () => {
    apiFetch("/api/get-room?code=" + roomCode)
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

          // Authorization Guard: redirect listeners away from settings page back to room view
          if (isSettingsPage && !data.is_host) {
            navigate(`/room/${roomCode}`);
          }
        }
      });
  };

  const leaveRoom = () => {
    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    };
    apiFetch("/api/leave-room", requestOptions)
      .then((response) => response.json())
      .then(() => navigate("/"));
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-screen w-screen bg-[#080808] text-white flex flex-col overflow-hidden">
      
      {/* Header */}
      <header className="bg-[#080808] px-6 py-3 flex items-center justify-between shrink-0 z-40">
        {/* Left: Mobile hamburger drawer toggle & Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (window.innerWidth >= 1024) {
                setLeftSidebarOpen(!leftSidebarOpen);
              } else {
                setLeftDrawerOpen(true);
              }
            }}
            className="text-[#b3b3b3] hover:text-white p-2 rounded-full hover:bg-white/5 transition duration-150 text-xl focus:outline-none flex items-center justify-center"
            title={leftSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            <FaBars />
          </button>
          <div className="flex items-center gap-3">
            <div className="bg-brand text-white rounded-full p-2 flex items-center justify-center">
              <FaMusic className="text-lg" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white hidden sm:block">
              Resoniq
            </h1>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {isHost && (
            <button
              onClick={() => navigate(isSettingsPage ? `/room/${roomCode}` : `/room/${roomCode}/settings`)}
              className="text-[#b3b3b3] hover:text-white p-2 rounded-full hover:bg-white/5 transition duration-150 text-xl focus:outline-none flex items-center justify-center"
              title={isSettingsPage ? "Back to Room" : "Session Settings"}
            >
              {isSettingsPage ? <FaTimes /> : <FaCog />}
            </button>
          )}
          
          {/* Mobile Right drawer stats toggle */}
          <button
            onClick={() => setRightDrawerOpen(true)}
            className="lg:hidden text-[#b3b3b3] hover:text-white p-2 rounded-full hover:bg-white/5 transition duration-150 text-xl focus:outline-none flex items-center justify-center"
            title="View Stats"
          >
            <FaUsers />
          </button>
        </div>
      </header>

      {/* Mobile Slide-out Left Drawer (Rules & Navigation) */}
      {leftDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div onClick={() => setLeftDrawerOpen(false)} className="fixed inset-0 bg-black/70"></div>
          
          {/* Drawer Content */}
          <div className="relative w-64 max-w-[80vw] bg-[#181818] border-r border-[#282828] h-full p-6 flex flex-col justify-between shadow-2xl animate-slide-right">
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <span className="text-[#b3b3b3] text-xs font-bold uppercase tracking-wider">Navigation</span>
                <button onClick={() => setLeftDrawerOpen(false)} className="text-[#b3b3b3] hover:text-white focus:outline-none">
                  <FaTimes className="text-lg" />
                </button>
              </div>
              
              {/* Rules info */}
              <div className="flex flex-col gap-4">
                <h3 className="font-bold text-xs uppercase tracking-wider text-brand border-b border-[#282828] pb-1">
                  Session Rules
                </h3>
                <div className="flex flex-col gap-3">
                  <div>
                    <p className="text-[10px] text-[#b3b3b3] font-bold uppercase tracking-wider">Votes to Skip</p>
                    <p className="text-sm font-bold mt-0.5">{voteToSkip}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#b3b3b3] font-bold uppercase tracking-wider">Guest Controls</p>
                    <p className="text-sm font-bold mt-0.5">
                      {guestCanPause ? "Play & Pause Allowed" : "Host Controlled Only"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#b3b3b3] font-bold uppercase tracking-wider">Your Role</p>
                    <p className="text-sm font-bold text-brand mt-0.5 flex items-center gap-1.5">
                      {isHost ? <><FaCrown /> Host</> : <><FaHeadphones /> Listener</>}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Leave Room Button */}
            <button
              onClick={leaveRoom}
              className="w-full bg-transparent hover:bg-[#e91429]/10 border border-[#e91429] text-[#e91429] hover:text-white font-bold py-2.5 rounded-full transition duration-150 text-sm focus:outline-none flex items-center justify-center gap-2"
            >
              <FaSignOutAlt /> Leave Room
            </button>
          </div>
        </div>
      )}

      {/* Mobile Slide-out Right Drawer (Room Info & Stats) */}
      {rightDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
          {/* Backdrop */}
          <div onClick={() => setRightDrawerOpen(false)} className="fixed inset-0 bg-black/70"></div>
          
          {/* Drawer Content */}
          <div className="relative w-64 max-w-[80vw] bg-[#121212] border-l border-white/[0.04] h-full p-6 flex flex-col gap-6 shadow-2xl animate-slide-left">
            <div className="flex items-center justify-between">
              <span className="text-[#b3b3b3] text-xs font-bold uppercase tracking-wider">Session Details</span>
              <button onClick={() => setRightDrawerOpen(false)} className="text-[#b3b3b3] hover:text-white focus:outline-none">
                <FaTimes className="text-lg" />
              </button>
            </div>

            {/* Room Code Click-to-copy */}
            <div
              onClick={copyRoomCode}
              className="bg-black/30 hover:bg-black/50 border border-white/[0.04] hover:border-brand/30 rounded-xl p-5 cursor-pointer transition duration-200 relative group select-none flex flex-col items-center gap-1"
              title="Click to copy room code"
            >
              <span className="text-[10px] uppercase tracking-wider text-[#b3b3b3] font-bold">Room Code</span>
              <p className="text-3xl font-mono font-bold text-brand mt-1 tracking-widest">{roomCode}</p>
              <p className="text-[9px] text-[#a7a7a7] mt-1">
                {copied ? "✓ Copied to clipboard" : "Click to copy code"}
              </p>
            </div>

            {/* Listeners Badge */}
            <div className="bg-black/30 border border-white/[0.04] rounded-xl p-5 flex flex-col items-center gap-1 select-none text-center">
              <span className="text-[10px] uppercase tracking-wider text-[#b3b3b3] font-bold">Active Listeners</span>
              <div className="flex items-center justify-center gap-3 mt-1">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand"></span>
                </span>
                <p className="text-3xl font-bold text-white leading-none">{userCount}</p>
              </div>
              <p className="text-[9px] text-[#a7a7a7] mt-1">Listening in sync</p>
            </div>
          </div>
        </div>
      )}

      {/* Columns Area */}
      <div className="flex-1 w-full flex gap-2 p-2 pb-[88px] sm:pb-[104px] overflow-hidden min-h-0">
        
        {/* Desktop Left Sidebar (Toggleable) */}
        <aside
          className={`hidden lg:flex flex-col justify-between shrink-0 transition-all duration-300 bg-[#121212] border border-white/[0.04] rounded-xl overflow-y-auto overflow-x-hidden ${
            leftSidebarOpen ? "w-64 p-4" : "w-16 py-4 px-2 items-center"
          }`}
        >
          <div className="flex flex-col gap-6 w-full">
            {/* Session Rules Content */}
            {leftSidebarOpen && (
              <div className="bg-black/30 border border-white/[0.04] rounded-xl p-5 flex flex-col gap-4">
                <h3 className="font-bold text-xs uppercase tracking-wider text-brand border-b border-[#282828] pb-2">
                  Session Rules
                </h3>
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
            )}
          </div>

          {/* Bottom Leave Button */}
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
        </aside>

        {/* Center Main Dashboard */}
        <main className="flex-1 bg-[#121212] border border-white/[0.04] rounded-xl overflow-y-auto px-6 pb-6 min-h-0">
          <div className="max-w-4xl mx-auto flex flex-col gap-6">
            
            {/* 1. Settings view (visible only when settings route is active) */}
            {isSettingsPage && (
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

            {/* 2. YoutubeMusicSearch component (always mounted to keep player active;
                it will handle hiding its own search UI on settings page internally) */}
            <YoutubeMusicSearch
              sendMessage={sendMessage}
              syncedTrack={syncedTrack}
              syncedTime={syncedTime}
              syncedIsPlaying={syncedIsPlaying}
              isHost={isHost}
              guestCanPause={guestCanPause}
            />
            
          </div>
        </main>

        {/* Desktop Right Sidebar */}
        <aside className="hidden lg:flex flex-col gap-4 w-60 shrink-0 p-4 bg-[#121212] border border-white/[0.04] rounded-xl overflow-y-auto min-h-0">
          {/* Room Code Card (Copy-able) */}
          <div
            onClick={copyRoomCode}
            className="bg-black/30 hover:bg-black/50 border border-white/[0.04] hover:border-brand/30 rounded-xl p-5 cursor-pointer transition duration-200 relative group select-none flex flex-col items-center gap-1"
            title="Click to copy room code"
          >
            <span className="text-[10px] uppercase tracking-wider text-[#b3b3b3] font-bold">Room Code</span>
            <p className="text-3xl font-mono font-bold text-brand mt-1 tracking-widest group-hover:scale-105 transition-transform duration-200">{roomCode}</p>
            <p className="text-[9px] text-[#a7a7a7] mt-1 transition-all opacity-60 group-hover:opacity-100">
              {copied ? "✓ Copied to clipboard" : "Click to copy code"}
            </p>
          </div>

          {/* Listeners Badge */}
          <div className="bg-black/30 border border-white/[0.04] rounded-xl p-5 flex flex-col items-center gap-1 select-none text-center">
            <span className="text-[10px] uppercase tracking-wider text-[#b3b3b3] font-bold">Active Listeners</span>
            <div className="flex items-center justify-center gap-3 mt-1">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand"></span>
              </span>
              <p className="text-3xl font-bold text-white leading-none">{userCount}</p>
            </div>
            <p className="text-[9px] text-[#a7a7a7] mt-1">Listening in sync</p>
          </div>
        </aside>

      </div>

    </div>
  );
}

export default Room;
