"use client";
import { useTheme } from "@/stores/theme-store";
import { Moon, Search, Sun } from "@/components/layout/icons";

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const { dark, toggle } = useTheme();
  return (
    <header className="mb-6 flex items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 sm:flex">
          <Search size={16} className="text-gray-500" />
          <input placeholder="Buscar partida, jogador…" className="w-48 bg-transparent text-sm outline-none placeholder:text-gray-500" />
        </div>
        <button onClick={toggle} className="rounded-xl border border-white/10 bg-white/5 p-2 hover:bg-white/10" aria-label="Tema">
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}
