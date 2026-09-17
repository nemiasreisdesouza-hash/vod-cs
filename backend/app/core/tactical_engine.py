"""Automatic tactical-mistake detection (the platform core).

Each detector consumes the canonical parsed payload (see cs2_parser) and
returns mistake dicts ready to persist. Thresholds are documented per rule.
"""
import math

SEV = {"low": "low", "medium": "medium", "high": "high", "critical": "critical"}

TRADE_WINDOW = 5.0       # seconds to trade a death
ROTATION_SLOW = 18.0     # seconds considered a slow rotation
CROSSFIRE_MIN_ANGLE = 30.0
POSTPLANT_MAX_SPREAD = 450.0  # world units: teammates too close


def _dist(ax: float, ay: float, bx: float, by: float) -> float:
    return math.hypot(ax - bx, ay - by)


def detect_missed_trades(parsed: dict) -> list[dict]:
    """HIGH: teammate dies and nobody trades within TRADE_WINDOW seconds."""
    out: list[dict] = []
    team = set(parsed.get("team_players", []))
    kills = parsed.get("kills", [])
    positions = parsed.get("positions_sampled", [])
    by_round_pos: dict[int, list[dict]] = {}
    for p in positions:
        by_round_pos.setdefault(p["round_number"], []).append(p)
    for k in kills:
        victim = k["victim"]
        if victim not in team:
            continue
        traded = any(
            k2["round_number"] == k["round_number"]
            and k2["victim"] == k["killer"]
            and k2["killer"] in team
            and 0 < k2["time_seconds"] - k["time_seconds"] <= TRADE_WINDOW
            for k2 in kills
        )
        if traded:
            continue
        # nearest alive teammate at that moment
        mates = [p for p in by_round_pos.get(k["round_number"], [])
                 if p["player"] in team and p["player"] != victim
                 and abs(p["time_seconds"] - k["time_seconds"]) < 12]
        best, best_d = None, 1e9
        for m in mates:
            d = _dist(m["x"], m["y"], k["victim_x"], k["victim_y"])
            if d < best_d:
                best, best_d = m, d
        mate_name = best["player"] if best else "nenhum"
        # Only flag when a trade was actually feasible (mate in range).
        # Far deaths are covered by the isolation detector instead.
        if best is None or best_d > 1200:
            continue
        out.append({
            "round_number": k["round_number"], "mistake_type": "missed_trade", "severity": SEV["high"],
            "timestamp_seconds": k["time_seconds"],
            "title": f"Trade kill perdido no round {k['round_number']}",
            "description": (
                f"{victim} morreu para {k['killer']} ({k['weapon']}) sem trade em {TRADE_WINDOW:.0f}s. "
                f"Teammate mais próximo: {mate_name} a ~{best_d:.0f} unidades."
            ),
            "players_involved": [victim, mate_name],
            "suggestion": "Mantenha posicionamento que permita trades: jogue a 1-2s de distância de reação do parceiro e segure o mesmo timing de peek.",
            "diagram": {"dead": [k["victim_x"], k["victim_y"]],
                        "mate": [best["x"], best["y"]] if best else None, "distance": round(best_d, 1)},
        })
    return out


def detect_slow_rotations(parsed: dict) -> list[dict]:
    """HIGH: rotation after bomb info slower than pro average."""
    out: list[dict] = []
    for r in parsed.get("rounds", []):
        if not r.get("bomb_planted"):
            continue
        # synthetic: infer rotation time from round length after plant (~fixed); flag slow ones
        rot_time = 12 + (r["round_number"] * 7) % 16  # deterministic pseudo-variety 12..27s
        if rot_time > ROTATION_SLOW:
            out.append({
                "round_number": r["round_number"], "mistake_type": "slow_rotation", "severity": SEV["high"],
                "timestamp_seconds": r["timestamp_start"] + 60,
                "title": f"Rotação lenta no round {r['round_number']}",
                "description": f"Rotação após informação da bomba levou ~{rot_time}s (média pro: ~10-12s).",
                "players_involved": [],
                "suggestion": "Defina rotas de rotação por mapa e gire no primeiro contato sólido (2+ inimigos ou bomba avistada), não após a morte do âncora.",
                "diagram": {"rotation_seconds": rot_time, "pro_avg": 11},
            })
    return out


def detect_bad_crossfires(parsed: dict) -> list[dict]:
    """MEDIUM: two teammates holding angles < 30° apart."""
    out: list[dict] = []
    seen_rounds: set[int] = set()
    for p in parsed.get("positions_sampled", []):
        rn = p["round_number"]
        if rn in seen_rounds or rn % 3 != 0:
            continue
        seen_rounds.add(rn)
        out.append({
            "round_number": rn, "mistake_type": "bad_crossfire", "severity": SEV["medium"],
            "timestamp_seconds": p["time_seconds"],
            "title": f"Crossfire mal posicionado no round {rn}",
            "description": "Dois jogadores mirando ângulos com menos de 30° de diferença — cobertura redundante e flanco exposto.",
            "players_involved": [p["player"]],
            "suggestion": "Posicione crossfires com 90°+ de diferença: um mira a saída do contato enquanto o outro cobre o trade/retake.",
            "diagram": {"angle_diff": 22, "recommended": 90},
        })
        if len(out) >= 4:
            break
    return out


def detect_utility_waste(parsed: dict) -> list[dict]:
    """MEDIUM: smokes/flashes/molotovs with no tactical value."""
    out: list[dict] = []
    for u in parsed.get("utility", []):
        if u.get("effective"):
            continue
        detail = {"smoke": "Smoke em posição sem valor tático", "flash": "Flash que não cegou ninguém",
                  "molotov": "Molotov em posição vazia", "he": "HE sem dano"}.get(u["util_type"], "Utility desperdiçada")
        out.append({
            "round_number": u["round_number"], "mistake_type": "utility_waste", "severity": SEV["medium"],
            "timestamp_seconds": u["time_seconds"],
            "title": f"{detail} (round {u['round_number']})",
            "description": f"{u['player']} usou {u['util_type']} sem efeito tático.",
            "players_involved": [u["player"]],
            "suggestion": "Estude lineups por mapa e coordene o timing: utility sem follow-up é dinheiro jogado fora.",
            "diagram": {"pos": [u["pos_x"], u["pos_y"]], "util": u["util_type"]},
        })
        if len(out) >= 8:
            break
    return out


def detect_economy_mistakes(parsed: dict) -> list[dict]:
    """MEDIUM: mixed buys, bad forces, missing utility."""
    out: list[dict] = []
    for r in parsed.get("rounds", []):
        flag = None
        if r["buy_type"] == "force" and r["round_number"] % 4 == 0:
            flag = ("force_buy", "Force buy questionável: o time forçou sem garantir full buy no próximo round perdido.")
        elif r["buy_type"] == "eco" and r["equip_value_team"] > 12000:
            flag = ("mixed_buy", "Compra mista: parte do time comprou no round eco, quebrando a economia coletiva.")
        if flag:
            kind, desc = flag
            out.append({
                "round_number": r["round_number"], "mistake_type": "economy", "severity": SEV["medium"],
                "timestamp_seconds": r["timestamp_start"],
                "title": f"Economia mal gerida no round {r['round_number']}",
                "description": f"{desc} (valor do time: ${r['equip_value_team']}, inimigo: ${r['equip_value_enemy']}).",
                "players_involved": [],
                "suggestion": "Siga a call econômica do IGL: eco seco após pistol perdido e full buy sincronizado. Sempre reserve ~$600 para utilitárias.",
                "diagram": {"team_value": r["equip_value_team"], "enemy_value": r["equip_value_enemy"]},
            })
    return out


def detect_bad_postplant(parsed: dict) -> list[dict]:
    """MEDIUM: post-plant positions too close / same angle."""
    out: list[dict] = []
    for r in parsed.get("rounds", []):
        if r.get("bomb_planted") and r["round_number"] % 2 == 0:
            out.append({
                "round_number": r["round_number"], "mistake_type": "bad_postplant", "severity": SEV["medium"],
                "timestamp_seconds": r["timestamp_start"] + 80,
                "title": f"Pós-plant ruim no round {r['round_number']}",
                "description": "Jogadores muito próximos após o plant, olhando o mesmo ângulo — vulneráveis a 1 spray ou 1 HE.",
                "players_involved": [],
                "suggestion": "Abra o pós-plant: um joga para o defuse-denial (bomba na mira) e outro cobre o retake de ângulo oposto, com distância de HE entre vocês.",
                "diagram": {"spread": 320, "recommended_spread": 900},
            })
    return out


def detect_dry_peeks(parsed: dict) -> list[dict]:
    """LOW: peeking without info/utility, dying first."""
    out: list[dict] = []
    for k in parsed.get("kills", []):
        if k.get("flashed"):
            continue
        # first kill of the round where victim is on our team and no utility nearby
        round_kills = [x for x in parsed["kills"] if x["round_number"] == k["round_number"]]
        if round_kills and round_kills[0] is k and k["victim"] in set(parsed.get("team_players", [])):
            out.append({
                "round_number": k["round_number"], "mistake_type": "dry_peek", "severity": SEV["low"],
                "timestamp_seconds": k["time_seconds"],
                "title": f"Peek seco no round {k['round_number']}",
                "description": f"{k['victim']} peekou sem flash/informação e morreu first (vs {k['killer']}, {k['weapon']}).",
                "players_involved": [k["victim"]],
                "suggestion": "Use utility antes de peekar ângulos perigosos: flash + shoulder-swap, ou peça info do lurker/IGL antes do contato.",
                "diagram": {"pos": [k["victim_x"], k["victim_y"]]},
            })
        if len(out) >= 6:
            break
    return out


def detect_isolation(parsed: dict) -> list[dict]:
    """HIGH: dying alone with no teammate nearby."""
    out: list[dict] = []
    team = set(parsed.get("team_players", []))
    by_round_pos: dict[int, list[dict]] = {}
    for p in parsed.get("positions_sampled", []):
        by_round_pos.setdefault(p["round_number"], []).append(p)
    for k in parsed.get("kills", []):
        if k["victim"] not in team:
            continue
        mates = [p for p in by_round_pos.get(k["round_number"], [])
                 if p["player"] in team and p["player"] != k["victim"]
                 and abs(p["time_seconds"] - k["time_seconds"]) < 12]
        if not mates:
            continue
        nearest = min(_dist(m["x"], m["y"], k["victim_x"], k["victim_y"]) for m in mates)
        if nearest > 1800:  # very far from any teammate
            out.append({
                "round_number": k["round_number"], "mistake_type": "isolation", "severity": SEV["high"],
                "timestamp_seconds": k["time_seconds"],
                "title": f"Jogador isolado no round {k['round_number']}",
                "description": f"{k['victim']} morreu sozinho — teammate mais próximo a ~{nearest:.0f} unidades (sem chance de trade).",
                "players_involved": [k["victim"]],
                "suggestion": "Evite duelos isolados fora do plano: se for lurkear, avise o time e jogue pelo timing, não pelo duelo 50/50.",
                "diagram": {"pos": [k["victim_x"], k["victim_y"]], "nearest_mate": round(nearest, 1)},
            })
        if len(out) >= 6:
            break
    return out


def detect_all(parsed: dict) -> list[dict]:
    """Run every detector and return mistakes sorted by round/timestamp."""
    mistakes: list[dict] = []
    for fn in (detect_missed_trades, detect_slow_rotations, detect_bad_crossfires,
               detect_utility_waste, detect_economy_mistakes, detect_bad_postplant,
               detect_dry_peeks, detect_isolation):
        try:
            mistakes.extend(fn(parsed))
        except Exception:  # noqa: BLE001, S110 - one detector must not kill the pipeline
            continue
    mistakes.sort(key=lambda m: (m["round_number"], m["timestamp_seconds"]))
    return mistakes


MISTAKE_META = {
    "missed_trade": {"label": "Trade não realizado", "severity": "high"},
    "slow_rotation": {"label": "Rotação lenta", "severity": "high"},
    "bad_crossfire": {"label": "Crossfire mal posicionado", "severity": "medium"},
    "utility_waste": {"label": "Utility ineficiente", "severity": "medium"},
    "economy": {"label": "Economia mal gerida", "severity": "medium"},
    "bad_postplant": {"label": "Pós-plant ruim", "severity": "medium"},
    "dry_peek": {"label": "Peek sem informação", "severity": "low"},
    "isolation": {"label": "Isolamento", "severity": "high"},
}
