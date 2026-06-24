import datetime
import logging
import os
import time

import requests

logger = logging.getLogger(__name__)

_BASE_URL = "https://v3.football.api-sports.io"
_ESPN_SITE = "https://site.api.espn.com/apis/site/v2/sports/soccer"
_TIMEOUT = 15
_HISTORY_TTL = 43200   # 12h — resultados passados não mudam
_ESPN_TTL    = 21600   # 6h para dados ESPN (parciais, menos estáveis)
_ESPN_DAYS   = 90

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

# Mapeamento para ESPN slugs — usado como fallback quando API-Football retorna vazio
_ESPN_SLUG = {
    71:  "bra.1",
    72:  "bra.2",
    39:  "eng.1",
    140: "esp.1",
    78:  "ger.1",
    135: "ita.1",
    61:  "fra.1",
    94:  "por.1",
    253: "usa.1",
    262: "mex.1",
    2:   "UEFA.CHAMPIONS",
    3:   "UEFA.EUROPA",
}

_ESPN_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json",
}

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
    ttl = _ESPN_TTL if data.get("source") == "espn" else _HISTORY_TTL
    _history_cache[league_id] = {"data": data, "expires": now + ttl}
    return data


def _fetch_and_analyze(league_id: int) -> dict:
    league_info = _LEAGUE_MAP[league_id]
    season = _current_season(league_info)

    afl_result = _try_apifootball(league_id, league_info, season)
    if afl_result and afl_result.get("total", 0) > 0:
        return afl_result

    espn_slug = _ESPN_SLUG.get(league_id)
    if espn_slug:
        espn_result = _try_espn(league_id, league_info, espn_slug)
        if espn_result and espn_result.get("total", 0) > 0:
            return espn_result

    return _empty_analysis(league_info, season)


# ============================================================
# API-Football
# ============================================================

def _try_apifootball(league_id: int, league_info: dict, season: int) -> dict | None:
    api_key = os.environ.get("API_FOOTBALL_KEY", "")
    if not api_key:
        return None

    headers = {"x-apisports-key": api_key, "Accept": "application/json"}
    params = {"league": league_id, "season": season, "status": "FT"}

    try:
        resp = requests.get(f"{_BASE_URL}/fixtures", headers=headers, params=params, timeout=_TIMEOUT)
        if resp.status_code != 200:
            logger.warning("analise afl HTTP %s league=%s", resp.status_code, league_id)
            return None
        fixtures = resp.json().get("response") or []
        if not fixtures:
            return None
        return _compute_stats_afl(fixtures, league_info, season, source="apifootball")
    except Exception as exc:
        logger.warning("analise afl failed league=%s: %s", league_id, exc)
        return None


def _compute_stats_afl(fixtures: list, league_info: dict, season: int, source: str) -> dict:
    home_wins = draws = away_wins = total_goals = btts = cs_home = cs_away = 0
    over_counts = {0.5: 0, 1.5: 0, 2.5: 0, 3.5: 0, 4.5: 0}
    total = 0

    for f in fixtures:
        goals = f.get("goals") or {}
        gh = goals.get("home")
        ga = goals.get("away")
        if gh is None or ga is None:
            continue
        total, home_wins, draws, away_wins, total_goals, btts, cs_home, cs_away, over_counts = _tally(
            total, home_wins, draws, away_wins, total_goals, btts, cs_home, cs_away, over_counts, gh, ga
        )

    if total == 0:
        return _empty_analysis(league_info, season)

    return _build_result(league_info, _season_label(league_info, season), total,
                         home_wins, draws, away_wins, total_goals, btts, cs_home, cs_away,
                         over_counts, source=source)


# ============================================================
# ESPN fallback
# ============================================================

def _try_espn(league_id: int, league_info: dict, slug: str) -> dict | None:
    today = datetime.date.today()
    start = today - datetime.timedelta(days=_ESPN_DAYS)
    from_str = start.strftime("%Y%m%d")
    to_str   = today.strftime("%Y%m%d")

    url = f"{_ESPN_SITE}/{slug}/scoreboard"
    params = {"dates": f"{from_str}-{to_str}", "limit": 200}

    try:
        resp = requests.get(url, headers=_ESPN_HEADERS, params=params, timeout=_TIMEOUT)
        if resp.status_code != 200:
            logger.warning("analise espn HTTP %s league=%s slug=%s", resp.status_code, league_id, slug)
            return None
        events = resp.json().get("events") or []
        return _compute_stats_espn(events, league_info, from_str, to_str)
    except Exception as exc:
        logger.warning("analise espn failed league=%s: %s", league_id, exc)
        return None


def _compute_stats_espn(events: list, league_info: dict, from_str: str, to_str: str) -> dict:
    home_wins = draws = away_wins = total_goals = btts = cs_home = cs_away = 0
    over_counts = {0.5: 0, 1.5: 0, 2.5: 0, 3.5: 0, 4.5: 0}
    total = 0

    for event in events:
        comp = (event.get("competitions") or [{}])[0]
        status_type = (comp.get("status") or {}).get("type") or {}
        if status_type.get("state") != "post":
            continue

        competitors = comp.get("competitors") or []
        home = next((c for c in competitors if c.get("homeAway") == "home"), None)
        away = next((c for c in competitors if c.get("homeAway") == "away"), None)
        if not home or not away:
            continue

        try:
            gh = int(home.get("score") or "")
            ga = int(away.get("score") or "")
        except (ValueError, TypeError):
            continue

        total, home_wins, draws, away_wins, total_goals, btts, cs_home, cs_away, over_counts = _tally(
            total, home_wins, draws, away_wins, total_goals, btts, cs_home, cs_away, over_counts, gh, ga
        )

    if total == 0:
        return _empty_analysis(league_info, _current_season(league_info))

    date_label = f"{_fmt_date(from_str)} – {_fmt_date(to_str)}"
    return _build_result(league_info, date_label, total,
                         home_wins, draws, away_wins, total_goals, btts, cs_home, cs_away,
                         over_counts, source="espn")


# ============================================================
# Shared helpers
# ============================================================

def _tally(total, hw, d, aw, tg, btts, csh, csa, over, gh, ga):
    total += 1
    tg += gh + ga
    if gh > ga:
        hw += 1
    elif gh == ga:
        d += 1
    else:
        aw += 1
    for threshold in over:
        if (gh + ga) > threshold:
            over[threshold] += 1
    if gh > 0 and ga > 0:
        btts += 1
    if ga == 0:
        csh += 1
    if gh == 0:
        csa += 1
    return total, hw, d, aw, tg, btts, csh, csa, over


def _build_result(league_info, season_label, total,
                  home_wins, draws, away_wins, total_goals, btts, cs_home, cs_away,
                  over_counts, source):
    def pct(n):
        return round(n / total * 100, 1)

    return {
        "league_id":   league_info["id"],
        "league_name": league_info["name"],
        "season":      season_label,
        "source":      source,
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
        "btts":    {"count": btts,    "pct": pct(btts)},
        "cs_home": {"count": cs_home, "pct": pct(cs_home)},
        "cs_away": {"count": cs_away, "pct": pct(cs_away)},
    }


def _empty_analysis(league_info: dict, season: int) -> dict:
    return {
        "league_id":   league_info["id"],
        "league_name": league_info["name"],
        "season":      _season_label(league_info, season),
        "source":      "none",
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


def _fmt_date(yyyymmdd: str) -> str:
    try:
        d = datetime.datetime.strptime(yyyymmdd, "%Y%m%d")
        return d.strftime("%d/%m/%y")
    except Exception:
        return yyyymmdd
