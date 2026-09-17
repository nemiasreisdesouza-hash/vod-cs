import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function fmtTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function severityColor(sev: string): string {
  switch (sev) {
    case "critical": return "bg-red-600 text-white";
    case "high": return "bg-red-500/20 text-red-400 border border-red-500/40";
    case "medium": return "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40";
    default: return "bg-blue-500/20 text-blue-400 border border-blue-500/40";
  }
}
