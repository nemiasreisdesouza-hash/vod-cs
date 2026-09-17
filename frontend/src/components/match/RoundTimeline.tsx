"use client";
import Link from "next/link";
import type { RoundInfo } from "@/types";
import { cn } from "@/lib/utils";

export function RoundTimeline({ matchId, rounds }: { matchId: number; rounds: RoundInfo[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {rounds.map((r) => (
        <Link
          key={r.round_number}
          href={`/dashboard/matches/${matchId}/rounds?round=${r.round_number}`}
          title={`Round ${r.round_number} — ${r.result} (${r.buy_type})`}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold transition hover:scale-110",
            r.result === "win" ? "bg-green-500/80 text-white" : "bg-red-500/80 text-white",
            r.buy_type === "eco" && "opacity-60",
            r.buy_type === "pistol" && "ring-2 ring-purple-400"
          )}
        >
          {r.round_number}
        </Link>
      ))}
    </div>
  );
}
