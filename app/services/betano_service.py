import json
import logging
import os
import re
import threading

import requests

logger = logging.getLogger(__name__)

_BETANO_BASE = "https://www.betano.bet.br"
_FLARESOLVERR_URL = os.environ.get(
    "FLARESOLVERR_URL", "http://flaresolverr.railway.internal:8080"
).strip()

_VALID_DAYS = frozenset({
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
})

_session_lock = threading.Lock()
_session_state: dict = {"id": None, "warmed": False}


# ─── Public API ──────────────────────────────────────────────────────────────

def fetch_odds(betano_url: str) -> dict:
    slug, event_id = _extract_slug_and_id(betano_url)
    page_url = f"{_BETANO_BASE}/odds/{slug}/{event_id}/"

    response_text = _fetch_page(page_url, referer=_BETANO_BASE + "/")

    next_data = _extract_next_data(response_text)
    if next_data:
        odds = _parse_next_data(next_data)
        if odds:
            return odds

    raise ValueError(
        "Resposta recebida mas sem mercados necessarios (1x2 + Resultado Correto). "
        "O jogo pode nao ter os mercados disponiveis ou a estrutura da pagina mudou."
    )


def fetch_upcoming(day: str) -> list[dict]:
    if day not in _VALID_DAYS:
        raise ValueError(
            "Dia invalido. Use: Monday, Tuesday, Wednesday, "
            "Thursday, Friday, Saturday, Sunday"
        )

    url = f"{_BETANO_BASE}/upcomingcoupon/?sid=FOOT&day={day}"
    response_text = _fetch_page(url, referer=f"{_BETANO_BASE}/sport/futebol/")

    next_data = _extract_next_data(response_text)
    if next_data:
        matches = _collect_events_from_next_data(next_data)
        if matches:
            return matches

    fallback = _extract_events_from_raw_html(response_text)
    if fallback:
        return fallback

    raise ValueError(
        "Nenhuma partida encontrada para este dia. "
        "O dia pode nao ter jogos ou a estrutura da pagina mudou."
    )


# ─── Core fetch with DataDome fallback ───────────────────────────────────────

def _fetch_page(url: str, referer: str = None) -> str:
    """
    Tries two strategies in order:
      1. Flaresolverr persistent session (no injected cookies)
      2. Flaresolverr with injected datadome cookie from BETANO_DATADOME env var
    Returns the response HTML/text or raises ValueError.
    """
    # Strategy 1: persistent session
    try:
        solution = _get_with_session(url, referer=referer)
        text = solution.get("response", "")
        if text and "<title>Betano Splash Screen</title>" not in text:
            logger.info("Betano response preview (session): %s", text[:300])
            return text
        logger.warning("Session bloqueada pelo DataDome, tentando com cookie injetado.")
        _reset_session()
    except Exception as exc:
        logger.warning("Flaresolverr session erro: %s — tentando fallback com cookie.", exc)
        _reset_session()

    # Strategy 2: injected datadome cookie
    datadome = os.environ.get("BETANO_DATADOME", "").strip()
    if not datadome:
        raise ValueError(
            "DataDome bloqueou a sessao automatica e nenhum cookie manual foi configurado. "
            "Adicione BETANO_DATADOME no Railway com o valor atual do cookie datadome "
            "do seu browser (veja instrucoes em /surebet)."
        )

    cookies = [{"name": "datadome", "value": datadome, "domain": ".betano.bet.br"}]
    pocaauth = os.environ.get("BETANO_POCAAUTH", "").strip()
    if pocaauth:
        cookies.append({"name": "pocaauth", "value": pocaauth, "domain": ".betano.bet.br"})

    try:
        solution = _flaresolverr_get(url, referer=referer, cookies=cookies)
    except ValueError:
        raise
    except Exception as exc:
        logger.warning("Flaresolverr cookie fallback erro: %s", exc)
        raise ValueError(
            f"Nao foi possivel conectar ao Flaresolverr: {exc}"
        )

    text = solution.get("response", "")
    if not text:
        raise ValueError("Flaresolverr retornou resposta vazia.")

    logger.info("Betano response preview (cookie): %s", text[:300])

    if "<title>Betano Splash Screen</title>" in text:
        raise ValueError(
            "DataDome bloqueou mesmo com cookie manual. "
            "O cookie BETANO_DATADOME pode ter expirado — "
            "atualize-o no Railway com um cookie fresco do seu browser."
        )

    return text


# ─── Flaresolverr session management ─────────────────────────────────────────

def _get_with_session(url: str, referer: str = None) -> dict:
    session_id = _ensure_session()
    try:
        return _flaresolverr_get(url, referer=referer, session=session_id)
    except ValueError as exc:
        if "session" in str(exc).lower() or "invalid" in str(exc).lower():
            _reset_session()
            session_id = _ensure_session()
            return _flaresolverr_get(url, referer=referer, session=session_id)
        raise


def _ensure_session() -> str:
    with _session_lock:
        if not _session_state["id"]:
            sid = _create_session()
            _session_state["id"] = sid
            _session_state["warmed"] = False

        if not _session_state["warmed"]:
            try:
                _flaresolverr_get(_BETANO_BASE + "/", session=_session_state["id"])
                _session_state["warmed"] = True
                logger.info("Flaresolverr session aquecida na homepage Betano")
            except Exception as exc:
                logger.warning("Warmup falhou (continuando): %s", exc)

        return _session_state["id"]


def _reset_session() -> None:
    with _session_lock:
        _session_state["id"] = None
        _session_state["warmed"] = False


def _create_session() -> str:
    resp = requests.post(
        f"{_FLARESOLVERR_URL}/v1",
        json={"cmd": "sessions.create"},
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    session_id = data.get("session")
    if not session_id:
        raise ValueError("Flaresolverr nao retornou session ID.")
    logger.info("Flaresolverr nova sessao: %s", session_id)
    return session_id


def _flaresolverr_get(
    url: str,
    referer: str = None,
    session: str = None,
    cookies: list = None,
) -> dict:
    payload: dict = {
        "cmd": "request.get",
        "url": url,
        "maxTimeout": 60000,
    }
    if referer:
        payload["headers"] = {"Referer": referer}
    if session:
        payload["session"] = session
    if cookies:
        payload["cookies"] = cookies

    resp = requests.post(
        f"{_FLARESOLVERR_URL}/v1",
        json=payload,
        timeout=75,
    )
    resp.raise_for_status()
    data = resp.json()

    if data.get("status") != "ok":
        raise ValueError(
            f"Flaresolverr retornou erro: {data.get('message', 'desconhecido')}"
        )

    solution = data["solution"]
    logger.info(
        "Flaresolverr url=%s status=%s",
        solution.get("url"),
        solution.get("status"),
    )
    return solution


# ─── URL parsing ─────────────────────────────────────────────────────────────

def _extract_slug_and_id(url: str) -> tuple[str, str]:
    m = re.search(r"/odds/([^/?]+)/(\d{7,})(?:/|$|\?)", url)
    if not m:
        raise ValueError(
            "URL invalida — formato esperado: betano.bet.br/odds/{partida}/{id}/"
        )
    return m.group(1), m.group(2)


# ─── HTML / Next.js data parsing ─────────────────────────────────────────────

def _extract_next_data(html: str) -> dict | None:
    m = re.search(
        r'<script[^>]+id=["\']__NEXT_DATA__["\'][^>]*>(.*?)</script>',
        html,
        re.DOTALL,
    )
    if not m:
        return None
    try:
        return json.loads(m.group(1).strip())
    except json.JSONDecodeError:
        return None


def _parse_next_data(data: dict) -> dict | None:
    props = data.get("props", {})
    page_props = props.get("pageProps", {})

    for key in ("event", "eventData", "data", "initialData", "sportEvent"):
        candidate = page_props.get(key)
        if isinstance(candidate, dict):
            if "markets" in candidate:
                result = _extract_odds(candidate["markets"])
                if result:
                    return result
            nested = candidate.get("event")
            if isinstance(nested, dict) and "markets" in nested:
                result = _extract_odds(nested["markets"])
                if result:
                    return result

    return _deep_search_markets(data)


def _deep_search_markets(obj, depth: int = 0) -> dict | None:
    if depth > 7:
        return None
    if isinstance(obj, dict):
        markets = obj.get("markets")
        if isinstance(markets, list) and markets:
            result = _extract_odds(markets)
            if result:
                return result
        for val in obj.values():
            result = _deep_search_markets(val, depth + 1)
            if result:
                return result
    elif isinstance(obj, list):
        for item in obj:
            result = _deep_search_markets(item, depth + 1)
            if result:
                return result
    return None


def _extract_odds(markets: list) -> dict | None:
    odd_mandante = odd_visitante = odd_empate_gols = None

    for market in markets:
        if not isinstance(market, dict):
            continue
        market_type = market.get("type", "")
        sels = market.get("selections", [])

        if market_type == "MRES" and odd_mandante is None:
            for sel in sels:
                name = sel.get("name", "")
                price = _safe_price(sel)
                if not price:
                    continue
                if name == "1":
                    odd_mandante = price
                elif name == "2":
                    odd_visitante = price

        if market_type == "CSFT":
            for sel in sels:
                hs = sel.get("hs")
                as_ = sel.get("as")
                price = _safe_price(sel)
                if price is None:
                    continue
                if (
                    hs is not None
                    and as_ is not None
                    and int(hs) == int(as_)
                    and int(hs) >= 1
                ):
                    if odd_empate_gols is None or price < odd_empate_gols:
                        odd_empate_gols = price

    if odd_mandante and odd_visitante and odd_empate_gols:
        return {
            "odd_mandante": odd_mandante,
            "odd_visitante": odd_visitante,
            "odd_empate_gols": odd_empate_gols,
        }
    return None


def _safe_price(sel: dict) -> float | None:
    v = sel.get("price")
    if v is None:
        return None
    try:
        f = float(v)
        return f if f > 1.01 else None
    except (TypeError, ValueError):
        return None


# ─── Browser clipboard parsing ───────────────────────────────────────────────

def parse_clipboard_data(raw_json: str) -> dict:
    """
    Parses __NEXT_DATA__ JSON pasted from the browser console.
    Auto-detects whether it came from a match page or the coupon/upcoming page.
    Returns {"type": "odds", ...} or {"type": "upcoming", "matches": [...]}.
    """
    try:
        data = json.loads(raw_json)
    except (json.JSONDecodeError, ValueError):
        raise ValueError(
            "JSON invalido. Certifique-se de ter rodado "
            "copy(JSON.stringify(window.__NEXT_DATA__)) no console."
        )

    if not isinstance(data, dict):
        raise ValueError("Formato inesperado. Execute o snippet na pagina correta do Betano.")

    odds = _parse_next_data(data)
    if odds:
        return {"type": "odds", **odds}

    matches = _collect_events_from_next_data(data)
    if matches:
        return {"type": "upcoming", "matches": matches}

    raise ValueError(
        "Nenhum dado reconhecido. "
        "Execute o snippet em uma pagina de partida ou na pagina de coupon do Betano."
    )


# ─── Upcoming matches ────────────────────────────────────────────────────────

def _collect_events_from_next_data(data: dict) -> list[dict]:
    results: list[dict] = []
    seen: set[str] = set()
    _walk_for_events(data, results, seen, depth=0)
    return results


def _walk_for_events(obj, results: list, seen: set, depth: int) -> None:
    if depth > 10:
        return
    if isinstance(obj, dict):
        obj_id = obj.get("id") or obj.get("eventId") or obj.get("eventID")
        obj_name = obj.get("name") or obj.get("eventName")
        obj_slug = (
            obj.get("slug") or obj.get("seoUrl")
            or obj.get("eventSlug") or obj.get("urlAlias")
        )

        if obj_id and obj_name and obj_slug:
            id_str = str(obj_id)
            if re.match(r"^\d{7,}$", id_str) and id_str not in seen:
                seen.add(id_str)
                start_raw = (
                    obj.get("startTime") or obj.get("startDate")
                    or obj.get("kickOff") or obj.get("date")
                )
                competition: str | None = None
                comp_obj = (
                    obj.get("competition") or obj.get("league")
                    or obj.get("category") or obj.get("tournament")
                )
                if isinstance(comp_obj, dict):
                    competition = comp_obj.get("name") or comp_obj.get("title")
                elif isinstance(comp_obj, str):
                    competition = comp_obj

                results.append({
                    "nome": str(obj_name),
                    "url": f"{_BETANO_BASE}/odds/{obj_slug}/{id_str}/",
                    "event_id": id_str,
                    "hora": str(start_raw) if start_raw else None,
                    "liga": str(competition) if competition else None,
                })
                return

        for val in obj.values():
            _walk_for_events(val, results, seen, depth + 1)
    elif isinstance(obj, list):
        for item in obj:
            _walk_for_events(item, results, seen, depth + 1)


def _extract_events_from_raw_html(html: str) -> list[dict]:
    results: list[dict] = []
    seen: set[str] = set()
    pattern = re.compile(
        r'"(?:slug|seoUrl|eventSlug)"\s*:\s*"([a-z0-9][a-z0-9-]+)"'
        r'(?:(?!"markets").){0,500}'
        r'"id"\s*:\s*(\d{7,})',
        re.DOTALL,
    )
    for m in pattern.finditer(html):
        slug, event_id = m.group(1), m.group(2)
        if event_id not in seen and "-" in slug:
            seen.add(event_id)
            results.append({
                "nome": slug.replace("-", " ").title(),
                "url": f"{_BETANO_BASE}/odds/{slug}/{event_id}/",
                "event_id": event_id,
                "hora": None,
                "liga": None,
            })
    return results
