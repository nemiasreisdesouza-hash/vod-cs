"use client";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Card, StatCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { PerfLine } from "@/components/charts/PerfLine";
import { useApi } from "@/hooks/useApi";

interface Overview {
  matches_analyzed: number; win_rate: number; avg_rating: number;
  avg_adr: number; avg_mistakes: number;
  by_map: Record<string, { matches: number; wins: number; win_rate: number }>;
  evolution: { match_id: number; result: string; score: string }[];
}
interface Recent {
  id: number; title: string; game: string; map_name: string; opponent: string;
  score_team: number; score_enemy: number; result: string; status: string; mistakes: number;
}
interface Issue { type: string; count: number; label: string; severity: string }

export default function Dashboard() {
  const ov = useApi<Overview>("/api/dashboard/overview");
  const recent = useApi<Recent[]>("/api/dashboard/recent-matches");
  const issues = useApi<Issue[]>("/api/dashboard/top-issues");

  if (ov.error) return <ErrorState message="Não foi possível carregar o painel." retry={ov.reload} />;

  return (
    <div>
      <Header title="Visão geral" subtitle="Desempenho do seu time e últimas análises" />
      {!ov.data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Rating médio" value={ov.data.avg_rating.toFixed(2)} sub={`${ov.data.matches_analyzed} partidas`} />
            <StatCard label="Win rate" value={`${ov.data.win_rate}%`} sub={`ADR médio ${ov.data.avg_adr}`} />
            <StatCard label="Erros/partida" value={String(ov.data.avg_mistakes)} sub="média de issues táticas" />
            <StatCard label="Mapas jogados" value={String(Object.keys(ov.data.by_map).length)} sub="no período" />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <h3 className="mb-3 font-semibold">📈 Evolução (últimas partidas)</h3>
              <PerfLine
                data={ov.data.evolution.map((e, i) => ({ match_id: i + 1, win: e.result === "win" ? 1 : 0 }))}
                dataKey="win"
                label="Vitória"
              />
            </Card>
            <Card>
              <h3 className="mb-3 font-semibold">🗺️ Win rate por mapa</h3>
              <div className="flex flex-col gap-2">
                {Object.entries(ov.data.by_map).map(([map, v]) => (
                  <div key={map} className="flex items-center gap-3 text-sm">
                    <span className="w-24 capitalize text-gray-300">{map}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500" style={{ width: `${v.win_rate}%` }} />
                    </div>
                    <span className="w-12 text-right text-gray-400">{v.win_rate}%</span>
                  </div>
                ))}
                {Object.keys(ov.data.by_map).length === 0 && <p className="text-sm text-gray-500">Envie sua primeira demo para ver dados.</p>}
              </div>
            </Card>
          </div>
        </>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">🕘 Partidas recentes</h3>
            <Link href="/dashboard/matches" className="text-xs text-blue-400">ver todas →</Link>
          </div>
          <div className="flex flex-col gap-2">
            {(recent.data ?? []).map((m) => (
              <Link key={m.id} href={`/dashboard/matches/${m.id}`} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] p-3 hover:bg-white/5">
                <div>
                  <p className="text-sm font-semibold">{m.title}</p>
                  <p className="text-xs text-gray-400">
                    {m.game === "cs2" ? "CS2" : "CrossFire"} • {m.map_name} • {m.score_team}–{m.score_enemy} {m.result === "win" ? "✅" : m.result === "loss" ? "❌" : "⏳"}
                  </p>
                </div>
                <Badge tone={m.mistakes > 8 ? "high" : m.mistakes > 4 ? "medium" : "low"}>{`${m.mistakes} erros`}</Badge>
              </Link>
            ))}
            {!recent.data && <Skeleton className="h-20" />}
            {recent.data?.length === 0 && (
              <Link href="/dashboard/matches/upload" className="rounded-xl border border-dashed border-white/20 p-6 text-center text-sm text-gray-400 hover:border-purple-400">
                ⬆ Enviar sua primeira demo ou VOD
              </Link>
            )}
          </div>
        </Card>
        <Card>
          <h3 className="mb-3 font-semibold">🔥 Top 5 problemas frequentes</h3>
          <div className="flex flex-col gap-2">
            {(issues.data ?? []).map((iss) => (
              <div key={iss.type} className="flex items-center justify-between rounded-xl bg-white/[0.03] p-3 text-sm">
                <span>{iss.label}</span>
                <span className="flex items-center gap-2">
                  <Badge tone={iss.severity}>{iss.severity}</Badge>
                  <span className="font-bold text-purple-300">×{iss.count}</span>
                </span>
              </div>
            ))}
            {!issues.data && <Skeleton className="h-20" />}
            {issues.data?.length === 0 && <p className="text-sm text-gray-500">Sem dados ainda.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
