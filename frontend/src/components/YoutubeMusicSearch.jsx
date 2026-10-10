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
    try {
      const response = await apiFetch(`/music/search?q=Trending%20Music%20Hits`);
      const data = await response.json();
      setTracks(data);
    } catch (err) {
      console.error("Default search failed:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDefault();
  }, []);

  useEffect(() => {
    const fetchSearch = async () => {
      if (!activeSearchQuery?.trim()) {
        fetchDefault();
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
        <div className="flex flex-col w-full px-4 sm:px-8 pt-8">
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="animate-pulse flex flex-col gap-3">
                  <div className="w-full aspect-square bg-white/5 rounded-md"></div>
                  <div className="h-4 bg-white/5 rounded w-3/4"></div>
                  <div className="h-3 bg-white/5 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {tracks.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                  {tracks.map((track) => (
                    <div
                      key={track.videoId}
                      onClick={() => playTrack(track)}
                      className={`group flex flex-col p-4 rounded-xl cursor-pointer transition-all duration-300 hover:bg-white/[0.04] ${
                        currentTrack?.videoId === track.videoId ? "bg-white/[0.08]" : "bg-[#181818]/60"
                      }`}
                    >
                      <div className="relative w-full aspect-square mb-4 shadow-lg overflow-hidden rounded-md bg-[#282828]">
                        <img
                          src={track.thumbnail}
                          alt={track.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        {/* Hover Play Button Overlay */}
                        <div
                          className={`absolute bottom-2 right-2 bg-brand text-white w-12 h-12 rounded-full flex items-center justify-center shadow-xl shadow-brand/40 transition-all duration-300 transform ${
                            currentTrack?.videoId === track.videoId && isPlaying
                              ? "opacity-100 translate-y-0"
                              : "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0"
                          } hover:scale-105 hover:bg-blue-500`}
                        >
                          {currentTrack?.videoId === track.videoId && isPlaying ? (
                            <FaPause className="text-lg" />
                          ) : (
                            <FaPlay className="text-lg ml-1" />
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col min-w-0 flex-1">
                        <p
                          className={`font-bold text-base truncate mb-1 transition-colors ${
                            currentTrack?.videoId === track.videoId ? "text-brand" : "text-white"
                          }`}
                        >
                          {track.title}
                        </p>
                        <p className="text-[#a7a7a7] text-sm font-medium truncate">
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

      {/* Persistent Bottom Player */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a] border-t border-white/[0.05] px-4 sm:px-6 py-4 flex items-center justify-between z-50 h-[90px]">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#282828] sm:hidden">
          {currentTrack && (
            <div
              className="h-full bg-brand"
              style={{ width: `${(currentTime / (duration || 180)) * 100}%` }}
            />
          )}
        </div>

        <div className="flex items-center gap-4 w-1/3 min-w-0">
          {currentTrack ? (
            <>
              <img
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                className="w-14 h-14 rounded shadow-lg border border-white/5 bg-black shrink-0"
              />
              <div className="min-w-0 hidden sm:flex flex-col justify-center">
                <h4 className="text-white font-bold text-sm truncate hover:underline cursor-pointer" title={currentTrack.title}>
                  {currentTrack.title}
                </h4>
                <p className="text-[#b3b3b3] text-[11px] font-medium truncate hover:underline cursor-pointer" title={currentTrack.artist}>
                  {currentTrack.artist}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded bg-[#1f1f1f] border border-white/[0.04] flex items-center justify-center shrink-0">
                <FaMusic className="text-[#535353] text-lg" />
              </div>
              <div className="min-w-0 hidden sm:flex flex-col justify-center">
                <h4 className="text-[#b3b3b3] font-bold text-sm truncate">No active track</h4>
                <p className="text-[#535353] text-[11px] font-medium truncate">Select a song to start</p>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col items-center gap-1.5 w-1/3 max-w-[722px]">
          <div className="flex items-center gap-5 sm:gap-6 justify-center w-full select-none">
            <button
              onClick={() => setIsShuffle(!isShuffle)}
              disabled={!currentTrack}
              className={`transition duration-150 focus:outline-none disabled:opacity-30 ${
                isShuffle ? "text-brand hover:text-brand-hover" : "text-[#b3b3b3] hover:text-white"
              }`}
            >
              <FaRandom className="text-sm" />
            </button>
            <button
              onClick={playPrevTrack}
              disabled={!currentTrack || !isHost}
              className="text-[#b3b3b3] hover:text-white disabled:opacity-30 transition duration-150 focus:outline-none"
            >
              <FaStepBackward className="text-lg" />
            </button>
            <button
              onClick={togglePlayPause}
              disabled={!currentTrack || !canControl}
              className="bg-white hover:scale-105 disabled:opacity-30 disabled:scale-100 disabled:cursor-not-allowed text-black w-9 h-9 rounded-full flex items-center justify-center transition duration-150 focus:outline-none shrink-0 shadow-md"
            >
              {isPlaying ? <FaPause className="text-sm" /> : <FaPlay className="text-sm ml-0.5" />}
            </button>
            <button
              onClick={playNextTrack}
              disabled={!currentTrack || !isHost}
              className="text-[#b3b3b3] hover:text-white disabled:opacity-30 transition duration-150 focus:outline-none"
            >
              <FaStepForward className="text-lg" />
            </button>
            <button
              onClick={() => setIsRepeat(!isRepeat)}
              disabled={!currentTrack}
              className={`transition duration-150 focus:outline-none disabled:opacity-30 ${
                isRepeat ? "text-brand hover:text-brand-hover" : "text-[#b3b3b3] hover:text-white"
              }`}
            >
              <FaSync className="text-sm" />
            </button>
          </div>
          <div className="hidden sm:flex w-full items-center gap-2">
            <span className="text-[11px] text-[#a7a7a7] font-mono min-w-[40px] text-right shrink-0">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max={duration || 180}
              value={currentTime}
              onChange={handleSliderChange}
              disabled={!isHost || !currentTrack}
              className="flex-1 h-1 bg-[#4d4d4d] rounded-full appearance-none cursor-pointer accent-white hover:accent-brand disabled:opacity-30 focus:outline-none transition group-hover:bg-[#535353]"
            />
            <span className="text-[11px] text-[#a7a7a7] font-mono min-w-[40px] text-left shrink-0">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 w-1/3 shrink-0">
          <button
            onClick={toggleMute}
            disabled={!currentTrack}
            className="text-[#b3b3b3] hover:text-white transition duration-150 focus:outline-none disabled:opacity-30"
          >
            {isMuted || volume === 0 ? <FaVolumeMute /> : volume < 33 ? <FaVolumeOff /> : volume < 66 ? <FaVolumeDown /> : <FaVolumeUp />}
          </button>
          <input
            type="range"
            min="0"
            max="100"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            disabled={!currentTrack}
            className="w-24 hidden sm:block h-1 bg-[#4d4d4d] rounded-full appearance-none cursor-pointer accent-white hover:accent-brand disabled:opacity-30 focus:outline-none transition"
          />
        </div>
      </div>

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
