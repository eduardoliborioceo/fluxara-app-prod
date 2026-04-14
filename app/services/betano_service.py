import json
import logging
import os
import re

import requests

logger = logging.getLogger(__name__)

_BETANO_BASE = "https://www.betano.bet.br"

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/121.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/html, */*",
    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    "Referer": "https://www.betano.bet.br/",
}

_API_PATTERNS = [
    "{base}/api/sport/events/{id}/",
    "{base}/api/sport/events/{id}/markets/",
    "{base}/api/sb/v1/events/{id}/markets/",
]


def fetch_odds(betano_url: str) -> dict:
    event_id = _extract_event_id(betano_url)
    session = requests.Session()
    session.headers.update(_HEADERS)

    email = os.environ.get("BETANO_EMAIL", "")
    password = os.environ.get("BETANO_PASSWORD", "")
    if email and password:
        _do_login(session, email, password)

    for pattern in _API_PATTERNS:
        url = pattern.format(base=_BETANO_BASE, id=event_id)
        try:
            resp = session.get(url, timeout=10)
            if resp.ok and "json" in resp.headers.get("content-type", ""):
                odds = _parse_api(resp.json())
                if odds:
                    return odds
        except Exception:
            continue

    try:
        resp = session.get(betano_url, timeout=15)
        if resp.ok:
            odds = _parse_html(resp.text, event_id)
            if odds:
                return odds
    except Exception as exc:
        logger.warning("Falha ao carregar pagina Betano: %s", exc)

    raise ValueError(
        "Nao foi possivel extrair as odds desta partida. "
        "Verifique se a URL esta correta e se os mercados estao disponiveis."
    )


def _do_login(session, email: str, password: str) -> None:
    try:
        session.post(
            f"{_BETANO_BASE}/api/auth/login/",
            json={"username": email, "password": password},
            timeout=10,
        )
    except Exception as exc:
        logger.warning("Betano login falhou: %s", exc)


def _parse_api(data) -> dict | None:
    markets = _find_markets(data)
    if not markets:
        return None
    return _extract_odds(markets)


def _find_markets(obj, depth: int = 0) -> list | None:
    if depth > 8 or obj is None:
        return None
    if isinstance(obj, list) and obj and isinstance(obj[0], dict):
        if any(k in obj[0] for k in ("name", "marketName", "marketType")):
            return obj
        for item in obj:
            r = _find_markets(item, depth + 1)
            if r:
                return r
    elif isinstance(obj, dict):
        for key in ("markets", "marketGroups", "groupedMarkets", "betOffers"):
            val = obj.get(key)
            if isinstance(val, list) and val:
                r = _find_markets(val, depth + 1)
                if r:
                    return r
        for val in obj.values():
            if isinstance(val, (dict, list)):
                r = _find_markets(val, depth + 1)
                if r:
                    return r
    return None


def _extract_odds(markets: list) -> dict | None:
    odd_mandante = odd_visitante = odd_empate_gols = None

    for market in markets:
        if not isinstance(market, dict):
            continue
        name = _mkt_name(market).lower()
        sels = _mkt_sels(market)

        if _is_result(name):
            for sel in sels:
                sn = _sel_name(sel).lower()
                v = _odd_val(sel)
                if not v:
                    continue
                if _is_home(sn):
                    odd_mandante = v
                elif _is_away(sn):
                    odd_visitante = v

        if _is_correct_score(name):
            for sel in sels:
                sn = _sel_name(sel).lower()
                v = _odd_val(sel)
                if not v:
                    continue
                if _is_draw_goals(sn):
                    if odd_empate_gols is None or v < odd_empate_gols:
                        odd_empate_gols = v

    if odd_mandante and odd_visitante and odd_empate_gols:
        return {"odd_mandante": odd_mandante, "odd_visitante": odd_visitante,
                "odd_empate_gols": odd_empate_gols}
    return None


def _parse_html(html: str, event_id: str) -> dict | None:
    for pat in [
        r'<script[^>]*id=["\']__NEXT_DATA__["\'][^>]*>(.*?)</script>',
        r'window\.__INITIAL_STATE__\s*=\s*(\{.*?\});',
    ]:
        for m in re.finditer(pat, html, re.DOTALL):
            chunk = m.group(1)
            if len(chunk) > 500_000:
                continue
            try:
                result = _parse_api(json.loads(chunk))
                if result:
                    return result
            except Exception:
                continue
    return None


def _extract_event_id(url: str) -> str:
    m = re.search(r"/(\d{7,})(?:/|$)", url)
    if not m:
        raise ValueError("URL invalida - ID do evento nao encontrado")
    return m.group(1)


def _mkt_name(m: dict) -> str:
    return str(m.get("name") or m.get("marketName") or m.get("marketType") or "")


def _mkt_sels(m: dict) -> list:
    for k in ("selections", "outcomes", "runners", "picks"):
        v = m.get(k)
        if isinstance(v, list):
            return v
    return []


def _sel_name(s: dict) -> str:
    return str(s.get("name") or s.get("selectionName") or s.get("outcomeName") or s.get("label") or "")


def _odd_val(s: dict) -> float | None:
    for k in ("odd", "price", "odds", "value", "decimalOdds", "decimal"):
        v = s.get(k)
        if v is not None:
            try:
                f = float(v)
                return f if f > 1.01 else None
            except (TypeError, ValueError):
                continue
    return None


def _is_result(name: str) -> bool:
    return any(k in name for k in ("resultado final", "1x2", "match result", "full time result"))


def _is_correct_score(name: str) -> bool:
    return any(k in name for k in ("resultado correto", "correct score", "placar correto"))


def _is_home(name: str) -> bool:
    has = any(k in name for k in ("1", "home", "casa", "mandante"))
    away = any(k in name for k in ("2", "away", "fora", "visitante"))
    draw = any(k in name for k in ("x", "empate", "draw"))
    return has and not away and not draw


def _is_away(name: str) -> bool:
    has = any(k in name for k in ("2", "away", "fora", "visitante"))
    draw = any(k in name for k in ("x", "empate", "draw"))
    return has and not draw


def _is_draw_goals(name: str) -> bool:
    for sep in (":", "-", " x ", "x"):
        if sep not in name:
            continue
        parts = name.split(sep, 1)
        if len(parts) == 2:
            try:
                a = int("".join(c for c in parts[0] if c.isdigit()) or "-1")
                b = int("".join(c for c in parts[1] if c.isdigit()) or "-1")
                if a == b and a >= 1:
                    return True
            except ValueError:
                continue
    return False
