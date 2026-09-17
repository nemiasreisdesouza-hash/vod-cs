"use client";
import { useEffect, useRef } from "react";
import type { HeatmapPoint } from "@/types";

export function HeatmapCanvas({ map, points }: { map: string; points: HeatmapPoint[] }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = (canvas.width = 640);
    const H = (canvas.height = 640);
    // Base: dark radar + grid + map label (replace with real overview PNG in production)
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#0B1220");
    g.addColorStop(1, "#131B2E");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath(); ctx.moveTo((i * W) / 8, 0); ctx.lineTo((i * W) / 8, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, (i * H) / 8); ctx.lineTo(W, (i * H) / 8); ctx.stroke();
    }
    // bombsite markers
    ctx.fillStyle = "rgba(139,92,246,0.25)";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText("A", W * 0.78, H * 0.22);
    ctx.fillText("B", W * 0.2, H * 0.78);
    ctx.font = "12px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillText(map.toUpperCase(), 12, H - 12);
    // Heat blobs
    for (const p of points) {
      const x = p.x * W;
      const y = p.y * H;
      const r = 14 + p.w * 22;
      const radial = ctx.createRadialGradient(x, y, 0, x, y, r);
      radial.addColorStop(0, `rgba(239,68,68,${0.55 * p.w + 0.15})`);
      radial.addColorStop(0.5, `rgba(234,179,8,${0.28 * p.w})`);
      radial.addColorStop(1, "rgba(234,179,8,0)");
      ctx.fillStyle = radial;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [map, points]);

  return <canvas ref={ref} className="w-full max-w-[640px] rounded-2xl border border-white/10" />;
}
