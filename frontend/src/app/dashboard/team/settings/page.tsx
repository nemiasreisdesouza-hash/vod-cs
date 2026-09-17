"use client";
import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import type { Team } from "@/types";

export default function TeamSettings() {
  const { data: teams, reload } = useApi<Team[]>("/api/teams");
  const [name, setName] = useState("");
  const [game, setGame] = useState("cs2");

  const create = async () => {
    if (!name) return;
    await api("/api/teams", { method: "POST", body: JSON.stringify({ name, game }) });
    setName("");
    reload();
  };

  return (
    <div>
      <Header title="Times" subtitle="Criar e gerenciar seus times" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-2 font-semibold">➕ Criar time</h3>
          <div className="flex flex-col gap-2">
            <Input placeholder="Nome do time" value={name} onChange={(e) => setName(e.target.value)} />
            <select value={game} onChange={(e) => setGame(e.target.value)} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
              <option value="cs2">Counter-Strike 2</option>
              <option value="crossfire">CrossFire</option>
            </select>
            <Button onClick={create}>Criar time</Button>
          </div>
        </Card>
        <Card>
          <h3 className="mb-2 font-semibold">📋 Meus times ({teams?.length ?? 0})</h3>
          {(teams ?? []).map((t: Team) => (
            <div key={t.id} className="mb-1 rounded-xl bg-white/[0.03] p-2 text-sm">
              <p className="font-semibold">{t.name} <span className="text-xs text-gray-500">({t.game.toUpperCase()} • {t.member_count} membros)</span></p>
              <p className="text-xs text-gray-500">convite: {t.invite_code}</p>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
