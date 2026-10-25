import React from "react";
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
import TrackImage from "./TrackImage";
import { formatTime } from "../../lib/sync";

function VolumeIcon({ muted, volume }) {
  if (muted || volume === 0) return <FaVolumeMute aria-hidden />;
  if (volume < 33) return <FaVolumeOff aria-hidden />;
  if (volume < 66) return <FaVolumeDown aria-hidden />;
  return <FaVolumeUp aria-hidden />;
}

function ToggleDot({ on }) {
  return (
    <span
      aria-hidden
      className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand ${on ? "opacity-100" : "opacity-0"}`}
    />
  );
}

function Seeker({ currentTime, duration, onSeek, disabled, className }) {
  return (
    <input
      type="range"
      min="0"
      max={duration || 180}
      value={currentTime}
      onChange={(e) => onSeek(parseFloat(e.target.value))}
      disabled={disabled}
      aria-label="Seek"
      aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
      className={className}
    />
  );
}

function PlayerBar({
  track,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  isShuffle,
  isRepeat,
  expanded,
  canControl,
  onExpand,
  onTogglePlay,
  onSeek,
  onNext,
  onPrev,
  onToggleShuffle,
  onToggleRepeat,
  onVolumeChange,
  onToggleMute,
}) {
  const progress = `${(currentTime / (duration || 180)) * 100}%`;
  const seekDisabled = !canControl || !track;

  return (
    <section aria-label="Player" className={`fixed bottom-0 left-0 right-0 border-t border-white/[0.05] px-3 sm:px-6 py-3 flex items-center justify-between h-[85px] sm:h-[90px] transition-all duration-300 ${expanded ? 'z-[50] bg-transparent border-transparent' : 'z-50 bg-[#0a0a0a]'}`}>

      {/* Mobile Edge Scrubber */}
      <div className={`range-wrap absolute top-0 left-0 right-0 h-1 sm:hidden ${expanded ? 'hidden' : ''}`}>
        <div className="absolute inset-0 bg-[#282828] w-full h-full">
          <div
            className="h-full transition-colors"
            style={{ width: progress, backgroundColor: 'var(--brand-color)' }}
          />
        </div>
        <Seeker
          currentTime={currentTime}
          duration={duration}
          onSeek={onSeek}
          disabled={seekDisabled}
          className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
        />
      </div>

      {/* Left: Track Info */}
      <div className={`flex items-center gap-3 min-w-0 pr-2 transition-opacity duration-300 ${expanded ? 'max-md:hidden w-1/3 opacity-100' : 'w-auto max-[500px]:flex-1 sm:w-1/3 opacity-100'}`}>
        {track ? (
          <>
            <button
              type="button"
              onClick={onExpand}
              aria-label={`Now playing: ${track.title} by ${track.artist}. Open full view`}
              className="group flex items-center gap-3 min-w-0 text-left rounded-lg"
            >
              <TrackImage
                src={track.thumbnail}
                alt=""
                className="w-12 h-12 sm:w-14 sm:h-14 rounded shadow-md object-cover border border-white/5 shrink-0 group-hover:opacity-80 transition group-hover:scale-105"
              />
              <span className="min-w-0 flex flex-col justify-center">
                <span className="text-white font-bold text-xs sm:text-sm truncate group-hover:underline" title={track.title}>
                  {track.title}
                </span>
                <span className="text-[#b3b3b3] text-[11px] font-medium truncate" title={track.artist}>
                  {track.artist}
                </span>
              </span>
            </button>
          </>
        ) : (
          <>
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded bg-[#1f1f1f] border border-white/[0.04] flex items-center justify-center shrink-0">
              <FaMusic className="text-[#a7a7a7] text-base sm:text-lg" aria-hidden />
            </div>
            <div className="min-w-0 hidden max-[350px]:hidden min-[351px]:flex flex-col justify-center">
              <p className="text-[#b3b3b3] font-bold text-xs sm:text-sm truncate">No active track</p>
              <p className="text-[#a7a7a7] text-[11px] font-medium truncate">Select a song to start</p>
            </div>
          </>
        )}
      </div>

      {/* Middle: Controls */}
      <div className={`flex flex-col md:flex-col-reverse items-center gap-2 transition-all duration-300 ${expanded ? 'w-full max-md:flex-1 md:w-1/3' : 'w-auto max-[500px]:shrink-0 sm:w-1/3'} max-w-[722px]`}>

        {/* Progress Bar */}
        <div className={`w-full items-center gap-2 group ${expanded ? 'flex mb-2 md:mb-0 md:mt-2' : 'hidden sm:flex md:mt-2'}`}>
          <span className="text-[11px] text-[#a7a7a7] font-mono min-w-[40px] text-right shrink-0">
            {formatTime(currentTime)}
          </span>
          <div className="range-wrap relative flex-1 h-1.5 bg-[#282828] rounded-full flex items-center cursor-pointer">
            <div
              className="absolute left-0 h-full bg-brand rounded-full transition-colors group-hover:bg-[#1ed760] sm:group-hover:bg-[#1fdf64]"
              style={{ width: progress, backgroundColor: 'var(--brand-color)' }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 shadow"></div>
            </div>
            <Seeker
              currentTime={currentTime}
              duration={duration}
              onSeek={onSeek}
              disabled={seekDisabled}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
          </div>
          <span className="text-[11px] text-[#a7a7a7] font-mono min-w-[40px] text-left shrink-0">
            {formatTime(duration)}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 justify-center w-full select-none mt-1 sm:mt-0">
          <button
            onClick={onToggleShuffle}
            disabled={!track}
            aria-label="Shuffle"
            aria-pressed={isShuffle}
            className={`${expanded ? "inline-flex" : "hidden sm:inline-flex"} relative rounded-full transition duration-150 disabled:opacity-30 p-2 ${
              isShuffle ? "text-brand hover:text-brand-hover" : "text-[#b3b3b3] hover:text-white"
            }`}
          >
            <FaRandom className="text-sm sm:text-base" aria-hidden />
            <ToggleDot on={isShuffle} />
          </button>
          <button
            onClick={onPrev}
            disabled={!track || !canControl}
            aria-label="Previous song"
            className="rounded-full text-[#b3b3b3] hover:text-white disabled:opacity-30 transition duration-150 p-2"
          >
            <FaStepBackward className="text-lg sm:text-xl" aria-hidden />
          </button>
          <button
            onClick={onTogglePlay}
            disabled={!track}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="bg-white hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] disabled:opacity-30 disabled:scale-100 disabled:shadow-none disabled:cursor-not-allowed text-black w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-200 shrink-0 shadow-[0_0_10px_rgba(255,255,255,0.2)]"
          >
            {isPlaying ? <FaPause className="text-xs sm:text-sm" aria-hidden /> : <FaPlay className="text-xs sm:text-sm ml-0.5 sm:ml-1" aria-hidden />}
          </button>
          <button
            onClick={onNext}
            disabled={!track || !canControl}
            aria-label="Next song"
            className="rounded-full text-[#b3b3b3] hover:text-white disabled:opacity-30 transition duration-150 p-2"
          >
            <FaStepForward className="text-lg sm:text-xl" aria-hidden />
          </button>
          <button
            onClick={onToggleRepeat}
            disabled={!track}
            aria-label="Repeat"
            aria-pressed={isRepeat}
            className={`${expanded ? "inline-flex" : "hidden sm:inline-flex"} relative rounded-full transition duration-150 disabled:opacity-30 p-2 ${
              isRepeat ? "text-brand hover:text-brand-hover" : "text-[#b3b3b3] hover:text-white"
            }`}
          >
            <FaSync className="text-sm sm:text-base" aria-hidden />
            <ToggleDot on={isRepeat} />
          </button>
        </div>
      </div>

      {/* Right: Volume */}
      <div className={`hidden md:flex items-center justify-end gap-3 shrink-0 transition-opacity duration-300 ${expanded ? 'max-md:hidden w-1/3' : 'w-1/3 opacity-100'}`}>
        <button
          onClick={onToggleMute}
          disabled={!track}
          className="rounded-full text-[#b3b3b3] hover:text-white transition duration-150 disabled:opacity-30 p-2"
          title={isMuted ? "Unmute" : "Mute"}
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          <VolumeIcon muted={isMuted} volume={volume} />
        </button>

        <div className="range-wrap relative hidden md:flex w-24 h-1.5 bg-[#282828] rounded-full items-center group cursor-pointer">
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
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            disabled={!track}
            aria-label="Volume"
            aria-valuetext={`${isMuted ? 0 : Math.round(volume)}%`}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
        </div>
      </div>
    </section>
  );
}

export default PlayerBar;
