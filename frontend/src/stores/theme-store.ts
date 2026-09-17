"use client";
import { create } from "zustand";

interface ThemeState {
  dark: boolean;
  toggle: () => void;
}

export const useTheme = create<ThemeState>((set) => ({
  dark: true,
  toggle: () =>
    set((s) => {
      const dark = !s.dark;
      document.documentElement.classList.toggle("dark", dark);
      return { dark };
    }),
}));
