import logging

from app.services import apostas_apifootball_service
from app.services import apostas_espn_service
from app.services import apostas_tips_service

logger = logging.getLogger(__name__)


def auto_recommend(config: dict, user_id: int) -> dict:
    min_diff   = max(1, int(config.get("min_diff") or 10))
    target_odd = max(1.01, float(config.get("target_odd") or 3.00))
    days_ahead = max(1, min(30, int(config.get("days_ahead") or 14)))
    leagues    = config.get("leagues") or []
    stake      = (config.get("stake") or "").strip()
    titulo     = (config.get("titulo") or "").strip()
    max_games  = max(2, min(8, int(config.get("max_games") or 5)))

    afl_ids, espn_slugs = _split_leagues(leagues)

    qualifying = _find_qualifying(afl_ids, espn_slugs, min_diff, days_ahead)
    if not qualifying:
        raise ValueError(
            "Nenhuma partida qualificada encontrada. "
            "Tente aumentar os dias ou reduzir a diferença mínima de posição."
        )

    for match in qualifying:
        if match.get("source") == "afl":
            odds = apostas_apifootball_service.get_fixture_odds(match["event_id"])
            if odds and odds.get("home") and odds["home"] > 1.0:
                match["home_odd"]   = round(float(odds["home"]), 2)
                match["odd_source"] = "api"
                continue
        match["home_odd"]   = _estimate_odd(match.get("pos_diff") or 10)
        match["odd_source"] = "est"

    selected = _build_multipla(qualifying, target_odd, max_games)
    if not selected:
        raise ValueError(
            "Não foi possível montar a múltipla. "
            "Tente ajustar a odd alvo ou aumentar o número máximo de jogos."
        )

    odd_total = round(_running_odd(selected), 2)

    if not titulo:
        titulo = f"Auto · {len(selected)} jogos · @{odd_total:.2f}"

    afl_names  = {lg["id"]: lg["name"]   for lg in apostas_apifootball_service.get_leagues()}
    espn_names = {lg["slug"]: lg["name"] for lg in apostas_espn_service.get_leagues()}

    jogos = []
    for m in selected:
        suffix = " ★" if m["odd_source"] == "est" else ""
        camp = afl_names.get(m.get("league_id")) or espn_names.get(m.get("league_slug"), "")
        jogos.append({
            "partida":      f"{m['home_name']} x {m['away_name']}",
            "campeonato":   camp,
            "mercado":      f"Vitória Casa (1){suffix}",
            "odd":          m["home_odd"],
            "data_partida": m["date_brt"][:10] if m.get("date_brt") else None,
        })

    tip = apostas_tips_service.create_tip(
        titulo=titulo,
        stake=stake,
        link_aposta="",
        jogos=jogos,
        user_id=user_id,
    )

    has_estimates = any(m["odd_source"] == "est" for m in selected)

    return {
        "tip": tip,
        "info": {
            "qualifying": len(qualifying),
            "selected":   len(selected),
            "odd_total":  odd_total,
            "has_estimates": has_estimates,
        },
    }


def _split_leagues(leagues: list) -> tuple[list[int], list[str]]:
    """Split unified list into API-Football IDs and ESPN slugs.
    Empty list → return all from both sources."""
    if not leagues:
        afl_ids    = [lg["id"]   for lg in apostas_apifootball_service.get_leagues()]
        espn_slugs = [lg["slug"] for lg in apostas_espn_service.get_leagues()]
        return afl_ids, espn_slugs

    afl_ids    = []
    espn_slugs = []
    for item in leagues:
        item = str(item)
        if item.startswith("afl:"):
            try:
                afl_ids.append(int(item[4:]))
            except ValueError:
                pass
        elif item.startswith("espn:"):
            espn_slugs.append(item[5:])
        else:
            try:
                afl_ids.append(int(item))
            except ValueError:
                espn_slugs.append(item)
    return afl_ids, espn_slugs


def _find_qualifying(afl_ids: list, espn_slugs: list, min_diff: int, days_ahead: int) -> list[dict]:
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
            data = apostas_espn_service.get_upcoming_fixtures(slug, days_ahead)
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
            logger.warning("auto_recommend espn league=%s: %s", slug, exc)

    result.sort(key=lambda m: m.get("date_iso") or "")
    return result


def _build_multipla(matches: list, target_odd: float, max_games: int) -> list[dict]:
    selected = []
    running  = 1.0
    for m in matches:
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
