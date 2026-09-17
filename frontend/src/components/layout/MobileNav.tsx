"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Crosshair, Swords, TeamIcon, Upload } from "@/components/layout/icons";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", Icon: BarChart3 },
  { href: "/dashboard/matches", Icon: Swords },
  { href: "/dashboard/matches/upload", Icon: Upload },
  { href: "/dashboard/tactics", Icon: Crosshair },
  { href: "/dashboard/team", Icon: TeamIcon },
];

export function MobileNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-white/10 bg-base/95 p-2 backdrop-blur md:hidden">
      {ITEMS.map(({ href, Icon }) => (
        <Link key={href} href={href} className={cn("rounded-xl p-3 text-gray-400", path === href && "bg-white/10 text-white")}>
          <Icon size={20} />
        </Link>
      ))}
    </nav>
  );
}
