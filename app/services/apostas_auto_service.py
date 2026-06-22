import logging
import re

from app.services import apostas_apifootball_service
from app.services import apostas_espn_service
from app.services import apostas_tips_service

logger = logging.getLogger(__name__)

_VALID_SPORTS = {"soccer", "basketball", "baseball", "tennis", "volleyball", "handball"}

_SPORT_MARKET = {
    "soccer":     "Vitória Casa (1)",
    "basketball": "Vitória Casa",
    "baseball":   "Vitória Casa",
    "tennis":     "Vitória Casa",
    "volleyball": "Vitória Casa",
    "handball":   "Vitória Casa",
}


def auto_recommend(config: dict, user_id: int) -> dict:
    min_diff    = max(1, int(config.get("min_diff") or 10))
    target_odd  = max(1.01, float(config.get("target_odd") or 3.00))
    days_ahead  = max(1, min(30, int(config.get("days_ahead") or 14)))
    leagues     = config.get("leagues") or []
    league_mode = config.get("league_mode") or "include"
    stake       = (config.get("stake") or "").strip()
    titulo      = (config.get("titulo") or "").strip()
    max_games   = max(2, min(8, int(config.get("max_games") or 5)))
    max_recs    = max(1, min(5, int(config.get("max_recommendations") or 1)))
    sport       = (config.get("sport") or "soccer").strip()
    if sport not in _VALID_SPORTS:
        sport = "soccer"

    afl_ids, espn_slugs = _split_leagues(leagues, league_mode, sport)

    qualifying = _find_qualifying(afl_ids, espn_slugs, min_diff, days_ahead, sport)
    if not qualifying:
        raise ValueError(
            "Nenhuma partida qualificada encontrada. "
            "Tente aumentar os dias ou reduzir a diferença mínima de posição."
        )

    for match in qualifying:
        if match.get("source") == "afl" and sport == "soccer":
            odds = apostas_apifootball_service.get_fixture_odds(match["event_id"])
            if odds and odds.get("home") and odds["home"] > 1.0:
                match["home_odd"]   = round(float(odds["home"]), 2)
                match["odd_source"] = "api"
                continue
        match["home_odd"]   = _estimate_odd(match.get("pos_diff") or 10)
        match["odd_source"] = "est"

    afl_names  = {lg["id"]:   lg["name"] for lg in apostas_apifootball_service.get_leagues()} if sport == "soccer" else {}
    espn_names = {lg["slug"]: lg["name"] for lg in apostas_espn_service.get_leagues(sport)}

    market = _SPORT_MARKET.get(sport, "Vitória Casa")

    pool = [m for m in qualifying if (m.get("home_odd") or 0) > 1.0]
    tips_created = []

    for _ in range(max_recs):
        if not pool:
            break

        selected = _build_multipla(pool, target_odd, max_games)
        if not selected:
            break

        odd_total  = round(_running_odd(selected), 2)
        tip_titulo = titulo if (titulo and max_recs == 1) else _build_title(selected, afl_names, espn_names)
        has_est    = any(m["odd_source"] == "est" for m in selected)

        jogos = []
        for m in selected:
            suffix = " ★" if m["odd_source"] == "est" else ""
            camp   = afl_names.get(m.get("league_id")) or espn_names.get(m.get("league_slug"), "")
            jogos.append({
                "partida":      f"{m['home_name']} x {m['away_name']}",
                "campeonato":   camp,
                "mercado":      f"{market}{suffix}",
                "odd":          m["home_odd"],
                "data_partida": m["date_brt"][:10] if m.get("date_brt") else None,
            })

        tip = apostas_tips_service.create_tip(
            titulo=tip_titulo,
            stake=stake,
            link_aposta="",
            jogos=jogos,
            user_id=user_id,
        )
        tips_created.append({"tip": tip, "odd_total": odd_total, "has_estimates": has_est})

        used = {m["event_id"] for m in selected}
        pool = [m for m in pool if m["event_id"] not in used]

    if not tips_created:
        raise ValueError(
            "Não foi possível montar nenhuma múltipla. "
            "Tente ajustar a odd alvo ou aumentar o número máximo de jogos."
        )

    return {
        "tips": [t["tip"] for t in tips_created],
        "info": {
            "qualifying":       len(qualifying),
            "recommendations":  len(tips_created),
            "has_estimates":    any(t["has_estimates"] for t in tips_created),
        },
    }


# ============================================================
# Title builder
# ============================================================

def _build_title(selected: list, afl_names: dict, espn_names: dict) -> str:
    dates = [
        m["date_brt"][:10]
        for m in selected
        if m.get("date_brt") and len(m.get("date_brt", "")) >= 10
    ]
    last_date = max(dates) if dates else ""

    if last_date:
        y, mo, d = last_date.split("-")
        date_label = f"{d}.{mo}.{y}"
    else:
        date_label = ""

    league_set = set()
    for m in selected:
        name = (
            afl_names.get(m.get("league_id")) or
            espn_names.get(m.get("league_slug")) or ""
        )
        if name:
            league_set.add(name)

    if len(league_set) == 1:
        short = _short_league_name(next(iter(league_set)))
        label = f"Múltipla {short}"
    else:
        label = "Múltipla"

    return f"{date_label} - {label}" if date_label else label


def _short_league_name(name: str) -> str:
    m = re.search(r'\(([^)]+)\)$', name)
    if m:
        return m.group(1)
    for prefix in ("Brasileirão ", "Liga "):
        if name.startswith(prefix):
            return name[len(prefix):].strip()
    return name


# ============================================================
# League splitting
# ============================================================

def _split_leagues(leagues: list, mode: str = "include", sport: str = "soccer") -> tuple[list[int], list[str]]:
    all_afl_ids    = [lg["id"]   for lg in apostas_apifootball_service.get_leagues()] if sport == "soccer" else []
    all_espn_slugs = [lg["slug"] for lg in apostas_espn_service.get_leagues(sport)]

    if not leagues:
        return all_afl_ids, all_espn_slugs

    selected_afl_ids    = []
    selected_espn_slugs = []
    for item in leagues:
        item = str(item)
        if item.startswith("afl:"):
            if sport == "soccer":
                try:
                    selected_afl_ids.append(int(item[4:]))
                except ValueError:
                    pass
        elif item.startswith("espn:"):
            selected_espn_slugs.append(item[5:])
        else:
            try:
                lid = int(item)
                if sport == "soccer":
                    selected_afl_ids.append(lid)
            except ValueError:
                selected_espn_slugs.append(item)

    if mode == "exclude":
        exclude_afl  = set(selected_afl_ids)
        exclude_espn = set(selected_espn_slugs)
        return (
            [lid  for lid  in all_afl_ids    if lid  not in exclude_afl],
            [slug for slug in all_espn_slugs if slug not in exclude_espn],
        )

    return selected_afl_ids, selected_espn_slugs


# ============================================================
# Qualifying matches
# ============================================================

def _find_qualifying(afl_ids: list, espn_slugs: list, min_diff: int, days_ahead: int, sport: str = "soccer") -> list[dict]:
    result = []

    for lid in afl_ids:
        try:
            data = apostas_apifootball_service.get_upcoming_fixtures(lid, days_ahead)
            for m in data.get("matches") or []:
                if m.get("state") != "pre":
                    continue
                hp, ap = m.get("home_pos"), m.get("away_pos")
                if hp is None or ap is None:
                    continue
                if hp >= ap:
                    continue
                if (ap - hp) < min_diff:
                    continue
                result.append({**m, "source": "afl", "league_id": lid})
        except Exception as exc:
            logger.warning("auto_recommend afl league=%s: %s", lid, exc)

    for slug in espn_slugs:
        try:
            data = apostas_espn_service.get_upcoming_fixtures(slug, days_ahead, sport)
            for m in data.get("matches") or []:
                if m.get("state") != "pre":
                    continue
                hp, ap = m.get("home_pos"), m.get("away_pos")
                if hp is None or ap is None:
                    continue
                if hp >= ap:
                    continue
                if (ap - hp) < min_diff:
                    continue
                result.append({**m, "source": "espn", "league_slug": slug})
        except Exception as exc:
            logger.warning("auto_recommend espn league=%s sport=%s: %s", slug, sport, exc)

    result.sort(key=lambda m: m.get("date_iso") or "")
    return result


# ============================================================
# Multipla builder
# ============================================================

def _build_multipla(pool: list, target_odd: float, max_games: int) -> list[dict]:
    selected = []
    running  = 1.0
    for m in pool:
        if len(selected) >= max_games:
            break
        odd = m.get("home_odd") or 0.0
        if odd <= 1.0:
            continue
        selected.append(m)
        running *= odd
        if running >= target_odd:
            break
    return selected


def _running_odd(matches: list) -> float:
    total = 1.0
    for m in matches:
        total *= m.get("home_odd") or 1.0
    return total


def _estimate_odd(pos_diff: int) -> float:
    if pos_diff >= 20:
        return 1.35
    if pos_diff >= 15:
        return 1.45
    return 1.55
