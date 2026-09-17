"use client";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Card, StatCard } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/hooks/useApi";
import type { Team } from "@/types";

interface TeamDash {
  matches: number; win_rate: number;
  ranking: { player: string; rating: number; adr: number; k: number; d: number }[];
}

export default function TeamPage() {
  const { data: teams } = useApi<Team[]>("/api/teams");
  const team = teams?.[0];
  const { data } = useApi<TeamDash>(team ? `/api/dashboard/team/${team.id}` : null);

  return (
    <div>
      <Header title="Dashboard do time" subtitle={team ? `${team.name} • ${team.game.toUpperCase()}` : "Selecione ou crie um time"} />
      {!team ? (
        <Card className="text-center">
          <p className="text-sm text-gray-400">Você ainda não tem um time.</p>
          <Link href="/dashboard/team/settings" className="mt-2 inline-block rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-2 text-sm font-semibold">
            Criar time
          </Link>
        </Card>
      ) : (
        <>
          <div className="mb-4 flex gap-2">
            <Link href="/dashboard/team/members" className="rounded-xl bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20">👥 Membros</Link>
            <Link href="/dashboard/team/settings" className="rounded-xl bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20">⚙️ Configurações</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Partidas" value={String(data?.matches ?? "…")} />
            <StatCard label="Win rate" value={`${data?.win_rate ?? "…"}%`} />
            <StatCard label="Membros" value={String(team.member_count)} sub={`convite: ${team.invite_code}`} />
          </div>
          <Card className="mt-4">
            <h3 className="mb-3 font-semibold">🏆 Ranking do time</h3>
            {!data && <Skeleton className="h-32" />}
            <div className="flex flex-col gap-1">
              {(data?.ranking ?? []).map((p, i) => (
                <Link key={p.player} href={`/dashboard/players/${encodeURIComponent(p.player)}`}
                  className="flex items-center gap-3 rounded-xl p-2 text-sm hover:bg-white/5">
                  <span className="w-6 text-center">{["🥇", "🥈", "🥉"][i] ?? `${i + 1}º`}</span>
                  <span className="flex-1 font-semibold">{p.player}</span>
                  <span className="text-gray-400">{p.k}K/{p.d}D</span>
                  <span className="text-gray-400">ADR {p.adr}</span>
                  <span className="font-bold text-purple-300">{p.rating.toFixed(2)}</span>
                </Link>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
