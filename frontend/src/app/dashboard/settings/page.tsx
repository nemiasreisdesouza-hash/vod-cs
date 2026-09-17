"use client";
import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/stores/auth-store";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/useApi";

export default function Settings() {
  const { user, fetchMe } = useAuth();
  const sub = useApi<{ plan: string; used: number; limit: number }>("/api/subscriptions/current");
  const [form, setForm] = useState({ name: "", nickname: "", steam_id: "" });
  const [saved, setSaved] = useState(false);

  const save = async () => {
    await api("/api/auth/me", { method: "PUT", body: JSON.stringify(form) });
    setSaved(true);
    fetchMe();
    setTimeout(() => setSaved(false), 2000);
  };

  const cancel = async () => {
    await api("/api/subscriptions/cancel", { method: "POST" });
    sub.reload();
    fetchMe();
  };

  return (
    <div>
      <Header title="Configurações" subtitle="Perfil, integrações e assinatura" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-2 font-semibold">👤 Perfil</h3>
          <p className="mb-3 text-xs text-gray-500">{user?.email} • plano {user?.plan}</p>
          <div className="flex flex-col gap-2">
            <Input placeholder={user?.name || "Nome"} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder={user?.nickname || "Nick"} onChange={(e) => setForm({ ...form, nickname: e.target.value })} />
            <Input placeholder={user?.steam_id || "Steam ID"} onChange={(e) => setForm({ ...form, steam_id: e.target.value })} />
            <Button onClick={save}>Salvar{saved ? " ✓" : ""}</Button>
          </div>
        </Card>
        <Card>
          <h3 className="mb-2 font-semibold">💳 Assinatura</h3>
          <p className="text-sm">Plano: <b className="uppercase text-purple-300">{sub.data?.plan ?? "…"}</b></p>
          <p className="text-sm text-gray-400">Análises usadas: {sub.data?.used ?? 0} / {sub.data?.limit === 10000 ? "∞" : sub.data?.limit}</p>
          <div className="mt-3 flex gap-2">
            <a href="/pricing" className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-2 text-sm font-semibold">Mudar de plano</a>
            {sub.data?.plan !== "free" && (
              <Button variant="danger" onClick={cancel}>Cancelar</Button>
            )}
          </div>
          <h3 className="mb-2 mt-6 font-semibold">🌐 Idioma</h3>
          <p className="text-sm text-gray-400">Português (BR) • English — alternância disponível no release multilíngue.</p>
        </Card>
      </div>
    </div>
  );
}
