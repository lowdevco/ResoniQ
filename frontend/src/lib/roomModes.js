export const OPEN = "open";
export const LISTENING = "listening";

export const ROOM_MODES = [
  {
    value: OPEN,
    label: "Open Party",
    description: "Guests can search, play, and skip",
  },
  {
    value: LISTENING,
    label: "Listening Party",
    description: "Host-only control. Immersive view.",
  },
];

export function canControl({ inRoom, isHost, mode }) {
  return !inRoom || isHost || mode === OPEN;
}
