"use client";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function EconomyChart({ data }: { data: { round: number; team: number; enemy: number }[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" />
          <XAxis dataKey="round" stroke="#9CA3AF" fontSize={11} />
          <YAxis stroke="#9CA3AF" fontSize={11} />
          <Tooltip contentStyle={{ background: "#1F2937", borderRadius: 12 }} />
          <Legend />
          <Line type="monotone" dataKey="team" name="Seu time ($)" stroke="#3B82F6" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="enemy" name="Inimigo ($)" stroke="#EF4444" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
