"use client";
import { useParams, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/hooks/useApi";
import { fmtTime } from "@/lib/utils";
import type { RoundInfo } from "@/types";

interface RoundDetail extends RoundInfo {
  players: { player_name: string; kills: number; deaths: number; damage: number; survived: boolean }[];
  kills: { killer: string; victim: string; weapon: string; headshot: boolean; time: number }[];
  utility: { player: string; type: string; effective: boolean }[];
  mistakes: { id: number; title: string; severity: string; description: string; suggestion: string }[];
}

export default function Rounds() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const { data: rounds } = useApi<RoundInfo[]>(`/api/matches/${id}/rounds`);
  const [round, setRound] = useState<number>(Number(search.get("round")) || 1);
  const detail = useApi<{ round: RoundInfo } & Omit<RoundDetail, "id" | "round_number" | "side" | "result" | "win_reason" | "buy_type" | "equip_value_team" | "equip_value_enemy" | "score_team" | "score_enemy" | "timestamp_start">>(
    `/api/matches/${id}/rounds/${round}`
  );
  const d = useMemo(() => detail.data, [detail.data]);

  return (
    <div>
      <Header title={`Rounds — partida #${id}`} subtitle="Análise round a round" />
      <div className="mb-4 flex flex-wrap gap-1.5">
        {(rounds ?? []).map((r) => (
          <button
            key={r.round_number}
            onClick={() => setRound(r.round_number)}
            className={`h-9 w-9 rounded-lg text-xs font-bold ${round === r.round_number ? "bg-purple-500 text-white" : r.result === "win" ? "bg-green-500/60" : "bg-red-500/60"}`}
          >
            {r.round_number}
          </button>
        ))}
      </div>
      {!d ? <Skeleton className="h-64" /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h3 className="font-semibold">Round {d.round.round_number} — {d.round.result === "win" ? "✅ Vitória" : "❌ Derrota"}</h3>
            <p className="text-sm text-gray-400">
              Lado {d.round.side.toUpperCase()} • {d.round.buy_type} • {d.round.win_reason} • ⏱ {fmtTime(d.round.timestamp_start)}
            </p>
            <p className="mt-1 text-sm">💰 Time ${d.round.equip_value_team} × ${d.round.equip_value_enemy} inimigo • Placar {d.round.score_team}–{d.round.score_enemy}</p>
            <h4 className="mb-1 mt-4 text-sm font-semibold">🔫 Kills ({d.kills.length})</h4>
            <div className="flex flex-col gap-1 text-sm">
              {d.kills.map((k, i) => (
                <p key={i} className="text-gray-300">
                  <span className="font-mono text-xs text-gray-500">{fmtTime(k.time)}</span> {k.killer} ▸ {k.victim} <span className="text-gray-500">({k.weapon}{k.headshot ? " 💀HS" : ""})</span>
                </p>
              ))}
              {d.kills.length === 0 && <p className="text-xs text-gray-500">Sem kills registradas.</p>}
            </div>
            <h4 className="mb-1 mt-4 text-sm font-semibold">💨 Utilitárias ({d.utility.length})</h4>
            <div className="flex flex-wrap gap-1">
              {d.utility.map((u, i) => (
                <span key={i} className={`rounded-lg px-2 py-0.5 text-xs ${u.effective ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>
                  {u.player}: {u.type} {u.effective ? "✓" : "✗"}
                </span>
              ))}
            </div>
          </Card>
          <div className="flex flex-col gap-4">
            <Card>
              <h4 className="mb-2 text-sm font-semibold">👥 Jogadores no round</h4>
              <div className="grid grid-cols-2 gap-1 text-xs">
                {d.players.map((p) => (
                  <p key={p.player_name} className="rounded-lg bg-white/[0.03] p-1.5">
                    {p.survived ? "🟢" : "🔴"} {p.player_name} — {p.kills}K/{p.deaths}D • {p.damage} dmg
                  </p>
                ))}
              </div>
            </Card>
            <Card>
              <h4 className="mb-2 text-sm font-semibold">⚠️ Erros do round ({d.mistakes.length})</h4>
              {d.mistakes.map((x) => (
                <div key={x.id} className="mb-2 rounded-xl bg-white/[0.03] p-3 text-sm">
                  <p className="font-semibold">{x.title}</p>
                  <p className="text-xs text-gray-400">{x.description}</p>
                  <p className="mt-1 text-xs text-green-300">✅ {x.suggestion}</p>
                </div>
              ))}
              {d.mistakes.length === 0 && <p className="text-xs text-gray-500">Nenhum erro detectado. Round limpo! 🎉</p>}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
