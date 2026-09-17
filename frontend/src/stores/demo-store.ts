/**
 * Smart switch: demo mode vs production API.
 *
 * - `NEXT_PUBLIC_DEMO_MODE=true`          -> always demo
 * - `?demo=1` / `?demo=0` in the URL      -> force demo / force real (persisted)
 * - otherwise                             -> probe the API once; unreachable => demo
 */
"use client";
import { create } from "zustand";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";
const FORCED = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

interface DemoState {
  enabled: boolean;
  checked: boolean;
  forced: boolean;
  set: (patch: Partial<DemoState>) => void;
}

export const useDemo = create<DemoState>((set) => ({
  enabled: FORCED,
  checked: FORCED,
  forced: FORCED,
  set: (patch) => set(patch),
}));

let probePromise: Promise<boolean> | null = null;

function readOverride(): boolean | null {
  if (typeof window === "undefined") return null;
  const param = new URLSearchParams(window.location.search).get("demo");
  if (param === "1") {
    localStorage.setItem("vod_demo_override", "1");
    return true;
  }
  if (param === "0") {
    localStorage.setItem("vod_demo_override", "0");
    return false;
  }
  const stored = localStorage.getItem("vod_demo_override");
  if (stored === "1") return true;
  if (stored === "0") return false;
  return null;
}

async function probeApi(): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(`${BASE}/api/subscriptions/plans`, { signal: ctrl.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Runs once per session; every `api()` call awaits this before routing. */
export function ensureDemoChecked(): Promise<{ enabled: boolean }> {
  const state = useDemo.getState();
  if (state.checked) return Promise.resolve({ enabled: state.enabled });
  if (!probePromise) {
    probePromise = (async () => {
      if (FORCED) {
        useDemo.getState().set({ enabled: true, checked: true, forced: true });
        return true;
      }
      const override = readOverride();
      if (override !== null) {
        useDemo.getState().set({ enabled: override, checked: true });
        return override;
      }
      const reachable = await probeApi();
      const enabled = !reachable;
      useDemo.getState().set({ enabled, checked: true });
      return enabled;
    })();
  }
  return probePromise.then((enabled) => ({ enabled }));
}

/** Re-run detection (used by the "retry API" button). */
export function recheckDemo(): void {
  probePromise = null;
  if (typeof window !== "undefined") localStorage.removeItem("vod_demo_override");
  useDemo.getState().set({ enabled: FORCED, checked: FORCED });
  if (!FORCED) void ensureDemoChecked();
}
