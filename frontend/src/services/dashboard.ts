import { api } from "@/lib/api";

export const dashboardService = {
  overview: () => api("/api/dashboard/overview"),
  recent: () => api("/api/dashboard/recent-matches"),
  topIssues: () => api("/api/dashboard/top-issues"),
};
