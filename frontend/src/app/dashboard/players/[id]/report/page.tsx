"use client";
import { useParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/hooks/useApi";
import type { PlayerReport } from "@/types";

export default function PlayerReportPage() {
  const { id } = useParams<{ id: string }>();
  const nick = decodeURIComponent(id);
  const { data } = useApi<PlayerReport>(`/api/players/${encodeURIComponent(nick)}/report`);

  const print = () => window.print();

  if (!data) return <div><Header title="Relatório" /><Skeleton className="h-64" /></div>;
  return (
    <div>
      <Header title={`📝 Relatório — ${data.player_name}`} subtitle="Exporte em PDF com Ctrl/Cmd+P" />
      <button onClick={print} className="mb-4 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-2 text-sm font-semibold">
        🖨️ Exportar PDF
      </button>
      <div className="flex flex-col gap-4">
        <Card>
          <h3 className="font-semibold">Resumo executivo</h3>
          <p className="mt-1 text-sm text-gray-300">
            {data.player_name} jogou {data.matches} partidas com rating médio {data.rating.toFixed(2)},
            ADR {data.adr.toFixed(1)} e KAST {data.kast.toFixed(0)}%. Role mais indicada: <b>{data.suggested_role}</b> — {data.role_reason}
          </p>
        </Card>
        <Card>
          <h3 className="font-semibold">Métricas detalhadas</h3>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            {[["Rating", data.rating.toFixed(2)], ["K/D diff", String(data.kd_diff)], ["ADR", data.adr.toFixed(1)],
              ["HS%", data.hs_pct.toFixed(0) + "%"], ["KAST", data.kast.toFixed(0) + "%"], ["Impact", data.impact.toFixed(2)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-white/5 p-2"><p className="text-xs text-gray-500">{k}</p><p className="font-bold">{v}</p></div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="font-semibold">Rotina de treino semanal sugerida</h3>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-gray-300">
            <li>🟦 Segunda/Quarta/Sexta: {data.drills[0]?.title} — {data.drills[0]?.detail}</li>
            <li>🟪 Terça/Quinta: {data.drills[1]?.title ?? "Review de VOD"} — {data.drills[1]?.detail ?? "reveja 3 erros no VOD player"}</li>
            <li>🟩 Sábado: scrim + revisão dos erros da semana com o time</li>
            <li>⬜ Domingo: descanso + 1 vídeo educacional sobre {data.suggested_role}</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
