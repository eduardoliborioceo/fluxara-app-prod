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
)

_session_lock = threading.Lock()
_session_state: dict = {"id": None, "warmed": False}


def fetch_odds(betano_url: str) -> dict:
    slug, event_id = _extract_slug_and_id(betano_url)
    page_url = f"{_BETANO_BASE}/odds/{slug}/{event_id}/"

    try:
        solution = _get_with_session(page_url, referer=_BETANO_BASE + "/")
    except ValueError as exc:
        raise
    except Exception as exc:
        logger.warning("Flaresolverr erro: %s", exc)
        raise ValueError(
            "Nao foi possivel conectar ao Flaresolverr. "
            "Verifique se o servico esta ativo no Railway."
        )

    response_text = solution.get("response", "")
    if not response_text:
        raise ValueError("Flaresolverr retornou resposta vazia.")

    logger.info("Betano response preview: %s", response_text[:300])

    if "<title>Betano Splash Screen</title>" in response_text:
        _reset_session()
        raise ValueError(
            "DataDome bloqueou a requisicao. "
            "A sessao foi reiniciada — tente novamente em alguns segundos."
        )

    next_data = _extract_next_data(response_text)
    if next_data:
        odds = _parse_next_data(next_data)
        if odds:
            return odds

    raise ValueError(
        "Resposta recebida mas sem mercados necessarios (1x2 + Resultado Correto). "
        "O jogo pode nao ter os mercados disponiveis ou a estrutura da pagina mudou."
    )


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


def _reset_session():
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


def _flaresolverr_get(url: str, referer: str = None, session: str = None) -> dict:
    payload: dict = {
        "cmd": "request.get",
        "url": url,
        "maxTimeout": 60000,
    }
    if referer:
        payload["headers"] = {"Referer": referer}
    if session:
        payload["session"] = session

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


def _extract_slug_and_id(url: str) -> tuple[str, str]:
    m = re.search(r"/odds/([^/?]+)/(\d{7,})(?:/|$|\?)", url)
    if not m:
        raise ValueError(
            "URL invalida — formato esperado: betano.bet.br/odds/{partida}/{id}/"
        )
    return m.group(1), m.group(2)


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
