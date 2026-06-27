import datetime
import logging
import time

import requests

logger = logging.getLogger(__name__)

_ESPN_BASE_SITE = "https://site.api.espn.com/apis/site/v2/sports"
_ESPN_BASE_V2   = "https://site.api.espn.com/apis/v2/sports"
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json",
}
_TIMEOUT = 12
_STANDINGS_TTL = 1800
_FIXTURES_TTL  = 600

_SPORT_LEAGUES: dict[str, list[dict]] = {
    "soccer": [
        {"slug": "bra.1",                  "name": "Brasileirão Série A",         "category": "Brasil"},
        {"slug": "bra.2",                  "name": "Brasileirão Série B",         "category": "Brasil"},
        {"slug": "bra.3",                  "name": "Brasileirão Série C",         "category": "Brasil"},
        {"slug": "bra.cup",                "name": "Copa do Brasil",              "category": "Brasil"},
        {"slug": "arg.1",                  "name": "Liga Argentina",              "category": "América do Sul"},
        {"slug": "col.1",                  "name": "Liga Colombiana",             "category": "América do Sul"},
        {"slug": "chi.1",                  "name": "Primera División (Chile)",    "category": "América do Sul"},
        {"slug": "uru.1",                  "name": "Primera División (Uruguai)",  "category": "América do Sul"},
        {"slug": "CONMEBOL.LIBERTADORES",  "name": "Copa Libertadores",           "category": "América do Sul"},
        {"slug": "CONMEBOL.SUDAMERICANA",  "name": "Copa Sudamericana",           "category": "América do Sul"},
        {"slug": "eng.1",                  "name": "Premier League",             "category": "Europa"},
        {"slug": "eng.2",                  "name": "Championship",               "category": "Europa"},
        {"slug": "esp.1",                  "name": "La Liga",                    "category": "Europa"},
        {"slug": "ger.1",                  "name": "Bundesliga",                 "category": "Europa"},
        {"slug": "ita.1",                  "name": "Serie A",                    "category": "Europa"},
        {"slug": "fra.1",                  "name": "Ligue 1",                    "category": "Europa"},
        {"slug": "por.1",                  "name": "Primeira Liga",              "category": "Europa"},
        {"slug": "ned.1",                  "name": "Eredivisie",                 "category": "Europa"},
        {"slug": "sco.1",                  "name": "Scottish Premiership",       "category": "Europa"},
        {"slug": "UEFA.CHAMPIONS",         "name": "Champions League",           "category": "Mundial"},
        {"slug": "UEFA.EUROPA",            "name": "Europa League",              "category": "Mundial"},
        {"slug": "UEFA.EUROPA.CONFERENCE", "name": "Conference League",          "category": "Mundial"},
        {"slug": "FIFA.WORLD",             "name": "Copa do Mundo FIFA",         "category": "Mundial"},
        {"slug": "CONMEBOL.COPA",          "name": "Copa América",               "category": "América do Sul"},
        {"slug": "UEFA.EURO",              "name": "Eurocopa",                   "category": "Europa"},
    ],
    "basketball": [
        {"slug": "nba",             "name": "NBA",                        "category": "América do Norte"},
        {"slug": "wnba",            "name": "WNBA",                       "category": "América do Norte"},
        {"slug": "nbb",             "name": "NBB (Brasil)",               "category": "Brasil"},
        {"slug": "mens-euroleague", "name": "EuroLeague",                 "category": "Europa"},
        {"slug": "mens-euro-cup",   "name": "EuroCup",                   "category": "Europa"},
        {"slug": "fiba.world",      "name": "FIBA World Cup",            "category": "Mundial"},
    ],
    "baseball": [
        {"slug": "mlb", "name": "MLB (Major League Baseball)", "category": "América do Norte"},
        {"slug": "kbo", "name": "KBO League (Coreia do Sul)", "category": "Ásia"},
        {"slug": "npb", "name": "NPB (Japão)",                "category": "Ásia"},
    ],
    "tennis": [
        {"slug": "atp", "name": "ATP Tour", "category": "Mundial"},
        {"slug": "wta", "name": "WTA Tour", "category": "Mundial"},
    ],
    "volleyball": [
        {"slug": "volleyball.m.bra", "name": "Superliga (Brasil - Masc.)",  "category": "Brasil"},
        {"slug": "volleyball.w.bra", "name": "Superliga (Brasil - Fem.)",   "category": "Brasil"},
        {"slug": "fivb.m",           "name": "FIVB Nations League (Masc.)", "category": "Mundial"},
        {"slug": "fivb.w",           "name": "FIVB Nations League (Fem.)",  "category": "Mundial"},
    ],
    "handball": [
        {"slug": "ehf.cl",     "name": "EHF Champions League",    "category": "Europa"},
        {"slug": "bundesliga", "name": "Bundesliga (Alemanha)",   "category": "Europa"},
        {"slug": "asobal",     "name": "Liga ASOBAL (Espanha)",   "category": "Europa"},
        {"slug": "starligue",  "name": "Starligue (França)",      "category": "Europa"},
    ],
    "hockey": [
        {"slug": "nhl", "name": "NHL",             "category": "América do Norte"},
        {"slug": "ahl", "name": "AHL",             "category": "América do Norte"},
        {"slug": "khl", "name": "KHL (Rússia)",    "category": "Europa"},
        {"slug": "shl", "name": "SHL (Suécia)",    "category": "Europa"},
    ],
    "football": [
        {"slug": "nfl",              "name": "NFL",            "category": "América do Norte"},
        {"slug": "college-football", "name": "NCAA Football",  "category": "América do Norte"},
        {"slug": "cfl",              "name": "CFL (Canadá)",   "category": "América do Norte"},
    ],
}

_SPORTS = [
    {"slug": "soccer",     "name": "Futebol"},
    {"slug": "basketball", "name": "Basquete"},
    {"slug": "baseball",   "name": "Beisebol"},
    {"slug": "tennis",     "name": "Tênis"},
    {"slug": "volleyball", "name": "Vôlei"},
    {"slug": "handball",   "name": "Handebol"},
    {"slug": "hockey",     "name": "Hockey"},
    {"slug": "football",   "name": "Futebol Americano"},
]

_standings_cache: dict = {}
_fixtures_cache: dict = {}


def get_sports() -> list[dict]:
    return list(_SPORTS)


def get_leagues(sport: str = "soccer") -> list[dict]:
    return list(_SPORT_LEAGUES.get(sport, []))


def get_known_slugs(sport: str = "soccer") -> set[str]:
    return {lg["slug"] for lg in _SPORT_LEAGUES.get(sport, [])}


# ============================================================
# Standings
# ============================================================

def get_standings(league_slug: str, sport: str = "soccer") -> dict:
    cache_key = f"{sport}:{league_slug}"
    now = time.monotonic()
    cached = _standings_cache.get(cache_key)
    if cached and cached["expires"] > now:
        return cached["data"]

    data = _fetch_standings(league_slug, sport)
    _standings_cache[cache_key] = {"data": data, "expires": now + _STANDINGS_TTL}
    return data


def _fetch_standings(league_slug: str, sport: str = "soccer") -> dict:
    for base in [_ESPN_BASE_V2, _ESPN_BASE_SITE]:
        url = f"{base}/{sport}/{league_slug}/standings"
        try:
            resp = requests.get(url, headers=_HEADERS, timeout=_TIMEOUT)
            if resp.status_code != 200:
                continue
            data = _parse_standings(resp.json())
            if data.get("groups"):
                return data
        except Exception as exc:
            logger.warning("ESPN standings failed sport=%s league=%s url=%s: %s", sport, league_slug, url, exc)
    logger.warning("ESPN standings empty for sport=%s league=%s", sport, league_slug)
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
    for i, entry in enumerate(entries):
        team = entry.get("team") or {}
        stats = {s["name"]: s.get("value", 0) for s in entry.get("stats") or []}
        rank = int(stats.get("rank", 0))
        rows.append({
            "position":      rank if rank > 0 else (i + 1),
            "team_id":       team.get("id", ""),
            "team_name":     team.get("displayName", ""),
            "team_short":    team.get("abbreviation", ""),
            "team_logo":     _extract_team_logo(team),
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


def build_standings_map(league_slug: str, sport: str = "soccer") -> dict[str, int]:
    data = get_standings(league_slug, sport)
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

def get_upcoming_fixtures(league_slug: str, days: int = 14, sport: str = "soccer") -> dict:
    cache_key = f"{sport}:{league_slug}_{days}"
    now = time.monotonic()
    cached = _fixtures_cache.get(cache_key)
    if cached and cached["expires"] > now:
        return cached["data"]

    standings_map = build_standings_map(league_slug, sport)
    standings_data = get_standings(league_slug, sport)

    today = datetime.date.today()
    end   = today + datetime.timedelta(days=days)
    from_str = today.strftime("%Y%m%d")
    to_str   = end.strftime("%Y%m%d")

    raw_events, league_logo = _fetch_scoreboard(league_slug, from_str, to_str, sport)
    matches = [_parse_event(ev, standings_map) for ev in raw_events]
    matches.sort(key=lambda m: m["date_iso"])

    all_rows = [r for g in standings_data.get("groups", []) for r in g.get("rows", [])]
    total_teams = len(all_rows)
    current_round = max((r["matches"] for r in all_rows), default=0) if all_rows else 0
    total_rounds  = (total_teams - 1) * 2 if total_teams >= 2 else 0

    data = {
        "league_slug":   league_slug,
        "season":        standings_data.get("season", ""),
        "league_logo":   league_logo,
        "matches":       matches,
        "from":          today.isoformat(),
        "to":            end.isoformat(),
        "current_round": current_round,
        "total_rounds":  total_rounds,
        "standings": [
            {
                "team_id":  r["team_id"],
                "position": r["position"],
                "points":   r["points"],
                "matches":  r["matches"],
            }
            for r in all_rows
        ],
    }
    _fixtures_cache[cache_key] = {"data": data, "expires": now + _FIXTURES_TTL}
    return data


def _fetch_scoreboard(league_slug: str, from_str: str, to_str: str, sport: str = "soccer") -> tuple[list[dict], str]:
    url = f"{_ESPN_BASE_SITE}/{sport}/{league_slug}/scoreboard"
    params = {"dates": f"{from_str}-{to_str}", "limit": 100}
    try:
        resp = requests.get(url, headers=_HEADERS, timeout=_TIMEOUT, params=params)
        if resp.status_code != 200:
            logger.warning("ESPN scoreboard HTTP %s for %s/%s", resp.status_code, sport, league_slug)
            return [], ""
        payload = resp.json()
        league_logo = _extract_league_logo(payload)
        return payload.get("events") or [], league_logo
    except Exception as exc:
        logger.warning("ESPN scoreboard failed sport=%s league=%s: %s", sport, league_slug, exc)
        return [], ""


def _extract_league_logo(payload: dict) -> str:
    leagues = payload.get("leagues") or []
    if not leagues:
        return ""
    logos = leagues[0].get("logos") or []
    if logos:
        return logos[0].get("href") or ""
    return leagues[0].get("logo") or ""


def _extract_team_logo(team: dict) -> str:
    logos = team.get("logos") or []
    if logos:
        return logos[0].get("href") or ""
    return team.get("logo") or ""


def _get_competitor_name(c: dict) -> str:
    team = c.get("team") or {}
    if team.get("displayName"):
        return team["displayName"]
    athlete = c.get("athlete") or {}
    if athlete.get("displayName"):
        return athlete["displayName"]
    return c.get("displayName", "")


def _parse_event(event: dict, standings_map: dict[str, int]) -> dict:
    comp = (event.get("competitions") or [{}])[0]
    competitors = comp.get("competitors") or []

    home = next(
        (c for c in competitors if c.get("homeAway") == "home"),
        competitors[0] if competitors else {},
    )
    away = next(
        (c for c in competitors if c.get("homeAway") == "away"),
        competitors[1] if len(competitors) > 1 else {},
    )

    home_team = home.get("team") or {}
    away_team = away.get("team") or {}

    home_id = str(home_team.get("id") or home.get("id") or "")
    away_id = str(away_team.get("id") or away.get("id") or "")

    home_pos = standings_map.get(home_id)
    away_pos = standings_map.get(away_id)
    pos_diff = abs(home_pos - away_pos) if home_pos and away_pos else None

    status_obj  = comp.get("status") or {}
    status_type = status_obj.get("type") or {}
    state       = status_type.get("state", "pre")

    score_home = home.get("score", "")
    score_away = away.get("score", "")

    venue = comp.get("venue") or {}

    date_iso = event.get("date", "")
    date_brt  = _to_brt(date_iso)

    return {
        "event_id":      event.get("id", ""),
        "date_iso":      date_iso,
        "date_brt":      date_brt,
        "round_number":  event.get("week", {}).get("number"),
        "home_id":       home_id,
        "home_name":     _get_competitor_name(home),
        "home_logo":     _extract_team_logo(home_team),
        "home_pos":      home_pos,
        "away_id":       away_id,
        "away_name":     _get_competitor_name(away),
        "away_logo":     _extract_team_logo(away_team),
        "away_pos":      away_pos,
        "pos_diff":      pos_diff,
        "state":         state,
        "score_home":    score_home,
        "score_away":    score_away,
        "venue":         venue.get("fullName", ""),
        "city":          (venue.get("address") or {}).get("city", ""),
        "display_clock": status_obj.get("displayClock", ""),
        "status_detail": status_type.get("detail", ""),
        "period":        status_obj.get("period", 0),
        "source":        "espn",
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
