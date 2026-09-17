"use client";
import { useParams, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Skeleton } from "@/components/ui/Skeleton";
import { VodPlayer } from "@/components/vod-player/VodPlayer";
import { useApi } from "@/hooks/useApi";
import type { MatchItem, Mistake } from "@/types";

export default function VodPage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const { data: match } = useApi<MatchItem>(`/api/matches/${id}`);
  const { data: mistakes } = useApi<Mistake[]>(`/api/matches/${id}/mistakes`);

  if (!match) return <Skeleton className="h-96" />;
  return (
    <div>
      <Header title={`VOD — ${match.title}`} subtitle="Timeline sincronizada com erros e anotações" />
      <VodPlayer
        matchId={match.id}
        src=""
        mistakes={mistakes ?? []}
        startAt={Number(search.get("t")) || 0}
      />
      <p className="mt-3 text-xs text-gray-500">
        Para VODs de CrossFire (.mp4), o player carrega o vídeo automaticamente. Demos .dem do CS2 geram
        a timeline tática — use os marcadores para revisar cada erro com seu time.
      </p>
    </div>
  );
}
