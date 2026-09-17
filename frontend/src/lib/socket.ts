"use client";
import { demoFetch } from "./demo-data";
import { ensureDemoChecked } from "@/stores/demo-store";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? ""; // relative -> same-origin proxy to the backend

export function matchSocket(matchId: number, onProgress: (p: { status: string; progress: number }) => void) {
  // Backend exposes WS at /ws/matches/{id}; poll as fallback (or demo data in demo mode).
  let stopped = false;
  const poll = async () => {
    while (!stopped) {
      try {
        const { enabled } = await ensureDemoChecked();
        if (enabled) {
          const data = demoFetch(`/api/matches/${matchId}/status`) as { status: string; progress: number };
          onProgress(data);
          if (data.status === "completed" || data.status === "failed") stopped = true;
        } else {
          const token = localStorage.getItem("vod_access");
          const res = await fetch(`${BASE}/api/matches/${matchId}/status`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (res.ok) {
            const data = await res.json();
            onProgress(data);
            if (data.status === "completed" || data.status === "failed") stopped = true;
          }
        }
      } catch {
        /* retry */
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
  };
  poll();
  return () => {
    stopped = true;
  };
}
