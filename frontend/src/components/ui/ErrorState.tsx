"use client";
export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
      <p className="text-red-300">😕 {message}</p>
      {retry && (
        <button onClick={retry} className="mt-3 rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/20">
          Tentar novamente
        </button>
      )}
    </div>
  );
}
