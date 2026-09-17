"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/stores/auth-store";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import type { PlanInfo } from "@/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function Pricing() {
  const { data: plans } = useApi<PlanInfo[]>("/api/subscriptions/plans");
  const { user } = useAuth();
  const router = useRouter();

  const checkout = async (plan: string) => {
    if (!user) {
      router.push("/register");
      return;
    }
    await api("/api/subscriptions/checkout?plan=" + plan, { method: "POST" });
    window.location.href = "/dashboard";
  };

  return (
    <main className="mx-auto max-w-5xl p-6">
      <nav className="mb-8 flex items-center justify-between">
        <Link href="/" className="font-extrabold">🎯 VOD Analyst Pro</Link>
        <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white">← Voltar</Link>
      </nav>
      <h1 className="text-center text-3xl font-extrabold">Planos</h1>
      <p className="mb-8 text-center text-gray-400">Comece grátis. Evolua quando precisar de análise tática completa.</p>
      <div className="grid gap-4 md:grid-cols-3">
        {(plans ?? []).map((p) => (
          <Card key={p.id} className={p.id === "pro" ? "border-purple-500/50 shadow-purple-500/20" : ""}>
            <p className="text-sm font-bold uppercase text-purple-300">{p.name}</p>
            <p className="mt-1 text-3xl font-extrabold">
              {p.price === 0 ? "Grátis" : `$${p.price}`}
              {p.price > 0 && <span className="text-sm font-normal text-gray-400">/mês</span>}
            </p>
            <ul className="mt-4 flex flex-col gap-2 text-sm text-gray-300">
              {p.features.map((f) => (
                <li key={f}>✅ {f}</li>
              ))}
            </ul>
            <Button className="mt-6 w-full" variant={p.id === "pro" ? "primary" : "ghost"} onClick={() => checkout(p.id)}>
              {user?.plan === p.id ? "Plano atual" : p.price === 0 ? "Começar grátis" : `Assinar ${p.name}`}
            </Button>
          </Card>
        ))}
      </div>
    </main>
  );
}
