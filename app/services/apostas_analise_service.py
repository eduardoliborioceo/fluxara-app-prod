import datetime
import logging
import os
import time

import requests

logger = logging.getLogger(__name__)

_BASE_URL = "https://v3.football.api-sports.io"
_ESPN_SITE = "https://site.api.espn.com/apis/site/v2/sports/soccer"
_TIMEOUT = 15
_HISTORY_TTL = 43200   # 12h
_ESPN_TTL    = 21600   # 6h
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

_ESPN_SLUG_REVERSE = {v: k for k, v in _ESPN_SLUG.items()}

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

# Cache stores league stats + team index + raw pairs for H2H
_cache: dict = {}


def get_leagues() -> list[dict]:
    return list(_ANALYSIS_LEAGUES)


# ============================================================
# League-level analysis
# ============================================================

def get_league_analysis(league_id: int) -> dict:
    if league_id not in _KNOWN_IDS:
        raise ValueError(f"Liga {league_id} não suportada para análise")
    entry = _ensure_loaded(league_id)
    return entry["league_stats"]


# ============================================================
# Match-level analysis
# ============================================================

def get_match_analysis(league: str, home_id: str, away_id: str) -> dict:
    """
    league: ESPN slug (e.g. "bra.1") or "afl:{id}"
    home_id / away_id: team IDs matching the league source
    """
    league_id = _resolve_league_id(league)
    if league_id is None:
        return _empty_match(home_id, away_id)

    entry = _ensure_loaded(league_id)
    team_index = entry.get("team_index") or {}
    raw_pairs  = entry.get("raw_pairs") or []
    source     = entry.get("source", "none")

    home_stats = _team_profile(team_index, home_id, side="home")
    away_stats = _team_profile(team_index, away_id, side="away")
    h2h        = _compute_h2h(raw_pairs, home_id, away_id)

    return {
        "home":   home_stats,
        "away":   away_stats,
        "h2h":    h2h,
        "source": source,
    }


# ============================================================
# Internal — cache management
# ============================================================

def _ensure_loaded(league_id: int) -> dict:
    now = time.monotonic()
    cached = _cache.get(league_id)
    if cached and cached["expires"] > now:
        return cached

    entry = _load_league(league_id)
    ttl = _ESPN_TTL if entry.get("source") == "espn" else _HISTORY_TTL
    entry["expires"] = now + ttl
    _cache[league_id] = entry
    return entry


def _load_league(league_id: int) -> dict:
    league_info = _LEAGUE_MAP[league_id]
    season = _current_season(league_info)

    afl = _try_apifootball(league_id, league_info, season)
    if afl:
        return afl

    espn_slug = _ESPN_SLUG.get(league_id)
    if espn_slug:
        espn = _try_espn(league_id, league_info, espn_slug)
        if espn:
            return espn

    return {
        "league_stats": _empty_league_stats(league_info, season),
        "team_index": {},
        "raw_pairs": [],
        "source": "none",
    }


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

        pairs = _afl_to_pairs(fixtures)
        return {
            "league_stats": _compute_league_stats(pairs, league_info, _season_label(league_info, season), "apifootball"),
            "team_index":   _build_team_index(pairs),
            "raw_pairs":    pairs,
            "source":       "apifootball",
        }
    except Exception as exc:
        logger.warning("analise afl failed league=%s: %s", league_id, exc)
        return None


def _afl_to_pairs(fixtures: list) -> list[dict]:
    pairs = []
    for f in fixtures:
        goals = f.get("goals") or {}
        gh = goals.get("home")
        ga = goals.get("away")
        if gh is None or ga is None:
            continue
        teams = f.get("teams") or {}
        home  = teams.get("home") or {}
        away  = teams.get("away") or {}
        fix   = f.get("fixture") or {}
        pairs.append({
            "home_id":   str(home.get("id") or ""),
            "home_name": home.get("name") or "",
            "away_id":   str(away.get("id") or ""),
            "away_name": away.get("name") or "",
            "gh": int(gh),
            "ga": int(ga),
            "date": (fix.get("date") or "")[:10],
        })
    return pairs


# ============================================================
# ESPN
# ============================================================

def _try_espn(league_id: int, league_info: dict, slug: str) -> dict | None:
    today = datetime.date.today()
    start = today - datetime.timedelta(days=_ESPN_DAYS)
    params = {"dates": f"{start.strftime('%Y%m%d')}-{today.strftime('%Y%m%d')}", "limit": 200}

    try:
        resp = requests.get(f"{_ESPN_SITE}/{slug}/scoreboard", headers=_ESPN_HEADERS,
                            params=params, timeout=_TIMEOUT)
        if resp.status_code != 200:
            logger.warning("analise espn HTTP %s league=%s", resp.status_code, league_id)
            return None

        events = resp.json().get("events") or []
        pairs  = _espn_to_pairs(events)
        if not pairs:
            return None

        date_label = f"{start.strftime('%d/%m/%y')} – {today.strftime('%d/%m/%y')}"
        return {
            "league_stats": _compute_league_stats(pairs, league_info, date_label, "espn"),
            "team_index":   _build_team_index(pairs),
            "raw_pairs":    pairs,
            "source":       "espn",
        }
    except Exception as exc:
        logger.warning("analise espn failed league=%s: %s", league_id, exc)
        return None


def _espn_to_pairs(events: list) -> list[dict]:
    pairs = []
    for event in events:
        comp = (event.get("competitions") or [{}])[0]
        if (comp.get("status") or {}).get("type", {}).get("state") != "post":
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
        ht = home.get("team") or {}
        at = away.get("team") or {}
        pairs.append({
            "home_id":   str(ht.get("id") or home.get("id") or ""),
            "home_name": ht.get("displayName") or ht.get("name") or "",
            "away_id":   str(at.get("id") or away.get("id") or ""),
            "away_name": at.get("displayName") or at.get("name") or "",
            "gh": gh,
            "ga": ga,
            "date": (event.get("date") or "")[:10],
        })
    return pairs


# ============================================================
# Stats computation
# ============================================================

def _compute_league_stats(pairs: list, league_info: dict, season_label: str, source: str) -> dict:
    hw = draws = aw = tg = btts = csh = csa = 0
    over = {0.5: 0, 1.5: 0, 2.5: 0, 3.5: 0, 4.5: 0}
    total = len(pairs)
    if not total:
        return _empty_league_stats(league_info, _current_season(league_info))

    for p in pairs:
        gh, ga = p["gh"], p["ga"]
        tg += gh + ga
        if gh > ga:   hw += 1
        elif gh == ga: draws += 1
        else:          aw += 1
        for t in over:
            if (gh + ga) > t:
                over[t] += 1
        if gh > 0 and ga > 0: btts += 1
        if ga == 0: csh += 1
        if gh == 0: csa += 1

    def pct(n): return round(n / total * 100, 1)

    return {
        "league_id":   league_info["id"],
        "league_name": league_info["name"],
        "season":      season_label,
        "source":      source,
        "total":       total,
        "home_wins":   {"count": hw,    "pct": pct(hw)},
        "draws":       {"count": draws, "pct": pct(draws)},
        "away_wins":   {"count": aw,    "pct": pct(aw)},
        "avg_goals":   round(tg / total, 2),
        "over": {str(k): {"count": v, "pct": pct(v)} for k, v in over.items()},
        "btts":    {"count": btts, "pct": pct(btts)},
        "cs_home": {"count": csh,  "pct": pct(csh)},
        "cs_away": {"count": csa,  "pct": pct(csa)},
    }


def _build_team_index(pairs: list) -> dict:
    index: dict = {}

    for p in pairs:
        for side, tid, tname, gf, ga in [
            ("home", p["home_id"], p["home_name"], p["gh"], p["ga"]),
            ("away", p["away_id"], p["away_name"], p["ga"], p["gh"]),
        ]:
            if not tid:
                continue
            if tid not in index:
                index[tid] = {"name": tname, "home": _empty_side(), "away": _empty_side()}
            st = index[tid][side]
            st["matches"] += 1
            st["goals_for"] += gf
            st["goals_against"] += ga
            if gf > ga:   st["wins"] += 1
            elif gf == ga: st["draws"] += 1
            else:          st["losses"] += 1
            if gf > 0 and ga > 0: st["btts"] += 1
            if ga == 0: st["cs"] += 1
            for t in st["over"]:
                if (gf + ga) > t:
                    st["over"][t] += 1
            st["recent"].append({
                "result": "W" if gf > ga else ("D" if gf == ga else "L"),
                "score":  f"{gf}-{ga}",
                "date":   p["date"],
            })

    for tid in index:
        for side in ("home", "away"):
            st = index[tid][side]
            st["recent"].sort(key=lambda r: r["date"], reverse=True)
            st["recent"] = st["recent"][:7]

    return index


def _empty_side() -> dict:
    return {
        "matches": 0, "wins": 0, "draws": 0, "losses": 0,
        "goals_for": 0, "goals_against": 0, "btts": 0, "cs": 0,
        "over": {0.5: 0, 1.5: 0, 2.5: 0, 3.5: 0, 4.5: 0},
        "recent": [],
    }


def _team_profile(team_index: dict, team_id: str, side: str) -> dict:
    entry = team_index.get(team_id)
    if not entry:
        return {"id": team_id, "name": "", "found": False, "side": side, "stats": None}

    st = entry[side]
    n  = st["matches"]
    if n == 0:
        return {"id": team_id, "name": entry["name"], "found": True, "side": side, "stats": None}

    def pct(v): return round(v / n * 100, 1)

    return {
        "id":    team_id,
        "name":  entry["name"],
        "found": True,
        "side":  side,
        "stats": {
            "matches":        n,
            "wins":           st["wins"],
            "draws":          st["draws"],
            "losses":         st["losses"],
            "win_pct":        pct(st["wins"]),
            "draw_pct":       pct(st["draws"]),
            "loss_pct":       pct(st["losses"]),
            "goals_for_avg":  round(st["goals_for"]  / n, 2),
            "goals_ag_avg":   round(st["goals_against"] / n, 2),
            "btts_pct":       pct(st["btts"]),
            "cs_pct":         pct(st["cs"]),
            "over25_pct":     pct(st["over"].get(2.5, 0)),
            "over15_pct":     pct(st["over"].get(1.5, 0)),
            "recent":         st["recent"],
        },
    }


def _compute_h2h(raw_pairs: list, home_id: str, away_id: str) -> dict:
    matches = [
        p for p in raw_pairs
        if (p["home_id"] == home_id and p["away_id"] == away_id) or
           (p["home_id"] == away_id and p["away_id"] == home_id)
    ]
    matches.sort(key=lambda p: p["date"], reverse=True)
    matches = matches[:8]

    if not matches:
        return {"total": 0, "home_wins": 0, "draws": 0, "away_wins": 0, "avg_goals": 0, "matches": []}

    hw = draws = aw = tg = 0
    records = []
    for p in matches:
        gh, ga = p["gh"], p["ga"]
        tg += gh + ga
        is_original = p["home_id"] == home_id
        if gh > ga:   hw_inc, aw_inc = (1, 0) if is_original else (0, 1)
        elif gh == ga: hw_inc = aw_inc = 0; draws += 1
        else:          hw_inc, aw_inc = (0, 1) if is_original else (1, 0)
        if gh != ga:
            hw += hw_inc
            aw += aw_inc
        records.append({
            "date":      _fmt_date(p["date"]),
            "home_name": p["home_name"],
            "away_name": p["away_name"],
            "score":     f"{gh}-{ga}",
        })

    total = len(matches)
    return {
        "total":      total,
        "home_wins":  hw,
        "draws":      draws,
        "away_wins":  aw,
        "avg_goals":  round(tg / total, 2),
        "matches":    records,
    }


# ============================================================
# Empty states
# ============================================================

def _empty_league_stats(league_info: dict, season: int) -> dict:
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


def _empty_match(home_id: str, away_id: str) -> dict:
    return {
        "home":   {"id": home_id, "name": "", "found": False, "side": "home", "stats": None},
        "away":   {"id": away_id, "name": "", "found": False, "side": "away", "stats": None},
        "h2h":    {"total": 0, "home_wins": 0, "draws": 0, "away_wins": 0, "avg_goals": 0, "matches": []},
        "source": "none",
    }


# ============================================================
# Helpers
# ============================================================

def _resolve_league_id(league: str) -> int | None:
    if not league:
        return None
    if league.startswith("afl:"):
        try:
            lid = int(league[4:])
            return lid if lid in _KNOWN_IDS else None
        except ValueError:
            return None
    return _ESPN_SLUG_REVERSE.get(league)


def _current_season(league_info: dict) -> int:
    now = datetime.date.today()
    if league_info.get("season_type") == "euro":
        return now.year if now.month >= 7 else now.year - 1
    return now.year


def _season_label(league_info: dict, season: int) -> str:
    if league_info.get("season_type") == "euro":
        return f"{season}/{season + 1}"
    return str(season)


def _fmt_date(iso: str) -> str:
    try:
        d = datetime.datetime.strptime(iso[:10], "%Y-%m-%d")
        return d.strftime("%d/%m/%y")
    except Exception:
        return iso[:10]
