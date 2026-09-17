export type Lang = "pt" | "en";

export const dict = {
  pt: {
    dashboard: "Painel", matches: "Partidas", upload: "Enviar demo/VOD",
    team: "Time", tactics: "Análise tática", players: "Jogadores",
    settings: "Configurações", pricing: "Planos", logout: "Sair",
    overview: "Visão geral", winRate: "Win rate", avgRating: "Rating médio",
    mistakes: "erros", viewAnalysis: "Ver análise", loading: "Carregando…",
  },
  en: {
    dashboard: "Dashboard", matches: "Matches", upload: "Upload demo/VOD",
    team: "Team", tactics: "Tactical analysis", players: "Players",
    settings: "Settings", pricing: "Pricing", logout: "Log out",
    overview: "Overview", winRate: "Win rate", avgRating: "Avg rating",
    mistakes: "mistakes", viewAnalysis: "View analysis", loading: "Loading…",
  },
} as const;
