import React, { useState, useEffect, useRef } from "react";
import YouTube from "react-youtube";
import { useLocation } from "react-router-dom";
import {
  FaPlay,
  FaPause,
  FaMusic,
  FaSearch,
  FaVolumeUp,
  FaVolumeDown,
  FaVolumeOff,
  FaVolumeMute,
  FaRandom,
  FaStepBackward,
  FaStepForward,
  FaSync
} from "react-icons/fa";
import { apiFetch } from "../api";

function YoutubeMusicSearch({
  sendMessage,
  syncedTrack,
  syncedTime,
  syncedIsPlaying,
  isHost,
  guestCanPause,
}) {
  const location = useLocation();
  const hideSearch = location.pathname.endsWith("/settings");

  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Volume States
  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);

  const playerRef = useRef(null);

  const getPlayerVideoId = () => {
    if (playerRef.current && typeof playerRef.current.getVideoData === "function") {
      const data = playerRef.current.getVideoData();
      return data ? data.video_id : null;
    }
    return null;
  };

  // Sync incoming WebSocket events
  useEffect(() => {
    if (!syncedTrack) {
      if (currentTrack) {
        setCurrentTrack(null);
        setIsPlaying(false);
        setCurrentTime(0);
      }
      return;
    }

    const isDifferentTrack = !currentTrack || currentTrack.videoId !== syncedTrack.videoId;
    if (isDifferentTrack) {
      setCurrentTrack(syncedTrack);
      setCurrentTime(0);
    }

    if (!playerRef.current) return;

    // Check if player has loaded the correct video before syncing state
    const currentPlayerVideoId = getPlayerVideoId();
    if (currentPlayerVideoId === syncedTrack.videoId) {
      const playerState = playerRef.current.getPlayerState();

      // Sync play/pause state
      if (syncedIsPlaying) {
        if (playerState !== 1) {
          playerRef.current.playVideo();
          setIsPlaying(true);
        }
      } else {
        if (playerState === 1) {
          playerRef.current.pauseVideo();
          setIsPlaying(false);
        }
      }

      // Sync current playback time
      const playerTime = playerRef.current.getCurrentTime();
      if (Math.abs(playerTime - syncedTime) > 2) {
        playerRef.current.seekTo(syncedTime, true);
        setCurrentTime(syncedTime);
      }
    }
  }, [syncedTrack, syncedTime, syncedIsPlaying, currentTrack]);

  // Periodic timer to poll current time when playing
  useEffect(() => {
    let interval;
    if (isPlaying && playerRef.current) {
      interval = setInterval(() => {
        if (playerRef.current && typeof playerRef.current.getCurrentTime === "function") {
          setCurrentTime(playerRef.current.getCurrentTime());
        }
      }, 500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying]);

  const searchSongs = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await apiFetch(
        `/music/search?q=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      setTracks(data);
    } catch (err) {
      console.error("Search failed:", err);
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") searchSongs();
  };

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

  const togglePlayPause = () => {
    if (!isHost && !guestCanPause) return;
    if (!playerRef.current) return;

    if (isPlaying) {
      playerRef.current.pauseVideo();
      setIsPlaying(false);
      sendMessage({
        type: "pause_song",
        track: currentTrack,
        currentTime: playerRef.current.getCurrentTime(),
        isPlaying: false,
      });
    } else {
      playerRef.current.playVideo();
      setIsPlaying(true);
      sendMessage({
        type: "play_song",
        track: currentTrack,
        currentTime: playerRef.current.getCurrentTime(),
        isPlaying: true,
      });
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

  const restartSong = () => {
    if (!isHost) return;
    if (!playerRef.current) return;

    playerRef.current.seekTo(0, true);
    setCurrentTime(0);

    sendMessage({
      type: "seek_song",
      track: currentTrack,
      currentTime: 0,
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
      const currentIndex = tracks.findIndex((t) => t.videoId === currentTrack.videoId);
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
      const currentIndex = tracks.findIndex((t) => t.videoId === currentTrack.videoId);
      if (currentIndex !== -1 && currentIndex > 0) {
        prevIndex = currentIndex - 1;
      } else {
        restartSong();
        return;
      }
    }
    playTrack(tracks[prevIndex]);
  };

  const stopSong = () => {
    if (!isHost) return;
    if (!playerRef.current) return;

    playerRef.current.pauseVideo();
    playerRef.current.seekTo(0, true);
    setIsPlaying(false);
    setCurrentTime(0);
    setCurrentTrack(null);

    sendMessage({
      type: "pause_song",
      track: null,
      currentTime: 0,
      isPlaying: false,
    });
  };

  const handleVolumeChange = (e) => {
    const newVol = parseInt(e.target.value);
    setVolume(newVol);
    if (playerRef.current) {
      playerRef.current.setVolume(newVol);
      if (newVol > 0 && isMuted) {
        playerRef.current.unMute();
        setIsMuted(false);
      }
    }
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
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

    // Apply active volume state
    event.target.setVolume(isMuted ? 0 : volume);

    // When player mounts, sync if room is already active
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
    <div className="flex flex-col w-full">
      {/* 1. Discover Tracks search card (visible only when not on settings page) */}
      {!hideSearch && (
        <div className="flex flex-col w-full">
          {/* Sticky Search Header & Input */}
          <div className="sticky top-0 bg-[#121212] z-10 pt-6 pb-4 border-b border-white/[0.06] mb-4">
            <h3 className="text-white font-bold text-xl flex items-center gap-2 mb-4">
              <FaSearch className="text-brand text-base shrink-0" /> Discover Tracks
            </h3>
            
            {/* Polished Spotify Search Input — only visible to host */}
            {isHost && (
              <div className="relative flex w-full">
                <button
                  onClick={searchSongs}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#b3b3b3] hover:text-white transition duration-150 focus:outline-none"
                   title="Search"
                >
                  <FaSearch className="text-sm" />
                </button>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={loading ? "Searching..." : "Search YouTube Music..."}
                  className="w-full bg-[#2a2a2a] border border-transparent text-white rounded-full pl-11 pr-5 py-2.5 focus:outline-none focus:bg-[#333333] focus:border-white/10 transition duration-150 text-sm"
                />
              </div>
            )}

            {/* Guest message — only visible to non-host */}
            {!isHost && (
              <div className="bg-black/30 border border-white/[0.04] rounded-xl px-4 py-3 flex items-center justify-center gap-2.5">
                <FaMusic className="text-brand text-sm shrink-0" />
                <p className="text-[#b3b3b3] text-sm font-medium">
                  Only the host can search and play songs
                  {guestCanPause && " — You can play & pause"}
                </p>
              </div>
            )}
          </div>

          {/* Search results list — only visible to host */}
          {isHost && tracks.length > 0 && (
            <div className="flex flex-col gap-1 mt-2">
              {tracks.map((track, index) => (
                <div
                  key={track.videoId}
                  onClick={() => playTrack(track)}
                  className={`group flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-all duration-150 ${
                    currentTrack?.videoId === track.videoId
                      ? "bg-white/[0.08]"
                      : "bg-transparent hover:bg-white/[0.04]"
                  }`}
                >
                  {/* Index / Play Hover */}
                  <div className="w-6 text-center text-sm font-semibold text-[#b3b3b3] relative flex items-center justify-center">
                    <span className="group-hover:hidden">{index + 1}</span>
                    <FaPlay className="hidden group-hover:inline text-brand text-[10px]" />
                  </div>

                  {/* Album Art */}
                  <img
                    src={track.thumbnail}
                    alt={track.title}
                    className="w-11 h-11 rounded-lg object-cover shadow-sm bg-black border border-white/5"
                  />

                  {/* Title & Artist */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm truncate ${
                      currentTrack?.videoId === track.videoId ? "text-brand" : "text-white"
                    }`}>
                      {track.title}
                    </p>
                    <p className="text-[#b3b3b3] text-xs truncate mt-0.5">
                      {track.artist}
                    </p>
                  </div>

                  {/* Duration */}
                  <div className="flex items-center gap-4 text-[#b3b3b3] text-xs font-semibold">
                    <span>{track.duration}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty Search State */}
          {isHost && tracks.length === 0 && query && !loading && (
            <p className="text-[#b3b3b3] text-sm text-center py-8">
              No results found. Try another search query!
            </p>
          )}
        </div>
      )}

      {/* 2. Persistent Bottom Player Bar — visible to everyone always */}
      <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-white/[0.05] px-6 py-4 flex items-center justify-between z-50 h-20 sm:h-24">
        
        {/* Mobile top thin progress indicator (active only) */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#282828] sm:hidden">
          {currentTrack && (
            <div 
              className="h-full bg-brand" 
              style={{ width: `${(currentTime / (duration || 180)) * 100}%` }}
            />
          )}
        </div>

        {/* Left Column: Active Track Details or Fallback */}
        <div className="flex items-center gap-3 w-2/3 sm:w-1/4 min-w-0">
          {currentTrack ? (
            <>
              <img
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                className="w-11 sm:w-14 sm:h-14 rounded-lg object-cover shadow-lg border border-white/5 bg-black shrink-0"
              />
              <div className="min-w-0">
                <h4 className="text-white font-semibold text-xs sm:text-sm truncate" title={currentTrack.title}>
                  {currentTrack.title}
                </h4>
                <p className="text-[#b3b3b3] text-[10px] sm:text-xs truncate mt-0.5" title={currentTrack.artist}>
                  {currentTrack.artist}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-11 sm:w-14 sm:h-14 rounded-lg bg-[#2a2a2a] border border-[#282828] flex items-center justify-center shrink-0">
                <FaMusic className="text-[#535353] text-sm sm:text-lg" />
              </div>
              <div className="min-w-0">
                <h4 className="text-[#b3b3b3] font-semibold text-xs sm:text-sm truncate">
                  No active track
                </h4>
                <p className="text-[#535353] text-[10px] sm:text-xs truncate mt-0.5">
                  Select a song to start listening
                </p>
              </div>
            </>
          )}
        </div>

        {/* Center Column: Controls & Time Slider */}
        <div className="flex flex-col items-center gap-2 w-1/3 sm:w-2/4">
          <div className="flex items-center gap-4 sm:gap-6 justify-end sm:justify-center w-full select-none">
            {/* Shuffle Button */}
            <button
              onClick={() => setIsShuffle(!isShuffle)}
              disabled={!currentTrack}
              className={`transition duration-150 text-sm sm:text-base focus:outline-none disabled:opacity-30 disabled:hover:text-[#b3b3b3] ${
                isShuffle ? "text-brand hover:text-brand-hover" : "text-[#b3b3b3] hover:text-white"
              }`}
              title="Shuffle"
            >
              <FaRandom />
            </button>

            {/* Previous Button */}
            <button
              onClick={playPrevTrack}
              disabled={!currentTrack || !isHost}
              className="text-[#b3b3b3] hover:text-white disabled:opacity-30 disabled:hover:text-[#b3b3b3] transition duration-150 text-sm sm:text-base focus:outline-none"
              title="Previous"
            >
              <FaStepBackward />
            </button>

            {/* Play/Pause Button */}
            <button
              onClick={togglePlayPause}
              disabled={!currentTrack || !canControl}
              className="bg-white hover:scale-105 disabled:opacity-30 disabled:scale-100 disabled:cursor-not-allowed text-black w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm shadow-md transition duration-150 focus:outline-none shrink-0"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <FaPause /> : <FaPlay />}
            </button>

            {/* Next Button */}
            <button
              onClick={playNextTrack}
              disabled={!currentTrack || !isHost}
              className="text-[#b3b3b3] hover:text-white disabled:opacity-30 disabled:hover:text-[#b3b3b3] transition duration-150 text-sm sm:text-base focus:outline-none"
              title="Next"
            >
              <FaStepForward />
            </button>

            {/* Repeat Button */}
            <button
              onClick={() => setIsRepeat(!isRepeat)}
              disabled={!currentTrack}
              className={`transition duration-150 text-sm sm:text-base focus:outline-none disabled:opacity-30 disabled:hover:text-[#b3b3b3] ${
                isRepeat ? "text-brand hover:text-brand-hover" : "text-[#b3b3b3] hover:text-white"
              }`}
              title="Repeat"
            >
              <FaSync />
            </button>
          </div>

          {/* Desktop-only slider track */}
          <div className="hidden sm:flex w-full items-center gap-3">
            <span className="text-[10px] text-[#b3b3b3] font-mono w-10 text-right shrink-0">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max={duration || 180}
              value={currentTime}
              onChange={handleSliderChange}
              disabled={!isHost || !currentTrack}
              className="flex-1 h-1 bg-[#535353] rounded-lg appearance-none cursor-pointer accent-brand disabled:opacity-30 focus:outline-none transition"
            />
            <span className="text-[10px] text-[#b3b3b3] font-mono w-10 text-left shrink-0">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Right Column: Spotify Volume Control Slider */}
        <div className="flex items-center justify-end gap-3 w-1/4 shrink-0">
          <button
            onClick={toggleMute}
            disabled={!currentTrack}
            className="text-[#b3b3b3] hover:text-white transition duration-150 text-base focus:outline-none disabled:opacity-30 flex items-center justify-center"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted || volume === 0 ? (
              <FaVolumeMute />
            ) : volume < 33 ? (
              <FaVolumeOff />
            ) : volume < 66 ? (
              <FaVolumeDown />
            ) : (
              <FaVolumeUp />
            )}
          </button>

          <input
            type="range"
            min="0"
            max="100"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            disabled={!currentTrack}
            className="w-20 sm:w-24 h-1 bg-[#535353] rounded-lg appearance-none cursor-pointer accent-white disabled:opacity-30 focus:outline-none transition"
            title="Volume"
          />
        </div>

      </div>

      {/* Hidden YouTube player container (always mounted off-screen for background audio) */}
      <div className="absolute left-[-9999px] opacity-0 pointer-events-none w-[1px] h-[1px] overflow-hidden">
        {currentTrack && (
          <YouTube
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
