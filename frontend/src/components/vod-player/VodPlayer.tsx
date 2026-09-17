"use client";
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import type { Annotation, Mistake } from "@/types";
import { api } from "@/lib/api";
import { fmtTime } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface Props {
  matchId: number;
  src: string;
  mistakes: Mistake[];
  startAt?: number;
}

export function VodPlayer({ matchId, src, mistakes, startAt = 0 }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [tool, setTool] = useState<"none" | "arrow" | "circle" | "line">("none");
  const [note, setNote] = useState("");
  const [kind, setKind] = useState<"error" | "good" | "note">("note");
  const [drawColor] = useState("#22C55E");

  useEffect(() => {
    api<Annotation[]>(`/api/matches/${matchId}/annotations`).then(setAnnotations).catch(() => {});
  }, [matchId]);

  useEffect(() => {
    if (videoRef.current && startAt > 0) videoRef.current.currentTime = startAt;
  }, [startAt, src]);

  const seek = (t: number) => {
    if (videoRef.current) videoRef.current.currentTime = Math.max(0, t);
  };

  const jump = (dir: 1 | -1) => {
    const marks = [...mistakes.map((m) => m.timestamp_seconds), ...annotations.map((a) => a.timestamp_seconds)].sort((a, b) => a - b);
    const target = dir === 1 ? marks.find((t) => t > time + 1) : [...marks].reverse().find((t) => t < time - 1);
    if (target !== undefined) seek(target);
  };

  const addAnnotation = async () => {
    const ann = await api<Annotation>(`/api/matches/${matchId}/annotations`, {
      method: "POST",
      body: JSON.stringify({ timestamp_seconds: Math.floor(time), kind, text: note, drawings: [] }),
    });
    setAnnotations((a) => [...a, ann].sort((x, y) => x.timestamp_seconds - y.timestamp_seconds));
    setNote("");
  };

  // --- simple drawing overlay ---
  const drawing = useRef<{ x: number; y: number } | null>(null);
  const onDown = (e: ReactMouseEvent) => {
    if (tool === "none") return;
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    drawing.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const onUp = (e: ReactMouseEvent) => {
    const start = drawing.current;
    drawing.current = null;
    if (!start || tool === "none") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const end = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = 3;
    if (tool === "line" || tool === "arrow") {
      ctx.beginPath();
      ctx.moveTo((start.x / rect.width) * canvas.width, (start.y / rect.height) * canvas.height);
      ctx.lineTo((end.x / rect.width) * canvas.width, (end.y / rect.height) * canvas.height);
      ctx.stroke();
      if (tool === "arrow") {
        const ang = Math.atan2(end.y - start.y, end.x - start.x);
        const sx = (end.x / rect.width) * canvas.width;
        const sy = (end.y / rect.height) * canvas.height;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - 14 * Math.cos(ang - 0.4), sy - 14 * Math.sin(ang - 0.4));
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - 14 * Math.cos(ang + 0.4), sy - 14 * Math.sin(ang + 0.4));
        ctx.stroke();
      }
    } else {
      const r = Math.hypot(end.x - start.x, end.y - start.y) * (canvas.width / rect.width);
      ctx.beginPath();
      ctx.arc((start.x / rect.width) * canvas.width, (start.y / rect.height) * canvas.height, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  };
  const clearDraw = () => {
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const markers = [
    ...mistakes.map((m) => ({ t: m.timestamp_seconds, color: m.severity === "low" ? "#EAB308" : "#EF4444", label: m.title })),
    ...annotations.map((a) => ({
      t: a.timestamp_seconds,
      color: a.kind === "error" ? "#EF4444" : a.kind === "good" ? "#22C55E" : "#EAB308",
      label: a.text || a.kind,
    })),
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black">
          {src ? (
            <video
              ref={videoRef}
              src={src}
              className="aspect-video w-full"
              controls={false}
              onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => setDur(e.currentTarget.duration || 0)}
            />
          ) : (
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 text-gray-400">
              <p className="text-4xl">🎬</p>
              <p className="text-sm">Nenhum VOD anexado — demos .dem geram timeline e dados táticos.</p>
              <p className="text-xs">Os marcadores abaixo funcionam com qualquer fonte de vídeo.</p>
            </div>
          )}
          <canvas
            ref={canvasRef}
            width={960}
            height={540}
            onMouseDown={onDown}
            onMouseUp={onUp}
            className="absolute inset-0 h-full w-full"
            style={{ cursor: tool === "none" ? "default" : "crosshair", pointerEvents: tool === "none" ? "none" : "auto" }}
          />
        </div>

        {/* timeline with markers */}
        <div className="mt-3">
          <input
            type="range"
            min={0}
            max={dur || 1000}
            value={Math.min(time, dur || 1000)}
            onChange={(e) => seek(Number(e.target.value))}
            className="w-full accent-purple-500"
          />
          <div className="relative h-2">
            {markers.map((mk, i) => (
              <button
                key={i}
                title={`${fmtTime(mk.t)} — ${mk.label}`}
                onClick={() => seek(mk.t)}
                className="absolute top-0 h-2 w-1.5 rounded"
                style={{ left: `${dur ? (mk.t / dur) * 100 : 0}%`, background: mk.color }}
              />
            ))}
          </div>
        </div>

        {/* controls */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button variant="ghost" onClick={() => jump(-1)}>⏮ Erro anterior</Button>
          <Button onClick={() => (videoRef.current?.paused ? videoRef.current?.play() : videoRef.current?.pause())}>
            {fmtTime(time)} / {fmtTime(dur)}
          </Button>
          <Button variant="ghost" onClick={() => jump(1)}>Próximo erro ⏭</Button>
          {[0.25, 0.5, 1, 1.5, 2].map((s) => (
            <button
              key={s}
              onClick={() => {
                setSpeed(s);
                if (videoRef.current) videoRef.current.playbackRate = s;
              }}
              className={`rounded-lg px-2 py-1 text-xs ${speed === s ? "bg-purple-500 text-white" : "bg-white/10 text-gray-300"}`}
            >
              {s}x
            </button>
          ))}
          <div className="ml-auto flex gap-2">
            {(["none", "arrow", "circle", "line"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTool(t)}
                className={`rounded-lg px-2 py-1 text-xs ${tool === t ? "bg-green-500 text-white" : "bg-white/10 text-gray-300"}`}
              >
                {t === "none" ? "✋" : t === "arrow" ? "➡️" : t === "circle" ? "⭕" : "📏"}
              </button>
            ))}
            <button onClick={clearDraw} className="rounded-lg bg-white/10 px-2 py-1 text-xs text-gray-300">🧹</button>
          </div>
        </div>
      </div>

      {/* side panel */}
      <div className="flex flex-col gap-3">
        <Card>
          <p className="mb-2 text-sm font-semibold">➕ Nova anotação em {fmtTime(time)}</p>
          <div className="mb-2 flex gap-2">
            {(["error", "good", "note"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`rounded-lg px-2 py-1 text-xs ${kind === k ? "bg-blue-500 text-white" : "bg-white/10 text-gray-300"}`}
              >
                {k === "error" ? "🔴 erro" : k === "good" ? "🟢 boa jogada" : "🟡 nota"}
              </button>
            ))}
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Descreva o momento…"
            className="w-full rounded-xl border border-white/10 bg-white/5 p-2 text-sm outline-none"
            rows={2}
          />
          <Button className="mt-2 w-full" onClick={addAnnotation}>Salvar anotação</Button>
        </Card>
        <Card className="max-h-[420px] overflow-y-auto">
          <p className="mb-2 text-sm font-semibold">📍 Marcadores ({markers.length})</p>
          <div className="flex flex-col gap-1">
            {markers.sort((a, b) => a.t - b.t).map((mk, i) => (
              <button key={i} onClick={() => seek(mk.t)} className="flex items-center gap-2 rounded-lg p-1.5 text-left text-xs hover:bg-white/5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: mk.color }} />
                <span className="font-mono text-gray-400">{fmtTime(mk.t)}</span>
                <span className="truncate text-gray-200">{mk.label}</span>
              </button>
            ))}
            {markers.length === 0 && <p className="text-xs text-gray-500">Sem marcadores ainda.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
