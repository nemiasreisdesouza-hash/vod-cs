"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Card, StatCard } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { RadarCompare } from "@/components/charts/RadarCompare";
import { PerfLine } from "@/components/charts/PerfLine";
import { useApi } from "@/hooks/useApi";
import type { PlayerReport } from "@/types";

export default function PlayerProfile() {
  const { id } = useParams<{ id: string }>();
  const nick = decodeURIComponent(id);
  const { data } = useApi<PlayerReport>(`/api/players/${encodeURIComponent(nick)}/report`);

  if (!data) return <div><Header title={nick} /><Skeleton className="h-64" /></div>;

  return (
    <div>
      <Header title={`👤 ${data.player_name}`} subtitle={`${data.matches} partidas • Role sugerida: ${data.suggested_role}`} />
      <div className="mb-4 flex gap-2 text-sm">
        <Link href={`/dashboard/players/${encodeURIComponent(nick)}/report`} className="rounded-xl bg-white/10 px-3 py-1.5 hover:bg-white/20">📝 Relatório completo</Link>
        <Link href={`/dashboard/players/${encodeURIComponent(nick)}/evolution`} className="rounded-xl bg-white/10 px-3 py-1.5 hover:bg-white/20">📈 Evolução</Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Rating 2.0" value={data.rating.toFixed(2)} sub={`K/D diff ${data.kd_diff >= 0 ? "+" : ""}${data.kd_diff}`} />
        <StatCard label="ADR" value={data.adr.toFixed(1)} sub={`Impact ${data.impact.toFixed(2)}`} />
        <StatCard label="HS%" value={`${data.hs_pct.toFixed(0)}%`} sub={`KAST ${data.kast.toFixed(0)}%`} />
        <StatCard label="Role sugerida" value={data.suggested_role} sub={data.role_reason.slice(0, 60)} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-2 font-semibold">🆚 Você vs média pro</h3>
          <RadarCompare
            player={{ rating: data.rating, adr: data.adr, hs_pct: data.hs_pct, kast: data.kast }}
            pro={data.pro_comparison.role_avg}
          />
          <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
            {Object.entries(data.pro_comparison.percentiles).map(([k, v]) => (
              <p key={k} className="rounded-lg bg-white/5 p-1.5">Top {100 - v}% em <b>{k}</b> (P{v})</p>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="mb-2 font-semibold">📈 Evolução do rating</h3>
          <PerfLine data={data.evolution} />
        </Card>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-2 font-semibold">💪 Pontos fortes</h3>
          {data.strengths.map((s, i) => (
            <p key={i} className="mb-1 rounded-xl bg-green-500/10 p-2 text-sm text-green-200">✅ {s.text} ({s.metric}: {s.value} vs pro {s.pro_avg})</p>
          ))}
        </Card>
        <Card>
          <h3 className="mb-2 font-semibold">🎯 Pontos fracos</h3>
          {data.weaknesses.map((s, i) => (
            <p key={i} className="mb-1 rounded-xl bg-red-500/10 p-2 text-sm text-red-200">🔧 {s.text} ({s.metric}: {s.value} vs pro {s.pro_avg})</p>
          ))}
        </Card>
      </div>
      <Card className="mt-4">
        <h3 className="mb-2 font-semibold">🏋️ Plano de melhoria personalizado</h3>
        <div className="grid gap-2 md:grid-cols-3">
          {data.drills.map((d, i) => (
            <div key={i} className="rounded-xl border border-white/10 p-3 text-sm">
              <p className="font-semibold">{d.title}</p>
              <p className="mt-1 text-xs text-gray-400">{d.detail}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
