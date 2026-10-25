import React, { useCallback, useEffect, useRef, useState } from "react";
import YouTube from "react-youtube";
import { useLocation } from "react-router-dom";
import NowPlaying from "./player/NowPlaying";
import PlayerBar from "./player/PlayerBar";
import TrackGrid from "./player/TrackGrid";
import useTrackSearch from "./Hook/useTrackSearch";
import { expectedPosition, needsSeek } from "../lib/sync";
import { canControl as canControlRoom } from "../lib/roomModes";

const PLAYER_OPTS = {
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

const YT_PLAYING = 1;
const YT_PAUSED = 2;
const YT_ENDED = 0;

function YoutubeMusicSearch({ sendMessage, sync, isHost, mode, inRoom, activeSearchQuery }) {
  const location = useLocation();
  const hideSearch = location.pathname.endsWith("/settings");
  const canControl = canControlRoom({ inRoom, isHost, mode });

  const { tracks, loading, error } = useTrackSearch(activeSearchQuery);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [showNowPlaying, setShowNowPlaying] = useState(false);

  const playerRef = useRef(null);
  const syncRef = useRef(sync);
  const localPauseRef = useRef(false);
  syncRef.current = sync;

  const broadcast = useCallback(
    (type, track, time, playing) => {
      if (inRoom) sendMessage({ type, track, currentTime: time, isPlaying: playing });
    },
    [inRoom, sendMessage]
  );

  const applySync = useCallback(() => {
    const s = syncRef.current;
    const player = playerRef.current;
    if (!s?.track || !player || localPauseRef.current) return;
    const target = expectedPosition(s);
    if (needsSeek(player.getCurrentTime(), target)) {
      player.seekTo(target, true);
      setCurrentTime(target);
    }
    if (s.isPlaying) player.playVideo();
    else player.pauseVideo();
    setIsPlaying(s.isPlaying);
  }, []);

  useEffect(() => {
    if (activeSearchQuery && canControl) setShowNowPlaying(false);
  }, [activeSearchQuery, canControl]);

  useEffect(() => {
    if (!canControl && currentTrack) setShowNowPlaying(true);
  }, [canControl, currentTrack]);

  useEffect(() => {
    if (canControl) localPauseRef.current = false;
  }, [canControl]);

  useEffect(() => {
    playerRef.current = null;
  }, [currentTrack?.videoId]);

  useEffect(() => {
    if (!inRoom || !sync?.track) return;
    if (sync.track.videoId !== currentTrack?.videoId) {
      setCurrentTrack(sync.track);
      setCurrentTime(sync.currentTime);
      setIsPlaying(sync.isPlaying);
      return;
    }
    applySync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sync, inRoom, applySync]);

  useEffect(() => {
    if (!isPlaying) return undefined;
    const interval = setInterval(() => {
      const player = playerRef.current;
      if (player && typeof player.getCurrentTime === "function") {
        setCurrentTime(player.getCurrentTime());
      }
    }, 500);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const togglePlayPause = () => {
    const player = playerRef.current;
    if (!player) return;
    const position = player.getCurrentTime();

    if (!canControl) {
      if (isPlaying) {
        localPauseRef.current = true;
        player.pauseVideo();
        setIsPlaying(false);
      } else {
        localPauseRef.current = false;
        player.playVideo();
        setIsPlaying(true);
        applySync();
      }
      return;
    }

    if (isPlaying) {
      player.pauseVideo();
      setIsPlaying(false);
      broadcast("pause_song", currentTrack, position, false);
    } else {
      player.playVideo();
      setIsPlaying(true);
      broadcast("play_song", currentTrack, position, true);
    }
  };

  const playTrack = (track) => {
    if (!canControl) return;
    if (currentTrack?.videoId === track.videoId) {
      togglePlayPause();
      return;
    }
    setCurrentTrack(track);
    setCurrentTime(0);
    setIsPlaying(true);
    broadcast("play_song", track, 0, true);
  };

  const seek = (time) => {
    const player = playerRef.current;
    if (!canControl || !player) return;
    player.seekTo(time, true);
    setCurrentTime(time);
    broadcast("seek_song", currentTrack, time, isPlaying);
  };

  const neighbourTrack = (step) => {
    if (tracks.length === 0) return null;
    if (step > 0 && isShuffle) {
      return tracks[Math.floor(Math.random() * tracks.length)];
    }
    const index = currentTrack
      ? tracks.findIndex((t) => t.videoId === currentTrack.videoId)
      : -1;
    const next = index + step;
    if (index === -1 || next < 0 || next >= tracks.length) return tracks[0];
    return tracks[next];
  };

  const playNextTrack = () => {
    if (!canControl) return;
    const next = neighbourTrack(1);
    if (next) playTrack(next);
  };

  const playPrevTrack = () => {
    if (!canControl) return;
    const prev = neighbourTrack(-1);
    if (prev) playTrack(prev);
  };

  const handleVolumeChange = (val) => {
    setVolume(val);
    const player = playerRef.current;
    if (!player) return;
    player.setVolume(val);
    if (val > 0 && isMuted) {
      player.unMute();
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    const player = playerRef.current;
    if (!player) return;
    if (isMuted || volume === 0) {
      player.unMute();
      setIsMuted(false);
      player.setVolume(volume);
    } else {
      player.mute();
      setIsMuted(true);
    }
  };

  const onReady = (event) => {
    playerRef.current = event.target;
    setDuration(event.target.getDuration());
    event.target.setVolume(isMuted ? 0 : volume);
    if (inRoom && syncRef.current?.track?.videoId === currentTrack?.videoId) {
      applySync();
    }
  };

  const onStateChange = (event) => {
    if (event.data === YT_PLAYING) {
      setIsPlaying(true);
      setDuration(event.target.getDuration());
    } else if (event.data === YT_PAUSED) {
      setIsPlaying(false);
    } else if (event.data === YT_ENDED) {
      setIsPlaying(false);
      setCurrentTime(0);
      if (isRepeat && canControl) {
        event.target.seekTo(0, true);
        event.target.playVideo();
        setIsPlaying(true);
        broadcast("play_song", currentTrack, 0, true);
      } else if (!inRoom || isHost) {
        playNextTrack();
      }
    }
  };

  return (
    <div className="flex flex-col w-full h-full pb-24">
      <p className="sr-only" role="status" aria-live="polite">
        {currentTrack ? `Now playing: ${currentTrack.title} by ${currentTrack.artist}` : ""}
      </p>
      {!hideSearch && (
        <div className="flex flex-col w-full h-full">
          {showNowPlaying && currentTrack ? (
            <NowPlaying
              track={currentTrack}
              canClose={canControl}
              onClose={() => setShowNowPlaying(false)}
            />
          ) : (
            <TrackGrid
              title={activeSearchQuery ? "Search Results" : "Trending Now"}
              tracks={tracks}
              loading={loading}
              error={error}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              onPlay={playTrack}
              showGuestNotice={inRoom && !canControl}
            />
          )}
        </div>
      )}

      <PlayerBar
        track={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        isMuted={isMuted}
        isShuffle={isShuffle}
        isRepeat={isRepeat}
        expanded={showNowPlaying}
        canControl={canControl}
        onExpand={() => setShowNowPlaying(true)}
        onTogglePlay={togglePlayPause}
        onSeek={seek}
        onNext={playNextTrack}
        onPrev={playPrevTrack}
        onToggleShuffle={() => setIsShuffle(!isShuffle)}
        onToggleRepeat={() => setIsRepeat(!isRepeat)}
        onVolumeChange={handleVolumeChange}
        onToggleMute={toggleMute}
      />

      <div className="absolute left-[-9999px] opacity-0 pointer-events-none w-[1px] h-[1px] overflow-hidden">
        {currentTrack && (
          <YouTube
            key={currentTrack.videoId}
            videoId={currentTrack.videoId}
            opts={PLAYER_OPTS}
            onReady={onReady}
            onStateChange={onStateChange}
          />
        )}
      </div>
    </div>
  );
}

export default YoutubeMusicSearch;
