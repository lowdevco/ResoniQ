import React from "react";
import { FaRedo } from "react-icons/fa";
import TrackGrid from "./player/TrackGrid";

const EXPECTED_WAKE_SECONDS = 60;

function WakingCard({ elapsed }) {
  const progress = Math.min(95, (elapsed / EXPECTED_WAKE_SECONDS) * 100);
  return (
    <div className="bg-black/30 border border-white/[0.04] rounded-xl p-5 mb-6 flex items-start gap-4 max-w-xl animate-fade-in">
      <span className="relative flex h-3 w-3 mt-1.5 shrink-0" aria-hidden>
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-brand"></span>
      </span>
      <div className="min-w-0 flex-1">
        <p role="status" className="text-white font-bold">Waking up the server…</p>
        <p className="text-[#b3b3b3] text-sm mt-1">
          Resoniq runs on a free server that sleeps when nobody’s listening. Starting it usually
          takes under a minute, and your music will load as soon as it’s ready.
        </p>
        <div className="mt-4 flex items-center gap-3" aria-hidden>
          <div className="relative flex-1 h-1.5 bg-[#282828] rounded-full overflow-hidden">
            <div
              className="absolute left-0 h-full rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${progress}%`, backgroundColor: "var(--brand-color)" }}
            />
          </div>
          <span className="text-[11px] text-[#a7a7a7] font-mono min-w-[32px] text-right">{elapsed}s</span>
        </div>
      </div>
    </div>
  );
}

function OfflineCard({ onRetry }) {
  return (
    <div role="alert" className="bg-black/30 border border-white/[0.04] rounded-xl p-5 mb-6 max-w-xl animate-fade-in">
      <p className="text-white font-bold">The server isn’t responding</p>
      <p className="text-[#b3b3b3] text-sm mt-1">
        It may still be starting or temporarily down. Check your connection, then try again.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 bg-brand hover:bg-brand-hover text-white font-bold py-2 px-5 rounded-full text-sm transition duration-150 inline-flex items-center gap-2"
      >
        <FaRedo aria-hidden /> Try again
      </button>
    </div>
  );
}

function ServerWake({ status, elapsed, onRetry }) {
  if (status === "offline") {
    return (
      <section className="flex-1 px-4 sm:px-8 pt-8">
        <h2 className="text-white font-bold text-2xl mb-6 tracking-tight">Trending Now</h2>
        <OfflineCard onRetry={onRetry} />
      </section>
    );
  }

  return (
    <div className="flex flex-col w-full h-full">
      <TrackGrid
        title="Trending Now"
        tracks={[]}
        loading
        error=""
        banner={status === "waking" ? <WakingCard elapsed={elapsed} /> : null}
      />
    </div>
  );
}

export default ServerWake;
