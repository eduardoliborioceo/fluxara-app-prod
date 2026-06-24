import logging
import time

from app.services.sports_base import budget_available, api_get, to_brt
from app.services import sports_base

logger = logging.getLogger(__name__)

_BASE_URL    = "https://v1.formula-1.api-sports.io"
_RACES_TTL   = 7200
_RANKS_TTL   = 21600
_SEASONS_TTL = 86400

_races_cache:   dict = {}
_ranks_cache:   dict = {}
_seasons_cache: dict = {}

_RACE_STATUS_MAP = {
    "Scheduled":   "pre",
    "Active":      "in",
    "Completed":   "post",
    "Cancelled":   "pre",
    "Postponed":   "pre",
    "Aborted":     "post",
}


def get_leagues() -> list[dict]:
    return [{"id": "f1", "name": "Formula 1", "category": "Motor Sport", "country": "Mundial",
             "logo": "https://media.api-sports.io/formula-1/formula-1-logo.png"}]


def get_races(season: int | None = None) -> dict:
    s = season or sports_base.current_season()
    cache_key = f"races_{s}"
    now = time.monotonic()
    cached = _races_cache.get(cache_key)
    if cached and cached["expires"] > now:
        return cached["data"]
    if not budget_available():
        return _races_cache.get(cache_key, {}).get("data") or {"matches": [], "season": str(s)}
    resp = api_get(_BASE_URL, "/races", {"season": s})
    races = _parse_races(resp) if resp else []
    data = {"matches": races, "season": str(s)}
    _races_cache[cache_key] = {"data": data, "expires": now + _RACES_TTL}
    return data


def get_games(league_id: str = "f1", days: int = 60, season: int | None = None) -> dict:
    return get_races(season)


def get_standings(league_id: str = "f1", season: int | None = None) -> dict:
    s = season or sports_base.current_season()
    cache_key = f"drivers_{s}"
    now = time.monotonic()
    cached = _ranks_cache.get(cache_key)
    if cached and cached["expires"] > now:
        return cached["data"]
    if not budget_available():
        return _ranks_cache.get(cache_key, {}).get("data") or {"groups": [], "season": str(s)}
    resp_drivers = api_get(_BASE_URL, "/rankings/drivers", {"season": s})
    data = _parse_rankings(resp_drivers, s) if resp_drivers else {"groups": [], "season": str(s)}
    _ranks_cache[cache_key] = {"data": data, "expires": now + _RANKS_TTL}
    return data


def _parse_races(payload: dict) -> list[dict]:
    result = []
    for race in (payload.get("response") or []):
        competition = race.get("competition") or {}
        circuit     = race.get("circuit") or {}
        status_str  = race.get("status") or "Scheduled"
        state       = _RACE_STATUS_MAP.get(status_str, "pre")
        date_str    = ""
        if race.get("date") and race.get("time"):
            date_str = f"{race['date']}T{race['time']}:00+00:00"
        elif race.get("date"):
            date_str = race["date"]

        result.append({
            "event_id":    str(race.get("id") or ""),
            "date_iso":    date_str,
            "date_brt":    to_brt(date_str),
            "home_id":     str(circuit.get("id") or ""),
            "home_name":   competition.get("name") or race.get("competition", {}).get("name", ""),
            "home_logo":   circuit.get("image") or "",
            "home_pos":    None,
            "away_id":     "",
            "away_name":   circuit.get("name") or "",
            "away_logo":   "",
            "away_pos":    None,
            "pos_diff":    None,
            "state":       state,
            "score_home":  str(race.get("laps", {}).get("current") or "") if isinstance(race.get("laps"), dict) else "",
            "score_away":  str(race.get("laps", {}).get("total") or "") if isinstance(race.get("laps"), dict) else "",
            "venue":       circuit.get("name") or "",
            "city":        (circuit.get("location") or {}).get("city") or "",
            "league_logo": "https://media.api-sports.io/formula-1/formula-1-logo.png",
        })
    result.sort(key=lambda m: m["date_iso"])
    return result


def _parse_rankings(payload: dict, season: int) -> dict:
    response = payload.get("response") or []
    if not response:
        return {"groups": [], "season": str(season)}
    rows = []
    for entry in response:
        driver = entry.get("driver") or {}
        team   = entry.get("teams") or [{}]
        team   = team[0] if isinstance(team, list) and team else team
        rows.append({
            "position":      entry.get("position", 0),
            "team_id":       str(driver.get("id", "")),
            "team_name":     f"{driver.get('name', '')}",
            "team_logo":     driver.get("image") or "",
            "team_short":    (driver.get("abbr") or driver.get("name") or "")[:3].upper(),
            "matches":       entry.get("races", 0),
            "wins":          entry.get("wins", 0),
            "draws":         0,
            "losses":        0,
            "goals_for":     entry.get("points", 0),
            "goals_against": 0,
            "goal_diff":     0,
            "points":        entry.get("points", 0),
        })
    rows.sort(key=lambda r: r["position"] or 999)
    return {"season": str(season), "league_logo": "https://media.api-sports.io/formula-1/formula-1-logo.png",
            "groups": [{"name": "Pilotos", "rows": rows}]}
