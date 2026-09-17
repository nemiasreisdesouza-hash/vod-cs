"use client";
import { create } from "zustand";
import type { User } from "@/types";
import { api } from "@/lib/api";

interface AuthState {
  user: User | null;
  loading: boolean;
  fetchMe: () => Promise<void>;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,
  fetchMe: async () => {
    try {
      const user = await api<User>("/api/auth/me");
      set({ user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },
  logout: () => {
    localStorage.removeItem("vod_access");
    localStorage.removeItem("vod_refresh");
    set({ user: null });
    window.location.href = "/login";
  },
}));
