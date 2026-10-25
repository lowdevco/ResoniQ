import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  FaMusic,
  FaBars,
  FaTimes,
  FaSignOutAlt,
  FaCrown,
  FaHeadphones,
  FaCog,
  FaSearch,
  FaUserFriends
} from "react-icons/fa";
import YoutubeMusicSearch from "./YoutubeMusicSearch";
import RoomSettings from "./RoomSettings";
import RoomLobby from "./RoomLobby";
import useRoom from "./Hook/UseRoom";
import useServerWake from "./Hook/useServerWake";
import ServerWake from "./ServerWake";
import { apiFetch } from "../api";
import { LISTENING, ROOM_MODES, canControl as canControlRoom } from "../lib/roomModes";

function AppLayout() {
  const { roomCode } = useParams();
  const navigate = useNavigate();

  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [activeSearchQuery, setActiveSearchQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  const [isHost, setIsHost] = useState(!roomCode);
  const [fetchedMode, setFetchedMode] = useState(LISTENING);
  const [copied, setCopied] = useState(false);

  const server = useServerWake();
  const { userCount, sync, mode: liveMode, connected, roomClosed, sendMessage } = useRoom(roomCode);
  const roomMode = liveMode ?? fetchedMode;
  const canControl = canControlRoom({ inRoom: !!roomCode, isHost, mode: roomMode });
  const modeLabel = ROOM_MODES.find((m) => m.value === roomMode)?.label;

  useEffect(() => {
    if (roomClosed) navigate("/");
  }, [roomClosed, navigate]);

  const [announcement, setAnnouncement] = useState("");
  const wasConnected = useRef(false);
  useEffect(() => {
    if (!roomCode) return;
    if (wasConnected.current && !connected) setAnnouncement("Connection lost. Reconnecting…");
    if (!wasConnected.current && connected) setAnnouncement(`Connected to room ${roomCode}.`);
    wasConnected.current = connected;
  }, [connected, roomCode]);

  const previousMode = useRef(null);
  useEffect(() => {
    if (previousMode.current && liveMode && liveMode !== previousMode.current) {
      setAnnouncement(`Room switched to ${ROOM_MODES.find((m) => m.value === liveMode)?.label}.`);
    }
    previousMode.current = liveMode;
  }, [liveMode]);

  const menuButtonRef = useRef(null);
  const drawerCloseRef = useRef(null);
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);
  useEffect(() => {
    if (!mobileMenuOpen) return undefined;
    const returnTo = menuButtonRef.current;
    drawerCloseRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") closeMobileMenu();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      returnTo?.focus();
    };
  }, [mobileMenuOpen, closeMobileMenu]);

  useEffect(() => {
    if (!roomCode) {
      setIsHost(true);
      setShowSettings(false);
      return undefined;
    }

    let cancelled = false;
    apiFetch(`/api/get-room?code=${roomCode}`)
      .then((response) => {
        if (!response.ok) {
          navigate("/");
          return null;
        }
        return response.json();
      })
      .then((data) => {
        if (!data || cancelled) return;
        setFetchedMode(data.mode);
        setIsHost(data.is_host);
      })
      .catch((err) => console.error(err));
    return () => {
      cancelled = true;
    };
  }, [roomCode, navigate]);

  const leaveRoom = () => {
    if (!roomCode) return;
    apiFetch("/api/leave-room", { method: "POST" }).then(() => navigate("/"));
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 555);

  useEffect(() => {
    const handleResize = () => setIsSmallScreen(window.innerWidth < 555);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setActiveSearchQuery(searchInput);
  };

  const renderSidebarContent = (isExpanded = leftSidebarOpen) => {
    if (!isExpanded) {
      return (
        <div className="flex flex-col gap-8 w-full items-center mt-6">
          <Link to="/" className="p-2 rounded-lg text-[#b3b3b3] hover:text-white transition group" title="Home" aria-label="Home" onClick={() => { setSearchInput(""); setActiveSearchQuery(""); setShowSettings(false); }}>
            <FaMusic className="text-xl group-hover:text-brand" />
          </Link>
          <button className="p-2 rounded-lg text-[#b3b3b3] hover:text-white transition" title="Search" aria-label="Search songs" onClick={() => document.getElementById("song-search")?.focus()}>
            <FaSearch className="text-xl" aria-hidden />
          </button>
          
          {roomCode && (
            <div className="flex flex-col gap-8 items-center mt-2 pt-8 border-t border-white/[0.05] w-full">
              <div className="flex flex-col items-center gap-1.5 text-[#b3b3b3] group" title="Active Listeners" role="img" aria-label={`${userCount} active listeners`}>
                <div className="relative">
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-brand"></span>
                  </span>
                  <FaUserFriends className="text-xl group-hover:text-white transition" />
                </div>
                <span className="text-[10px] font-bold mt-1">{userCount}</span>
              </div>
              
              <div className="flex flex-col items-center gap-1.5 text-brand" title={isHost ? "Host" : "Listener"} role="img" aria-label={isHost ? "You are the host" : "You are a listener"}>
                {isHost ? <FaCrown className="text-xl" /> : <FaHeadphones className="text-xl" />}
              </div>

              {isHost && (
                <button className="p-2 rounded-lg text-[#b3b3b3] hover:text-white transition mt-2" title="Room Settings" aria-label="Room settings" onClick={() => { setLeftSidebarOpen(true); setShowSettings(true); }}>
                  <FaCog className="text-xl" aria-hidden />
                </button>
              )}
            </div>
          )}
          
          {roomCode && (
             <button
                onClick={leaveRoom}
                className="mt-auto p-2 rounded-lg text-[#e91429]/70 hover:text-[#e91429] transition" title="Leave Room" aria-label="Leave room"
             >
                <FaSignOutAlt className="text-xl" aria-hidden />
             </button>
          )}
        </div>
      );
    }

    if (!roomCode) {
      return (
        <div className="flex flex-col gap-6 w-full mt-4">
          <RoomLobby />
        </div>
      );
    }

    if (showSettings && isHost && leftSidebarOpen) {
      return (
        <div className="flex flex-col gap-6 w-full animate-fade-in mt-4">
          <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
             <h3 className="font-bold text-xs uppercase tracking-wider text-brand-text">Room Settings</h3>
             <button onClick={() => setShowSettings(false)} className="p-2 -m-2 rounded-lg text-[#b3b3b3] hover:text-white transition" aria-label="Close room settings">
                <FaTimes aria-hidden />
             </button>
          </div>
          <RoomSettings
             roomCode={roomCode}
             mode={roomMode}
             onSaved={(mode) => {
                setFetchedMode(mode);
                setShowSettings(false);
             }}
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6 w-full">
        {leftSidebarOpen && (
          <>
            <button
              type="button"
              onClick={copyRoomCode}
              aria-label={`Room code ${roomCode.split("").join(" ")}. Copy to clipboard`}
              className="w-full bg-black/30 hover:bg-black/50 border border-white/[0.04] hover:border-brand/30 rounded-xl p-5 cursor-pointer transition duration-200 relative group select-none flex flex-col items-center gap-1 mt-4"
              title="Click to copy room code"
            >
              <span className="text-[10px] uppercase tracking-wider text-[#b3b3b3] font-bold" aria-hidden>
                Room Code
              </span>
              <span className="text-3xl font-mono font-bold text-brand mt-1 tracking-widest group-hover:scale-105 transition-transform duration-200" aria-hidden>
                {roomCode}
              </span>
              <span className="text-[11px] text-[#a7a7a7] mt-1 transition-colors group-hover:text-white" aria-live="polite">
                {copied ? "Copied to clipboard" : "Click to copy code"}
              </span>
            </button>

            <div className="bg-black/30 border border-white/[0.04] rounded-xl p-5 flex flex-col items-center gap-1 select-none text-center">
              <span className="text-[10px] uppercase tracking-wider text-[#b3b3b3] font-bold">
                Active Listeners
              </span>
              <div className="flex items-center justify-center gap-3 mt-1">
                <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand"></span>
                </span>
                <p className="text-3xl font-bold text-white leading-none">
                  {userCount}
                </p>
              </div>
              {!connected && (
                <p className="text-[11px] text-amber-400 font-medium mt-2">Reconnecting…</p>
              )}
            </div>

            <div className="bg-black/30 border border-white/[0.04] rounded-xl p-5 flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-[#282828] pb-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-brand-text">
                  Session Rules
                </h3>
                {isHost && (
                  <button
                    onClick={() => setShowSettings(true)}
                    className="p-2 -m-2 rounded-lg text-[#b3b3b3] hover:text-white transition"
                    aria-label="Change room settings"
                  >
                    <FaCog aria-hidden />
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#b3b3b3] font-bold">Room Mode</p>
                  <p className="text-sm font-bold text-white mt-0.5">{modeLabel}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#b3b3b3] font-bold">Your Role</p>
                  <p className="text-sm font-bold text-brand-text mt-0.5 flex items-center gap-1.5">
                    {isHost ? <><FaCrown aria-hidden /> Host</> : <><FaHeadphones aria-hidden /> Listener</>}
                  </p>
                </div>
              </div>
            </div>

            {/* Render Leave Room button natively at the bottom of the scrollable content */}
            <button
              onClick={leaveRoom}
              className="mt-4 w-full bg-transparent hover:bg-[#e91429]/10 border border-[#e91429] text-[#e91429] hover:text-white font-bold transition-all duration-150 py-2.5 rounded-full text-sm flex items-center justify-center gap-2"
            >
              <FaSignOutAlt aria-hidden /> Leave Room
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#050505] font-sans selection:bg-brand/30 selection:text-white">
      <a href="#music" className="skip-link">Skip to music</a>
      <div className="sr-only" role="status" aria-live="polite">{announcement}</div>

      {/* Top Navbar */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-[#0a0a0a] border-b border-white/[0.05] z-40 shrink-0 gap-2 sm:gap-4">
        <div className="flex items-center gap-4 w-auto sm:w-1/4 shrink-0">
          <button
            onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
            className="hidden lg:block p-2 -m-2 rounded-lg text-[#b3b3b3] hover:text-white transition duration-200"
            aria-label={leftSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            aria-expanded={leftSidebarOpen}
            aria-controls="room-sidebar"
          >
            <FaBars className="text-xl" aria-hidden />
          </button>
          <button
            ref={menuButtonRef}
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 -m-2 rounded-lg text-[#b3b3b3] hover:text-white transition duration-200"
            aria-label={roomCode ? "Open room menu" : "Create or join a room"}
            aria-expanded={mobileMenuOpen}
            aria-controls="room-drawer"
          >
            <FaBars className="text-xl" aria-hidden />
          </button>
          <Link to="/" className="flex items-center gap-2.5 group cursor-pointer" onClick={() => { setSearchInput(""); setActiveSearchQuery(""); setShowSettings(false); }}>
            <div className="bg-white rounded-full p-1 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center shadow-lg shadow-white/10 group-hover:scale-105 transition-transform overflow-hidden shrink-0">
              <img src="/logo.png" alt="" className="w-full h-full object-contain rounded-full" />
            </div>
            <h1 className="hidden sm:block text-lg sm:text-xl font-bold tracking-tight text-white group-hover:text-brand transition-colors">
              Resoniq
            </h1>
            <span className="sr-only sm:hidden">Resoniq home</span>
          </Link>
        </div>

        {/* Central Search Bar */}
        <div className="flex-1 max-w-lg mx-2 sm:mx-4 relative w-full flex justify-center">
          {!canControl ? (
            <div className="bg-brand/10 border border-brand/30 text-brand-text text-xs sm:text-sm px-4 py-2 rounded-full font-bold tracking-wide flex items-center gap-2 animate-fade-in shadow-[0_0_15px_rgba(29,185,84,0.15)]">
              <FaHeadphones aria-hidden /> Listening Party Mode
            </div>
          ) : (
            <form role="search" onSubmit={handleSearchSubmit} className="relative group w-full">
              <label htmlFor="song-search" className="sr-only">Search songs</label>
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#b3b3b3] group-focus-within:text-brand transition-colors">
                <FaSearch aria-hidden />
              </div>
              <input
                id="song-search"
                type="search"
                autoComplete="off"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={isSmallScreen ? "Search" : "What do you want to play?"}
                className="w-full bg-[#1a1a1a] hover:bg-[#222222] focus:bg-[#222222] border border-white/[0.05] focus:border-brand/50 rounded-full py-2.5 sm:py-3 pl-11 pr-4 text-sm text-white placeholder-[#b3b3b3] transition-all duration-200 shadow-inner"
              />
            </form>
          )}
        </div>

        <div className="w-auto sm:w-1/4 flex justify-end shrink-0">
          {/* Future premium/profile buttons */}
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={closeMobileMenu} aria-hidden />
          <div
            id="room-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={roomCode ? "Room" : "Create or join a room"}
            className="relative w-72 bg-[#0a0a0a] h-full flex flex-col shadow-2xl overflow-y-auto animate-slide-in p-6"
          >
            <div className="flex items-center justify-end pb-2">
              <button ref={drawerCloseRef} onClick={closeMobileMenu} className="p-2 -m-2 rounded-lg text-[#b3b3b3] hover:text-white" aria-label="Close menu">
                <FaTimes className="text-lg" aria-hidden />
              </button>
            </div>
            <div className="flex-1 mt-2">
              {renderSidebarContent(true)}
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div inert={mobileMenuOpen || undefined} className="flex-1 w-full flex gap-2 p-2 pb-[88px] sm:pb-[104px] overflow-hidden min-h-0">
        {/* Left Sidebar */}
        <aside
          id="room-sidebar"
          aria-label="Room"
          className={`hidden lg:flex flex-col justify-between shrink-0 transition-all duration-300 bg-[#0a0a0a] rounded-xl overflow-y-auto overflow-x-hidden ${
            leftSidebarOpen ? "w-72 p-4" : "w-16 py-4 px-2 items-center"
          }`}
        >
          {renderSidebarContent()}
        </aside>

        {/* Main Content Area */}
        <main id="music" tabIndex={-1} className="flex-1 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/15 via-[#0a0a0a] to-[#0a0a0a] rounded-xl overflow-y-auto min-h-0 relative">
          <div className="max-w-[1400px] mx-auto flex flex-col gap-6 p-6">
            {server.status === "ready" ? (
              <YoutubeMusicSearch
                sendMessage={sendMessage}
                sync={sync}
                isHost={isHost}
                mode={roomMode}
                inRoom={!!roomCode}
                activeSearchQuery={activeSearchQuery}
              />
            ) : (
              <ServerWake status={server.status} elapsed={server.elapsed} onRetry={server.retry} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
