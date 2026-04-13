import json
import logging
import os
import re

from playwright.sync_api import TimeoutError as PWTimeout
from playwright.sync_api import sync_playwright

logger = logging.getLogger(__name__)

_BETANO_BASE = "https://www.betano.bet.br"
_LOGIN_URL = f"{_BETANO_BASE}/registo/?action=login"

_CHROMIUM_ARGS = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-software-rasterizer",
    "--single-process",
]

_USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
)


# ─── Public entry point ──────────────────────────────────────────────────────

def fetch_odds(betano_url: str) -> dict:
    """
    Extrai as odds de uma partida no Betano.
    Retorna: {nome, odd_mandante, odd_visitante, odd_empate_gols}
    Lança ValueError se não encontrar as odds.
    """
    event_id = _extract_event_id(betano_url)
    captured: list[tuple[str, object]] = []

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=_CHROMIUM_ARGS)
        ctx = browser.new_context(
            user_agent=_USER_AGENT,
            viewport={"width": 1280, "height": 900},
            locale="pt-BR",
            timezone_id="America/Sao_Paulo",
        )
        page = ctx.new_page()

        def _on_response(resp):
            try:
                ct = resp.headers.get("content-type", "")
                if resp.status == 200 and "json" in ct:
                    url_lower = resp.url.lower()
                    if event_id in resp.url or any(
                        k in url_lower for k in ("market", "event", "sport", "gamebook")
                    ):
                        captured.append((resp.url, resp.json()))
            except Exception:
                pass

        page.on("response", _on_response)

        email = os.environ.get("BETANO_EMAIL", "")
        password = os.environ.get("BETANO_PASSWORD", "")
        if email and password:
            _do_login(page, email, password)

        _navigate(page, betano_url)
        _try_expand_correct_score(page)
        page.wait_for_timeout(1500)

        odds = _extract_from_captured(captured)
        if not odds:
            odds = _extract_from_dom(page)

        nome = _get_match_name(page) or "Partida"
        browser.close()

    if not odds:
        raise ValueError(
            "Não foi possível extrair as odds desta partida. "
            "Verifique se a URL está correta e se os mercados estão disponíveis."
        )

    odds["nome"] = nome
    return odds


# ─── Login ───────────────────────────────────────────────────────────────────

def _do_login(page, email: str, password: str) -> None:
    try:
        page.goto(_LOGIN_URL, wait_until="domcontentloaded", timeout=15000)
        page.wait_for_timeout(1500)

        for sel in ["input[name='username']", "input[type='email']", "#username", "input[name='email']"]:
            if page.locator(sel).count() > 0:
                page.fill(sel, email)
                break

        for sel in ["input[name='password']", "input[type='password']", "#password"]:
            if page.locator(sel).count() > 0:
                page.fill(sel, password)
                break

        for sel in [
            "button[type='submit']",
            "[data-qa='login-btn']",
            "button:has-text('Entrar')",
            "button:has-text('Login')",
        ]:
            if page.locator(sel).count() > 0:
                page.click(sel)
                break

        page.wait_for_timeout(2500)
    except Exception as exc:
        logger.warning("Betano login falhou (continuando sem autenticação): %s", exc)


# ─── Navigation ──────────────────────────────────────────────────────────────

def _navigate(page, url: str) -> None:
    try:
        page.goto(url, wait_until="networkidle", timeout=30000)
    except PWTimeout:
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=15000)
            page.wait_for_timeout(4000)
        except PWTimeout:
            pass


def _try_expand_correct_score(page) -> None:
    specials_selectors = [
        "button:has-text('Especiais')",
        "[data-qa='specials-tab']",
        ".tab:has-text('Especiais')",
    ]
    for sel in specials_selectors:
        try:
            if page.locator(sel).count() > 0:
                page.click(sel, timeout=3000)
                page.wait_for_timeout(1000)
                break
        except Exception:
            continue

    correct_score_selectors = [
        "button:has-text('Resultado Correto')",
        "[data-market-name*='Resultado Correto']",
        "span:has-text('Resultado Correto')",
    ]
    for sel in correct_score_selectors:
        try:
            if page.locator(sel).count() > 0:
                page.click(sel, timeout=3000)
                page.wait_for_timeout(1000)
                break
        except Exception:
            continue


# ─── Extract from captured network responses ─────────────────────────────────

def _extract_from_captured(captured: list) -> dict | None:
    for _, data in captured:
        try:
            result = _parse_api_response(data)
            if result:
                return result
        except Exception:
            continue
    return None


def _parse_api_response(data) -> dict | None:
    markets = _find_markets_in_obj(data)
    if not markets:
        return None
    return _odds_from_markets(markets)


def _find_markets_in_obj(obj, depth: int = 0) -> list | None:
    if depth > 8 or obj is None:
        return None

    if isinstance(obj, list) and obj:
        first = obj[0]
        if isinstance(first, dict) and any(
            k in first for k in ("name", "marketName", "marketType", "betOffers")
        ):
            return obj
        for item in obj:
            result = _find_markets_in_obj(item, depth + 1)
            if result:
                return result

    elif isinstance(obj, dict):
        for key in ("markets", "marketGroups", "groupedMarkets", "betOffers", "lines"):
            val = obj.get(key)
            if isinstance(val, list) and val:
                result = _find_markets_in_obj(val, depth + 1)
                if result:
                    return result
        for val in obj.values():
            if isinstance(val, (dict, list)):
                result = _find_markets_in_obj(val, depth + 1)
                if result:
                    return result

    return None


def _odds_from_markets(markets: list) -> dict | None:
    odd_mandante = odd_visitante = odd_empate_gols = None

    for market in markets:
        if not isinstance(market, dict):
            continue

        name = _market_name(market).lower()
        selections = _market_selections(market)

        if _is_result_market(name):
            for sel in selections:
                sel_name = _selection_name(sel).lower()
                val = _odd_value(sel)
                if not val:
                    continue
                if _is_home(sel_name):
                    odd_mandante = val
                elif _is_away(sel_name):
                    odd_visitante = val

        if _is_correct_score_market(name):
            for sel in selections:
                sel_name = _selection_name(sel).lower()
                val = _odd_value(sel)
                if not val:
                    continue
                if _is_draw_with_goals(sel_name):
                    if odd_empate_gols is None or val < odd_empate_gols:
                        odd_empate_gols = val

    if odd_mandante and odd_visitante and odd_empate_gols:
        return {
            "odd_mandante": odd_mandante,
            "odd_visitante": odd_visitante,
            "odd_empate_gols": odd_empate_gols,
        }
    return None


# ─── DOM fallback ─────────────────────────────────────────────────────────────

def _extract_from_dom(page) -> dict | None:
    try:
        scripts = page.evaluate("""
            () => Array.from(document.querySelectorAll('script'))
                .map(s => s.textContent)
                .filter(t => t.includes('market') && t.includes('odd'))
                .slice(0, 8)
        """)
        for script in scripts:
            if len(script) > 200_000:
                continue
            for pattern in (
                r'(\{[^{}]*"markets"\s*:\s*\[.*?\]\s*\})',
                r'(\{[^{}]*"betOffers"\s*:\s*\[.*?\]\s*\})',
            ):
                for m in re.finditer(pattern, script, re.DOTALL):
                    try:
                        data = json.loads(m.group())
                        result = _parse_api_response(data)
                        if result:
                            return result
                    except Exception:
                        continue
    except Exception:
        pass
    return None


# ─── Match name ──────────────────────────────────────────────────────────────

def _get_match_name(page) -> str | None:
    for sel in [
        "h1",
        "[data-qa='event-name']",
        ".event-name",
        ".match-title",
        ".event__title",
    ]:
        try:
            el = page.locator(sel).first
            text = (el.text_content(timeout=2000) or "").strip()
            if text and 3 < len(text) < 120:
                return text
        except Exception:
            continue
    return None


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _extract_event_id(url: str) -> str:
    m = re.search(r"/(\d{7,})(?:/|$)", url)
    if not m:
        raise ValueError("URL inválida — ID do evento não encontrado na URL Betano")
    return m.group(1)


def _market_name(market: dict) -> str:
    return str(
        market.get("name") or market.get("marketName") or
        market.get("marketType") or market.get("title") or ""
    )


def _market_selections(market: dict) -> list:
    for key in ("selections", "outcomes", "runners", "picks", "betOffers"):
        val = market.get(key)
        if isinstance(val, list):
            return val
    return []


def _selection_name(sel: dict) -> str:
    return str(
        sel.get("name") or sel.get("selectionName") or
        sel.get("outcomeName") or sel.get("label") or sel.get("title") or ""
    )


def _odd_value(sel: dict) -> float | None:
    for key in ("odd", "price", "odds", "value", "decimalOdds", "decimal", "oddValue"):
        val = sel.get(key)
        if val is not None:
            try:
                f = float(val)
                return f if f > 1.01 else None
            except (TypeError, ValueError):
                continue
    return None


def _is_result_market(name: str) -> bool:
    return any(k in name for k in (
        "resultado final", "1x2", "match result", "full time result",
        "resultado 1x2", "tempo regulamentar", "vencedor do jogo",
    ))


def _is_correct_score_market(name: str) -> bool:
    return any(k in name for k in (
        "resultado correto", "correct score", "placar correto", "placar exato",
    ))


def _is_home(name: str) -> bool:
    has_home = any(k in name for k in ("1", "home", "casa", "mandante", "vitória 1", "vitoria 1"))
    has_away = any(k in name for k in ("2", "away", "fora", "visitante"))
    has_draw = any(k in name for k in ("x", "empate", "draw"))
    return has_home and not has_away and not has_draw


def _is_away(name: str) -> bool:
    has_away = any(k in name for k in ("2", "away", "fora", "visitante", "vitória 2", "vitoria 2"))
    has_draw = any(k in name for k in ("x", "empate", "draw"))
    return has_away and not has_draw


def _is_draw_with_goals(name: str) -> bool:
    cleaned = name.strip()
    for sep in (":", "-", " x ", "x"):
        if sep not in cleaned:
            continue
        parts = cleaned.split(sep, 1)
        if len(parts) == 2:
            try:
                a = int("".join(c for c in parts[0] if c.isdigit()) or "-1")
                b = int("".join(c for c in parts[1] if c.isdigit()) or "-1")
                if a == b and a >= 1:
                    return True
            except ValueError:
                continue
    return False
