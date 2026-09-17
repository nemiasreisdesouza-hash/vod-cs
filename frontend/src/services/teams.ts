import { api } from "@/lib/api";
import type { Team, TeamMember } from "@/types";

export const teamService = {
  list: () => api<Team[]>("/api/teams"),
  create: (data: { name: string; game: string }) =>
    api<Team>("/api/teams", { method: "POST", body: JSON.stringify(data) }),
  members: (id: number) => api<TeamMember[]>(`/api/teams/${id}/members`),
};
