import React from "react";
import { FaPlay, FaPause, FaMusic } from "react-icons/fa";
import TrackImage from "./TrackImage";

const GRID = "grid max-[450px]:grid-cols-1 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6";

function LoadingGrid() {
  return (
    <div className={GRID} aria-hidden>
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
  );
}

function TrackCard({ track, isCurrent, isPlaying, onPlay, disabled }) {
  const showPause = isCurrent && isPlaying;
  const action = showPause ? "Pause" : "Play";
  return (
    <li>
      <button
        type="button"
        onClick={() => onPlay(track)}
        disabled={disabled}
        aria-label={`${action} ${track.title} by ${track.artist}`}
        aria-current={isCurrent ? "true" : undefined}
        className={`group w-full text-left flex max-[450px]:flex-row max-[450px]:items-center flex-col p-3 sm:p-4 rounded-xl transition-all duration-300 enabled:cursor-pointer enabled:hover:bg-white/[0.04] disabled:cursor-default ${
          isCurrent ? "bg-white/[0.08]" : "bg-transparent"
        }`}
      >
        <span className="relative block max-[450px]:w-14 max-[450px]:h-14 max-[450px]:mb-0 max-[450px]:mr-4 max-[450px]:shrink-0 w-full aspect-square mb-3 sm:mb-4 shadow-lg overflow-hidden rounded-md bg-black border border-white/5">
          <TrackImage
            src={track.thumbnail}
            alt=""
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {!disabled && (
            <span
              aria-hidden
              className={`absolute bottom-2 right-2 max-[450px]:hidden bg-brand text-white w-10 sm:w-12 h-10 sm:h-12 rounded-full flex items-center justify-center shadow-xl shadow-brand/40 transition-all duration-300 transform ${
                showPause
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:translate-y-0"
              } hover:scale-105 hover:bg-blue-500`}
            >
              {showPause ? (
                <FaPause className="text-sm sm:text-lg" />
              ) : (
                <FaPlay className="text-sm sm:text-lg ml-1" />
              )}
            </span>
          )}
          <span aria-hidden className={`absolute inset-0 bg-black/60 hidden max-[450px]:flex items-center justify-center transition-opacity duration-300 ${isCurrent ? 'opacity-100' : 'opacity-0'}`}>
            {showPause ? (
              <FaPause className="text-brand text-xl" />
            ) : (
              <FaPlay className="text-brand text-xl ml-1" />
            )}
          </span>
        </span>

        <span className="flex flex-col min-w-0 flex-1">
          <span
            title={track.title}
            className={`font-bold text-sm sm:text-base line-clamp-2 break-words mb-0.5 sm:mb-1 transition-colors ${
              isCurrent ? "text-brand-text" : "text-white"
            }`}
          >
            {track.title}
          </span>
          <span title={track.artist} className="text-[#a7a7a7] text-xs sm:text-sm font-medium truncate">
            {track.artist}
          </span>
          {isCurrent && (
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#b3b3b3] mt-1">
              {isPlaying ? "Now playing" : "Paused"}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}

function TrackGrid({
  title,
  tracks,
  loading,
  error,
  currentTrack,
  isPlaying,
  onPlay,
  showGuestNotice,
  banner,
}) {
  return (
    <section aria-labelledby="track-grid-heading" aria-busy={loading} className="flex-1 px-4 sm:px-8 pt-8 pb-[120px] overflow-y-auto">
      <h2 id="track-grid-heading" className="text-white font-bold text-2xl mb-6 tracking-tight">{title}</h2>

      {showGuestNotice && (
        <div className="bg-black/30 border border-white/[0.04] rounded-xl px-4 py-3 flex items-center gap-3 mb-6 w-max max-w-full">
          <FaMusic className="text-brand text-sm shrink-0" aria-hidden />
          <p className="text-[#b3b3b3] text-sm font-medium">
            Listening Party — only the host can change songs
          </p>
        </div>
      )}

      {banner}

      {loading ? (
        <>
          <p className="sr-only" role="status">Loading songs…</p>
          <LoadingGrid />
        </>
      ) : error ? (
        <p role="alert" className="text-red-400 text-sm py-8">{error}</p>
      ) : tracks.length > 0 ? (
        <ul className={GRID}>
          {tracks.map((track) => (
            <TrackCard
              key={track.videoId}
              track={track}
              isCurrent={currentTrack?.videoId === track.videoId}
              isPlaying={isPlaying}
              onPlay={onPlay}
              disabled={showGuestNotice}
            />
          ))}
        </ul>
      ) : (
        <p className="text-[#b3b3b3] text-sm py-8">
          No songs found. Try a different song or artist name.
        </p>
      )}
    </section>
  );
}

export default TrackGrid;
