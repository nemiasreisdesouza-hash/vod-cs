export type Plan = "free" | "pro" | "team";
export type Game = "cs2" | "crossfire";
export type Severity = "low" | "medium" | "high" | "critical";

export interface User {
  id: number; email: string; name: string; nickname: string;
  avatar_url: string; steam_id: string; plan: Plan;
}

export interface Team {
  id: number; name: string; logo_url: string; game: Game;
  owner_id: number; invite_code: string; member_count: number;
}

export interface TeamMember {
  id: number; team_id: number; user_id: number | null; nickname: string; role: string;
}

export interface MatchItem {
  id: number; game: Game; map_name: string; opponent: string; title: string;
  score_team: number; score_enemy: number; result: string;
  duration_seconds: number; status: string; progress: number;
  tags: string[]; team_id: number | null; mistake_count: number;
}

export interface RoundInfo {
  id: number; round_number: number; side: string; result: string;
  win_reason: string; buy_type: string; equip_value_team: number;
  equip_value_enemy: number; score_team: number; score_enemy: number;
  timestamp_start: number;
}

export interface PlayerStats {
  player_name: string; team: string; kills: number; deaths: number; assists: number;
  adr: number; hs_pct: number; kast: number; rating: number; impact: number;
  flash_assists: number; utility_damage: number; first_kills: number;
  first_deaths: number; clutches_won: number; clutches_attempted: number;
  main_weapon: string;
}

export interface Mistake {
  id: number; round_number: number; mistake_type: string; severity: Severity;
  timestamp_seconds: number; title: string; description: string;
  players_involved: string[]; suggestion: string; diagram: Record<string, number | string | number[] | null>;
}

export interface Annotation {
  id: number; match_id: number; user_id: number;
  timestamp_seconds: number; kind: "error" | "good" | "note";
  text: string; drawings: Drawing[];
}

export interface Drawing {
  tool: "arrow" | "circle" | "line" | "text";
  points: number[]; color: string; text?: string;
}

export interface HeatmapPoint { x: number; y: number; w: number; label?: string }

export interface PlayerReport {
  player_name: string; matches: number; rating: number; kd_diff: number;
  adr: number; hs_pct: number; kast: number; impact: number;
  strengths: { metric: string; value: number; pro_avg: number; text: string }[];
  weaknesses: { metric: string; value: number; pro_avg: number; text: string }[];
  suggested_role: string; role_reason: string;
  drills: { title: string; detail: string; kind: string }[];
  pro_comparison: { role_avg: Record<string, number>; percentiles: Record<string, number> };
  evolution: { match_id: number; rating: number; adr: number; kast: number }[];
}

export interface PlanInfo {
  id: string; name: string; price: number; analyses: number; features: string[];
}
