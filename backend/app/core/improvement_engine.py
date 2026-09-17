"""Strength/weakness detection, role suggestion and training plans."""
from sqlalchemy.orm import Session

from app.models.tactical_mistake import ImprovementPlan

PRO_AVG = {"rating": 1.05, "adr": 78.0, "hs_pct": 46.0, "kast": 71.0, "impact": 1.05, "kd_diff": 4.0}

DRILLS = {
    "aim": {"title": "Rotina de mira (15 min/dia)", "detail": "Aim Botz / Refrag: 100 kills por dia + 10 min de deathmatch só HS.", "kind": "aim"},
    "spray": {"title": "Controle de spray", "detail": "Recoil Master: 1 pente por arma até agrupar 80%+ dos tiros no alvo.", "kind": "aim"},
    "utility": {"title": "Lineups essenciais", "detail": "Aprenda 3 smokes + 2 flashes por mapa do pool. Treine offline com sv_cheats.", "kind": "utility"},
    "positioning": {"title": "Posicionamento e trades", "detail": "Reveja 3 rounds com erro de trade por semana no VOD player e anote o posicionamento correto.", "kind": "tactics"},
    "economy": {"title": "Fundamentos de economia", "detail": "Decore a tabela de loss bonus e pratique calls de eco/force com o IGL em scrims.", "kind": "tactics"},
    "clutch": {"title": "Treino de clutch", "detail": "Retake servers 2h/semana + reveja clutches perdidos anotando a decisão errada.", "kind": "gameplay"},
    "opener": {"title": "Duelos de abertura", "detail": "Deathmatch de entry: jogue 20 min buscando first contact com strafing e counter-strafe.", "kind": "gameplay"},
    "support": {"title": "Jogo de suporte", "detail": "Pratique flashes para o entry + timing de trade em mapas de retake com o duo.", "kind": "teamplay"},
}

ROLE_RULES = [
    ("AWPer", "Alto impact com AWP como arma principal e bom clutch rate.", lambda s: s.get("main_weapon") == "AWP" and s.get("impact", 0) >= 1.0),
    ("Entry Fragger", "Muitos opening kills e estilo agressivo de primeiro contato.", lambda s: s.get("first_kills", 0) >= 3),
    ("Support", "Muitos flash assists e utility damage alto — habilita o time.", lambda s: s.get("flash_assists", 0) >= 3 or s.get("utility_damage", 0) > 200),
    ("Lurker", "Alto KAST e sobrevivência com impact em rounds decisivos.", lambda s: s.get("kast", 0) >= 72 and s.get("deaths", 99) <= 14),
    ("IGL", "KAST alto e perfil tático consistente (confirme com o coach).", lambda s: s.get("kast", 0) >= 70 and s.get("assists", 0) >= 8),
]


def analyze(stats: dict) -> tuple[list[dict], list[dict], str, str]:
    """Return (strengths, weaknesses, suggested_role, role_reason). Max 5 each."""
    strengths: list[dict] = []
    weaknesses: list[dict] = []

    def push(is_strength: bool, metric: str, value: float, avg: float, text: str, drill: str):
        item = {"metric": metric, "value": round(value, 2), "pro_avg": avg, "text": text, "drill": drill}
        (strengths if is_strength else weaknesses).append(item)

    kd = stats.get("kills", 0) - stats.get("deaths", 0)
    push(stats.get("rating", 0) >= PRO_AVG["rating"], "rating", stats.get("rating", 0), PRO_AVG["rating"],
         "Rating acima da média pro" if stats.get("rating", 0) >= PRO_AVG["rating"] else "Rating abaixo da média pro — consistência é o foco", "aim")
    push(stats.get("adr", 0) >= PRO_AVG["adr"], "adr", stats.get("adr", 0), PRO_AVG["adr"],
         "Dano por round sólido" if stats.get("adr", 0) >= PRO_AVG["adr"] else "ADR baixo: busque mais contato e dano útil por round", "aim")
    push(stats.get("hs_pct", 0) >= PRO_AVG["hs_pct"], "hs%", stats.get("hs_pct", 0), PRO_AVG["hs_pct"],
         "Precisão de HS excelente" if stats.get("hs_pct", 0) >= PRO_AVG["hs_pct"] else "HS% baixo: treine mira na altura da cabeça", "aim")
    push(stats.get("kast", 0) >= PRO_AVG["kast"], "kast", stats.get("kast", 0), PRO_AVG["kast"],
         "Muito consistente (KAST alto)" if stats.get("kast", 0) >= PRO_AVG["kast"] else "KAST baixo: morra menos sem impacto — jogue mais com o time", "positioning")
    push(stats.get("impact", 0) >= PRO_AVG["impact"], "impact", stats.get("impact", 0), PRO_AVG["impact"],
         "Alto impact nos rounds" if stats.get("impact", 0) >= PRO_AVG["impact"] else "Impact baixo: participe mais das jogadas decisivas", "opener")
    if stats.get("utility_damage", 0) < 60:
        push(False, "utility", stats.get("utility_damage", 0), 120, "Pouco dano de utility — use mais granadas", "utility")
    else:
        push(True, "utility", stats.get("utility_damage", 0), 120, "Bom uso de utilitárias", "utility")
    if kd < 0:
        push(False, "k/d diff", kd, PRO_AVG["kd_diff"], "K/D negativo: sobreviva mais e escolha melhor os duelos", "positioning")
    else:
        push(True, "k/d diff", kd, PRO_AVG["kd_diff"], "K/D positivo consistente", "aim")

    role, reason = "Rifler", "Perfil equilibrado de rifler — sem especialização dominante ainda."
    for name, why, rule in ROLE_RULES:
        try:
            if rule(stats):
                role, reason = name, why
                break
        except Exception:  # noqa: BLE001, S110
            continue
    return strengths[:5], weaknesses[:5], role, reason


def build_and_save(db: Session, match_id: int, stats: dict, rounds: list) -> ImprovementPlan:
    strengths, weaknesses, role, reason = analyze(stats)
    drills = []
    for w in weaknesses[:3]:
        d = DRILLS.get(w.get("drill", "aim"), DRILLS["aim"])
        drills.append(d)
    plan = ImprovementPlan(match_id=match_id, player_name=stats.get("player_name", ""),
                           strengths=strengths, weaknesses=weaknesses, drills=drills,
                           suggested_role=role, role_reason=reason)
    db.add(plan)
    return plan
