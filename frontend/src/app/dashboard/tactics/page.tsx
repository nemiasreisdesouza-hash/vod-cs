"use client";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/hooks/useApi";
import type { MatchItem, Mistake } from "@/types";

export default function Tactics() {
  const { data: matches } = useApi<MatchItem[]>("/api/matches?per_page=5");
  const firstId = matches?.[0]?.id;
  const { data: mistakes } = useApi<Mistake[]>(firstId ? `/api/matches/${firstId}/mistakes` : null);

  return (
    <div>
      <Header title="Análise tática" subtitle="Todos os erros detectados, agregados e por partida" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h3 className="mb-2 font-semibold">📋 Últimas partidas</h3>
          {!matches && <Skeleton className="h-32" />}
          {(matches ?? []).map((m) => (
            <Link key={m.id} href={`/dashboard/matches/${m.id}`} className="mb-1 flex items-center justify-between rounded-xl bg-white/[0.03] p-2 text-sm hover:bg-white/5">
              <span className="truncate">{m.title}</span>
              <Badge tone={m.mistake_count > 8 ? "high" : "medium"}>{String(m.mistake_count)}</Badge>
            </Link>
          ))}
        </Card>
        <div className="flex flex-col gap-3 lg:col-span-2">
          <h3 className="font-semibold">⚠️ Erros da partida mais recente ({mistakes?.length ?? 0})</h3>
          {!mistakes && <Skeleton className="h-32" />}
          {(mistakes ?? []).map((x) => (
            <Card key={x.id}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{x.title}</p>
                <Badge tone={x.severity}>{x.severity.toUpperCase()}</Badge>
              </div>
              <p className="mt-1 text-sm text-gray-400">Round {x.round_number} • {x.players_involved.join(", ")}</p>
              <p className="mt-1 text-sm text-gray-300">{x.description}</p>
              <p className="mt-2 rounded-xl bg-green-500/10 p-2 text-sm text-green-200">✅ {x.suggestion}</p>
              {firstId && (
                <Link href={`/dashboard/matches/${firstId}/vod?t=${Math.floor(x.timestamp_seconds)}`} className="mt-2 inline-block text-sm text-blue-400">
                  ▶ Ver no VOD
                </Link>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
