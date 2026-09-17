import { api } from "@/lib/api";
import type { PlayerReport } from "@/types";

export const playerService = {
  report: (nick: string) => api<PlayerReport>(`/api/players/${encodeURIComponent(nick)}/report`),
};
