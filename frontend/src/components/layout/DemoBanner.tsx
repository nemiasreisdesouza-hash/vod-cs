"use client";
import { recheckDemo, useDemo } from "@/stores/demo-store";

/** Shown whenever the smart switch routes the app to local demo data. */
export function DemoBanner() {
  const { enabled, checked, forced } = useDemo();
  if (!checked || !enabled) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-2.5 text-sm">
      <p className="text-yellow-200">
        🎭 <b>Modo demonstração</b> — API não configurada, exibindo dados simulados.
        {!forced && " Configure as chaves do backend para dados reais."}
      </p>
      {!forced && (
        <button
          onClick={recheckDemo}
          className="rounded-xl bg-yellow-500/20 px-3 py-1 text-xs font-semibold text-yellow-100 hover:bg-yellow-500/30"
        >
          🔌 Tentar conectar API
        </button>
      )}
    </div>
  );
}
