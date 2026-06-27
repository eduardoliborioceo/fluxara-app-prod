import logging
import time

from app.services.sports_base import budget_available, api_get, current_season

logger = logging.getLogger(__name__)

_BASE_URL = "https://v3.football.api-sports.io"
_CARDS_TTL = 43200  # 12 hours

_cards_cache: dict = {}

_YELLOW_ALERT = 4
_YELLOW_RED_ALERT = 1


def get_match_card_alerts(league_id: int, home_id: str, away_id: str) -> dict:
    home = _get_team_alerts(league_id, home_id)
    away = _get_team_alerts(league_id, away_id)
    return {
        "available": True,
        "home": home,
        "away": away,
    }


def _get_team_alerts(league_id: int, team_id: str) -> list[dict]:
    cache_key = f"{league_id}:{team_id}"
    now = time.monotonic()
    cached = _cards_cache.get(cache_key)
    if cached and cached["expires"] > now:
        return cached["data"]

    if not budget_available():
        return _cards_cache.get(cache_key, {}).get("data") or []

    season = _resolve_season(league_id)
    data = _fetch_alerts(league_id, team_id, season)
    _cards_cache[cache_key] = {"data": data, "expires": now + _CARDS_TTL}
    return data


def _resolve_season(league_id: int) -> int:
    try:
        from app.services.apostas_apifootball_service import _LEAGUE_MAP
        season_type = _LEAGUE_MAP.get(league_id, {}).get("season_type", "calendar")
    except Exception:
        season_type = "calendar"
    return current_season(season_type)


def _fetch_alerts(league_id: int, team_id: str, season: int) -> list[dict]:
    resp = api_get(_BASE_URL, "/players", {
        "league":  league_id,
        "team":    team_id,
        "season":  season,
        "page":    1,
    })
    if resp is None:
        return []

    alerts = []
    for entry in (resp.get("response") or []):
        player = entry.get("player") or {}
        stats_list = entry.get("statistics") or []
        if not stats_list:
            continue
        cards = (stats_list[0].get("cards") or {})
        yellow = int(cards.get("yellow") or 0)
        yellow_red = int(cards.get("yellowred") or 0)

        if yellow < _YELLOW_ALERT and yellow_red < _YELLOW_RED_ALERT:
            continue

        level = "danger" if yellow_red >= _YELLOW_RED_ALERT else "warning"
        alerts.append({
            "id":         player.get("id"),
            "name":       player.get("name") or "",
            "photo":      player.get("photo") or "",
            "yellow":     yellow,
            "yellow_red": yellow_red,
            "level":      level,
        })

    alerts.sort(key=lambda p: (p["yellow_red"], p["yellow"]), reverse=True)
    return alerts
