import datetime
import logging
import time

import requests

logger = logging.getLogger(__name__)

_ESPN_SITE = "https://site.api.espn.com/apis/site/v2/sports/soccer"
_ESPN_V2   = "https://site.api.espn.com/apis/v2/sports/soccer"
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json",
}
_TIMEOUT = 12
_STANDINGS_TTL = 1800   # 30 min
_FIXTURES_TTL  = 600    # 10 min

_LEAGUES = [
    # Brasil
    {"slug": "bra.1",   "name": "Brasileirão Série A",   "category": "Brasil"},
    {"slug": "bra.2",   "name": "Brasileirão Série B",   "category": "Brasil"},
    {"slug": "bra.3",   "name": "Brasileirão Série C",   "category": "Brasil"},
    {"slug": "bra.cup", "name": "Copa do Brasil",         "category": "Brasil"},
    # América do Sul
    {"slug": "arg.1",                  "name": "Liga Argentina",      "category": "América do Sul"},
    {"slug": "col.1",                  "name": "Liga Colombiana",     "category": "América do Sul"},
    {"slug": "chi.1",                  "name": "Primera División (Chile)", "category": "América do Sul"},
    {"slug": "uru.1",                  "name": "Primera División (Uruguai)", "category": "América do Sul"},
    {"slug": "CONMEBOL.LIBERTADORES",  "name": "Copa Libertadores",   "category": "América do Sul"},
    {"slug": "CONMEBOL.SUDAMERICANA",  "name": "Copa Sudamericana",   "category": "América do Sul"},
    # Europa
    {"slug": "eng.1", "name": "Premier League",    "category": "Europa"},
    {"slug": "eng.2", "name": "Championship",      "category": "Europa"},
    {"slug": "esp.1", "name": "La Liga",           "category": "Europa"},
    {"slug": "ger.1", "name": "Bundesliga",        "category": "Europa"},
    {"slug": "ita.1", "name": "Serie A",           "category": "Europa"},
    {"slug": "fra.1", "name": "Ligue 1",           "category": "Europa"},
    {"slug": "por.1", "name": "Primeira Liga",     "category": "Europa"},
    {"slug": "ned.1", "name": "Eredivisie",        "category": "Europa"},
    {"slug": "sco.1", "name": "Scottish Premiership", "category": "Europa"},
    # Competições mundiais / continentais
    {"slug": "UEFA.CHAMPIONS",         "name": "Champions League",    "category": "Mundial"},
    {"slug": "UEFA.EUROPA",            "name": "Europa League",       "category": "Mundial"},
    {"slug": "UEFA.EUROPA.CONFERENCE", "name": "Conference League",   "category": "Mundial"},
]

KNOWN_SLUGS = {lg["slug"] for lg in _LEAGUES}

_standings_cache: dict = {}
_fixtures_cache: dict = {}


def get_leagues() -> list[dict]:
    return list(_LEAGUES)


# ============================================================
# Standings
# ============================================================

def get_standings(league_slug: str) -> dict:
    now = time.monotonic()
    cached = _standings_cache.get(league_slug)
    if cached and cached["expires"] > now:
        return cached["data"]

    data = _fetch_standings(league_slug)
    _standings_cache[league_slug] = {"data": data, "expires": now + _STANDINGS_TTL}
    return data


def _fetch_standings(league_slug: str) -> dict:
    url = f"{_ESPN_V2}/{league_slug}/standings"
    try:
        resp = requests.get(url, headers=_HEADERS, timeout=_TIMEOUT)
        if resp.status_code != 200:
            logger.warning("ESPN standings HTTP %s for %s", resp.status_code, league_slug)
            return {"groups": [], "season": ""}
        return _parse_standings(resp.json())
    except Exception as exc:
        logger.warning("ESPN standings failed league=%s: %s", league_slug, exc)
        return {"groups": [], "season": ""}


def _parse_standings(payload: dict) -> dict:
    season_obj = payload.get("season") or {}
    season_name = season_obj.get("displayName", "")

    groups = []
    children = payload.get("children") or []

    if children:
        for child in children:
            _append_group(groups, child)
    else:
        _append_group(groups, payload)

    return {"season": season_name, "groups": groups}


def _append_group(groups: list, node: dict) -> None:
    standings_node = node.get("standings") or {}
    entries = standings_node.get("entries") or []
    if not entries:
        return

    rows = []
    for entry in entries:
        team = entry.get("team") or {}
        stats = {s["name"]: s.get("value", 0) for s in entry.get("stats") or []}
        rows.append({
            "position":      int(stats.get("rank", 0)),
            "team_id":       team.get("id", ""),
            "team_name":     team.get("displayName", ""),
            "team_short":    team.get("abbreviation", ""),
            "matches":       int(stats.get("gamesPlayed", 0)),
            "wins":          int(stats.get("wins", 0)),
            "draws":         int(stats.get("ties", 0)),
            "losses":        int(stats.get("losses", 0)),
            "goals_for":     int(stats.get("pointsFor", 0)),
            "goals_against": int(stats.get("pointsAgainst", 0)),
            "goal_diff":     int(stats.get("pointDifferential", 0)),
            "points":        int(stats.get("points", 0)),
        })

    rows.sort(key=lambda r: r["position"] or 999)
    groups.append({"name": node.get("name", ""), "rows": rows})


def build_standings_map(league_slug: str) -> dict[str, int]:
    data = get_standings(league_slug)
    result: dict[str, int] = {}
    for group in data.get("groups") or []:
        for row in group.get("rows") or []:
            tid = row.get("team_id")
            pos = row.get("position")
            if tid and pos:
                result[str(tid)] = pos
    return result


# ============================================================
# Upcoming fixtures
# ============================================================

def get_upcoming_fixtures(league_slug: str, days: int = 14) -> dict:
    cache_key = f"{league_slug}_{days}"
    now = time.monotonic()
    cached = _fixtures_cache.get(cache_key)
    if cached and cached["expires"] > now:
        return cached["data"]

    standings_map = build_standings_map(league_slug)
    standings_data = get_standings(league_slug)

    today = datetime.date.today()
    end   = today + datetime.timedelta(days=days)
    from_str = today.strftime("%Y%m%d")
    to_str   = end.strftime("%Y%m%d")

    raw_events = _fetch_scoreboard(league_slug, from_str, to_str)
    matches = [_parse_event(ev, standings_map) for ev in raw_events]
    matches.sort(key=lambda m: m["date_iso"])

    data = {
        "league_slug": league_slug,
        "season": standings_data.get("season", ""),
        "matches": matches,
        "from": today.isoformat(),
        "to": end.isoformat(),
    }
    _fixtures_cache[cache_key] = {"data": data, "expires": now + _FIXTURES_TTL}
    return data


def _fetch_scoreboard(league_slug: str, from_str: str, to_str: str) -> list[dict]:
    url = f"{_ESPN_SITE}/{league_slug}/scoreboard"
    params = {"dates": f"{from_str}-{to_str}"}
    try:
        resp = requests.get(url, headers=_HEADERS, timeout=_TIMEOUT, params=params)
        if resp.status_code != 200:
            logger.warning("ESPN scoreboard HTTP %s for %s", resp.status_code, league_slug)
            return []
        return resp.json().get("events") or []
    except Exception as exc:
        logger.warning("ESPN scoreboard failed league=%s: %s", league_slug, exc)
        return []


def _parse_event(event: dict, standings_map: dict[str, int]) -> dict:
    comp = (event.get("competitions") or [{}])[0]
    competitors = comp.get("competitors") or []

    home = next((c for c in competitors if c.get("homeAway") == "home"), {})
    away = next((c for c in competitors if c.get("homeAway") == "away"), {})

    home_team = home.get("team") or {}
    away_team = away.get("team") or {}

    home_id = str(home_team.get("id") or home.get("id") or "")
    away_id = str(away_team.get("id") or away.get("id") or "")

    home_pos = standings_map.get(home_id)
    away_pos = standings_map.get(away_id)
    pos_diff = abs(home_pos - away_pos) if home_pos and away_pos else None

    status = (comp.get("status") or {}).get("type") or {}
    state = status.get("state", "pre")

    score_home = home.get("score", "")
    score_away = away.get("score", "")

    venue = comp.get("venue") or {}

    date_iso = event.get("date", "")
    date_brt  = _to_brt(date_iso)

    return {
        "event_id":   event.get("id", ""),
        "date_iso":   date_iso,
        "date_brt":   date_brt,
        "home_id":    home_id,
        "home_name":  home_team.get("displayName", home.get("displayName", "")),
        "home_pos":   home_pos,
        "away_id":    away_id,
        "away_name":  away_team.get("displayName", away.get("displayName", "")),
        "away_pos":   away_pos,
        "pos_diff":   pos_diff,
        "state":      state,
        "score_home": score_home,
        "score_away": score_away,
        "venue":      venue.get("fullName", ""),
        "city":       (venue.get("address") or {}).get("city", ""),
    }


def _to_brt(iso_str: str) -> str:
    if not iso_str:
        return ""
    try:
        dt = datetime.datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
        brt = dt - datetime.timedelta(hours=3)
        return brt.strftime("%Y-%m-%dT%H:%M")
    except Exception:
        return iso_str[:16]
