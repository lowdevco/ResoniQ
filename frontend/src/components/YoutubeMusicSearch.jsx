import React, { useState, useEffect, useRef } from "react";
import YouTube from "react-youtube";
import { useLocation } from "react-router-dom";
import {
  FaPlay,
  FaPause,
  FaMusic,
  FaVolumeUp,
  FaVolumeDown,
  FaVolumeOff,
  FaVolumeMute,
  FaRandom,
  FaStepBackward,
  FaStepForward,
  FaSync,
  FaChevronDown,
} from "react-icons/fa";
import { apiFetch } from "../api";

function YoutubeMusicSearch({
  sendMessage,
  syncedTrack,
  syncedTime,
  syncedIsPlaying,
  isHost,
  guestCanPause,
  inRoom,
  activeSearchQuery,
}) {
  const location = useLocation();
  const hideSearch = location.pathname.endsWith("/settings");

  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [showNowPlaying, setShowNowPlaying] = useState(false);

  useEffect(() => {
    if (activeSearchQuery && (!inRoom || isHost || guestCanPause)) {
      setShowNowPlaying(false);
    }
  }, [activeSearchQuery, inRoom, isHost, guestCanPause]);

  useEffect(() => {
    if (inRoom && !isHost && !guestCanPause && currentTrack) {
      setShowNowPlaying(true);
    }
  }, [inRoom, isHost, guestCanPause, currentTrack]);

  const playerRef = useRef(null);

  useEffect(() => {
    if (!syncedTrack) {
      if (currentTrack) {
        setCurrentTrack(null);
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
        if (playerRef.current) {
          playerRef.current.stopVideo();
        }
      }
      return;
    }

    if (
      !currentTrack ||
      currentTrack.videoId !== syncedTrack.videoId ||
      Math.abs(currentTime - syncedTime) > 2
    ) {
      setCurrentTrack(syncedTrack);
      setCurrentTime(syncedTime);
    }
    setIsPlaying(syncedIsPlaying);
  }, [syncedTrack, syncedTime, syncedIsPlaying]);

  useEffect(() => {
    let interval;
    if (isPlaying && playerRef.current) {
      interval = setInterval(() => {
        if (
          playerRef.current &&
          typeof playerRef.current.getCurrentTime === "function"
        ) {
          setCurrentTime(playerRef.current.getCurrentTime());
        }
      }, 500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying]);

  const fetchDefault = async () => {
    setLoading(true);
    const defaultQueries = [
      "Top Global Hits",
      "Viral Pop Songs 2026",
      "Lo-Fi Beats to Relax",
      "Trending Hip Hop",
      "EDM Party Anthems",
      "Acoustic Covers",
      "Chill Vibes",
      "Best RnB Hits"
    ];
    const randomQuery = defaultQueries[Math.floor(Math.random() * defaultQueries.length)];
    
    try {
      const response = await apiFetch(`/music/search?q=${encodeURIComponent(randomQuery)}`);
      const data = await response.json();
      setTracks(data);
    } catch (err) {
      console.error("Default search failed:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDefault();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchSearch = async () => {
      if (!activeSearchQuery?.trim()) {
        // Only fetch default if we don't already have tracks, to avoid double-fetching on mount
        if (tracks.length === 0) fetchDefault();
        return;
      }
      setLoading(true);
      try {
        const response = await apiFetch(
          `/music/search?q=${encodeURIComponent(activeSearchQuery)}`
        );
        const data = await response.json();
        setTracks(data);
      } catch (err) {
        console.error("Search failed:", err);
      }
      setLoading(false);
    };
    fetchSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSearchQuery]);

  const playTrack = (track) => {
    if (!isHost) return;

    if (currentTrack && currentTrack.videoId === track.videoId) {
      togglePlayPause();
      return;
    }

    setCurrentTrack(track);
    setCurrentTime(0);
    setIsPlaying(true);

    sendMessage({
      type: "play_song",
      track: track,
      currentTime: 0,
      isPlaying: true,
    });
  };

  const localPauseTimestampRef = useRef(null);

  const togglePlayPause = () => {
    if (!playerRef.current) return;
    const canControl = isHost || guestCanPause;

    if (isPlaying) {
      playerRef.current.pauseVideo();
      setIsPlaying(false);
      
      if (canControl) {
        sendMessage({
          type: "pause_song",
          track: currentTrack,
          currentTime: playerRef.current.getCurrentTime(),
          isPlaying: false,
        });
      } else {

        localPauseTimestampRef.current = Date.now();
      }
    } else {
      setIsPlaying(true);
      
      if (canControl) {
        playerRef.current.playVideo();
        sendMessage({
          type: "play_song",
          track: currentTrack,
          currentTime: playerRef.current.getCurrentTime(),
          isPlaying: true,
        });
      } else {

        if (localPauseTimestampRef.current && syncedIsPlaying) {
          const timePausedSeconds = (Date.now() - localPauseTimestampRef.current) / 1000;
          const targetTime = playerRef.current.getCurrentTime() + timePausedSeconds;
          playerRef.current.seekTo(targetTime, true);
          localPauseTimestampRef.current = null;
        }
        playerRef.current.playVideo();
      }
    }
  };

  const handleSliderChange = (e) => {
    if (!isHost) return;
    if (!playerRef.current) return;

    const newTime = parseFloat(e.target.value);
    playerRef.current.seekTo(newTime, true);
    setCurrentTime(newTime);

    sendMessage({
      type: "seek_song",
      track: currentTrack,
      currentTime: newTime,
      isPlaying: isPlaying,
    });
  };

  const playNextTrack = () => {
    if (!isHost) return;
    if (tracks.length === 0) return;

    let nextIndex = 0;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * tracks.length);
    } else if (currentTrack) {
      const currentIndex = tracks.findIndex(
        (t) => t.videoId === currentTrack.videoId
      );
      if (currentIndex !== -1 && currentIndex < tracks.length - 1) {
        nextIndex = currentIndex + 1;
      }
    }
    playTrack(tracks[nextIndex]);
  };

  const playPrevTrack = () => {
    if (!isHost) return;
    if (tracks.length === 0) return;

    let prevIndex = 0;
    if (currentTrack) {
      const currentIndex = tracks.findIndex(
        (t) => t.videoId === currentTrack.videoId
      );
      if (currentIndex > 0) {
        prevIndex = currentIndex - 1;
      }
    }
    playTrack(tracks[prevIndex]);
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (playerRef.current) {
      playerRef.current.setVolume(val);
      if (val > 0 && isMuted) {
        playerRef.current.unMute();
        setIsMuted(false);
      }
    }
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted || volume === 0) {
      playerRef.current.unMute();
      setIsMuted(false);
      playerRef.current.setVolume(volume);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const onReady = (event) => {
    playerRef.current = event.target;
    setDuration(event.target.getDuration());
    event.target.setVolume(isMuted ? 0 : volume);

    if (syncedTrack) {
      event.target.seekTo(syncedTime || 0, true);
      if (syncedIsPlaying) {
        event.target.playVideo();
        setIsPlaying(true);
      } else {
        event.target.pauseVideo();
        setIsPlaying(false);
      }
    }
  };

  const onStateChange = (event) => {
    if (event.data === 1) {
      setIsPlaying(true);
      setDuration(event.target.getDuration());
    } else if (event.data === 2) {
      setIsPlaying(false);
    } else if (event.data === 0) {
      setIsPlaying(false);
      setCurrentTime(0);
      if (isRepeat) {
        if (playerRef.current) {
          playerRef.current.seekTo(0, true);
          playerRef.current.playVideo();
          setIsPlaying(true);
          sendMessage({
            type: "play_song",
            track: currentTrack,
            currentTime: 0,
            isPlaying: true,
          });
        }
      } else if (isHost && tracks.length > 0) {
        playNextTrack();
      }
    }
  };

  const formatTime = (secs) => {
    if (!secs) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const opts = {
    height: "100%",
    width: "100%",
    playerVars: {
      autoplay: 1,
      controls: 0,
      disablekb: 1,
      fs: 0,
      modestbranding: 1,
      rel: 0,
      showinfo: 0,
    },
  };

  const canControl = isHost || guestCanPause;

  return (
    <div className="flex flex-col w-full h-full pb-24">
      {!hideSearch && (
        <div className="flex flex-col w-full h-full">
          {showNowPlaying && currentTrack ? (
            <div className="flex-1 flex flex-col animate-fade-in px-4 sm:px-8 pt-6 pb-[120px] overflow-y-auto min-h-0 relative">
              {(!inRoom || isHost || guestCanPause) && (
                <button 
                  onClick={() => setShowNowPlaying(false)} 
                  className="absolute top-6 left-4 sm:left-8 text-white hover:text-brand transition p-2 focus:outline-none bg-white/5 rounded-full hover:bg-white/10 z-10"
                  title="Back to search"
                >
                  <FaChevronDown className="text-xl rotate-90" />
                </button>
              )}
              
              <div className="flex-1 flex flex-col items-center justify-center min-h-0 w-full max-w-2xl mx-auto mt-4 sm:mt-0">
                <span className="text-[10px] sm:text-xs text-brand uppercase tracking-widest font-bold mb-4 sm:mb-8">Now Playing</span>
                <div className="relative w-full max-w-[280px] sm:max-w-[400px] aspect-square mb-6 sm:mb-8 group">
                  <img
                    src={currentTrack.thumbnail}
                    alt={currentTrack.title}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "https://placehold.co/400x400/121212/535353?text=No+Image";
                    }}
                    className="w-full h-full rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] object-cover"
                  />
                </div>
                <div className="w-full max-w-[280px] sm:max-w-[400px] flex flex-col items-start px-2">
                  <h2 className="text-2xl sm:text-3xl text-white font-bold truncate w-full tracking-tight">{currentTrack.title}</h2>
                  <p className="text-base sm:text-xl text-[#b3b3b3] truncate w-full mt-1 font-medium">{currentTrack.artist}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 px-4 sm:px-8 pt-8 pb-[120px] overflow-y-auto">
              <h2 className="text-white font-bold text-2xl mb-6 tracking-tight">
                {activeSearchQuery ? "Search Results" : "Trending Now"}
              </h2>

              {!isHost && inRoom && (
                <div className="bg-black/30 border border-white/[0.04] rounded-xl px-4 py-3 flex items-center gap-3 mb-6 w-max">
                  <FaMusic className="text-brand text-sm shrink-0" />
                  <p className="text-[#b3b3b3] text-sm font-medium">
                    Only the host can change songs
                    {guestCanPause && " — You can play & pause"}
                  </p>
                </div>
              )}

              {loading ? (
                <div className="grid max-[450px]:grid-cols-1 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                  {[...Array(24)].map((_, i) => (
                    <div key={i} className="animate-pulse flex max-[450px]:flex-row max-[450px]:items-center flex-col gap-3">
                      <div className="max-[450px]:w-14 max-[450px]:h-14 max-[450px]:shrink-0 w-full aspect-square bg-white/5 rounded-md"></div>
                      <div className="flex flex-col gap-2 w-full">
                        <div className="h-4 bg-white/5 rounded w-3/4"></div>
                        <div className="h-3 bg-white/5 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {tracks.length > 0 ? (
                    <div className="grid max-[450px]:grid-cols-1 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                      {tracks.map((track) => (
                        <div
                          key={track.videoId}
                          onClick={() => playTrack(track)}
                          className={`group flex max-[450px]:flex-row max-[450px]:items-center flex-col p-3 sm:p-4 rounded-xl cursor-pointer transition-all duration-300 hover:bg-white/[0.04] ${
                            currentTrack?.videoId === track.videoId ? "bg-white/[0.08]" : "bg-transparent"
                          }`}
                        >
                          <div className="relative max-[450px]:w-14 max-[450px]:h-14 max-[450px]:mb-0 max-[450px]:mr-4 max-[450px]:shrink-0 w-full aspect-square mb-3 sm:mb-4 shadow-lg overflow-hidden rounded-md bg-black border border-white/5">
                            <img
                              src={track.thumbnail}
                              alt={track.title}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "https://placehold.co/400x400/121212/535353?text=No+Image";
                              }}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            <div
                              className={`absolute bottom-2 right-2 max-[450px]:hidden bg-brand text-white w-10 sm:w-12 h-10 sm:h-12 rounded-full flex items-center justify-center shadow-xl shadow-brand/40 transition-all duration-300 transform ${
                                currentTrack?.videoId === track.videoId && isPlaying
                                  ? "opacity-100 translate-y-0"
                                  : "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0"
                              } hover:scale-105 hover:bg-blue-500`}
                            >
                              {currentTrack?.videoId === track.videoId && isPlaying ? (
                                <FaPause className="text-sm sm:text-lg" />
                              ) : (
                                <FaPlay className="text-sm sm:text-lg ml-1" />
                              )}
                            </div>
                            <div className={`absolute inset-0 bg-black/60 hidden max-[450px]:flex items-center justify-center transition-opacity duration-300 ${currentTrack?.videoId === track.videoId ? 'opacity-100' : 'opacity-0'}`}>
                              {currentTrack?.videoId === track.videoId && isPlaying ? (
                                <FaPause className="text-brand text-xl" />
                              ) : (
                                <FaPlay className="text-brand text-xl ml-1" />
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col min-w-0 flex-1">
                            <p
                              className={`font-bold text-sm sm:text-base truncate mb-0.5 sm:mb-1 transition-colors ${
                                currentTrack?.videoId === track.videoId ? "text-brand" : "text-white"
                              }`}
                            >
                              {track.title}
                            </p>
                            <p className="text-[#a7a7a7] text-xs sm:text-sm font-medium truncate">
                              {track.artist}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#b3b3b3] text-sm py-8">
                      No results found. Try another search query!
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Global Bottom Player Bar */}
      <div className={`fixed bottom-0 left-0 right-0 border-t border-white/[0.05] px-3 sm:px-6 py-3 flex items-center justify-between h-[85px] sm:h-[90px] transition-all duration-300 ${showNowPlaying ? 'z-[50] bg-transparent border-transparent' : 'z-50 bg-[#0a0a0a]'}`}>
        
        {/* Mobile Edge Scrubber */}
        <div className={`absolute top-0 left-0 right-0 h-1 sm:hidden ${showNowPlaying ? 'hidden' : ''}`}>
          <div className="absolute inset-0 bg-[#282828] w-full h-full">
            <div 
              className="h-full transition-colors" 
              style={{ width: `${(currentTime / (duration || 180)) * 100}%`, backgroundColor: 'var(--brand-color)' }}
            />
          </div>
          <input
            type="range"
            min="0"
            max={duration || 180}
            value={currentTime}
            onChange={handleSliderChange}
            disabled={!isHost || !currentTrack}
            className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
          />
        </div>

        {/* Left: Track Info */}
        <div className={`flex items-center gap-3 min-w-0 pr-2 transition-opacity duration-300 ${showNowPlaying ? 'max-md:hidden w-1/3 opacity-100' : 'w-auto max-[500px]:flex-1 sm:w-1/3 opacity-100'}`}>
          {currentTrack ? (
            <>
              <img
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://placehold.co/400x400/121212/535353?text=No+Image";
                }}
                onClick={() => setShowNowPlaying(true)}
                title="Expand"
                className="w-12 h-12 sm:w-14 sm:h-14 rounded shadow-md object-cover border border-white/5 shrink-0 cursor-pointer hover:opacity-80 transition hover:scale-105"
              />
              <div className="min-w-0 flex flex-col justify-center">
                <h4 
                  className="text-white font-bold text-xs sm:text-sm truncate hover:underline cursor-pointer" 
                  title={currentTrack.title}
                  onClick={() => setShowNowPlaying(true)}
                >
                  {currentTrack.title}
                </h4>
                <p className="text-[#b3b3b3] text-[10px] sm:text-[11px] font-medium truncate hover:underline cursor-pointer" title={currentTrack.artist}>
                  {currentTrack.artist}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded bg-[#1f1f1f] border border-white/[0.04] flex items-center justify-center shrink-0">
                <FaMusic className="text-[#535353] text-base sm:text-lg" />
              </div>
              <div className="min-w-0 hidden max-[350px]:hidden min-[351px]:flex flex-col justify-center">
                <h4 className="text-[#b3b3b3] font-bold text-xs sm:text-sm truncate">No active track</h4>
                <p className="text-[#535353] text-[10px] sm:text-[11px] font-medium truncate">Select a song to start</p>
              </div>
            </>
          )}
        </div>

        {/* Middle: Controls */}
        <div className={`flex flex-col md:flex-col-reverse items-center gap-2 transition-all duration-300 ${showNowPlaying ? 'w-full max-md:flex-1 md:w-1/3' : 'w-auto max-[500px]:shrink-0 sm:w-1/3'} max-w-[722px]`}>
          
          {/* Progress Bar */}
          <div className={`w-full items-center gap-2 group ${showNowPlaying ? 'flex mb-2 md:mb-0 md:mt-2' : 'hidden sm:flex md:mt-2'}`}>
            <span className="text-[11px] text-[#a7a7a7] font-mono min-w-[40px] text-right shrink-0">
              {formatTime(currentTime)}
            </span>
            <div className="relative flex-1 h-1.5 bg-[#282828] rounded-full flex items-center cursor-pointer">
              <div 
                className="absolute left-0 h-full bg-brand rounded-full transition-colors group-hover:bg-[#1ed760] sm:group-hover:bg-[#1fdf64]" 
                style={{ width: `${(currentTime / (duration || 180)) * 100}%`, backgroundColor: 'var(--brand-color)' }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 shadow"></div>
              </div>
              <input
                type="range"
                min="0"
                max={duration || 180}
                value={currentTime}
                onChange={handleSliderChange}
                disabled={!isHost || !currentTrack}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
            </div>
            <span className="text-[11px] text-[#a7a7a7] font-mono min-w-[40px] text-left shrink-0">
              {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 justify-center w-full select-none mt-1 sm:mt-0">
            <button
              onClick={() => setIsShuffle(!isShuffle)}
              disabled={!currentTrack}
              className={`transition duration-150 focus:outline-none disabled:opacity-30 p-2 sm:p-0 ${
                isShuffle ? "text-brand hover:text-brand-hover" : "text-[#b3b3b3] hover:text-white"
              }`}
            >
              <FaRandom className="text-sm sm:text-base" />
            </button>
            <button
              onClick={playPrevTrack}
              disabled={!currentTrack || !isHost}
              className="text-[#b3b3b3] hover:text-white disabled:opacity-30 transition duration-150 focus:outline-none p-2 sm:p-0"
            >
              <FaStepBackward className="text-lg sm:text-xl" />
            </button>
            <button
              onClick={togglePlayPause}
              disabled={!currentTrack}
              className="bg-white hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] disabled:opacity-30 disabled:scale-100 disabled:shadow-none disabled:cursor-not-allowed text-black w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none shrink-0 shadow-[0_0_10px_rgba(255,255,255,0.2)]"
            >
              {isPlaying ? <FaPause className="text-xs sm:text-sm" /> : <FaPlay className="text-xs sm:text-sm ml-0.5 sm:ml-1" />}
            </button>
            <button
              onClick={playNextTrack}
              disabled={!currentTrack || !isHost}
              className="text-[#b3b3b3] hover:text-white disabled:opacity-30 transition duration-150 focus:outline-none p-2 sm:p-0"
            >
              <FaStepForward className="text-lg sm:text-xl" />
            </button>
            <button
              onClick={() => setIsRepeat(!isRepeat)}
              disabled={!currentTrack}
              className={`transition duration-150 focus:outline-none disabled:opacity-30 p-2 sm:p-0 ${
                isRepeat ? "text-brand hover:text-brand-hover" : "text-[#b3b3b3] hover:text-white"
              }`}
            >
              <FaSync className="text-sm sm:text-base" />
            </button>
          </div>
        </div>

        {/* Right: Volume */}
        <div className={`hidden md:flex items-center justify-end gap-3 shrink-0 transition-opacity duration-300 ${showNowPlaying ? 'max-md:hidden w-1/3' : 'w-1/3 opacity-100'}`}>
          <button
            onClick={toggleMute}
            disabled={!currentTrack}
            className="text-[#b3b3b3] hover:text-white transition duration-150 focus:outline-none disabled:opacity-30 p-2 sm:p-0"
            title="Mute"
          >
            {isMuted || volume === 0 ? <FaVolumeMute /> : volume < 33 ? <FaVolumeOff /> : volume < 66 ? <FaVolumeDown /> : <FaVolumeUp />}
          </button>
          
          <div className="relative hidden md:flex w-24 h-1.5 bg-[#282828] rounded-full items-center group cursor-pointer">
            <div 
              className="absolute left-0 h-full bg-white group-hover:bg-brand rounded-full transition-colors"
              style={{ width: `${isMuted ? 0 : volume}%`, backgroundColor: 'var(--brand-color)' }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 shadow"></div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              disabled={!currentTrack}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
          </div>
        </div>
      </div>

      <div className="absolute left-[-9999px] opacity-0 pointer-events-none w-[1px] h-[1px] overflow-hidden">
        {currentTrack && (
          <YouTube
            key={currentTrack.videoId}
            videoId={currentTrack.videoId}
            opts={opts}
            onReady={onReady}
            onStateChange={onStateChange}
          />
        )}
      </div>
    </div>
  );
}

export default YoutubeMusicSearch;
