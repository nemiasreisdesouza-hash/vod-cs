"use client";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { HeatmapCanvas } from "@/components/heatmap/HeatmapCanvas";
import { useApi } from "@/hooks/useApi";
import type { HeatmapPoint, MatchItem } from "@/types";

const TYPES = [
  { id: "kills", label: "🔫 Kills" },
  { id: "deaths", label: "💀 Deaths" },
  { id: "positions", label: "📍 Posições" },
  { id: "utility", label: "💨 Utilitárias" },
];

export default function Heatmaps() {
  const { id } = useParams<{ id: string }>();
  const [type, setType] = useState("kills");
  const [side, setSide] = useState("all");
  const { data: match } = useApi<MatchItem>(`/api/matches/${id}`);
  const { data, loading } = useApi<{ points: HeatmapPoint[] }>(`/api/matches/${id}/heatmap?type=${type}&side=${side}`);

  return (
    <div>
      <Header title="Heatmaps" subtitle={`${match?.map_name ?? ""} — ${data?.points.length ?? 0} pontos`} />
      <div className="mb-4 flex flex-wrap gap-2">
        {TYPES.map((t) => (
          <button key={t.id} onClick={() => setType(t.id)} className={`rounded-xl px-3 py-1.5 text-sm ${type === t.id ? "bg-purple-500 text-white" : "bg-white/10"}`}>
            {t.label}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          {(["all", "ct", "t"] as const).map((s) => (
            <button key={s} onClick={() => setSide(s)} className={`rounded-xl px-3 py-1.5 text-sm uppercase ${side === s ? "bg-blue-500 text-white" : "bg-white/10"}`}>
              {s === "all" ? "Ambos" : s}
            </button>
          ))}
        </div>
      </div>
      <Card className="flex justify-center">
        {loading || !data ? <Skeleton className="h-[480px] w-full max-w-[640px]" /> : <HeatmapCanvas map={match?.map_name ?? "mirage"} points={data.points} />}
      </Card>
      <p className="mt-2 text-xs text-gray-500">Dica: troque o fundo pela overview oficial do mapa em frontend/public/maps/ para visual profissional.</p>
    </div>
  );
}
