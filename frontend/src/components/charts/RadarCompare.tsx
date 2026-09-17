"use client";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";

export function RadarCompare({ player, pro }: { player: Record<string, number>; pro: Record<string, number> }) {
  const keys = ["rating", "adr", "hs_pct", "kast"];
  const maxes: Record<string, number> = { rating: 1.6, adr: 110, hs_pct: 70, kast: 90 };
  const data = keys.map((k) => ({
    metric: k,
    player: Math.round(((player[k] ?? 0) / maxes[k]) * 100),
    pro: Math.round(((pro[k] ?? 0) / maxes[k]) * 100),
  }));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <RadarChart data={data}>
          <PolarGrid stroke="rgba(255,255,255,0.15)" />
          <PolarAngleAxis dataKey="metric" tick={{ fill: "#9CA3AF", fontSize: 11 }} />
          <Radar name="Você" dataKey="player" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.4} />
          <Radar name="Média pro" dataKey="pro" stroke="#22C55E" fill="#22C55E" fillOpacity={0.25} />
          <Tooltip contentStyle={{ background: "#1F2937", borderRadius: 12 }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
