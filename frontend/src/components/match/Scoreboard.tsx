"use client";
import { useMemo, useState } from "react";
import type { PlayerStats } from "@/types";
import { Card } from "@/components/ui/Card";

type Key = keyof PlayerStats;
const COLS: { key: Key; label: string }[] = [
  { key: "player_name", label: "Jogador" },
  { key: "kills", label: "K" },
  { key: "deaths", label: "D" },
  { key: "assists", label: "A" },
  { key: "adr", label: "ADR" },
  { key: "hs_pct", label: "HS%" },
  { key: "kast", label: "KAST" },
  { key: "rating", label: "Rating" },
  { key: "main_weapon", label: "Arma" },
];

export function Scoreboard({ rows }: { rows: PlayerStats[] }) {
  const [sort, setSort] = useState<Key>("rating");
  const [desc, setDesc] = useState(true);
  const sorted = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      const va = a[sort];
      const vb = b[sort];
      const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
      return desc ? -cmp : cmp;
    });
    return arr;
  }, [rows, sort, desc]);
  const best = rows.length ? Math.max(...rows.map((r) => r.rating)) : 0;
  const worst = rows.length ? Math.min(...rows.map((r) => r.rating)) : 0;

  const click = (k: Key) => {
    if (sort === k) setDesc(!desc);
    else {
      setSort(k);
      setDesc(true);
    }
  };

  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-xs uppercase text-gray-400">
            {COLS.map((c) => (
              <th key={c.key} onClick={() => click(c.key)} className="cursor-pointer px-4 py-3 hover:text-white">
                {c.label} {sort === c.key ? (desc ? "▼" : "▲") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr
              key={r.player_name}
              className={
                r.rating === best
                  ? "border-b border-white/5 bg-green-500/10"
                  : r.rating === worst
                    ? "border-b border-white/5 bg-red-500/10"
                    : "border-b border-white/5 hover:bg-white/5"
              }
            >
              <td className="px-4 py-2 font-semibold">
                {r.player_name} <span className="text-xs text-gray-500">({r.team === "team" ? "seu time" : "inimigo"})</span>
              </td>
              <td className="px-4 py-2">{r.kills}</td>
              <td className="px-4 py-2">{r.deaths}</td>
              <td className="px-4 py-2">{r.assists}</td>
              <td className="px-4 py-2">{r.adr.toFixed(1)}</td>
              <td className="px-4 py-2">{r.hs_pct.toFixed(0)}%</td>
              <td className="px-4 py-2">{r.kast.toFixed(0)}%</td>
              <td className="px-4 py-2 font-bold text-purple-300">{r.rating.toFixed(2)}</td>
              <td className="px-4 py-2 text-gray-400">{r.main_weapon}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
