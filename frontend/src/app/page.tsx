import Link from "next/link";

const FEATURES = [
  { icon: "🎯", title: "Análise tática automática", desc: "8 detectores de erro: trades perdidos, rotações lentas, economia, pós-plant e mais." },
  { icon: "🗺️", title: "Heatmaps interativos", desc: "Kills, mortes, posições e utilitárias sobre os mapas oficiais de CS2 e CrossFire." },
  { icon: "📊", title: "Rating 2.0 e scoreboard", desc: "K/D, ADR, KAST, HS%, impact, clutches e opening duels por jogador e por round." },
  { icon: "🎬", title: "VOD player com anotações", desc: "Timeline de erros clicável, desenho sobre o vídeo e notas compartilhadas." },
  { icon: "🧠", title: "Plano de melhoria", desc: "Pontos fortes/fracos automáticos, role sugerida e rotinas de treino personalizadas." },
  { icon: "🏆", title: "Comparação com pros", desc: "Radar jogador vs média profissional e percentis por métrica." },
];

export default function Landing() {
  return (
    <main>
      <nav className="mx-auto flex max-w-6xl items-center justify-between p-6">
        <span className="text-xl font-extrabold">🎯 <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">VOD Analyst Pro</span></span>
        <div className="flex gap-3">
          <Link href="/login" className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/5">Entrar</Link>
          <Link href="/register" className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-2 text-sm font-semibold">Criar conta</Link>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-10 text-center">
        <p className="mb-4 inline-block rounded-full border border-purple-500/40 bg-purple-500/10 px-4 py-1 text-xs text-purple-300">
          CS2 • CrossFire • Análise automática de demos e VODs
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight sm:text-6xl">
          Descubra <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">onde você erra</span> e suba de nível
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-gray-400">
          Envie sua demo .dem ou VOD .mp4 e receba scoreboard completo, heatmaps,
          erros táticos com timestamp e um plano de melhoria personalizado.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/login?demo=1" className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-3 font-semibold">🎭 Ver demonstração — sem cadastro</Link>
          <Link href="/register" className="rounded-xl border border-white/10 px-6 py-3 hover:bg-white/5">Criar conta grátis</Link>
          <Link href="/pricing" className="rounded-xl border border-white/10 px-6 py-3 hover:bg-white/5">Ver planos</Link>
        </div>
        <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-3 text-left sm:grid-cols-4">
          {[
            ["8", "detectores táticos"],
            ["13", "mapas suportados"],
            ["2.0", "rating HLTV-like"],
            ["∞", "anotações no VOD"],
          ].map(([v, l]) => (
            <div key={l} className="rounded-2xl border border-white/10 bg-card p-4 text-center">
              <p className="text-2xl font-extrabold text-purple-300">{v}</p>
              <p className="text-xs text-gray-400">{l}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-16 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-2xl border border-white/10 bg-card p-6">
            <p className="text-3xl">{f.icon}</p>
            <h3 className="mt-2 font-bold">{f.title}</h3>
            <p className="mt-1 text-sm text-gray-400">{f.desc}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-8 text-center">
          <h2 className="text-2xl font-bold">Pronto para evoluir?</h2>
          <p className="mt-1 text-sm text-gray-300">Contas de demonstração: pro@vod.gg / pro123 • coach@vod.gg / team123 • free@vod.gg / free123</p>
          <Link href="/register" className="mt-4 inline-block rounded-xl bg-white px-6 py-3 font-semibold text-gray-900">Começar agora</Link>
        </div>
      </section>

      <footer className="border-t border-white/10 p-6 text-center text-xs text-gray-500">
        VOD Analyst Pro © 2026 — Feito para jogadores que querem melhorar.
      </footer>
    </main>
  );
}
