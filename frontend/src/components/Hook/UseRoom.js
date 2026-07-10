import { useEffect, useRef, useState } from "react";
import { WS_BASE_URL } from "../../config";

function useRoom(roomCode) {
  const ws = useRef(null);
  const [userCount, setUserCount] = useState(1);
  const [syncedTrack, setSyncedTrack] = useState(null);
  const [syncedTime, setSyncedTime] = useState(0);
  const [syncedIsPlaying, setSyncedIsPlaying] = useState(false);

  useEffect(() => {
    const baseWsUrl = WS_BASE_URL.replace(/^http/, "ws");
    ws.current = new WebSocket(`${baseWsUrl}/ws/room/${roomCode}/`);

    ws.current.onopen = () => {
      console.log("Room WebSocket connected ✅");
    };

    ws.current.onmessage = (e) => {
      const data = JSON.parse(e.data);

      if (data.type === "sync_song") {
        setSyncedTrack(data.track);
        setSyncedTime(data.currentTime);
        setSyncedIsPlaying(data.isPlaying);
      }

      if (data.type === "update_user_count") {
        setUserCount(data.count);
      }
    };

    ws.current.onclose = () => {
      console.log("Room WebSocket disconnected");
    };

    ws.current.onerror = (error) => {
      console.log("WebSocket error:", error);
    };

    return () => {
      ws.current.close();
    };
  }, [roomCode]);

  const sendMessage = (data) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    }
  };

  return {
    userCount,
    syncedTrack,
    syncedTime,
    syncedIsPlaying,
    sendMessage,
  };
}

export default useRoom;
