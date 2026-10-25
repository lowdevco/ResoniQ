import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useRoom, { ROOM_NOT_FOUND } from "./UseRoom";

class FakeSocket {
  static instances = [];
  static OPEN = 1;

  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.sent = [];
    FakeSocket.instances.push(this);
  }

  send(data) {
    this.sent.push(JSON.parse(data));
  }

  close() {
    this.readyState = 3;
  }

  open() {
    this.readyState = FakeSocket.OPEN;
    this.onopen?.();
  }

  message(data) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  drop(code = 1006) {
    this.readyState = 3;
    this.onclose?.({ code });
  }
}

describe("useRoom", () => {
  beforeEach(() => {
    FakeSocket.instances = [];
    vi.useFakeTimers();
    vi.stubGlobal("WebSocket", FakeSocket);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("connects to the room socket and tracks state", () => {
    const { result } = renderHook(() => useRoom("ABCDEF"));
    const socket = FakeSocket.instances[0];
    expect(socket.url).toMatch(/\/ws\/room\/ABCDEF\/$/);

    act(() => {
      socket.open();
      socket.message({ type: "room_updated", mode: "open" });
      socket.message({ type: "update_user_count", count: 3 });
      socket.message({ type: "sync_song", track: { videoId: "v" }, currentTime: 5, isPlaying: true });
    });

    expect(result.current.connected).toBe(true);
    expect(result.current.mode).toBe("open");
    expect(result.current.userCount).toBe(3);
    expect(result.current.sync).toMatchObject({ currentTime: 5, isPlaying: true });
  });

  it("reconnects with backoff after the connection drops", () => {
    const { result } = renderHook(() => useRoom("ABCDEF"));
    act(() => {
      FakeSocket.instances[0].open();
      FakeSocket.instances[0].drop();
    });
    expect(result.current.connected).toBe(false);
    expect(FakeSocket.instances).toHaveLength(1);

    act(() => vi.advanceTimersByTime(1000));
    expect(FakeSocket.instances).toHaveLength(2);
  });

  it("stops and reports when the room is gone", () => {
    const { result } = renderHook(() => useRoom("ABCDEF"));
    act(() => FakeSocket.instances[0].drop(ROOM_NOT_FOUND));
    act(() => vi.advanceTimersByTime(60000));
    expect(result.current.roomClosed).toBe(true);
    expect(FakeSocket.instances).toHaveLength(1);
  });

  it("sends a heartbeat while connected", () => {
    renderHook(() => useRoom("ABCDEF"));
    const socket = FakeSocket.instances[0];
    act(() => socket.open());
    act(() => vi.advanceTimersByTime(25000));
    expect(socket.sent).toContainEqual({ type: "ping" });
  });

  it("does nothing outside a room", () => {
    renderHook(() => useRoom(undefined));
    expect(FakeSocket.instances).toHaveLength(0);
  });
});
