import { useCallback, useEffect, useRef, useState } from "react";
import { WS_BASE_URL } from "../../config";
import { backoffDelay } from "../../lib/sync";

export const ROOM_NOT_FOUND = 4404;
const HEARTBEAT_MS = 25000;

export function roomSocketUrl(roomCode) {
  const baseWsUrl = WS_BASE_URL.replace(/^http/, "ws");
  const url = `${baseWsUrl}/ws/room/${roomCode}/`;
  const [scheme, rest] = url.split("://");
  return rest === undefined ? url : `${scheme}://${rest.replace(/\/+/g, "/")}`;
}

function useRoom(roomCode) {
  const ws = useRef(null);
  const [userCount, setUserCount] = useState(1);
  const [sync, setSync] = useState(null);
  const [mode, setMode] = useState(null);
  const [connected, setConnected] = useState(false);
  const [roomClosed, setRoomClosed] = useState(false);

  useEffect(() => {
    setSync(null);
    setMode(null);
    setRoomClosed(false);
    setConnected(false);
    if (!roomCode) return;

    let attempt = 0;
    let stopped = false;
    let reconnectTimer = null;
    let heartbeat = null;

    const connect = () => {
      const socket = new WebSocket(roomSocketUrl(roomCode));
      ws.current = socket;

      socket.onopen = () => {
        attempt = 0;
        setConnected(true);
        heartbeat = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "ping" }));
          }
        }, HEARTBEAT_MS);
      };

      socket.onmessage = (e) => {
        let data;
        try {
          data = JSON.parse(e.data);
        } catch {
          return;
        }

        if (data.type === "sync_song") {
          setSync({
            track: data.track,
            currentTime: data.currentTime,
            isPlaying: data.isPlaying,
            receivedAt: Date.now(),
          });
        } else if (data.type === "update_user_count") {
          setUserCount(data.count);
        } else if (data.type === "room_updated") {
          setMode(data.mode);
        } else if (data.type === "room_closed") {
          stopped = true;
          setRoomClosed(true);
        }
      };

      socket.onclose = (e) => {
        clearInterval(heartbeat);
        setConnected(false);
        if (stopped) return;
        if (e.code === ROOM_NOT_FOUND) {
          setRoomClosed(true);
          return;
        }
        reconnectTimer = setTimeout(connect, backoffDelay(attempt));
        attempt += 1;
      };
    };

    connect();

    return () => {
      stopped = true;
      clearTimeout(reconnectTimer);
      clearInterval(heartbeat);
      ws.current?.close();
      ws.current = null;
    };
  }, [roomCode]);

  const sendMessage = useCallback((data) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    }
  }, []);

  return { userCount, sync, mode, connected, roomClosed, sendMessage };
}

export default useRoom;
