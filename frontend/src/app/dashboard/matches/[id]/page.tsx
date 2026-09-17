"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, StatCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Scoreboard } from "@/components/match/Scoreboard";
import { RoundTimeline } from "@/components/match/RoundTimeline";
import { MistakeCard } from "@/components/match/MistakeCard";
import { EconomyChart } from "@/components/charts/EconomyChart";
import { useApi } from "@/hooks/useApi";
import { matchSocket } from "@/lib/socket";
import type { MatchItem, Mistake, PlayerStats, RoundInfo } from "@/types";

export default function MatchDetail() {
  const { id } = useParams<{ id: string }>();
  const match = useApi<MatchItem>(`/api/matches/${id}`);
  const rounds = useApi<RoundInfo[]>(`/api/matches/${id}/rounds`);
  const board = useApi<PlayerStats[]>(`/api/matches/${id}/scoreboard`);
  const mistakes = useApi<Mistake[]>(`/api/matches/${id}/mistakes`);
  const economy = useApi<{ round: number; team: number; enemy: number }[]>(`/api/matches/${id}/economy`);
  const [live, setLive] = useState<{ status: string; progress: number } | null>(null);

  useEffect(() => {
    if (match.data && match.data.status !== "completed") {
      return matchSocket(Number(id), (p) => {
        setLive(p);
        if (p.status === "completed") {
          match.reload();
          rounds.reload();
          board.reload();
          mistakes.reload();
        }
      });
    }
  }, [id, match.data?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!match.data) return <Skeleton className="h-64" />;
  const m = match.data;
  const status = live?.status ?? m.status;
  const progress = live?.progress ?? m.progress;

  if (status !== "completed") {
    return (
      <div>
        <Header title={m.title} subtitle="Processando análise…" />
        <Card className="text-center">
          <p className="text-4xl">⏳</p>
          <p className="mt-2 font-semibold">Analisando demo ({status} — {progress}%)</p>
          <div className="mx-auto mt-3 h-3 max-w-md overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-xs text-gray-400">Extraindo rounds, kills, posições e erros táticos…</p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Header title={m.title} subtitle={`${m.game === "cs2" ? "CS2" : "CrossFire"} • ${m.map_name} • ${m.score_team}–${m.score_enemy}`} />
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link href={`/dashboard/matches/${id}/rounds`} className="rounded-xl bg-white/10 px-3 py-1.5 hover:bg-white/20">🔁 Rounds</Link>
        <Link href={`/dashboard/matches/${id}/heatmaps`} className="rounded-xl bg-white/10 px-3 py-1.5 hover:bg-white/20">🗺️ Heatmaps</Link>
        <Link href={`/dashboard/matches/${id}/vod`} className="rounded-xl bg-white/10 px-3 py-1.5 hover:bg-white/20">🎬 VOD player</Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Placar" value={`${m.score_team} – ${m.score_enemy}`} sub={m.result === "win" ? "✅ Vitória" : "❌ Derrota"} />
        <StatCard label="Duração" value={`${Math.floor(m.duration_seconds / 60)}min`} sub={`${rounds.data?.length ?? 0} rounds`} />
        <StatCard label="Erros táticos" value={String(mistakes.data?.length ?? 0)} sub="detectados automaticamente" />
        <StatCard label="Mapa" value={m.map_name} sub={m.opponent ? `vs ${m.opponent}` : ""} />
      </div>

      <Card className="mt-4">
        <h3 className="mb-3 font-semibold">🔁 Timeline de rounds</h3>
        {rounds.data ? <RoundTimeline matchId={m.id} rounds={rounds.data} /> : <Skeleton className="h-10" />}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-semibold">💰 Economia ao longo da partida</h3>
          {economy.data ? <EconomyChart data={economy.data} /> : <Skeleton className="h-40" />}
        </Card>
        <Card>
          <h3 className="mb-3 font-semibold">🔥 Erros por severidade</h3>
          <div className="flex flex-col gap-2">
            {(["critical", "high", "medium", "low"] as const).map((sev) => {
              const n = (mistakes.data ?? []).filter((x) => x.severity === sev).length;
              return (
                <div key={sev} className="flex items-center gap-3 text-sm">
                  <Badge tone={sev}>{sev.toUpperCase()}</Badge>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-yellow-500" style={{ width: `${mistakes.data?.length ? (n / mistakes.data.length) * 100 : 0}%` }} />
                  </div>
                  <span className="font-bold">{n}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <h3 className="mb-3 mt-6 font-semibold">📊 Scoreboard</h3>
      {board.data ? <Scoreboard rows={board.data} /> : <Skeleton className="h-64" />}

      <h3 className="mb-3 mt-6 font-semibold">⚠️ Erros táticos ({mistakes.data?.length ?? 0})</h3>
      <div className="grid gap-3 lg:grid-cols-2">
        {(mistakes.data ?? []).slice(0, 10).map((x) => <MistakeCard key={x.id} m={x} matchId={m.id} />)}
      </div>
      {(mistakes.data?.length ?? 0) > 10 && (
        <p className="mt-3 text-sm text-gray-400">…e mais {(mistakes.data?.length ?? 0) - 10} erros. Veja todos no VOD player.</p>
      )}
    </div>
  );
}
