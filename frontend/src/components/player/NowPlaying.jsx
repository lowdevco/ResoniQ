import React, { useEffect } from "react";
import { FaChevronDown } from "react-icons/fa";
import TrackImage from "./TrackImage";

function NowPlaying({ track, canClose, onClose }) {
  useEffect(() => {
    if (!canClose) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [canClose, onClose]);

  return (
    <section
      aria-label="Now playing"
      className="absolute inset-0 flex flex-col items-center justify-center gap-5 sm:gap-7 px-6 py-6 overflow-hidden animate-fade-in"
    >
      {canClose && (
        <button
          onClick={onClose}
          className="absolute top-4 left-4 sm:top-6 sm:left-8 text-white hover:text-brand transition p-2 bg-white/5 rounded-full hover:bg-white/10 z-10"
          title="Back to search"
          aria-label="Back to search"
        >
          <FaChevronDown className="text-xl rotate-90" aria-hidden />
        </button>
      )}

      <span className="text-[11px] sm:text-xs text-brand-text uppercase tracking-widest font-bold" aria-hidden>
        Now Playing
      </span>

      <div className="w-[min(78vw,400px,42dvh)] aspect-square shrink-0">
        <TrackImage
          src={track.thumbnail}
          alt=""
          className="w-full h-full rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] object-cover"
        />
      </div>

      <div className="w-[min(78vw,400px)] text-center">
        <h2 className="text-2xl sm:text-3xl text-white font-bold line-clamp-2 break-words tracking-tight">
          {track.title}
        </h2>
        <p className="text-base sm:text-xl text-[#b3b3b3] truncate mt-1 font-medium">{track.artist}</p>
      </div>
    </section>
  );
}

export default NowPlaying;
