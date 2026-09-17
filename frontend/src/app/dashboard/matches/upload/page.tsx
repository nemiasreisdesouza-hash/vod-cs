"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { uploadMatch } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import type { Team } from "@/types";

const CS2_MAPS = ["mirage", "inferno", "dust2", "nuke", "overpass", "ancient", "anubis", "vertigo"];
const CF_MAPS = ["black widow", "port", "sub base", "eagle eye", "mexico"];

export default function Upload() {
  const router = useRouter();
  const { data: teams } = useApi<Team[]>("/api/teams");
  const [file, setFile] = useState<File | null>(null);
  const [opponent, setOpponent] = useState("");
  const [teamId, setTeamId] = useState("");
  const [map, setMap] = useState("mirage");
  const [tags, setTags] = useState("scrim");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const game = file?.name.endsWith(".dem") ? "cs2" : "crossfire";

  const submit = async () => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      if (teamId) form.append("team_id", teamId);
      form.append("opponent", opponent);
      form.append("map_name", map);
      form.append("tags", tags);
      const res = await uploadMatch(form);
      router.push(`/dashboard/matches/${res.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Header title="Enviar demo / VOD" subtitle="CS2: .dem (até 600MB) • CrossFire: .mp4 / .mkv" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-white/20 p-10 text-center hover:border-purple-400">
            <p className="text-4xl">📁</p>
            <p className="mt-2 font-semibold">{file ? file.name : "Clique para escolher o arquivo"}</p>
            <p className="text-xs text-gray-400">.dem • .mp4 • .mkv</p>
            <input
              type="file"
              accept=".dem,.mp4,.mkv,.avi"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {file && (
            <p className="mt-2 text-xs text-gray-400">
              {(file.size / 1024 / 1024).toFixed(1)} MB • {game === "cs2" ? "🔫 CS2 (parser de demo)" : "🎖️ CrossFire (visão computacional)"}
            </p>
          )}
        </Card>
        <Card>
          <div className="flex flex-col gap-3">
            <label className="text-sm">Adversário
              <Input value={opponent} onChange={(e) => setOpponent(e.target.value)} placeholder="Ex: MIBR Academy" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">Time
                <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                  <option value="">Sem time</option>
                  {(teams ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </label>
              <label className="text-sm">Mapa
                <select value={map} onChange={(e) => setMap(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                  {[...CS2_MAPS, ...CF_MAPS].map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </label>
            </div>
            <label className="text-sm">Tags (separadas por vírgula)
              <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="scrim, torneio, ranked" />
            </label>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <Button disabled={!file || busy} onClick={submit}>
              {busy ? "Enviando e processando…" : "🚀 Enviar e analisar"}
            </Button>
            <p className="text-xs text-gray-500">O processamento é assíncrono — você pode navegar enquanto a análise roda.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
