import React, { useState, useRef, useEffect } from "react";
import { FaPlay, FaPause, FaRedo, FaStop } from "react-icons/fa";

function MusicSearch() {
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const searchSongs = () => {
    if (query.trim() === "") return;
    setLoading(true);
    fetch(`/music/search?q=${query}`)
      .then((response) => response.json())
      .then((data) => {
        setTracks(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") searchSongs();
  };

  const safePlay = () => {
    const playPromise = audioRef.current.play();
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        console.log("Playback interrupted:", error);
      });
    }
  };

  const playTrack = (track) => {
    if (!track.preview) return;
    if (currentTrack && currentTrack.id === track.id) {
      togglePlayPause();
      return;
    }
    setCurrentTrack(track);
    setCurrentTime(0);
    audioRef.current.src = track.preview;
    safePlay();
    setIsPlaying(true);
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      safePlay();
      setIsPlaying(true);
    }
  };

  const handleSliderChange = (e) => {
    const newTime = parseFloat(e.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (secs) => {
    if (!secs) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <audio ref={audioRef} />

      {/* Search Bar */}
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search for a song..."
          className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={searchSongs}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition duration-200"
        >
          {loading ? "..." : "Search"}
        </button>
      </div>

      {/* Player */}

      {currentTrack && (
        <div className="bg-gray-700 rounded-2xl p-4 flex flex-col gap-3">

          {/* Track */}

          <div className="flex items-center gap-4">
            <img
              src={currentTrack.cover}
              alt={currentTrack.album}
              className="w-16 h-16 rounded-xl object-cover shadow-lg"
            />
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm truncate">
                {currentTrack.title}
              </p>
              <p className="text-gray-400 text-xs truncate">
                {currentTrack.artist}
              </p>
              <p className="text-gray-500 text-xs truncate">
                {currentTrack.album}
              </p>
            </div>

            {/* Preview badge- user warninga */} 

            <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
              30s Preview
            </span>
          </div>

          {/* Slider */}


          <div className="flex flex-col gap-1">
            <input
              type="range"
              min="0"
              max={duration || 30}
              value={currentTime}
              onChange={handleSliderChange}
              className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>


          {/* Controls */}

          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => {
                audioRef.current.currentTime = 0;
                setCurrentTime(0);
              }}
              className="text-gray-400 hover:text-white transition duration-200 text-xl"
            >
              <FaRedo />
            </button>

            <button
              onClick={togglePlayPause}
              className="bg-blue-600 hover:bg-blue-700 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl transition duration-200 shadow-lg"
            >
              {isPlaying ? <FaPause /> : <FaPlay />}
            </button>

            <button
              onClick={() => {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
                setIsPlaying(false);
                setCurrentTime(0);
                setCurrentTrack(null);
              }}
              className="text-gray-400 hover:text-white transition duration-200 text-xl"
            >
              <FaStop />
            </button>
          </div>
        </div>
      )}


      {/* Results */}


      <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
        {tracks.map((track) => (
          <div
            key={track.id}
            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition duration-200 ${
              currentTrack?.id === track.id
                ? "bg-blue-700"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
            onClick={() => playTrack(track)}
          >
            <img
              src={track.cover}
              alt={track.album}
              className="w-12 h-12 rounded-lg object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm truncate">
                {track.title}
              </p>
              <p className="text-gray-400 text-xs truncate">
                {track.artist} — {track.album}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-gray-400 text-xs">
                {formatDuration(track.duration)}
              </span>
              <span className="text-xs">
                {currentTrack?.id === track.id && isPlaying ? (
                  <FaPause />
                ) : (
                  <FaPlay />
                )}
              </span>
            </div>
          </div>
        ))}

        {tracks.length === 0 && query && !loading && (
          <p className="text-gray-500 text-sm text-center py-4">
            No results found. Try another search!
          </p>
        )}
      </div>
    </div>
  );
}

export default MusicSearch;
