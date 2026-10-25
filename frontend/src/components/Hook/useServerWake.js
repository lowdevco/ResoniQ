import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../api";

export const WAKING_AFTER_MS = 1500;
export const GIVE_UP_AFTER_MS = 90000;
const REQUEST_TIMEOUT_MS = 15000;
const RETRY_DELAY_MS = 2000;

let serverKnownAwake = false;

function useServerWake() {
  const [status, setStatus] = useState(serverKnownAwake ? "ready" : "checking");
  const [elapsed, setElapsed] = useState(0);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (serverKnownAwake && attempt === 0) return undefined;
    let cancelled = false;
    let retryTimer = null;
    const started = Date.now();
    setStatus("checking");
    setElapsed(0);

    const tick = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    const wakeTimer = setTimeout(() => {
      if (!cancelled) setStatus((s) => (s === "checking" ? "waking" : s));
    }, WAKING_AFTER_MS);

    const finish = (result) => {
      if (result === "ready") serverKnownAwake = true;
      clearInterval(tick);
      clearTimeout(wakeTimer);
      if (!cancelled) setStatus(result);
    };

    const ping = async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      const response = await apiFetch("/api/health", { signal: controller.signal }).catch(() => null);
      clearTimeout(timeout);
      if (response?.ok) {
        finish("ready");
        return;
      }
      if (cancelled) return;
      if (Date.now() - started >= GIVE_UP_AFTER_MS) {
        finish("offline");
        return;
      }
      retryTimer = setTimeout(ping, RETRY_DELAY_MS);
    };

    ping();

    return () => {
      cancelled = true;
      clearInterval(tick);
      clearTimeout(wakeTimer);
      clearTimeout(retryTimer);
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { status, elapsed, retry };
}

export default useServerWake;
