"use client";
import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import type { Team, TeamMember } from "@/types";

const ROLES = ["Entry", "AWPer", "Support", "IGL", "Lurker", "Rifler", "Coach"];

export default function Members() {
  const { data: teams } = useApi<Team[]>("/api/teams");
  const team = teams?.[0];
  const members = useApi<TeamMember[]>(team ? `/api/teams/${team.id}/members` : null);
  const [nick, setNick] = useState("");
  const [role, setRole] = useState("Rifler");
  const [invite, setInvite] = useState("");

  const add = async () => {
    if (!team || !nick) return;
    await api(`/api/teams/${team.id}/members`, { method: "POST", body: JSON.stringify({ nickname: nick, role }) });
    setNick("");
    members.reload();
  };

  const genInvite = async () => {
    if (!team) return;
    const inv = await api<{ code: string }>(`/api/teams/${team.id}/invite`, { method: "POST", body: JSON.stringify({}) });
    setInvite(`${window.location.origin}/dashboard/team/join/${inv.code} (código: ${inv.code})`);
  };

  return (
    <div>
      <Header title="Membros do time" subtitle={team?.name ?? ""} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-2 font-semibold">👥 Membros ({members.data?.length ?? 0})</h3>
          {(members.data ?? []).map((m) => (
            <div key={m.id} className="mb-1 flex items-center justify-between rounded-xl bg-white/[0.03] p-2 text-sm">
              <span className="font-semibold">{m.nickname || "—"}</span>
              <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-xs text-purple-300">{m.role}</span>
            </div>
          ))}
        </Card>
        <div className="flex flex-col gap-4">
          <Card>
            <h3 className="mb-2 font-semibold">➕ Adicionar membro</h3>
            <div className="flex gap-2">
              <Input placeholder="Nick do jogador" value={nick} onChange={(e) => setNick(e.target.value)} />
              <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-xl border border-white/10 bg-white/5 px-2 text-sm">
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <Button onClick={add}>Adicionar</Button>
            </div>
          </Card>
          <Card>
            <h3 className="mb-2 font-semibold">🔗 Convidar por link</h3>
            <Button variant="ghost" onClick={genInvite}>Gerar link de convite</Button>
            {invite && <p className="mt-2 break-all rounded-xl bg-white/5 p-2 text-xs text-gray-300">{invite}</p>}
            {team && <p className="mt-2 text-xs text-gray-500">Ou use o código fixo do time: <b>{team.invite_code}</b></p>}
          </Card>
        </div>
      </div>
    </div>
  );
}
