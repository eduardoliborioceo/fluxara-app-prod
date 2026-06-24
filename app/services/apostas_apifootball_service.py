import logging
import time

from app.services.sports_base import budget_available, api_get, to_brt
from app.services import sports_base

logger = logging.getLogger(__name__)

_BASE_URL = "https://v3.football.api-sports.io"
_STANDINGS_TTL = 21600
_FIXTURES_TTL  = 7200
_ODDS_TTL      = 1800

_LEAGUES = [
    {"id": 203, "name": "Süper Lig (Turquia)",      "category": "Europa Extra", "season_type": "calendar"},
    {"id": 235, "name": "Premier League (Rússia)",   "category": "Europa Extra", "season_type": "calendar"},
    {"id": 144, "name": "Pro League (Bélgica)",      "category": "Europa Extra", "season_type": "euro"},
    {"id": 197, "name": "Super League (Grécia)",     "category": "Europa Extra", "season_type": "euro"},
    {"id": 106, "name": "Ekstraklasa (Polônia)",     "category": "Europa Extra", "season_type": "euro"},
    {"id": 119, "name": "Superliga (Dinamarca)",     "category": "Europa Extra", "season_type": "euro"},
    {"id": 253, "name": "MLS (EUA/Canadá)",          "category": "Américas",     "season_type": "calendar"},
    {"id": 262, "name": "Liga MX (México)",          "category": "Américas",     "season_type": "calendar"},
    {"id": 98,  "name": "J1 League (Japão)",         "category": "Ásia",         "season_type": "calendar"},
    {"id": 307, "name": "Saudi Pro League (Arábia)", "category": "Ásia",         "season_type": "calendar"},
]

KNOWN_IDS  = {lg["id"] for lg in _LEAGUES}
_LEAGUE_MAP = {lg["id"]: lg for lg in _LEAGUES}

_standings_cache: dict = {}
_fixtures_cache:  dict = {}
_odds_cache:      dict = {}

_STATUS_MAP = {
    "NS": "pre", "TBD": "pre", "PST": "pre", "CANC": "pre", "AWD": "pre", "WO": "pre",
    "1H": "in",  "HT": "in",  "2H": "in",   "ET": "in",   "BT": "in",   "P": "in", "LIVE": "in",
    "FT": "post", "AET": "post", "PEN": "post",
}


# ============================================================
# Public API
# ============================================================

def get_leagues() -> list[dict]:
    return list(_LEAGUES)


def get_standings(league_id: int) -> dict:
    now = time.monotonic()
    cached = _standings_cache.get(league_id)
    if cached and cached["expires"] > now:
        return cached["data"]

    if not budget_available():
        return _standings_cache.get(league_id, {}).get("data") or {"groups": [], "season": "", "league_logo": ""}

    data = _fetch_standings(league_id)
    _standings_cache[league_id] = {"data": data, "expires": now + _STANDINGS_TTL}
    return data


def get_upcoming_fixtures(league_id: int, days: int = 14) -> dict:
    cache_key = f"{league_id}_{days}"
    now = time.monotonic()
    cached = _fixtures_cache.get(cache_key)
    if cached and cached["expires"] > now:
        return cached["data"]

    if not budget_available():
        return _fixtures_cache.get(cache_key, {}).get("data") or {
            "league_id": league_id, "season": "", "matches": [], "from": "", "to": "",
        }

    standings_map, standings_logos = _build_standings_map(league_id)

    from_date, to_date = sports_base.make_date_range(days)
    raw = _fetch_fixtures(league_id, from_date, to_date)
    matches = [_parse_fixture(f, standings_map) for f in raw]
    matches.sort(key=lambda m: m["date_iso"])

    league_info = _LEAGUE_MAP.get(league_id, {})
    data = {
        "league_id":   league_id,
        "season":      _season_label(league_info),
        "league_logo": standings_logos.get("league_logo", ""),
        "matches":     matches,
        "from":        from_date,
        "to":          to_date,
    }
    _fixtures_cache[cache_key] = {"data": data, "expires": now + _FIXTURES_TTL}
    return data


def get_fixture_odds(fixture_id: str) -> dict | None:
    now = time.monotonic()
    cached = _odds_cache.get(fixture_id)
    if cached and cached["expires"] > now:
        return cached["data"]

    if not budget_available():
        return _odds_cache.get(fixture_id, {}).get("data")

    data = _fetch_odds(fixture_id)
    _odds_cache[fixture_id] = {"data": data, "expires": now + _ODDS_TTL}
    return data


def get_daily_usage() -> dict:
    return sports_base.get_daily_usage()


# ============================================================
# Internal — season
# ============================================================

def _season(league_info: dict) -> int:
    return sports_base.current_season(league_info.get("season_type", "calendar"))


def _season_label(league_info: dict) -> str:
    season = _season(league_info)
    if league_info.get("season_type") == "euro":
        return f"{season}/{season + 1}"
    return str(season)


# ============================================================
# Internal — standings
# ============================================================

def _fetch_standings(league_id: int) -> dict:
    league_info = _LEAGUE_MAP.get(league_id, {})
    season = _season(league_info)
    resp = api_get(_BASE_URL, "/standings", {"league": league_id, "season": season})
    if resp is None:
        return {"groups": [], "season": "", "league_logo": ""}
    return _parse_standings(resp, league_info)


def _parse_standings(payload: dict, league_info: dict) -> dict:
    response = payload.get("response") or []
    if not response:
        return {"groups": [], "season": "", "league_logo": ""}

    league_node = response[0].get("league") or {}
    season_label = _season_label(league_info)
    raw_standings = league_node.get("standings") or []
    league_logo = league_node.get("logo") or ""

    groups = []
    for group_rows in raw_standings:
        rows = []
        for entry in group_rows:
            team = entry.get("team") or {}
            all_stats = entry.get("all") or {}
            goals = all_stats.get("goals") or {}
            gf = goals.get("for") or 0
            ga = goals.get("against") or 0
            rows.append({
                "position":      entry.get("rank", 0),
                "team_id":       str(team.get("id", "")),
                "team_name":     team.get("name", ""),
                "team_logo":     team.get("logo", ""),
                "team_short":    (team.get("name") or "")[:3].upper(),
                "matches":       all_stats.get("played", 0),
                "wins":          all_stats.get("win", 0),
                "draws":         all_stats.get("draw", 0),
                "losses":        all_stats.get("lose", 0),
                "goals_for":     gf,
                "goals_against": ga,
                "goal_diff":     entry.get("goalsDiff", gf - ga),
                "points":        entry.get("points", 0),
            })
        rows.sort(key=lambda r: r["position"] or 999)
        group_name = (group_rows[0].get("group") or "") if group_rows else ""
        groups.append({"name": group_name, "rows": rows})

    return {"season": season_label, "league_logo": league_logo, "groups": groups}


def _build_standings_map(league_id: int) -> tuple[dict[str, int], dict]:
    data = get_standings(league_id)
    positions: dict[str, int] = {}
    meta: dict = {"league_logo": data.get("league_logo", "")}
    for group in data.get("groups") or []:
        for row in group.get("rows") or []:
            tid = row.get("team_id")
            pos = row.get("position")
            if tid and pos:
                positions[str(tid)] = pos
    return positions, meta


# ============================================================
# Internal — fixtures
# ============================================================

def _fetch_fixtures(league_id: int, from_date: str, to_date: str) -> list[dict]:
    league_info = _LEAGUE_MAP.get(league_id, {})
    season = _season(league_info)
    resp = api_get(_BASE_URL, "/fixtures", {
        "league": league_id,
        "season": season,
        "from":   from_date,
        "to":     to_date,
    })
    if resp is None:
        return []
    return resp.get("response") or []


def _parse_fixture(fixture: dict, standings_map: dict[str, int]) -> dict:
    fix_node = fixture.get("fixture") or {}
    teams    = fixture.get("teams") or {}
    goals    = fixture.get("goals") or {}
    league   = fixture.get("league") or {}

    home = teams.get("home") or {}
    away = teams.get("away") or {}
    venue  = fix_node.get("venue") or {}
    status = fix_node.get("status") or {}

    home_id  = str(home.get("id") or "")
    away_id  = str(away.get("id") or "")
    home_pos = standings_map.get(home_id)
    away_pos = standings_map.get(away_id)
    pos_diff = abs(home_pos - away_pos) if home_pos and away_pos else None

    date_iso = fix_node.get("date") or ""
    state    = _STATUS_MAP.get(status.get("short") or "", "pre")

    score_home = "" if goals.get("home") is None else str(goals["home"])
    score_away = "" if goals.get("away") is None else str(goals["away"])

    return {
        "event_id":    str(fix_node.get("id") or ""),
        "date_iso":    date_iso,
        "date_brt":    to_brt(date_iso),
        "home_id":     home_id,
        "home_name":   home.get("name") or "",
        "home_logo":   home.get("logo") or "",
        "home_pos":    home_pos,
        "away_id":     away_id,
        "away_name":   away.get("name") or "",
        "away_logo":   away.get("logo") or "",
        "away_pos":    away_pos,
        "pos_diff":    pos_diff,
        "state":       state,
        "score_home":  score_home,
        "score_away":  score_away,
        "venue":       venue.get("name") or "",
        "city":        venue.get("city") or "",
        "league_logo": league.get("logo") or "",
    }


# ============================================================
# Internal — odds
# ============================================================

def _fetch_odds(fixture_id: str) -> dict | None:
    resp = api_get(_BASE_URL, "/odds", {"fixture": fixture_id})
    if resp is None:
        return None
    return _parse_odds(resp)


def _parse_odds(payload: dict) -> dict | None:
    for item in (payload.get("response") or []):
        for bookmaker in (item.get("bookmakers") or []):
            for bet in (bookmaker.get("bets") or []):
                if bet.get("id") == 1 or bet.get("name") == "Match Winner":
                    values = {
                        v["value"]: float(v["odd"])
                        for v in (bet.get("values") or [])
                        if v.get("value") and v.get("odd")
                    }
                    if values.get("Home") and values.get("Draw") and values.get("Away"):
                        return {
                            "home": values["Home"],
                            "draw": values["Draw"],
                            "away": values["Away"],
                        }
    return None
