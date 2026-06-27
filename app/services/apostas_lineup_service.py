import logging
import time

from app.services.sports_base import budget_available, api_get

logger = logging.getLogger(__name__)

_BASE_URL = "https://v3.football.api-sports.io"
_LINEUP_TTL_ANNOUNCED = 43200   # 12h once lineup is known
_LINEUP_TTL_PENDING   = 300     # 5 min retry while not announced yet


def get_lineup(fixture_id: str) -> dict:
    cache_key = str(fixture_id)
    now = time.monotonic()
    cached = _lineup_cache.get(cache_key)
    if cached and cached["expires"] > now:
        return cached["data"]

    if not budget_available():
        return _lineup_cache.get(cache_key, {}).get("data") or {"available": False, "announced": False}

    data = _fetch_lineup(fixture_id)
    ttl = _LINEUP_TTL_ANNOUNCED if data.get("announced") else _LINEUP_TTL_PENDING
    _lineup_cache[cache_key] = {"data": data, "expires": now + ttl}
    return data


_lineup_cache: dict = {}


def _fetch_lineup(fixture_id: str) -> dict:
    resp = api_get(_BASE_URL, "/fixtures/lineups", {"fixture": fixture_id})
    if resp is None:
        return {"available": False, "announced": False}

    teams = resp.get("response") or []
    if not teams:
        return {"available": True, "announced": False, "home": None, "away": None}

    home_data = _parse_team(teams[0]) if len(teams) > 0 else None
    away_data = _parse_team(teams[1]) if len(teams) > 1 else None
    announced = bool(home_data and home_data.get("starters"))

    return {
        "available":  True,
        "announced":  announced,
        "home":       home_data,
        "away":       away_data,
    }


def _parse_team(raw: dict) -> dict:
    team       = raw.get("team") or {}
    formation  = raw.get("formation") or ""
    start_xi   = raw.get("startXI") or []
    substitutes = raw.get("substitutes") or []

    starters = [_parse_player(e) for e in start_xi]
    subs     = [_parse_player(e) for e in substitutes]

    return {
        "id":          str(team.get("id") or ""),
        "name":        team.get("name") or "",
        "logo":        team.get("logo") or "",
        "formation":   formation,
        "starters":    starters,
        "substitutes": subs,
    }


def _parse_player(entry: dict) -> dict:
    p   = entry.get("player") or {}
    pid = p.get("id")
    row, col = _parse_grid(p.get("grid") or "")
    return {
        "id":     pid,
        "name":   p.get("name") or "",
        "number": p.get("number"),
        "pos":    p.get("pos") or "",
        "row":    row,
        "col":    col,
        "photo":  f"https://media.api-sports.io/football/players/{pid}.png" if pid else "",
    }


def _parse_grid(grid: str) -> tuple[int, int]:
    if not grid or ":" not in grid:
        return 0, 0
    parts = grid.split(":")
    try:
        return int(parts[0]), int(parts[1])
    except (ValueError, IndexError):
        return 0, 0
