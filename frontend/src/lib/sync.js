export const DRIFT_TOLERANCE = 2;

export function expectedPosition(sync, nowMs = Date.now()) {
  if (!sync) return 0;
  if (!sync.isPlaying) return sync.currentTime;
  return sync.currentTime + Math.max(0, nowMs - sync.receivedAt) / 1000;
}

export function needsSeek(actual, expected, tolerance = DRIFT_TOLERANCE) {
  return Math.abs(actual - expected) > tolerance;
}

export function backoffDelay(attempt) {
  return Math.min(30000, 1000 * 2 ** attempt);
}

export function formatTime(secs) {
  if (!secs) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
