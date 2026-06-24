import logging
import time

from app.services.sports_base import budget_available, api_get, to_brt
from app.services import sports_base

logger = logging.getLogger(__name__)

_BASE_URL     = "https://v1.nfl.api-sports.io"
_LEAGUES_TTL  = 86400
_STANDINGS_TTL = 21600
_GAMES_TTL    = 7200
_ODDS_TTL     = 1800

_leagues_cache:   dict = {}
_standings_cache: dict = {}
_games_cache:     dict = {}
_odds_cache:      dict = {}

_STATUS_MAP = {
    "NS": "pre", "TBD": "pre", "CANC": "pre", "SUSP": "pre", "PST": "pre",
    "Q1": "in", "Q2": "in", "Q3": "in", "Q4": "in", "HT": "in", "OT": "in",
    "FT": "post", "AOT": "post",
}

_FEATURED_LEAGUES = [
    {"id": 1, "name": "NFL",    "category": "América do Norte", "country": "USA"},
    {"id": 2, "name": "NCAA FB","category": "América do Norte", "country": "USA"},
    {"id": 3, "name": "CFL",    "category": "América do Norte", "country": "Canada"},
]


def get_leagues() -> list[dict]:
    now = time.monotonic()
    cached = _leagues_cache.get("all")
    if cached and cached["expires"] > now:
        return cached["data"]
    if not budget_available():
        return cached["data"] if cached else _FEATURED_LEAGUES
    resp = api_get(_BASE_URL, "/leagues", {})
    if resp is None:
        return _FEATURED_LEAGUES
    leagues = _parse_leagues(resp)
    result = leagues or _FEATURED_LEAGUES
    _leagues_cache["all"] = {"data": result, "expires": now + _LEAGUES_TTL}
    return result


def get_standings(league_id: int, season: int | None = None) -> dict:
    s = season or sports_base.current_season()
    cache_key = f"{league_id}_{s}"
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


def get_games(league_id: int, days: int = 14, season: int | None = None) -> dict:
    s = season or sports_base.current_season()
    cache_key = f"{league_id}_{s}_{days}"
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


def _parse_leagues(payload: dict) -> list[dict]:
    result = []
    for item in (payload.get("response") or []):
        league  = item.get("league") or item
        country = item.get("country") or {}
        result.append({
            "id":       league.get("id"),
            "name":     league.get("name", ""),
            "logo":     league.get("logo", ""),
            "category": country.get("name", "América do Norte"),
            "country":  country.get("name", ""),
        })
    return result


def _parse_standings(payload: dict, season: int) -> dict:
    response = payload.get("response") or []
    if not response:
        return {"groups": [], "season": str(season)}
    league_logo = ""
    groups_map: dict[str, list] = {}
    for entry in response:
        league   = entry.get("league") or {}
        team     = entry.get("team") or {}
        division = entry.get("division") or entry.get("conference") or "Principal"
        wins   = entry.get("won", 0)
        losses = entry.get("lost", 0)
        ties   = entry.get("ties", 0)
        league_logo = league_logo or league.get("logo", "")
        row = {
            "position":      entry.get("position", 0),
            "team_id":       str(team.get("id", "")),
            "team_name":     team.get("name", ""),
            "team_logo":     team.get("logo", ""),
            "team_short":    (team.get("name") or "")[:3].upper(),
            "matches":       wins + losses + ties,
            "wins":          wins,
            "draws":         ties,
            "losses":        losses,
            "goals_for":     entry.get("points_for", 0),
            "goals_against": entry.get("points_against", 0),
            "goal_diff":     entry.get("points_for", 0) - entry.get("points_against", 0),
            "points":        entry.get("points", 0),
        }
        if division not in groups_map:
            groups_map[division] = []
        groups_map[division].append(row)
    groups = [{"name": gn, "rows": sorted(rows, key=lambda r: r["position"] or 999)}
              for gn, rows in groups_map.items()]
    return {"season": str(season), "league_logo": league_logo, "groups": groups}


def _parse_games(payload: dict) -> list[dict]:
    result = []
    for game in (payload.get("response") or []):
        game_node = game.get("game") or {}
        teams     = game.get("teams") or {}
        scores    = game.get("scores") or {}
        status    = game.get("status") or {}
        league    = game.get("league") or {}
        home = teams.get("home") or {}
        away = teams.get("away") or {}
        date_info = game_node.get("date") or {}
        date_str  = date_info.get("date") or game.get("date") or ""
        time_str  = date_info.get("time") or ""
        if date_str and time_str and "T" not in date_str:
            date_str = f"{date_str}T{time_str}:00+00:00"
        state = _STATUS_MAP.get(status.get("short") or "NS", "pre")
        hs = (scores.get("home") or {}).get("total")
        as_ = (scores.get("away") or {}).get("total")
        result.append({
            "event_id":    str(game.get("id") or game_node.get("id") or ""),
            "date_iso":    date_str,
            "date_brt":    to_brt(date_str),
            "home_id":     str(home.get("id") or ""),
            "home_name":   home.get("name") or "",
            "home_logo":   home.get("logo") or "",
            "home_pos":    None,
            "away_id":     str(away.get("id") or ""),
            "away_name":   away.get("name") or "",
            "away_logo":   away.get("logo") or "",
            "away_pos":    None,
            "pos_diff":    None,
            "state":       state,
            "score_home":  "" if hs is None else str(hs),
            "score_away":  "" if as_ is None else str(as_),
            "venue":       game_node.get("stadium") or league.get("name") or "",
            "city":        "",
            "league_logo": league.get("logo") or "",
        })
    result.sort(key=lambda m: m["date_iso"])
    return result


def _parse_odds(payload: dict) -> dict | None:
    for item in (payload.get("response") or []):
        for bookmaker in (item.get("bookmakers") or []):
            for bet in (bookmaker.get("bets") or []):
                name = bet.get("name", "").lower()
                if "winner" in name or "moneyline" in name or "spread" in name:
                    values = {v.get("value", ""): _safe_float(v.get("odd")) for v in (bet.get("values") or [])}
                    home = values.get("Home") or values.get("1")
                    away = values.get("Away") or values.get("2")
                    if home and away:
                        return {"home": home, "away": away}
    return None


def _safe_float(val) -> float | None:
    try:
        return float(val)
    except (TypeError, ValueError):
        return None
