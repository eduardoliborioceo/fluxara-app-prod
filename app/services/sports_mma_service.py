import logging
import time

from app.services.sports_base import budget_available, api_get, to_brt
from app.services import sports_base

logger = logging.getLogger(__name__)

_BASE_URL      = "https://v1.mma.api-sports.io"
_EVENTS_TTL    = 3600
_FIGHTS_TTL    = 3600
_CATS_TTL      = 86400

_events_cache: dict = {}
_fights_cache: dict = {}
_cats_cache:   dict = {}

_FIGHT_STATUS_MAP = {
    "Scheduled": "pre",
    "Upcoming":  "pre",
    "Live":      "in",
    "Finished":  "post",
    "Cancelled": "pre",
}


def get_leagues() -> list[dict]:
    cats = _get_categories()
    return [
        {"id": str(c.get("id", "")), "name": c.get("name", ""), "category": "MMA",
         "country": "Mundial", "logo": c.get("logo", "")}
        for c in cats
    ]


def get_games(league_id: str = "", days: int = 30, season: int | None = None) -> dict:
    now_m = time.monotonic()
    cached = _events_cache.get(f"events_{days}")
    if cached and cached["expires"] > now_m:
        return cached["data"]
    if not budget_available():
        return _events_cache.get(f"events_{days}", {}).get("data") or {"matches": [], "season": ""}

    from_date, to_date = sports_base.make_date_range(days)
    params: dict = {"from": from_date, "to": to_date}
    if league_id:
        params["category"] = league_id

    resp = api_get(_BASE_URL, "/events", params)
    fights = _parse_events(resp) if resp else []
    data = {"matches": fights, "season": "", "from": from_date, "to": to_date}
    _events_cache[f"events_{days}"] = {"data": data, "expires": now_m + _EVENTS_TTL}
    return data


def get_standings(league_id: str = "", season: int | None = None) -> dict:
    return {"groups": [], "season": ""}


def _get_categories() -> list[dict]:
    now = time.monotonic()
    cached = _cats_cache.get("all")
    if cached and cached["expires"] > now:
        return cached["data"]
    if not budget_available():
        return cached["data"] if cached else []
    resp = api_get(_BASE_URL, "/categories", {})
    cats = (resp.get("response") or []) if resp else []
    _cats_cache["all"] = {"data": cats, "expires": now + _CATS_TTL}
    return cats


def _parse_events(payload: dict) -> list[dict]:
    result = []
    for event in (payload.get("response") or []):
        event_info = event.get("event") or event
        fights     = event.get("fights") or []
        date_str   = event_info.get("date") or ""

        if fights:
            for fight in fights:
                fighters  = fight.get("fighters") or []
                f1 = fighters[0] if len(fighters) > 0 else {}
                f2 = fighters[1] if len(fighters) > 1 else {}
                status = fight.get("status") or "Scheduled"
                state  = _FIGHT_STATUS_MAP.get(status, "pre")

                winner_id = fight.get("winner", {}).get("id") if isinstance(fight.get("winner"), dict) else None
                sh = "W" if winner_id and str(f1.get("id")) == str(winner_id) else ""
                sa = "W" if winner_id and str(f2.get("id")) == str(winner_id) else ""

                result.append({
                    "event_id":    str(fight.get("id") or ""),
                    "date_iso":    date_str,
                    "date_brt":    to_brt(date_str),
                    "home_id":     str(f1.get("id") or ""),
                    "home_name":   f1.get("name") or "",
                    "home_logo":   f1.get("image") or "",
                    "home_pos":    None,
                    "away_id":     str(f2.get("id") or ""),
                    "away_name":   f2.get("name") or "",
                    "away_logo":   f2.get("image") or "",
                    "away_pos":    None,
                    "pos_diff":    None,
                    "state":       state,
                    "score_home":  sh,
                    "score_away":  sa,
                    "venue":       event_info.get("name") or "",
                    "city":        (event_info.get("location") or {}).get("city") or "",
                    "league_logo": "",
                })
        else:
            result.append({
                "event_id":    str(event_info.get("id") or ""),
                "date_iso":    date_str,
                "date_brt":    to_brt(date_str),
                "home_id":     "",
                "home_name":   event_info.get("name") or "",
                "home_logo":   event_info.get("logo") or "",
                "home_pos":    None,
                "away_id":     "",
                "away_name":   event_info.get("location", {}).get("venue") or "",
                "away_logo":   "",
                "away_pos":    None,
                "pos_diff":    None,
                "state":       "pre",
                "score_home":  "",
                "score_away":  "",
                "venue":       event_info.get("location", {}).get("venue") or "",
                "city":        event_info.get("location", {}).get("city") or "",
                "league_logo": "",
            })
    result.sort(key=lambda m: m["date_iso"])
    return result
