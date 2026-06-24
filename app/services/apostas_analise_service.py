import datetime
import logging
import os
import time

import requests

logger = logging.getLogger(__name__)

_BASE_URL = "https://v3.football.api-sports.io"
_TIMEOUT = 15
_HISTORY_TTL = 43200  # 12h — resultados passados não mudam

_ANALYSIS_LEAGUES = [
    {"id": 71,  "name": "Brasileirão Série A",     "category": "Brasil",       "season_type": "calendar"},
    {"id": 72,  "name": "Brasileirão Série B",     "category": "Brasil",       "season_type": "calendar"},
    {"id": 39,  "name": "Premier League",          "category": "Europa",       "season_type": "euro"},
    {"id": 140, "name": "La Liga",                 "category": "Europa",       "season_type": "euro"},
    {"id": 78,  "name": "Bundesliga",              "category": "Europa",       "season_type": "euro"},
    {"id": 135, "name": "Serie A (Itália)",        "category": "Europa",       "season_type": "euro"},
    {"id": 61,  "name": "Ligue 1",                 "category": "Europa",       "season_type": "euro"},
    {"id": 94,  "name": "Primeira Liga",           "category": "Europa",       "season_type": "euro"},
    {"id": 203, "name": "Süper Lig (Turquia)",     "category": "Europa Extra", "season_type": "calendar"},
    {"id": 144, "name": "Pro League (Bélgica)",    "category": "Europa Extra", "season_type": "euro"},
    {"id": 253, "name": "MLS (EUA/Canadá)",        "category": "Américas",     "season_type": "calendar"},
    {"id": 262, "name": "Liga MX (México)",        "category": "Américas",     "season_type": "calendar"},
    {"id": 2,   "name": "Champions League",        "category": "Mundial",      "season_type": "euro"},
    {"id": 3,   "name": "Europa League",           "category": "Mundial",      "season_type": "euro"},
]

_KNOWN_IDS = {lg["id"] for lg in _ANALYSIS_LEAGUES}
_LEAGUE_MAP = {lg["id"]: lg for lg in _ANALYSIS_LEAGUES}

_history_cache: dict = {}


def get_leagues() -> list[dict]:
    return list(_ANALYSIS_LEAGUES)


def get_league_analysis(league_id: int) -> dict:
    if league_id not in _KNOWN_IDS:
        raise ValueError(f"Liga {league_id} não suportada para análise")

    now = time.monotonic()
    cached = _history_cache.get(league_id)
    if cached and cached["expires"] > now:
        return cached["data"]

    data = _fetch_and_analyze(league_id)
    _history_cache[league_id] = {"data": data, "expires": now + _HISTORY_TTL}
    return data


def _fetch_and_analyze(league_id: int) -> dict:
    league_info = _LEAGUE_MAP[league_id]
    season = _current_season(league_info)

    api_key = os.environ.get("API_FOOTBALL_KEY", "")
    if not api_key:
        logger.warning("API_FOOTBALL_KEY not set — analysis unavailable")
        return _empty_analysis(league_info, season)

    headers = {"x-apisports-key": api_key, "Accept": "application/json"}
    params = {"league": league_id, "season": season, "status": "FT"}

    try:
        resp = requests.get(f"{_BASE_URL}/fixtures", headers=headers, params=params, timeout=_TIMEOUT)
        if resp.status_code != 200:
            logger.warning("analise api-football HTTP %s league=%s", resp.status_code, league_id)
            return _empty_analysis(league_info, season)

        fixtures = resp.json().get("response") or []
        return _compute_stats(fixtures, league_info, season)
    except Exception as exc:
        logger.warning("analise fetch failed league=%s: %s", league_id, exc)
        return _empty_analysis(league_info, season)


def _compute_stats(fixtures: list, league_info: dict, season: int) -> dict:
    home_wins = draws = away_wins = total_goals = btts = cs_home = cs_away = 0
    over_counts = {0.5: 0, 1.5: 0, 2.5: 0, 3.5: 0, 4.5: 0}
    total = 0

    for f in fixtures:
        goals = f.get("goals") or {}
        gh = goals.get("home")
        ga = goals.get("away")
        if gh is None or ga is None:
            continue

        total += 1
        total_goals += gh + ga

        if gh > ga:
            home_wins += 1
        elif gh == ga:
            draws += 1
        else:
            away_wins += 1

        for threshold in over_counts:
            if (gh + ga) > threshold:
                over_counts[threshold] += 1

        if gh > 0 and ga > 0:
            btts += 1
        if ga == 0:
            cs_home += 1
        if gh == 0:
            cs_away += 1

    if total == 0:
        return _empty_analysis(league_info, season)

    def pct(n: int) -> float:
        return round(n / total * 100, 1)

    return {
        "league_id":   league_info["id"],
        "league_name": league_info["name"],
        "season":      _season_label(league_info, season),
        "total":       total,
        "home_wins":   {"count": home_wins, "pct": pct(home_wins)},
        "draws":       {"count": draws,     "pct": pct(draws)},
        "away_wins":   {"count": away_wins, "pct": pct(away_wins)},
        "avg_goals":   round(total_goals / total, 2),
        "over": {
            "0.5": {"count": over_counts[0.5], "pct": pct(over_counts[0.5])},
            "1.5": {"count": over_counts[1.5], "pct": pct(over_counts[1.5])},
            "2.5": {"count": over_counts[2.5], "pct": pct(over_counts[2.5])},
            "3.5": {"count": over_counts[3.5], "pct": pct(over_counts[3.5])},
            "4.5": {"count": over_counts[4.5], "pct": pct(over_counts[4.5])},
        },
        "btts":     {"count": btts,    "pct": pct(btts)},
        "cs_home":  {"count": cs_home, "pct": pct(cs_home)},
        "cs_away":  {"count": cs_away, "pct": pct(cs_away)},
    }


def _empty_analysis(league_info: dict, season: int) -> dict:
    return {
        "league_id":   league_info["id"],
        "league_name": league_info["name"],
        "season":      _season_label(league_info, season),
        "total":       0,
        "home_wins":   {"count": 0, "pct": 0},
        "draws":       {"count": 0, "pct": 0},
        "away_wins":   {"count": 0, "pct": 0},
        "avg_goals":   0,
        "over":        {k: {"count": 0, "pct": 0} for k in ["0.5", "1.5", "2.5", "3.5", "4.5"]},
        "btts":        {"count": 0, "pct": 0},
        "cs_home":     {"count": 0, "pct": 0},
        "cs_away":     {"count": 0, "pct": 0},
    }


def _current_season(league_info: dict) -> int:
    now = datetime.date.today()
    if league_info.get("season_type") == "euro":
        return now.year if now.month >= 7 else now.year - 1
    return now.year


def _season_label(league_info: dict, season: int) -> str:
    if league_info.get("season_type") == "euro":
        return f"{season}/{season + 1}"
    return str(season)
