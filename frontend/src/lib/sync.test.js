import { describe, expect, it } from "vitest";
import { backoffDelay, expectedPosition, formatTime, needsSeek } from "./sync";
import { canControl } from "./roomModes";

describe("expectedPosition", () => {
  it("advances while playing", () => {
    const sync = { currentTime: 10, isPlaying: true, receivedAt: 1000 };
    expect(expectedPosition(sync, 4000)).toBe(13);
  });

  it("holds still while paused", () => {
    const sync = { currentTime: 10, isPlaying: false, receivedAt: 1000 };
    expect(expectedPosition(sync, 4000)).toBe(10);
  });

  it("never goes backwards on clock skew", () => {
    const sync = { currentTime: 10, isPlaying: true, receivedAt: 5000 };
    expect(expectedPosition(sync, 4000)).toBe(10);
  });
});

describe("helpers", () => {
  it("only seeks past the drift tolerance", () => {
    expect(needsSeek(10, 11.5)).toBe(false);
    expect(needsSeek(10, 12.5)).toBe(true);
  });

  it("backs off exponentially up to 30s", () => {
    expect([0, 1, 2, 10].map(backoffDelay)).toEqual([1000, 2000, 4000, 30000]);
  });

  it("formats times", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(125)).toBe("2:05");
  });
});

describe("canControl", () => {
  it("lets everyone control solo playback and open parties", () => {
    expect(canControl({ inRoom: false, isHost: false, mode: null })).toBe(true);
    expect(canControl({ inRoom: true, isHost: false, mode: "open" })).toBe(true);
  });

  it("restricts listening parties to the host", () => {
    expect(canControl({ inRoom: true, isHost: false, mode: "listening" })).toBe(false);
    expect(canControl({ inRoom: true, isHost: true, mode: "listening" })).toBe(true);
  });
});
