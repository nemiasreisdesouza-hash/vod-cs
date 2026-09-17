/**
 * Demo-mode data layer (the "smart switch" data source).
 *
 * When the site runs WITHOUT backend keys (e.g. plain Vercel deploy),
 * every API call is served locally from this module: no database needed.
 * With keys, `api()` bypasses this file entirely and talks to the real API.
 */
import type {
  Annotation,
  HeatmapPoint,
  MatchItem,
  Mistake,
  PlayerStats,
  RoundInfo,
  Team,
  TeamMember,
  User,
} from "@/types";

// ---------------------------------------------------------------- seeded RNG
function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(r: () => number, arr: T[]): T => arr[Math.floor(r() * arr.length)];

// ------------------------------------------------------------------ constants
const TEAM_PLAYERS = ["FalleN", "fer", "coldzera", "TACO", "fnx"];
const ENEMY_PLAYERS = ["s1mple", "NiKo", "ZywOo", "shox", "dev1ce"];
const WEAPONS = ["AK-47", "M4A4", "AWP", "Deagle", "USP-S", "Glock-18", "SSG-08", "MP9"];

interface MatchDef {
  id: number;
  map: string;
  opponent: string;
  team: number;
  enemy: number;
  tags: string[];
  game: "cs2" | "crossfire";
}

const MATCH_DEFS: MatchDef[] = [
  { id: 1, map: "mirage", opponent: "MIBR Academy", team: 13, enemy: 6, tags: ["scrim"], game: "cs2" },
  { id: 2, map: "inferno", opponent: "FURIA fe", team: 10, enemy: 11, tags: ["torneio"], game: "cs2" },
  { id: 3, map: "dust2", opponent: "paiN Academy", team: 13, enemy: 7, tags: ["scrim"], game: "cs2" },
  { id: 4, map: "nuke", opponent: "Imperial fe", team: 12, enemy: 8, tags: ["torneio"], game: "cs2" },
  { id: 5, map: "ancient", opponent: "RED Canids", team: 12, enemy: 12, tags: ["scrim"], game: "cs2" },
];

export const DEMO_USER: User = {
  id: 9001,
  email: "coach@vod.gg",
  name: "Coach Carter (demo)",
  nickname: "coachc",
  avatar_url: "",
  steam_id: "",
  plan: "team",
};

export const DEMO_TEAM: Team = {
  id: 901,
  name: "VOD Esportas",
  logo_url: "",
  game: "cs2",
  owner_id: DEMO_USER.id,
  invite_code: "demo-2026",
  member_count: 6,
};

const DEMO_MEMBERS: TeamMember[] = [
  ...["FalleN|IGL", "fer|Entry", "coldzera|Rifler", "TACO|Support", "fnx|Lurker"].map((s, i) => {
    const [nickname, role] = s.split("|");
    return { id: 100 + i, team_id: DEMO_TEAM.id, user_id: null, nickname, role };
  }),
  { id: 105, team_id: DEMO_TEAM.id, user_id: DEMO_USER.id, nickname: "coachc", role: "Coach" },
];

const PRO_AVG = { rating: 1.05, adr: 78, hs_pct: 46, kast: 71, impact: 1.05 };

// ------------------------------------------------------------------- matches
export interface DemoKill {
  killer: string;
  victim: string;
  weapon: string;
  headshot: boolean;
  time: number;
}

export interface DemoRoundDetail {
  round: RoundInfo;
  players: { player_name: string; kills: number; deaths: number; damage: number; survived: boolean }[];
  kills: DemoKill[];
  utility: { player: string; type: string; effective: boolean }[];
  mistakes: Mistake[];
}

interface DemoMatch {
  meta: MatchItem;
  rounds: RoundInfo[];
  board: PlayerStats[];
  mistakes: Mistake[];
  details: Map<number, DemoRoundDetail>;
  timeline: { t: number; kind: string; round: number; text: string; severity?: string }[];
}

const MISTAKE_BUILDERS: {
  type: string;
  severity: Mistake["severity"];
  label: string;
  desc: (r: () => number) => string;
  fix: string;
}[] = [
  {
    type: "missed_trade", severity: "high", label: "Trade não realizado",
    desc: (r) => `${pick(r, TEAM_PLAYERS)} morreu sem trade em 5s. Teammate mais próximo a ~${300 + Math.floor(r() * 700)}u.`,
    fix: "Mantenha posicionamento que permita trades: jogue a 1-2s de distância de reação do parceiro.",
  },
  {
    type: "slow_rotation", severity: "high", label: "Rotação lenta",
    desc: (r) => `Rotação após info da bomba levou ~${19 + Math.floor(r() * 8)}s (média pro: ~11s).`,
    fix: "Gire no primeiro contato sólido, não após a morte do âncora.",
  },
  {
    type: "bad_crossfire", severity: "medium", label: "Crossfire mal posicionado",
    desc: () => "Dois jogadores mirando ângulos com menos de 30° de diferença.",
    fix: "Posicione crossfires com 90°+ de diferença entre os ângulos.",
  },
  {
    type: "utility_waste", severity: "medium", label: "Utility desperdiçada",
    desc: (r) => `${pick(r, TEAM_PLAYERS)} usou ${pick(r, ["smoke", "flash", "molotov", "HE"])} sem efeito tático.`,
    fix: "Estude lineups por mapa e coordene o timing com o follow-up do time.",
  },
  {
    type: "economy", severity: "medium", label: "Economia mal gerida",
    desc: (r) => `${pick(r, ["Compra mista quebrando o loss bonus.", "Force buy sem garantir o próximo full buy."])}`,
    fix: "Siga a call do IGL e reserve ~$600 para utilitárias.",
  },
  {
    type: "bad_postplant", severity: "medium", label: "Pós-plant ruim",
    desc: () => "Jogadores muito próximos após o plant, olhando o mesmo ângulo.",
    fix: "Abra o pós-plant: um nega o defuse, outro cobre o retake de ângulo oposto.",
  },
  {
    type: "dry_peek", severity: "low", label: "Peek sem informação",
    desc: (r) => `${pick(r, TEAM_PLAYERS)} peekou sem flash e morreu first.`,
    fix: "Use utility antes de peekar ângulos perigosos.",
  },
  {
    type: "isolation", severity: "high", label: "Isolamento",
    desc: (r) => `${pick(r, TEAM_PLAYERS)} morreu sozinho, sem teammate por perto.`,
    fix: "Evite duelos isolados fora do plano; jogue pelo timing com o time.",
  },
];

function ratingOf(kast: number, kpr: number, dpr: number, impact: number, adr: number): number {
  return Math.max(0.0073 * kast + 0.3591 * kpr - 0.5329 * dpr + 0.2372 * impact + 0.0032 * adr + 0.1587, 0);
}

function genDemoMatch(def: MatchDef): DemoMatch {
  const r = mulberry32(hashSeed(`vod-demo-match-${def.id}`));
  const total = def.team + def.enemy;
  const result = def.team > def.enemy ? "win" : def.team < def.enemy ? "loss" : "draw";

  // Round winners (exact score)
  const wins: boolean[] = [...Array(def.team).fill(true), ...Array(def.enemy).fill(false)];
  for (let i = wins.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [wins[i], wins[j]] = [wins[j], wins[i]];
  }

  const rounds: RoundInfo[] = [];
  const details = new Map<number, DemoRoundDetail>();
  const timeline: DemoMatch["timeline"] = [];
  const killsByPlayer: Record<string, { k: number; d: number; a: number; dmg: number; hs: number; fk: number; fd: number; fa: number; ud: number; kastR: number; weapons: Record<string, number> }> = {};
  for (const p of [...TEAM_PLAYERS, ...ENEMY_PLAYERS]) {
    killsByPlayer[p] = { k: 0, d: 0, a: 0, dmg: 0, hs: 0, fk: 0, fd: 0, fa: 0, ud: 0, kastR: 0, weapons: {} };
  }

  let t = 0;
  let st = 0;
  let se = 0;
  for (let rn = 1; rn <= total; rn++) {
    const win = wins[rn - 1];
    if (win) st++;
    else se++;
    const side = rn <= 12 ? "ct" : "t";
    const buy = rn === 1 || rn === 13 ? "pistol" : pick(r, ["eco", "force", "full", "full", "full"]);
    const baseMap: Record<string, number> = { pistol: 3500, eco: 6000, force: 14000, full: 24000 };
    const base = baseMap[buy] ?? 24000;
    const round: RoundInfo = {
      id: def.id * 100 + rn, round_number: rn, side, result: win ? "win" : "loss",
      win_reason: pick(r, ["elimination", "elimination", "bomb_exploded", "defuse", "time"]),
      buy_type: buy, equip_value_team: Math.max(2000, base + Math.floor((r() - 0.5) * 5000)),
      equip_value_enemy: Math.max(2000, base + Math.floor((r() - 0.5) * 5000)),
      score_team: st, score_enemy: se, timestamp_start: Math.round(t),
    };
    rounds.push(round);

    // Kills of the round
    const aliveA = new Set(TEAM_PLAYERS);
    const aliveB = new Set(ENEMY_PLAYERS);
    const rk: DemoKill[] = [];
    const n = 5 + Math.floor(r() * 6);
    let firstBlood = false;
    for (let i = 0; i < n; i++) {
      if (aliveA.size === 0 || aliveB.size === 0) break;
      const aKills = r() < (win ? 0.62 : 0.38);
      const killer = pick(r, [...(aKills ? aliveA : aliveB)]);
      const victim = pick(r, [...(aKills ? aliveB : aliveA)]);
      (aKills ? aliveB : aliveA).delete(victim);
      const weapon = pick(r, [...WEAPONS, ...WEAPONS, "AWP"]);
      const hs = r() < 0.42;
      const kt = Math.round(t + 15 + r() * 80);
      rk.push({ killer, victim, weapon, headshot: hs, time: kt });
      killsByPlayer[killer].k++;
      killsByPlayer[killer].dmg += 60 + Math.floor(r() * 80);
      killsByPlayer[killer].weapons[weapon] = (killsByPlayer[killer].weapons[weapon] ?? 0) + 1;
      if (hs) killsByPlayer[killer].hs++;
      killsByPlayer[victim].d++;
      if (!firstBlood) {
        killsByPlayer[killer].fk++;
        killsByPlayer[victim].fd++;
        firstBlood = true;
      }
      if (r() < 0.25) {
        const mates = (TEAM_PLAYERS.includes(killer) ? TEAM_PLAYERS : ENEMY_PLAYERS).filter((p) => p !== killer);
        killsByPlayer[pick(r, mates)].a++;
      }
      timeline.push({ t: kt, kind: "kill", round: rn, text: `${killer} ▸ ${victim} (${weapon})` });
    }

    const players = [...TEAM_PLAYERS, ...ENEMY_PLAYERS].map((p) => {
      const s = killsByPlayer[p];
      const roundK = rk.filter((k) => k.killer === p).length;
      const roundD = rk.filter((k) => k.victim === p).length;
      const survived = (TEAM_PLAYERS.includes(p) ? aliveA : aliveB).has(p);
      if (roundK > 0 || roundD === 0) s.kastR++;
      s.fa += r() < 0.12 ? 1 : 0;
      const ud = Math.floor(r() * 45);
      s.ud += ud;
      return { player_name: p, kills: roundK, deaths: roundD, damage: roundK * 85 + Math.floor(r() * 120), survived };
    });
    const utilN = 2 + Math.floor(r() * 5);
    const utility = Array.from({ length: utilN }, () => ({
      player: pick(r, [...TEAM_PLAYERS, ...ENEMY_PLAYERS]),
      type: pick(r, ["smoke", "flash", "he", "molotov"]),
      effective: r() < 0.65,
    }));
    details.set(rn, { round, players, kills: rk, utility, mistakes: [] });
    t += 100 + r() * 50;
  }

  // Scoreboard
  const board: PlayerStats[] = [...TEAM_PLAYERS, ...ENEMY_PLAYERS].map((p) => {
    const s = killsByPlayer[p];
    const kast = Math.min(95, Math.max(38, Math.round((100 * s.kastR) / total)));
    const adr = Math.round((s.dmg / total) * 10) / 10;
    const kpr = s.k / total;
    const dpr = s.d / total;
    const impact = Math.max(0.3, Math.round(((s.k + s.a * 0.5) / total + 0.35) * 100) / 100);
    const weapons = Object.entries(s.weapons);
    return {
      player_name: p, team: TEAM_PLAYERS.includes(p) ? "team" : "enemy",
      kills: s.k, deaths: s.d, assists: s.a, adr,
      hs_pct: s.k ? Math.round((100 * s.hs) / s.k) : 0, kast,
      rating: Math.round(ratingOf(kast, kpr, dpr, impact, adr) * 100) / 100,
      impact, flash_assists: s.fa, utility_damage: s.ud,
      first_kills: s.fk, first_deaths: s.fd,
      clutches_won: s.k >= 16 && r() < 0.7 ? 1 : 0, clutches_attempted: s.k >= 16 ? 1 : 0,
      main_weapon: weapons.length ? weapons.sort((a, b) => b[1] - a[1])[0][0] : "AK-47",
    };
  });

  // Mistakes (~14-22 per match)
  const mistakes: Mistake[] = [];
  const mCount = 14 + Math.floor(r() * 9);
  for (let i = 0; i < mCount; i++) {
    const b = MISTAKE_BUILDERS[Math.floor(r() * MISTAKE_BUILDERS.length)];
    const rn = 1 + Math.floor(r() * total);
    const ts = Math.round(rounds[rn - 1].timestamp_start + 20 + r() * 70);
    const m: Mistake = {
      id: def.id * 1000 + i, round_number: rn, mistake_type: b.type, severity: b.severity,
      timestamp_seconds: ts, title: `${b.label} — round ${rn}`, description: b.desc(r),
      players_involved: [pick(r, TEAM_PLAYERS)], suggestion: b.fix,
      diagram: { round: rn },
    };
    mistakes.push(m);
    details.get(rn)?.mistakes.push(m);
    timeline.push({ t: ts, kind: "mistake", round: rn, text: m.title, severity: b.severity });
  }
  mistakes.sort((a, b) => a.round_number - b.round_number || a.timestamp_seconds - b.timestamp_seconds);
  timeline.sort((a, b) => a.t - b.t);

  const meta: MatchItem = {
    id: def.id, game: def.game, map_name: def.map, opponent: def.opponent,
    title: `vs ${def.opponent} — ${def.map}`, score_team: def.team, score_enemy: def.enemy,
    result, duration_seconds: Math.round(t), status: "completed", progress: 100,
    tags: def.tags, team_id: DEMO_TEAM.id, mistake_count: mistakes.length,
  };
  return { meta, rounds, board, mistakes, details, timeline };
}

const matchCache = new Map<number, DemoMatch>();
const processing = new Map<number, number>(); // id -> progress 0..100
let uploadCounter = 0;

function getMatch(id: number): DemoMatch | undefined {
  if (matchCache.has(id)) return matchCache.get(id);
  const def = MATCH_DEFS.find((d) => d.id === id);
  if (!def) return undefined;
  const m = genDemoMatch(def);
  matchCache.set(id, m);
  return m;
}

function allMetas(): MatchItem[] {
  const metas = MATCH_DEFS.map((d) => {
    const m = getMatch(d.id);
    if (!m) throw new Error("demo match missing");
    return m.meta;
  });
  // uploads (newest first)
  const uploads: MatchItem[] = [];
  for (const [id, prog] of [...processing.entries()].sort((a, b) => b[0] - a[0])) {
    const m = matchCache.get(id);
    if (m) uploads.push({ ...m.meta, status: prog >= 100 ? "completed" : "processing", progress: prog });
  }
  return [...uploads, ...metas];
}

// ------------------------------------------------------------------- heatmap
function heatPoints(matchId: number, type: string): HeatmapPoint[] {
  const r = mulberry32(hashSeed(`heat-${matchId}-${type}`));
  const clusters = type === "utility"
    ? [{ x: 0.5, y: 0.4 }, { x: 0.62, y: 0.55 }]
    : [{ x: 0.78, y: 0.22 }, { x: 0.2, y: 0.78 }, { x: 0.5, y: 0.5 }, { x: 0.65, y: 0.35 }];
  const n = type === "positions" ? 400 : 130;
  const pts: HeatmapPoint[] = [];
  for (let i = 0; i < n; i++) {
    const c = clusters[Math.floor(r() * clusters.length)];
    const spread = type === "positions" ? 0.16 : 0.09;
    pts.push({
      x: Math.min(0.98, Math.max(0.02, c.x + (r() - 0.5) * 2 * spread)),
      y: Math.min(0.98, Math.max(0.02, c.y + (r() - 0.5) * 2 * spread)),
      w: type === "positions" ? 0.35 : 0.6 + r() * 0.4,
    });
  }
  return pts;
}

// --------------------------------------------------------------- player data
function playerBoards(nick: string): { match_id: number; row: PlayerStats }[] {
  const out: { match_id: number; row: PlayerStats }[] = [];
  for (const d of MATCH_DEFS) {
    const m = getMatch(d.id);
    const row = m?.board.find((b) => b.player_name === nick);
    if (m && row) out.push({ match_id: d.id, row });
  }
  return out;
}

function buildReport(nick: string) {
  const boards = playerBoards(nick);
  const rows = boards.length ? boards.map((b) => b.row) : null;
  const avg = (f: (p: PlayerStats) => number, fallback: number) =>
    rows ? rows.reduce((s, p) => s + f(p), 0) / rows.length : fallback;
  const rating = avg((p) => p.rating, 1.02);
  const adr = avg((p) => p.adr, 74);
  const hs = avg((p) => p.hs_pct, 44);
  const kast = avg((p) => p.kast, 68);
  const impact = avg((p) => p.impact, 1.0);
  const kd = rows ? rows.reduce((s, p) => s + (p.kills - p.deaths), 0) : 3;
  const fa = rows ? rows.reduce((s, p) => s + p.flash_assists, 0) : 2;
  const ud = rows ? rows.reduce((s, p) => s + p.utility_damage, 0) : 150;
  const fk = rows ? rows.reduce((s, p) => s + p.first_kills, 0) : 2;
  const mainWeapon = rows ? rows.slice().sort((a, b) => b.kills - a.kills)[0].main_weapon : "AK-47";

  const metrics = [
    { metric: "rating", value: rating, pro: PRO_AVG.rating, good: "Rating acima da média pro", bad: "Rating abaixo da média pro — consistência é o foco", drill: "aim" },
    { metric: "adr", value: adr, pro: PRO_AVG.adr, good: "Dano por round sólido", bad: "ADR baixo: busque mais contato útil por round", drill: "aim" },
    { metric: "hs%", value: hs, pro: PRO_AVG.hs_pct, good: "Precisão de HS excelente", bad: "HS% baixo: treine mira na altura da cabeça", drill: "aim" },
    { metric: "kast", value: kast, pro: PRO_AVG.kast, good: "Muito consistente (KAST alto)", bad: "KAST baixo: jogue mais com o time", drill: "positioning" },
    { metric: "impact", value: impact, pro: PRO_AVG.impact, good: "Alto impact nos rounds", bad: "Impact baixo: participe das jogadas decisivas", drill: "opener" },
  ];
  const strengths = metrics.filter((m) => m.value >= m.pro).map((m) => ({ metric: m.metric, value: +m.value.toFixed(2), pro_avg: m.pro, text: m.good }));
  const weaknesses = metrics.filter((m) => m.value < m.pro).map((m) => ({ metric: m.metric, value: +m.value.toFixed(2), pro_avg: m.pro, text: m.bad, drill: m.drill }));
  if (ud < 300) weaknesses.push({ metric: "utility", value: ud, pro_avg: 600, text: "Pouco dano de utility — use mais granadas", drill: "utility" });
  else strengths.push({ metric: "utility", value: ud, pro_avg: 600, text: "Bom uso de utilitárias" });

  let role = "Rifler";
  let reason = "Perfil equilibrado de rifler.";
  if (mainWeapon === "AWP" && impact >= 1.0) { role = "AWPer"; reason = "Alto impact com AWP como arma principal."; }
  else if (fk >= 6) { role = "Entry Fragger"; reason = "Muitos opening kills e estilo agressivo."; }
  else if (fa >= 5 || ud > 800) { role = "Support"; reason = "Habilita o time com flashes e utility."; }
  else if (kast >= 70) { role = "Lurker"; reason = "Alto KAST e sobrevivência com impact decisivo."; }

  const DRILLS: Record<string, { title: string; detail: string; kind: string }> = {
    aim: { title: "Rotina de mira (15 min/dia)", detail: "Aim Botz: 100 kills/dia + 10 min de DM só HS.", kind: "aim" },
    positioning: { title: "Posicionamento e trades", detail: "Reveja 3 rounds com erro de trade/semana no VOD player.", kind: "tactics" },
    opener: { title: "Duelos de abertura", detail: "DM de entry 20 min com counter-strafe.", kind: "gameplay" },
    utility: { title: "Lineups essenciais", detail: "3 smokes + 2 flashes por mapa do pool.", kind: "utility" },
  };
  const drills = weaknesses.slice(0, 3).map((w) => DRILLS[(w as { drill?: string }).drill ?? "aim"] ?? DRILLS.aim);
  const percentiles: Record<string, number> = {
    rating: Math.min(97, Math.max(5, Math.round(50 + (rating - PRO_AVG.rating) * 120))),
    adr: Math.min(97, Math.max(5, Math.round(50 + (adr - PRO_AVG.adr) * 2))),
    hs_pct: Math.min(97, Math.max(5, Math.round(50 + (hs - PRO_AVG.hs_pct) * 2))),
    kast: Math.min(97, Math.max(5, Math.round(50 + (kast - PRO_AVG.kast) * 2))),
  };
  const evolution = boards.length
    ? boards.map((b) => ({ match_id: b.match_id, rating: b.row.rating, adr: b.row.adr, kast: b.row.kast }))
    : MATCH_DEFS.map((d, i) => ({ match_id: d.id, rating: +(0.95 + i * 0.04).toFixed(2), adr: 70 + i * 2, kast: 66 + i }));
  return {
    player_name: nick, matches: boards.length || 5, rating: +rating.toFixed(2), kd_diff: kd,
    adr: +adr.toFixed(1), hs_pct: +hs.toFixed(1), kast: +kast.toFixed(1), impact: +impact.toFixed(2),
    strengths: strengths.slice(0, 5),
    weaknesses: weaknesses.slice(0, 5).map(({ drill: _d, ...w }) => w),
    suggested_role: role, role_reason: reason, drills,
    pro_comparison: { role_avg: { rating: 1.12, adr: 80, hs_pct: 46, kast: 72 }, percentiles },
    evolution,
  };
}

// ------------------------------------------------------------- subscriptions
const demoSub = { plan: "team", status: "active", used: 5, limit: 10000 };
const PLANS = [
  { id: "free", name: "FREE", price: 0, analyses: 3, features: ["3 análises/mês", "Estatísticas básicas", "1 heatmap por partida", "1 mapa"] },
  { id: "pro", name: "PRO", price: 9.99, analyses: 20, features: ["20 análises/mês", "Análise tática completa", "Todos os heatmaps", "Relatório individual", "VOD player com anotações", "Comparação com pros", "Exportar PDF"] },
  { id: "team", name: "TEAM", price: 29.99, analyses: -1, features: ["Análises ilimitadas", "Tudo do PRO", "Dashboard do time (10 membros)", "Plano de melhoria do time", "Compartilhar com coach", "API de integração", "Suporte prioritário"] },
];
const PLAN_LIMITS: Record<string, number> = { free: 3, pro: 20, team: 10000 };

// --------------------------------------------------------------- annotations
function annKey(matchId: number): string {
  return `vod_demo_ann_${matchId}`;
}

function readAnns(matchId: number): Annotation[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(annKey(matchId)) ?? "[]") as Annotation[];
  } catch {
    return [];
  }
}

function writeAnns(matchId: number, anns: Annotation[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(annKey(matchId), JSON.stringify(anns));
}

// ------------------------------------------------------------------ demoFetch
function notFound(what: string): Error {
  return new Error(JSON.stringify({ detail: `${what} not found` }));
}

/** Minimal router that mimics the FastAPI responses used by the frontend. */
export function demoFetch(path: string, init: RequestInit = {}): unknown {
  const method = (init.method ?? "GET").toUpperCase();
  const [rawPath, rawQuery] = path.split("?");
  const q = new URLSearchParams(rawQuery ?? "");
  const body = (() => {
    try {
      return init.body && typeof init.body === "string" ? (JSON.parse(init.body) as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  })();

  // ---- auth ----
  if (rawPath === "/api/auth/login" || rawPath === "/api/auth/register") {
    return { access_token: "demo-access-token", refresh_token: "demo-refresh-token", token_type: "bearer" };
  }
  if (rawPath === "/api/auth/refresh") {
    return { access_token: "demo-access-token", refresh_token: "demo-refresh-token", token_type: "bearer" };
  }
  if (rawPath === "/api/auth/forgot-password" || rawPath === "/api/auth/reset-password") return { ok: true };
  if (rawPath === "/api/auth/me") {
    if (method === "PUT") Object.assign(DEMO_USER, body);
    return { ...DEMO_USER, plan: demoSub.plan };
  }

  // ---- teams ----
  if (rawPath === "/api/teams" && method === "GET") return [{ ...DEMO_TEAM }];
  if (rawPath === "/api/teams" && method === "POST") {
    return { ...DEMO_TEAM, id: 902, name: String(body.name ?? "Novo time"), game: String(body.game ?? "cs2"), member_count: 1 };
  }
  const membersMatch = rawPath.match(/^\/api\/teams\/(\d+)\/members$/);
  if (membersMatch && method === "GET") return [...DEMO_MEMBERS];
  if (membersMatch && method === "POST") {
    return { id: Date.now(), team_id: Number(membersMatch[1]), user_id: null, nickname: String(body.nickname ?? "novo"), role: String(body.role ?? "Rifler") };
  }
  if (rawPath.match(/^\/api\/teams\/\d+\/members\/\d+$/) && method === "DELETE") return { ok: true };
  if (rawPath.match(/^\/api\/teams\/\d+\/invite$/) && method === "POST") {
    return { id: 1, team_id: DEMO_TEAM.id, email: String(body.email ?? ""), code: "demo-invite", status: "pending" };
  }
  const teamHeat = rawPath.match(/^\/api\/teams\/(\d+)\/heatmap$/);
  if (teamHeat) {
    return { map_name: q.get("map") ?? "mirage", heatmap_type: q.get("type") ?? "kills", points: heatPoints(1, q.get("type") ?? "kills").slice(0, 300), filters: {} };
  }

  // ---- matches ----
  if (rawPath === "/api/matches" && method === "GET") {
    let metas = allMetas();
    if (q.get("game")) metas = metas.filter((m) => m.game === q.get("game"));
    const per = Number(q.get("per_page") ?? 50);
    return metas.slice(0, per);
  }
  const mId = rawPath.match(/^\/api\/matches\/(\d+)(\/[\w-]+)?(\/\d+)?$/);
  if (mId) {
    const id = Number(mId[1]);
    const sub = mId[2] ?? "";
    const extra = mId[3]?.slice(1);
    if (sub === "" && method === "DELETE") {
      matchCache.delete(id);
      processing.delete(id);
      return { ok: true };
    }
    const m = getMatch(id);
    if (!m) throw notFound("Match");
    if (sub === "") return { ...m.meta, status: processing.has(id) ? (processing.get(id)! >= 100 ? "completed" : "processing") : m.meta.status, progress: processing.get(id) ?? m.meta.progress };
    if (sub === "/status") {
      const prog = processing.get(id);
      if (prog === undefined) return { status: "completed", progress: 100, error: "" };
      const next = Math.min(100, prog + 34);
      processing.set(id, next);
      return { status: next >= 100 ? "completed" : "processing", progress: next, error: "" };
    }
    if (sub === "/analysis") {
      const first = m.rounds.filter((x) => x.round_number <= 12);
      const second = m.rounds.filter((x) => x.round_number > 12);
      return {
        match: m.meta,
        first_half: { team: first.filter((x) => x.result === "win").length, enemy: first.filter((x) => x.result === "loss").length },
        second_half: { team: second.filter((x) => x.result === "win").length, enemy: second.filter((x) => x.result === "loss").length },
        pistol_rounds: m.rounds.filter((x) => x.buy_type === "pistol").map((x) => x.round_number),
        economy: m.rounds.map((x) => ({ round: x.round_number, team: x.equip_value_team, enemy: x.equip_value_enemy, buy: x.buy_type })),
      };
    }
    if (sub === "/rounds" && !extra) return m.rounds;
    if (sub === "/rounds" && extra) {
      const d = m.details.get(Number(extra));
      if (!d) throw notFound("Round");
      return d;
    }
    if (sub === "/scoreboard") return [...m.board].sort((a, b) => b.rating - a.rating);
    if (sub === "/mistakes") {
      const sev = q.get("severity");
      return sev ? m.mistakes.filter((x) => x.severity === sev) : m.mistakes;
    }
    if (sub === "/timeline") return m.timeline;
    if (sub === "/economy") {
      return m.rounds.map((x) => ({ round: x.round_number, team: x.equip_value_team, enemy: x.equip_value_enemy, buy: x.buy_type, result: x.result }));
    }
    if (sub === "/heatmap") {
      return { map_name: m.meta.map_name, heatmap_type: q.get("type") ?? "kills", points: heatPoints(id, q.get("type") ?? "kills"), filters: { player: q.get("player") ?? "all", side: q.get("side") ?? "all" } };
    }
    if (sub === "/annotations" && method === "GET") return readAnns(id);
    if (sub === "/annotations" && method === "POST") {
      const anns = readAnns(id);
      const ann: Annotation = {
        id: Date.now(), match_id: id, user_id: DEMO_USER.id,
        timestamp_seconds: Number(body.timestamp_seconds ?? 0),
        kind: (body.kind as Annotation["kind"]) ?? "note",
        text: String(body.text ?? ""), drawings: (body.drawings as Annotation["drawings"]) ?? [],
      };
      anns.push(ann);
      writeAnns(id, anns);
      return ann;
    }
  }
  const annUpd = rawPath.match(/^\/api\/annotations\/(\d+)$/);
  if (annUpd && (method === "PUT" || method === "DELETE")) {
    // annotations are scoped per match in storage; scan known matches
    for (const d of MATCH_DEFS) {
      const anns = readAnns(d.id);
      const idx = anns.findIndex((a) => a.id === Number(annUpd[1]));
      if (idx >= 0) {
        if (method === "DELETE") {
          anns.splice(idx, 1);
          writeAnns(d.id, anns);
          return { ok: true };
        }
        Object.assign(anns[idx], body);
        writeAnns(d.id, anns);
        return anns[idx];
      }
    }
    if (method === "DELETE") return { ok: true };
    throw notFound("Annotation");
  }

  // ---- players ----
  const playerMatch = rawPath.match(/^\/api\/players\/(.+?)\/(profile|stats|report|evolution|comparison|improvement-plan)$/);
  if (playerMatch) {
    const nick = decodeURIComponent(playerMatch[1]);
    const rep = buildReport(nick);
    const kind = playerMatch[2];
    if (kind === "report") return rep;
    if (kind === "evolution") return rep.evolution;
    if (kind === "comparison") return rep.pro_comparison;
    if (kind === "improvement-plan") {
      return { strengths: rep.strengths, weaknesses: rep.weaknesses, drills: rep.drills, suggested_role: rep.suggested_role, role_reason: rep.role_reason };
    }
    if (kind === "profile") {
      return { player_name: nick, matches: rep.matches, rating: rep.rating, adr: rep.adr, hs_pct: rep.hs_pct, kast: rep.kast, kd_diff: rep.kd_diff };
    }
    return rep.evolution.map((e) => ({ match_id: e.match_id, kills: 15, deaths: 13, assists: 4, adr: e.adr, rating: e.rating, kast: e.kast, hs_pct: 44 }));
  }

  // ---- dashboard ----
  if (rawPath === "/api/dashboard/overview") {
    const metas = MATCH_DEFS.map((d) => getMatch(d.id)!.meta);
    const boards = MATCH_DEFS.flatMap((d) => getMatch(d.id)!.board.filter((b) => b.team === "team"));
    const wins = metas.filter((meta) => meta.result === "win").length;
    const byMap: Record<string, { matches: number; wins: number; win_rate: number }> = {};
    for (const meta of metas) {
      const e = (byMap[meta.map_name] ??= { matches: 0, wins: 0, win_rate: 0 });
      e.matches++;
      if (meta.result === "win") e.wins++;
    }
    for (const e of Object.values(byMap)) e.win_rate = Math.round((100 * e.wins) / e.matches);
    const totalMistakes = MATCH_DEFS.reduce((s, d) => s + getMatch(d.id)!.mistakes.length, 0);
    return {
      matches_analyzed: metas.length, win_rate: Math.round((100 * wins) / metas.length),
      avg_rating: +(boards.reduce((s, b) => s + b.rating, 0) / boards.length).toFixed(2),
      avg_adr: +(boards.reduce((s, b) => s + b.adr, 0) / boards.length).toFixed(1),
      avg_mistakes: +(totalMistakes / metas.length).toFixed(1), by_map: byMap,
      evolution: metas.map((meta) => ({ match_id: meta.id, title: meta.title, result: meta.result, score: `${meta.score_team}-${meta.score_enemy}` })),
    };
  }
  if (rawPath === "/api/dashboard/recent-matches") {
    return [...MATCH_DEFS]
      .reverse()
      .map((d) => getMatch(d.id)!)
      .map((m) => ({
        id: m.meta.id, title: m.meta.title, game: m.meta.game, map_name: m.meta.map_name,
        opponent: m.meta.opponent, score_team: m.meta.score_team, score_enemy: m.meta.score_enemy,
        result: m.meta.result, status: "completed", mistakes: m.mistakes.length,
      }));
  }
  if (rawPath === "/api/dashboard/top-issues") {
    const counts: Record<string, number> = {};
    for (const d of MATCH_DEFS) for (const mi of getMatch(d.id)!.mistakes) counts[mi.mistake_type] = (counts[mi.mistake_type] ?? 0) + 1;
    const LABELS: Record<string, { label: string; severity: string }> = {
      missed_trade: { label: "Trade não realizado", severity: "high" },
      slow_rotation: { label: "Rotação lenta", severity: "high" },
      bad_crossfire: { label: "Crossfire mal posicionado", severity: "medium" },
      utility_waste: { label: "Utility ineficiente", severity: "medium" },
      economy: { label: "Economia mal gerida", severity: "medium" },
      bad_postplant: { label: "Pós-plant ruim", severity: "medium" },
      dry_peek: { label: "Peek sem informação", severity: "low" },
      isolation: { label: "Isolamento", severity: "high" },
    };
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({ type, count, ...(LABELS[type] ?? { label: type, severity: "medium" }) }));
  }
  const teamDash = rawPath.match(/^\/api\/dashboard\/team\/(\d+)$/);
  if (teamDash) {
    const agg = new Map<string, { r: number; a: number; k: number; d: number; n: number }>();
    for (const d of MATCH_DEFS) {
      for (const b of getMatch(d.id)!.board.filter((x) => x.team === "team")) {
        const e = agg.get(b.player_name) ?? { r: 0, a: 0, k: 0, d: 0, n: 0 };
        e.r += b.rating;
        e.a += b.adr;
        e.k += b.kills;
        e.d += b.deaths;
        e.n++;
        agg.set(b.player_name, e);
      }
    }
    const metas = MATCH_DEFS.map((d) => getMatch(d.id)!.meta);
    return {
      matches: metas.length,
      win_rate: Math.round((100 * metas.filter((m) => m.result === "win").length) / metas.length),
      ranking: [...agg.entries()]
        .map(([player, e]) => ({ player, rating: +(e.r / e.n).toFixed(2), adr: +(e.a / e.n).toFixed(1), k: e.k, d: e.d }))
        .sort((a, b) => b.rating - a.rating),
    };
  }

  // ---- subscriptions ----
  if (rawPath === "/api/subscriptions/plans") return PLANS;
  if (rawPath === "/api/subscriptions/current") {
    return { plan: demoSub.plan, status: demoSub.status, used: demoSub.used, limit: demoSub.limit };
  }
  if (rawPath === "/api/subscriptions/checkout" && method === "POST") {
    const plan = ["free", "pro", "team"].includes(q.get("plan") ?? "") ? (q.get("plan") as string) : "pro";
    demoSub.plan = plan;
    demoSub.status = "active";
    demoSub.limit = PLAN_LIMITS[plan];
    return { ok: true, plan, checkout: "demo — conecte o Stripe em produção" };
  }
  if (rawPath === "/api/subscriptions/cancel" && method === "POST") {
    demoSub.plan = "free";
    demoSub.status = "canceled";
    demoSub.limit = PLAN_LIMITS.free;
    return { ok: true };
  }

  throw new Error(`Demo: rota não suportada (${method} ${path})`);
}

/** Simulated upload: creates a match that "processes" over a few status polls. */
export function demoUpload(fileName: string, fields: Record<string, string>): MatchItem {
  uploadCounter++;
  const id = 1000 + uploadCounter;
  const isDem = fileName.toLowerCase().endsWith(".dem");
  const def: MatchDef = {
    id,
    map: fields.map_name || "mirage",
    opponent: fields.opponent || "Adversário",
    team: 13, enemy: 9, tags: (fields.tags || "demo").split(",").map((t) => t.trim()).filter(Boolean),
    game: isDem ? "cs2" : "crossfire",
  };
  const m = genDemoMatch(def);
  m.meta.status = "processing";
  m.meta.progress = 0;
  m.meta.title = `vs ${def.opponent} — ${fileName}`;
  matchCache.set(id, m);
  processing.set(id, 0);
  return { ...m.meta };
}
