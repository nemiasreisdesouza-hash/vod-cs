"use client";
import Link from "next/link";
import type { Mistake } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { fmtTime } from "@/lib/utils";

const LABELS: Record<string, string> = {
  missed_trade: "🔫 Trade não realizado",
  slow_rotation: "🔄 Rotação lenta",
  bad_crossfire: "🎯 Crossfire ruim",
  utility_waste: "💨 Utility desperdiçada",
  economy: "💰 Economia",
  bad_postplant: "💣 Pós-plant ruim",
  dry_peek: "👀 Peek seco",
  isolation: "🏝️ Isolamento",
};

export function MistakeCard({ m, matchId }: { m: Mistake; matchId: number }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{LABELS[m.mistake_type] ?? m.mistake_type}</p>
          <p className="text-xs text-gray-400">Round {m.round_number} • {fmtTime(m.timestamp_seconds)}</p>
        </div>
        <Badge tone={m.severity}>{m.severity.toUpperCase()}</Badge>
      </div>
      <p className="mt-2 text-sm text-gray-300">{m.description}</p>
      <p className="mt-2 rounded-xl bg-green-500/10 p-3 text-sm text-green-200">✅ {m.suggestion}</p>
      <Link
        href={`/dashboard/matches/${matchId}/vod?t=${Math.floor(m.timestamp_seconds)}`}
        className="mt-3 inline-block text-sm font-semibold text-blue-400 hover:text-blue-300"
      >
        ▶ Ver no VOD em {fmtTime(m.timestamp_seconds)}
      </Link>
    </Card>
  );
}
