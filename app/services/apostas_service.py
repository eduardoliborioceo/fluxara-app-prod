import concurrent.futures
import logging
import time

import requests

logger = logging.getLogger(__name__)

_API_BASE = "https://api.sofascore.com/api/v1"
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Referer": "https://www.sofascore.com/",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    "Origin": "https://www.sofascore.com",
}
_TIMEOUT = 12
_CACHE_TTL = 1800       # 30 min — match-day standings
_ODDS_CACHE_TTL = 300   # 5 min — odds
_SEASON_CACHE_TTL = 86400  # 24 h — season discovery

_standings_cache: dict = {}
_odds_cache: dict = {}
_season_cache: dict = {}
_full_standings_cache: dict = {}

_KNOWN_TOURNAMENTS = [
    {"id": 325, "name": "Brasileirão Série A", "category": "Brasil"},
    {"id": 390, "name": "Brasileirão Série B", "category": "Brasil"},
    {"id": 384, "name": "CONMEBOL Libertadores", "category": "América do Sul"},
    {"id": 480, "name": "CONMEBOL Sudamericana", "category": "América do Sul"},
    {"id": 17,  "name": "Premier League",       "category": "Inglaterra"},
    {"id": 8,   "name": "LaLiga",               "category": "Espanha"},
    {"id": 35,  "name": "Bundesliga",           "category": "Alemanha"},
    {"id": 23,  "name": "Serie A",              "category": "Itália"},
    {"id": 34,  "name": "Ligue 1",              "category": "França"},
]

_KNOWN_TOURNAMENT_IDS = {t["id"] for t in _KNOWN_TOURNAMENTS}


# ============================================================
# Analisador
# ============================================================

def get_mismatch_matches(date_str: str, min_diff: int) -> tuple[list[dict], int]:
    events = _fetch_events(date_str)

    tournament_keys: set[tuple] = set()
    for event in events:
        ut = event.get("uniqueTournament") or {}
        season = event.get("season") or {}
        tid = ut.get("id")
        sid = season.get("id")
        if tid and sid:
            tournament_keys.add((tid, sid))

    standings_maps: dict[tuple, dict] = {}

    def _fetch_one(key: tuple) -> tuple[tuple, dict]:
        return key, _get_standings_map(key[0], key[1])

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(_fetch_one, key): key for key in tournament_keys}
        for future in concurrent.futures.as_completed(futures):
            try:
                key, standings = future.result()
                standings_maps[key] = standings
            except Exception as exc:
                logger.warning("standings fetch error: %s", exc)

    with_standings = 0
    results = []
    for event in events:
        ut = event.get("uniqueTournament") or {}
        season = event.get("season") or {}
        tid = ut.get("id")
        sid = season.get("id")

        standings_map = standings_maps.get((tid, sid), {})
        if not standings_map:
            continue

        home = event.get("homeTeam") or {}
        away = event.get("awayTeam") or {}
        home_id = home.get("id")
        away_id = away.get("id")

        home_pos = standings_map.get(home_id)
        away_pos = standings_map.get(away_id)

        if home_pos is None or away_pos is None:
            continue

        with_standings += 1
        diff = abs(home_pos - away_pos)
        if diff < min_diff:
            continue

        category = (event.get("tournament") or {}).get("category") or {}
        round_info = event.get("roundInfo") or {}
        status = event.get("status") or {}

        results.append({
            "event_id": event.get("id"),
            "home_team": home.get("name", ""),
            "home_short": home.get("shortName", ""),
            "away_team": away.get("name", ""),
            "away_short": away.get("shortName", ""),
            "home_pos": home_pos,
            "away_pos": away_pos,
            "pos_diff": diff,
            "tournament_id": tid,
            "tournament": ut.get("name", ""),
            "season": season.get("name", ""),
            "country": category.get("name", ""),
            "start_timestamp": event.get("startTimestamp"),
            "status_desc": status.get("description", ""),
            "status_type": status.get("type", ""),
            "round": round_info.get("round"),
        })

    results.sort(key=lambda x: x["pos_diff"], reverse=True)

    def _fetch_one_odds(event_id):
        return event_id, get_event_odds(event_id)

    odds_map: dict = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        odds_futures = {executor.submit(_fetch_one_odds, r["event_id"]): r["event_id"] for r in results}
        for future in concurrent.futures.as_completed(odds_futures):
            try:
                eid, odds = future.result()
                if odds:
                    odds_map[eid] = odds
            except Exception as exc:
                logger.warning("mismatch odds fetch error: %s", exc)

    for r in results:
        r["odds"] = odds_map.get(r["event_id"])

    return results, with_standings


# ============================================================
# Odds
# ============================================================

def get_event_odds(event_id: int) -> dict:
    now = time.monotonic()
    cached = _odds_cache.get(event_id)
    if cached and cached["expires"] > now:
        return cached["data"]

    data = _fetch_featured_odds(event_id)
    _odds_cache[event_id] = {"data": data, "expires": now + _ODDS_CACHE_TTL}
    return data


def _fetch_featured_odds(event_id: int) -> dict:
    url = f"{_API_BASE}/event/{event_id}/odds/1/featured"
    try:
        resp = requests.get(url, headers=_HEADERS, timeout=_TIMEOUT)
        if resp.status_code != 200:
            return {}
        payload = resp.json()
        return _parse_featured_odds(payload)
    except Exception as exc:
        logger.warning("Sofascore odds fetch failed event=%s: %s", event_id, exc)
        return {}


def _parse_featured_odds(payload: dict) -> dict:
    featured = payload.get("featured") or {}
    result = {}

    ft = featured.get("fullTime") or featured.get("default")
    if ft:
        choices = ft.get("choices") or []
        odds_1x2 = {}
        for c in choices:
            name = c.get("name", "")
            dec = _frac_to_decimal(c.get("fractionalValue", ""))
            if name in ("1", "X", "2") and dec is not None:
                odds_1x2[name] = dec
        if odds_1x2:
            result["fulltime"] = odds_1x2

    asian = featured.get("asian")
    if asian:
        choices = asian.get("choices") or []
        result["asian"] = [
            {"name": c.get("name", ""), "odd": _frac_to_decimal(c.get("fractionalValue", ""))}
            for c in choices
            if _frac_to_decimal(c.get("fractionalValue", "")) is not None
        ]

    return result


def _frac_to_decimal(frac: str) -> float | None:
    if not frac:
        return None
    try:
        num_str, den_str = frac.split("/")
        return round(int(num_str) / int(den_str) + 1, 2)
    except Exception:
        return None


# ============================================================
# Standings explorer
# ============================================================

def get_tournaments_list() -> list[dict]:
    return list(_KNOWN_TOURNAMENTS)


def get_tournament_standings(tournament_id: int) -> dict:
    now = time.monotonic()
    cached = _full_standings_cache.get(tournament_id)
    if cached and cached["expires"] > now:
        return cached["data"]

    season_id, season_name = _get_current_season(tournament_id)
    if not season_id:
        return {"groups": [], "season": "", "tournament_id": tournament_id}

    groups = _fetch_standings_full(tournament_id, season_id)
    data = {
        "tournament_id": tournament_id,
        "season": season_name,
        "groups": groups,
    }
    _full_standings_cache[tournament_id] = {"data": data, "expires": now + _CACHE_TTL}
    return data


def _get_current_season(tournament_id: int) -> tuple:
    now = time.monotonic()
    cached = _season_cache.get(tournament_id)
    if cached and cached["expires"] > now:
        return cached["data"]

    url = f"{_API_BASE}/unique-tournament/{tournament_id}/seasons"
    try:
        resp = requests.get(url, headers=_HEADERS, timeout=_TIMEOUT)
        if resp.status_code != 200:
            return None, ""
        seasons = resp.json().get("seasons", [])
        if not seasons:
            return None, ""
        latest = seasons[0]
        season_id = latest.get("id")
        season_name = latest.get("name", "")
        result = (season_id, season_name)
        _season_cache[tournament_id] = {"data": result, "expires": now + _SEASON_CACHE_TTL}
        return result
    except Exception as exc:
        logger.warning("Season discovery failed t=%s: %s", tournament_id, exc)
        return None, ""


def _fetch_standings_full(tournament_id: int, season_id: int) -> list[dict]:
    url = f"{_API_BASE}/unique-tournament/{tournament_id}/season/{season_id}/standings/total"
    try:
        resp = requests.get(url, headers=_HEADERS, timeout=_TIMEOUT)
        if resp.status_code != 200:
            return []
        payload = resp.json()
        groups = []
        for table in payload.get("standings", []):
            rows = []
            for row in table.get("rows", []):
                team = row.get("team") or {}
                rows.append({
                    "position":       row.get("position"),
                    "team_id":        team.get("id"),
                    "team_name":      team.get("name", ""),
                    "team_short":     team.get("shortName", ""),
                    "matches":        row.get("matches", 0),
                    "wins":           row.get("wins", 0),
                    "draws":          row.get("draws", 0),
                    "losses":         row.get("losses", 0),
                    "goals_for":      row.get("scoresFor", 0),
                    "goals_against":  row.get("scoresAgainst", 0),
                    "goal_diff":      row.get("scoreDiffFormatted", "0"),
                    "points":         row.get("points", 0),
                })
            if rows:
                groups.append({
                    "name": table.get("name", ""),
                    "rows": rows,
                })
        return groups
    except Exception as exc:
        logger.warning("Full standings fetch failed t=%s s=%s: %s", tournament_id, season_id, exc)
        return []


# ============================================================
# Internal helpers
# ============================================================

def _fetch_events(date_str: str) -> list[dict]:
    url = f"{_API_BASE}/sport/football/scheduled-events/{date_str}"
    try:
        resp = requests.get(url, headers=_HEADERS, timeout=_TIMEOUT)
        resp.raise_for_status()
        return resp.json().get("events", [])
    except Exception as exc:
        logger.warning("Sofascore events fetch failed for %s: %s", date_str, exc)
        return []


def _get_standings_map(tournament_id: int, season_id: int) -> dict[int, int]:
    key = (tournament_id, season_id)
    now = time.monotonic()
    cached = _standings_cache.get(key)
    if cached and cached["expires"] > now:
        return cached["data"]

    data = _fetch_standings(tournament_id, season_id)
    _standings_cache[key] = {"data": data, "expires": now + _CACHE_TTL}
    return data


def _fetch_standings(tournament_id: int, season_id: int) -> dict[int, int]:
    url = f"{_API_BASE}/unique-tournament/{tournament_id}/season/{season_id}/standings/total"
    try:
        resp = requests.get(url, headers=_HEADERS, timeout=_TIMEOUT)
        if resp.status_code != 200:
            return {}
        payload = resp.json()
        result: dict[int, int] = {}
        for table in payload.get("standings", []):
            for row in table.get("rows", []):
                team_id = (row.get("team") or {}).get("id")
                position = row.get("position")
                if team_id and position is not None:
                    result[team_id] = position
        return result
    except Exception as exc:
        logger.warning(
            "Sofascore standings fetch failed t=%s s=%s: %s",
            tournament_id, season_id, exc,
        )
        return {}
