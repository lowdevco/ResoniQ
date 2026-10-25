import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchHealth = vi.fn();
vi.mock("../../api", () => ({ apiFetch: (...args) => fetchHealth(...args) }));

async function loadHook() {
  vi.resetModules();
  const { default: useServerWake } = await import("./useServerWake");
  return renderHook(() => useServerWake());
}

const ok = () => Promise.resolve({ ok: true });
const unavailable = () => Promise.resolve({ ok: false });
const never = (_url, { signal }) =>
  new Promise((_resolve, reject) => {
    signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
  });

describe("useServerWake", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fetchHealth.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is ready straight away when the server answers quickly", async () => {
    fetchHealth.mockImplementation(ok);
    const { result } = await loadHook();
    await act(async () => {});
    expect(result.current.status).toBe("ready");
  });

  it("shows waking after a delay, then becomes ready", async () => {
    let wake;
    fetchHealth.mockImplementationOnce(() => new Promise((resolve) => (wake = resolve)));
    const { result } = await loadHook();
    expect(result.current.status).toBe("checking");

    await act(async () => vi.advanceTimersByTime(1500));
    expect(result.current.status).toBe("waking");

    await act(async () => vi.advanceTimersByTime(3000));
    expect(result.current.elapsed).toBe(4);

    await act(async () => wake({ ok: true }));
    expect(result.current.status).toBe("ready");
  });

  it("retries while the server returns errors", async () => {
    fetchHealth.mockImplementationOnce(unavailable).mockImplementationOnce(unavailable).mockImplementation(ok);
    const { result } = await loadHook();
    await act(async () => {});
    await act(async () => vi.advanceTimersByTime(2000));
    await act(async () => vi.advanceTimersByTime(2000));
    expect(fetchHealth).toHaveBeenCalledTimes(3);
    expect(result.current.status).toBe("ready");
  });

  it("gives up after 90 seconds and can try again", async () => {
    fetchHealth.mockImplementation(never);
    const { result } = await loadHook();
    for (let i = 0; i < 7; i += 1) {
      await act(async () => vi.advanceTimersByTime(15000));
      await act(async () => vi.advanceTimersByTime(2000));
    }
    expect(result.current.status).toBe("offline");

    fetchHealth.mockImplementation(ok);
    await act(async () => result.current.retry());
    expect(result.current.status).toBe("ready");
  });
});
