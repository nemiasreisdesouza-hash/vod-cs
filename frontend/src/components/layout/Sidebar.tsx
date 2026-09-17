"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Crosshair, LogOut, Settings, Swords, TeamIcon, Upload, Users, Wallet } from "@/components/layout/icons";
import { useAuth } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", label: "Painel", Icon: BarChart3 },
  { href: "/dashboard/matches", label: "Partidas", Icon: Swords },
  { href: "/dashboard/matches/upload", label: "Enviar demo", Icon: Upload },
  { href: "/dashboard/tactics", label: "Táticas", Icon: Crosshair },
  { href: "/dashboard/team", label: "Time", Icon: TeamIcon },
  { href: "/pricing", label: "Planos", Icon: Wallet },
  { href: "/dashboard/settings", label: "Ajustes", Icon: Settings },
];

export function Sidebar() {
  const path = usePathname();
  const { user, logout } = useAuth();
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-white/10 bg-black/30 p-4 md:flex">
      <Link href="/" className="mb-6 flex items-center gap-2 px-2">
        <span className="text-2xl">🎯</span>
        <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-lg font-extrabold text-transparent">
          VOD Analyst Pro
        </span>
      </Link>
      <nav className="flex flex-1 flex-col gap-1">
        {ITEMS.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-gray-300 hover:bg-white/5",
              (path === href || (href !== "/dashboard" && path.startsWith(href))) && "bg-white/10 text-white"
            )}
          >
            <Icon /> {label}
          </Link>
        ))}
      </nav>
      <div className="mt-4 rounded-xl border border-white/10 p-3">
        <p className="truncate text-sm font-semibold">{user?.nickname || user?.name || "…"}</p>
        <p className="text-xs uppercase text-purple-300">{user?.plan ?? "free"}</p>
        <button onClick={logout} className="mt-2 flex items-center gap-2 text-xs text-gray-400 hover:text-white">
          <LogOut /> Sair
        </button>
      </div>
      <div className="mt-3 hidden items-center gap-2 text-xs text-gray-500"><Users /> v1.0.0</div>
    </aside>
  );
}
