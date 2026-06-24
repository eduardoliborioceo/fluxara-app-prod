import logging
import time

from app.services.sports_base import budget_available, api_get, to_brt
from app.services import sports_base

logger = logging.getLogger(__name__)

_BASE_URL     = "https://v2.nba.api-sports.io"
_STANDINGS_TTL = 21600
_GAMES_TTL    = 7200
_ODDS_TTL     = 1800

_standings_cache: dict = {}
_games_cache:     dict = {}
_odds_cache:      dict = {}

_STATUS_MAP = {
    "NS": "pre", "TBD": "pre", "CANC": "pre",
    "Q1": "in", "Q2": "in", "Q3": "in", "Q4": "in", "OT": "in", "HT": "in",
    "FT": "post", "AOT": "post",
}

_LEAGUE = {"id": "standard", "name": "NBA", "category": "América do Norte", "country": "USA",
           "logo": "https://media.api-sports.io/basketball/leagues/12.png"}


def get_leagues() -> list[dict]:
    return [_LEAGUE]


def get_standings(league_id: str = "standard", season: int | None = None) -> dict:
    s = season or sports_base.current_season()
    cache_key = f"nba_{s}"
    now = time.monotonic()
    cached = _standings_cache.get(cache_key)
    if cached and cached["expires"] > now:
        return cached["data"]
    if not budget_available():
        return _standings_cache.get(cache_key, {}).get("data") or {"groups": [], "season": str(s)}
    resp = api_get(_BASE_URL, "/standings", {"league": league_id, "season": s})
    data = _parse_standings(resp, s) if resp else {"groups": [], "season": str(s)}
    _standings_cache[cache_key] = {"data": data, "expires": now + _STANDINGS_TTL}
    return data


def get_games(league_id: str = "standard", days: int = 14, season: int | None = None) -> dict:
    s = season or sports_base.current_season()
    cache_key = f"nba_{s}_{days}"
    now = time.monotonic()
    cached = _games_cache.get(cache_key)
    if cached and cached["expires"] > now:
        return cached["data"]
    if not budget_available():
        return _games_cache.get(cache_key, {}).get("data") or {"matches": [], "season": str(s)}
    from_date, to_date = sports_base.make_date_range(days)
    resp = api_get(_BASE_URL, "/games", {"league": league_id, "season": s, "from": from_date, "to": to_date})
    games = _parse_games(resp) if resp else []
    data = {"matches": games, "season": str(s), "from": from_date, "to": to_date}
    _games_cache[cache_key] = {"data": data, "expires": now + _GAMES_TTL}
    return data


def get_odds(game_id: int) -> dict | None:
    cache_key = str(game_id)
    now = time.monotonic()
    cached = _odds_cache.get(cache_key)
    if cached and cached["expires"] > now:
        return cached["data"]
    if not budget_available():
        return _odds_cache.get(cache_key, {}).get("data")
    resp = api_get(_BASE_URL, "/odds", {"game": game_id})
    data = _parse_odds(resp) if resp else None
    _odds_cache[cache_key] = {"data": data, "expires": now + _ODDS_TTL}
    return data


def _parse_standings(payload: dict, season: int) -> dict:
    response = payload.get("response") or []
    if not response:
        return {"groups": [], "season": str(season)}
    groups_map: dict[str, list] = {}
    for entry in response:
        team      = entry.get("team") or {}
        conference = entry.get("conference") or {}
        division   = entry.get("division") or {}
        group_name = f"{conference.get('name', '')} — {division.get('name', '')}".strip(" —")
        win = entry.get("win") or {}
        loss = entry.get("loss") or {}
        row = {
            "position":      entry.get("rank", {}).get("division", 0),
            "team_id":       str(team.get("id", "")),
            "team_name":     team.get("name", ""),
            "team_logo":     team.get("logo", ""),
            "team_short":    (team.get("code") or team.get("name") or "")[:3].upper(),
            "matches":       win.get("total", 0) + loss.get("total", 0),
            "wins":          win.get("total", 0),
            "draws":         0,
            "losses":        loss.get("total", 0),
            "goals_for":     0,
            "goals_against": 0,
            "goal_diff":     0,
            "points":        win.get("percentage", "0"),
        }
        if group_name not in groups_map:
            groups_map[group_name] = []
        groups_map[group_name].append(row)
    groups = [{"name": gn, "rows": sorted(rows, key=lambda r: r["position"] or 999)}
              for gn, rows in groups_map.items()]
    return {"season": str(season), "league_logo": _LEAGUE["logo"], "groups": groups}


def _parse_games(payload: dict) -> list[dict]:
    result = []
    for game in (payload.get("response") or []):
        g_node   = game.get("date") or {}
        teams    = game.get("teams") or {}
        scores   = game.get("scores") or {}
        status   = game.get("status") or {}
        home     = teams.get("home") or {}
        visitors = teams.get("visitors") or {}
        date_str = g_node.get("start") or ""
        state = _STATUS_MAP.get(status.get("short") or "NS", "pre")
        hs = (scores.get("home") or {}).get("points")
        vs = (scores.get("visitors") or {}).get("points")
        result.append({
            "event_id":    str(game.get("id") or ""),
            "date_iso":    date_str,
            "date_brt":    to_brt(date_str),
            "home_id":     str(home.get("id") or ""),
            "home_name":   home.get("name") or "",
            "home_logo":   home.get("logo") or "",
            "home_pos":    None,
            "away_id":     str(visitors.get("id") or ""),
            "away_name":   visitors.get("name") or "",
            "away_logo":   visitors.get("logo") or "",
            "away_pos":    None,
            "pos_diff":    None,
            "state":       state,
            "score_home":  "" if hs is None else str(hs),
            "score_away":  "" if vs is None else str(vs),
            "venue":       game.get("arena") or "NBA",
            "city":        "",
            "league_logo": _LEAGUE["logo"],
        })
    result.sort(key=lambda m: m["date_iso"])
    return result


def _parse_odds(payload: dict) -> dict | None:
    for item in (payload.get("response") or []):
        for bookmaker in (item.get("bookmakers") or []):
            for bet in (bookmaker.get("bets") or []):
                name = bet.get("name", "").lower()
                if "moneyline" in name or "winner" in name:
                    values = {v.get("value", ""): _safe_float(v.get("odd")) for v in (bet.get("values") or [])}
                    home = values.get("Home") or values.get("1")
                    away = values.get("Away") or values.get("Visitors") or values.get("2")
                    if home and away:
                        return {"home": home, "away": away}
    return None


def _safe_float(val) -> float | None:
    try:
        return float(val)
    except (TypeError, ValueError):
        return None
