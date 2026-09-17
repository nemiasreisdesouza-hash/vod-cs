import { api } from "@/lib/api";
import type { User } from "@/types";

export const authService = {
  login: (email: string, password: string) =>
    api<{ access_token: string; refresh_token: string }>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (data: Record<string, string>) =>
    api<{ access_token: string; refresh_token: string }>("/api/auth/register", { method: "POST", body: JSON.stringify(data) }),
  me: () => api<User>("/api/auth/me"),
};
