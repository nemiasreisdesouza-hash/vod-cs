"use client";
import { useParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { PerfLine } from "@/components/charts/PerfLine";
import { useApi } from "@/hooks/useApi";

export default function Evolution() {
  const { id } = useParams<{ id: string }>();
  const nick = decodeURIComponent(id);
  const { data } = useApi<{ match_id: number; rating: number; adr: number; kast: number }[]>(
    `/api/players/${encodeURIComponent(nick)}/evolution`
  );

  return (
    <div>
      <Header title={`📈 Evolução — ${nick}`} subtitle="Rating, ADR e KAST por partida" />
      {!data ? <Skeleton className="h-64" /> : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card><h3 className="mb-2 text-sm font-semibold">Rating 2.0</h3><PerfLine data={data} dataKey="rating" label="Rating" /></Card>
          <Card><h3 className="mb-2 text-sm font-semibold">ADR</h3><PerfLine data={data} dataKey="adr" label="ADR" /></Card>
          <Card><h3 className="mb-2 text-sm font-semibold">KAST</h3><PerfLine data={data} dataKey="kast" label="KAST" /></Card>
        </div>
      )}
    </div>
  );
}
