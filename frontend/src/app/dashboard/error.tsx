"use client";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
      <p className="text-red-300">😕 Falha ao carregar esta seção.</p>
      <button onClick={reset} className="mt-3 rounded-xl bg-white/10 px-4 py-2 text-sm">Tentar novamente</button>
    </div>
  );
}
