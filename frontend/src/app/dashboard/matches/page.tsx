"use client";
import Link from "next/link";
import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/hooks/useApi";
import type { MatchItem } from "@/types";

export default function Matches() {
  const [q, setQ] = useState("");
  const { data, loading } = useApi<MatchItem[]>("/api/matches?per_page=50");
  const filtered = (data ?? []).filter((m) => !q || (m.title + m.opponent + m.map_name).toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <Header title="Partidas" subtitle="Histórico de demos e VODs analisados" />
      <div className="mb-4 flex gap-2">
        <Input placeholder="🔍 Buscar por mapa, adversário…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Link href="/dashboard/matches/upload" className="shrink-0 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-2 text-sm font-semibold">
          ⬆ Enviar
        </Link>
      </div>
      {loading && <div className="grid gap-3"><Skeleton className="h-20" /><Skeleton className="h-20" /></div>}
      <div className="grid gap-3">
        {filtered.map((m) => (
          <Link key={m.id} href={`/dashboard/matches/${m.id}`}>
            <Card className="flex items-center justify-between hover:border-purple-500/50">
              <div>
                <p className="font-semibold">{m.title}</p>
                <p className="text-xs text-gray-400">
                  {m.game === "cs2" ? "🔫 CS2" : "🎖️ CrossFire"} • {m.map_name} • ⏱ {Math.floor(m.duration_seconds / 60)}min
                  {m.tags.map((t) => ` • #${t}`).join("")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-extrabold">{m.score_team}<span className="text-gray-500">–</span>{m.score_enemy}</span>
                {m.status !== "completed" ? (
                  <Badge tone="medium">{`${m.status} ${m.progress}%`}</Badge>
                ) : (
                  <Badge tone={m.mistake_count > 8 ? "high" : "medium"}>{`${m.mistake_count} erros`}</Badge>
                )}
              </div>
            </Card>
          </Link>
        ))}
        {!loading && filtered.length === 0 && (
          <Card className="text-center text-sm text-gray-400">
            Nenhuma partida encontrada. <Link href="/dashboard/matches/upload" className="text-blue-400">Envie sua primeira demo →</Link>
          </Card>
        )}
      </div>
    </div>
  );
}
