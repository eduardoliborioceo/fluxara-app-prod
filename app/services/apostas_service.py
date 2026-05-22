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
_CACHE_TTL = 1800  # 30 minutes

_standings_cache: dict = {}
_odds_cache: dict = {}
_ODDS_CACHE_TTL = 300  # 5 minutes


def get_mismatch_matches(date_str: str, min_diff: int) -> list[dict]:
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
    return results


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
