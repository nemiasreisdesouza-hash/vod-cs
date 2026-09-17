"use client";
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg p-10 text-center">
      <p className="text-4xl">😕</p>
      <h1 className="mt-2 text-xl font-bold">Algo deu errado</h1>
      <p className="mt-1 text-sm text-gray-400">{error.message}</p>
      <button onClick={reset} className="mt-4 rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/20">
        Tentar novamente
      </button>
    </div>
  );
}
