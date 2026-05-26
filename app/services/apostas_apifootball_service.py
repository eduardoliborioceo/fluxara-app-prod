import datetime
import logging
import os
import time

import requests

logger = logging.getLogger(__name__)

_BASE_URL = "https://v3.football.api-sports.io"
_TIMEOUT = 15
_STANDINGS_TTL = 21600   # 6 hours — conserva budget
_FIXTURES_TTL  = 7200    # 2 hours — conserva budget
_DAILY_SOFT_LIMIT = 90   # para antes de esgotar os 100/dia

_LEAGUES = [
    # Europa Extra (não cobertos pela ESPN)
    {"id": 203, "name": "Süper Lig (Turquia)",      "category": "Europa Extra", "season_type": "calendar"},
    {"id": 235, "name": "Premier League (Rússia)",   "category": "Europa Extra", "season_type": "calendar"},
    {"id": 144, "name": "Pro League (Bélgica)",      "category": "Europa Extra", "season_type": "euro"},
    {"id": 197, "name": "Super League (Grécia)",     "category": "Europa Extra", "season_type": "euro"},
    {"id": 106, "name": "Ekstraklasa (Polônia)",     "category": "Europa Extra", "season_type": "euro"},
    {"id": 119, "name": "Superliga (Dinamarca)",     "category": "Europa Extra", "season_type": "euro"},
    # Américas
    {"id": 253, "name": "MLS (EUA/Canadá)",          "category": "Américas",     "season_type": "calendar"},
    {"id": 262, "name": "Liga MX (México)",          "category": "Américas",     "season_type": "calendar"},
    # Ásia / Oriente Médio
    {"id": 98,  "name": "J1 League (Japão)",         "category": "Ásia",         "season_type": "calendar"},
    {"id": 307, "name": "Saudi Pro League (Arábia)", "category": "Ásia",         "season_type": "calendar"},
]

KNOWN_IDS = {lg["id"] for lg in _LEAGUES}
_LEAGUE_MAP = {lg["id"]: lg for lg in _LEAGUES}

_standings_cache: dict = {}
_fixtures_cache: dict = {}
_odds_cache: dict = {}

_daily_budget: dict = {"date": None, "count": 0}

_ODDS_TTL = 300  # 5 min


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

    if not _budget_available():
        return _standings_cache.get(league_id, {}).get("data") or {"groups": [], "season": ""}

    data = _fetch_standings(league_id)
    _standings_cache[league_id] = {"data": data, "expires": now + _STANDINGS_TTL}
    return data


def get_upcoming_fixtures(league_id: int, days: int = 14) -> dict:
    cache_key = f"{league_id}_{days}"
    now = time.monotonic()
    cached = _fixtures_cache.get(cache_key)
    if cached and cached["expires"] > now:
        return cached["data"]

    if not _budget_available():
        return _fixtures_cache.get(cache_key, {}).get("data") or {
            "league_id": league_id, "season": "", "matches": [], "from": "", "to": "",
        }

    standings_map = _build_standings_map(league_id)

    today = datetime.date.today()
    end = today + datetime.timedelta(days=days)

    raw = _fetch_fixtures(league_id, today.isoformat(), end.isoformat())
    matches = [_parse_fixture(f, standings_map) for f in raw]
    matches.sort(key=lambda m: m["date_iso"])

    league_info = _LEAGUE_MAP.get(league_id, {})
    data = {
        "league_id": league_id,
        "season": _current_season_label(league_info),
        "matches": matches,
        "from": today.isoformat(),
        "to": end.isoformat(),
    }
    _fixtures_cache[cache_key] = {"data": data, "expires": now + _FIXTURES_TTL}
    return data


def get_daily_usage() -> dict:
    _reset_budget_if_new_day()
    return {"used": _daily_budget["count"], "limit": 100, "soft_limit": _DAILY_SOFT_LIMIT}


def get_fixture_odds(fixture_id: int) -> dict:
    now = time.monotonic()
    cached = _odds_cache.get(fixture_id)
    if cached and cached["expires"] > now:
        return cached["data"]

    if not _budget_available():
        return _odds_cache.get(fixture_id, {}).get("data") or {}

    data = _fetch_fixture_odds(fixture_id)
    _odds_cache[fixture_id] = {"data": data, "expires": now + _ODDS_TTL}
    return data


# ============================================================
# Internal — budget
# ============================================================

def _budget_available() -> bool:
    _reset_budget_if_new_day()
    if _daily_budget["count"] >= _DAILY_SOFT_LIMIT:
        logger.warning(
            "api-football daily budget at limit (%s/%s) — using cache only",
            _daily_budget["count"], _DAILY_SOFT_LIMIT,
        )
        return False
    _daily_budget["count"] += 1
    logger.debug("api-football request #%s today", _daily_budget["count"])
    return True


def _reset_budget_if_new_day():
    today = datetime.date.today().isoformat()
    if _daily_budget["date"] != today:
        _daily_budget["date"] = today
        _daily_budget["count"] = 0


# ============================================================
# Internal — season
# ============================================================

def _current_season(league_info: dict) -> int:
    now = datetime.date.today()
    if league_info.get("season_type") == "euro":
        return now.year if now.month >= 7 else now.year - 1
    return now.year


def _current_season_label(league_info: dict) -> str:
    season = _current_season(league_info)
    if league_info.get("season_type") == "euro":
        return f"{season}/{season + 1}"
    return str(season)


# ============================================================
# Internal — standings
# ============================================================

def _fetch_standings(league_id: int) -> dict:
    league_info = _LEAGUE_MAP.get(league_id, {})
    season = _current_season(league_info)
    url = f"{_BASE_URL}/standings"
    params = {"league": league_id, "season": season}
    try:
        resp = _get(url, params)
        if resp is None:
            return {"groups": [], "season": ""}
        return _parse_standings(resp, league_info)
    except Exception as exc:
        logger.warning("api-football standings failed league=%s: %s", league_id, exc)
        return {"groups": [], "season": ""}


def _parse_standings(payload: dict, league_info: dict) -> dict:
    response = payload.get("response") or []
    if not response:
        return {"groups": [], "season": ""}

    league_node = response[0].get("league") or {}
    season_label = _current_season_label(league_info)
    raw_standings = league_node.get("standings") or []

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

    return {"season": season_label, "groups": groups}


def _build_standings_map(league_id: int) -> dict[str, int]:
    data = get_standings(league_id)
    result: dict[str, int] = {}
    for group in data.get("groups") or []:
        for row in group.get("rows") or []:
            tid = row.get("team_id")
            pos = row.get("position")
            if tid and pos:
                result[str(tid)] = pos
    return result


# ============================================================
# Internal — fixtures
# ============================================================

def _fetch_fixtures(league_id: int, from_date: str, to_date: str) -> list[dict]:
    league_info = _LEAGUE_MAP.get(league_id, {})
    season = _current_season(league_info)
    url = f"{_BASE_URL}/fixtures"
    params = {
        "league": league_id,
        "season": season,
        "from": from_date,
        "to": to_date,
    }
    try:
        resp = _get(url, params)
        if resp is None:
            return []
        return resp.get("response") or []
    except Exception as exc:
        logger.warning("api-football fixtures failed league=%s: %s", league_id, exc)
        return []


_STATUS_MAP = {
    "NS": "pre", "TBD": "pre", "PST": "pre", "CANC": "pre", "AWD": "pre", "WO": "pre",
    "1H": "in", "HT": "in", "2H": "in", "ET": "in", "BT": "in", "P": "in", "LIVE": "in",
    "FT": "post", "AET": "post", "PEN": "post",
}


def _parse_fixture(fixture: dict, standings_map: dict[str, int]) -> dict:
    fix_node = fixture.get("fixture") or {}
    teams = fixture.get("teams") or {}
    goals = fixture.get("goals") or {}

    home = teams.get("home") or {}
    away = teams.get("away") or {}
    venue = fix_node.get("venue") or {}
    status = fix_node.get("status") or {}

    home_id = str(home.get("id") or "")
    away_id = str(away.get("id") or "")
    home_pos = standings_map.get(home_id)
    away_pos = standings_map.get(away_id)
    pos_diff = abs(home_pos - away_pos) if home_pos and away_pos else None

    date_iso = fix_node.get("date") or ""
    state = _STATUS_MAP.get(status.get("short") or "", "pre")

    score_home = "" if goals.get("home") is None else str(goals["home"])
    score_away = "" if goals.get("away") is None else str(goals["away"])

    return {
        "source":     "afl",
        "event_id":   str(fix_node.get("id") or ""),
        "date_iso":   date_iso,
        "date_brt":   _to_brt(date_iso),
        "home_id":    home_id,
        "home_name":  home.get("name") or "",
        "home_pos":   home_pos,
        "away_id":    away_id,
        "away_name":  away.get("name") or "",
        "away_pos":   away_pos,
        "pos_diff":   pos_diff,
        "state":      state,
        "score_home": score_home,
        "score_away": score_away,
        "venue":      venue.get("name") or "",
        "city":       venue.get("city") or "",
        "odds":       None,
    }


def _fetch_fixture_odds(fixture_id: int) -> dict:
    url = f"{_BASE_URL}/odds"
    params = {"fixture": fixture_id, "bet": 1}
    try:
        resp = _get(url, params)
        if resp is None:
            return {}
        return _parse_fixture_odds(resp)
    except Exception as exc:
        logger.warning("api-football fixture odds failed fixture=%s: %s", fixture_id, exc)
        return {}


def _parse_fixture_odds(payload: dict) -> dict:
    response = payload.get("response") or []
    if not response:
        return {}
    bookmakers = response[0].get("bookmakers") or []
    if not bookmakers:
        return {}
    bets = bookmakers[0].get("bets") or []
    for bet in bets:
        if bet.get("id") == 1:
            values = bet.get("values") or []
            r: dict = {}
            for v in values:
                name = v.get("value", "")
                try:
                    odd = round(float(v.get("odd") or 0), 2)
                except (TypeError, ValueError):
                    odd = None
                if odd and odd > 1:
                    if name == "Home":
                        r["1"] = odd
                    elif name == "Draw":
                        r["X"] = odd
                    elif name == "Away":
                        r["2"] = odd
            return {"fulltime": r} if r else {}
    return {}


# ============================================================
# Internal — HTTP
# ============================================================

def _get(url: str, params: dict) -> dict | None:
    api_key = os.environ.get("API_FOOTBALL_KEY", "")
    if not api_key:
        logger.warning("API_FOOTBALL_KEY not set — skipping api-football request")
        return None
    headers = {
        "x-apisports-key": api_key,
        "Accept": "application/json",
    }
    resp = requests.get(url, headers=headers, params=params, timeout=_TIMEOUT)
    if resp.status_code != 200:
        logger.warning("api-football HTTP %s for %s params=%s", resp.status_code, url, params)
        return None
    return resp.json()


def _to_brt(iso_str: str) -> str:
    if not iso_str:
        return ""
    try:
        dt = datetime.datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
        brt = dt - datetime.timedelta(hours=3)
        return brt.strftime("%Y-%m-%dT%H:%M")
    except Exception:
        return iso_str[:16]
