import datetime
import json
import logging

from app.repositories import apostas_tips_repository as repo

logger = logging.getLogger(__name__)


def get_assertividade_debug() -> dict:
    tips = repo.list_tips(admin=True)

    resolved = [t for t in tips if t.get("status") in ("green", "red")]
    total_r  = len(resolved)
    green_r  = sum(1 for t in resolved if t.get("status") == "green")
    red_r    = total_r - green_r
    taxa_r   = round(green_r / total_r * 100, 1) if total_r else 0.0

    today = datetime.date.today()

    def _period_stats(days: int) -> dict:
        cutoff = today - datetime.timedelta(days=days)
        subset = []
        for t in resolved:
            ca = t.get("created_at")
            if ca:
                d = ca.date() if hasattr(ca, "date") else datetime.date.fromisoformat(str(ca)[:10])
                if d >= cutoff:
                    subset.append(t)
        n = len(subset)
        g = sum(1 for t in subset if t.get("status") == "green")
        return {"total": n, "green": g, "red": n - g, "taxa": round(g / n * 100, 1) if n else 0.0}

    ranges = [
        ("1.00–1.50", 1.00, 1.50),
        ("1.51–2.00", 1.51, 2.00),
        ("2.01–3.00", 2.01, 3.00),
        ("3.01–5.00", 3.01, 5.00),
        ("5.01+",     5.01, 9999.0),
    ]
    by_odd = []
    for label, lo, hi in ranges:
        bucket = [t for t in resolved if lo <= float(t.get("odd") or 0) <= hi]
        if not bucket:
            continue
        n = len(bucket)
        g = sum(1 for t in bucket if t.get("status") == "green")
        by_odd.append({"label": label, "total": n, "green": g, "red": n - g,
                       "taxa": round(g / n * 100, 1)})

    by_stake_map: dict = {}
    for t in resolved:
        s = (t.get("stake") or "Sem stake").strip() or "Sem stake"
        by_stake_map.setdefault(s, {"total": 0, "green": 0})
        by_stake_map[s]["total"] += 1
        if t.get("status") == "green":
            by_stake_map[s]["green"] += 1
    by_stake = []
    for label, v in sorted(by_stake_map.items()):
        n = v["total"]
        g = v["green"]
        by_stake.append({"label": label, "total": n, "green": g, "red": n - g,
                         "taxa": round(g / n * 100, 1) if n else 0.0})

    by_legs_map: dict = {}
    for t in resolved:
        jogos = t.get("jogos") or []
        if isinstance(jogos, str):
            try:
                jogos = json.loads(jogos)
            except Exception:
                jogos = []
        n_legs = len(jogos) if isinstance(jogos, list) else 0
        label  = f"{n_legs} jogo{'s' if n_legs != 1 else ''}"
        by_legs_map.setdefault(label, {"n": n_legs, "total": 0, "green": 0})
        by_legs_map[label]["total"] += 1
        if t.get("status") == "green":
            by_legs_map[label]["green"] += 1
    by_legs = []
    for label, v in sorted(by_legs_map.items(), key=lambda x: x[1]["n"]):
        n = v["total"]
        g = v["green"]
        by_legs.append({"label": label, "total": n, "green": g, "red": n - g,
                        "taxa": round(g / n * 100, 1) if n else 0.0})

    return {
        "geral": {
            "total_tips": len(tips),
            "resolvidas": total_r,
            "green":      green_r,
            "red":        red_r,
            "pendentes":  sum(1 for t in tips if t.get("status") == "pendente"),
            "voids":      sum(1 for t in tips if t.get("status") == "void"),
            "taxa":       taxa_r,
        },
        "por_periodo": {
            "ultimos_30d": _period_stats(30),
            "ultimos_60d": _period_stats(60),
            "ultimos_90d": _period_stats(90),
        },
        "por_odd":   by_odd,
        "por_stake": by_stake,
        "por_legs":  by_legs,
    }
