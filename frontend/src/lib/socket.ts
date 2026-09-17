"use client";
import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function matchSocket(matchId: number, onProgress: (p: { status: string; progress: number }) => void) {
  const base = process.env.NEXT_PUBLIC_API_URL ?? ""; // relative -> same-origin proxy to the backend
  // Backend exposes WS at /ws/matches/{id}; poll as fallback if socket.io absent.
  let stopped = false;
  const poll = async () => {
    while (!stopped) {
      try {
        const token = localStorage.getItem("vod_access");
        const res = await fetch(`${base}/api/matches/${matchId}/status`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          onProgress(data);
          if (data.status === "completed" || data.status === "failed") stopped = true;
        }
      } catch {
        /* retry */
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
  };
  poll();
  try {
    socket = io(base, { transports: ["websocket"] });
    socket.on(`match:${matchId}`, onProgress);
  } catch {
    /* polling covers it */
  }
  return () => {
    stopped = true;
    socket?.disconnect();
  };
}
