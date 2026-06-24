import logging
import time

from app.services.sports_base import budget_available, api_get, to_brt
from app.services import sports_base

logger = logging.getLogger(__name__)

_BASE_URL     = "https://v1.handball.api-sports.io"
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
    "1H": "in", "HT": "in", "2H": "in", "OT": "in", "BT": "in",
    "FT": "post", "AOT": "post",
}

_FEATURED_LEAGUES = [
    {"id": 1,   "name": "EHF Champions League", "category": "Europa",   "country": "Europa"},
    {"id": 6,   "name": "Bundesliga (Alemanha)", "category": "Europa",   "country": "Germany"},
    {"id": 9,   "name": "Liga ASOBAL (Espanha)", "category": "Europa",   "country": "Spain"},
    {"id": 7,   "name": "LNH (França)",          "category": "Europa",   "country": "France"},
    {"id": 12,  "name": "HLA (Áustria)",         "category": "Europa",   "country": "Austria"},
    {"id": 55,  "name": "Liga Nacional (Brasil)","category": "América do Sul", "country": "Brazil"},
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
    s = season or sports_base.current_season("euro")
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
    s = season or sports_base.current_season("euro")
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
            "category": country.get("name", "Internacional"),
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
        league = entry.get("league") or {}
        team   = entry.get("team") or {}
        group  = entry.get("group") or "Principal"
        games  = entry.get("games") or {}
        goals  = entry.get("goals") or {}
        league_logo = league_logo or league.get("logo", "")
        wins   = _extract_total(games.get("win"))
        losses = _extract_total(games.get("lose"))
        draws  = _extract_total(games.get("draw"))
        gf     = _extract_total(goals.get("for"))
        ga     = _extract_total(goals.get("against"))
        row = {
            "position":      entry.get("position", 0),
            "team_id":       str(team.get("id", "")),
            "team_name":     team.get("name", ""),
            "team_logo":     team.get("logo", ""),
            "team_short":    (team.get("name") or "")[:3].upper(),
            "matches":       wins + draws + losses,
            "wins":          wins,
            "draws":         draws,
            "losses":        losses,
            "goals_for":     gf,
            "goals_against": ga,
            "goal_diff":     gf - ga,
            "points":        entry.get("points", 0),
        }
        if group not in groups_map:
            groups_map[group] = []
        groups_map[group].append(row)
    groups = [{"name": gn, "rows": sorted(rows, key=lambda r: r["position"] or 999)}
              for gn, rows in groups_map.items()]
    return {"season": str(season), "league_logo": league_logo, "groups": groups}


def _parse_games(payload: dict) -> list[dict]:
    result = []
    for game in (payload.get("response") or []):
        teams    = game.get("teams") or {}
        scores   = game.get("scores") or {}
        status   = game.get("status") or {}
        league   = game.get("league") or {}
        home = teams.get("home") or {}
        away = teams.get("away") or {}
        date_str = game.get("date") or ""
        short_status = status.get("short") or "NS"
        state = _STATUS_MAP.get(short_status, "pre")
        home_score = (scores.get("home") or {}).get("total")
        away_score = (scores.get("away") or {}).get("total")
        result.append({
            "event_id":    str(game.get("id") or ""),
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
            "score_home":  "" if home_score is None else str(home_score),
            "score_away":  "" if away_score is None else str(away_score),
            "venue":       game.get("venue") or league.get("name") or "",
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
                if "winner" in name:
                    values = {v.get("value", ""): _safe_float(v.get("odd")) for v in (bet.get("values") or [])}
                    home = values.get("Home") or values.get("1")
                    away = values.get("Away") or values.get("2")
                    draw = values.get("Draw") or values.get("X")
                    if home and away:
                        result = {"home": home, "away": away}
                        if draw:
                            result["draw"] = draw
                        return result
    return None


def _extract_total(val) -> int:
    if isinstance(val, dict):
        return val.get("total", 0)
    return int(val) if val is not None else 0


def _safe_float(val) -> float | None:
    try:
        return float(val)
    except (TypeError, ValueError):
        return None
