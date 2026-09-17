import { api } from "@/lib/api";
import type { MatchItem, Mistake, PlayerStats, RoundInfo } from "@/types";

export const matchService = {
  list: () => api<MatchItem[]>("/api/matches"),
  get: (id: number) => api<MatchItem>(`/api/matches/${id}`),
  rounds: (id: number) => api<RoundInfo[]>(`/api/matches/${id}/rounds`),
  scoreboard: (id: number) => api<PlayerStats[]>(`/api/matches/${id}/scoreboard`),
  mistakes: (id: number) => api<Mistake[]>(`/api/matches/${id}/mistakes`),
  remove: (id: number) => api(`/api/matches/${id}`, { method: "DELETE" }),
};
