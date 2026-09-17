import { demoFetch, demoUpload } from "./demo-data";
import { ensureDemoChecked, useDemo } from "@/stores/demo-store";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? ""; // relative -> same-origin proxy to the backend

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("vod_access");
}

function isNetworkError(e: unknown): boolean {
  return e instanceof TypeError; // fetch throws TypeError on DNS/refused/aborted
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  // SMART SWITCH: no backend keys/reachability => serve everything locally (demo).
  const { enabled } = await ensureDemoChecked();
  if (enabled) return demoFetch(path, init) as T;

  const headers: Record<string, string> = { ...(init.headers as Record<string, string> ?? {}) };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (init.body && typeof init.body === "string" && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers });
  } catch (e) {
    if (isNetworkError(e)) {
      // Backend went away mid-session -> fall back to demo instead of breaking.
      useDemo.getState().set({ enabled: true, checked: true });
      return demoFetch(path, init) as T;
    }
    throw e;
  }
  if (res.status === 401 && typeof window !== "undefined" && !path.startsWith("/api/auth")) {
    localStorage.removeItem("vod_access");
    window.location.href = "/login";
    throw new Error("Sessão expirada");
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Erro ${res.status}`);
  }
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) return undefined as T;
  return (await res.json()) as T;
}

export async function uploadMatch(form: FormData): Promise<{ id: number; [k: string]: unknown }> {
  const { enabled } = await ensureDemoChecked();
  const file = form.get("file");
  const name = file instanceof File ? file.name : "demo.dem";
  if (enabled) {
    // Simulate network latency so the progress UI is visible.
    await new Promise((r) => setTimeout(r, 800));
    const fields: Record<string, string> = {};
    for (const [k, v] of form.entries()) if (typeof v === "string") fields[k] = v;
    return demoUpload(name, fields) as unknown as { id: number; [k: string]: unknown };
  }
  const token = getToken();
  const res = await fetch(`${BASE}/api/matches/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
