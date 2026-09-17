import Link from "next/link";
export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg p-10 text-center">
      <p className="text-4xl">🗺️</p>
      <h1 className="mt-2 text-xl font-bold">Página não encontrada</h1>
      <Link href="/dashboard" className="mt-4 inline-block rounded-xl bg-white/10 px-4 py-2 text-sm">Voltar ao painel</Link>
    </div>
  );
}
