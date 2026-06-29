import logging

logger = logging.getLogger(__name__)


def get_assertividade_debug() -> dict:
    from app.services import apostas_analise_service as svc

    cached_ids = svc.get_cached_league_ids()

    if not cached_ids:
        return {
            "available": False,
            "message": (
                "Nenhuma liga carregada em memória. "
                "Acesse a aba Próximos Jogos ou Análise para carregar os dados, "
                "depois rode o debug novamente."
            ),
        }

    league_map = {lg["id"]: lg for lg in svc.get_leagues()}
    all_evals: list[dict] = []
    by_league: list[dict] = []

    for lid in cached_ids:
        try:
            evals = svc.evaluate_predictions(lid)
        except Exception as exc:
            logger.warning("evaluate_predictions failed league=%s: %s", lid, exc)
            continue
        if not evals:
            continue

        n            = len(evals)
        n_outcome    = sum(1 for e in evals if e["outcome_correct"])
        n_over25     = sum(1 for e in evals if (e["over_25_pct"] > 50) == e["actual_over25"])
        n_btts       = sum(1 for e in evals if (e["btts_pct"] > 50) == e["actual_btts"])
        n_home_right = sum(1 for e in evals if e["actual_outcome"] == "home" and e["predicted_outcome"] == "home")
        n_home_total = sum(1 for e in evals if e["predicted_outcome"] == "home")
        n_draw_right = sum(1 for e in evals if e["actual_outcome"] == "draw" and e["predicted_outcome"] == "draw")
        n_draw_total = sum(1 for e in evals if e["predicted_outcome"] == "draw")
        n_away_right = sum(1 for e in evals if e["actual_outcome"] == "away" and e["predicted_outcome"] == "away")
        n_away_total = sum(1 for e in evals if e["predicted_outcome"] == "away")

        by_league.append({
            "league_id":    lid,
            "league_name":  league_map.get(lid, {}).get("name", str(lid)),
            "source":       svc._cache.get(lid, {}).get("source", "?"),
            "jogos":        n,
            "outcome_taxa": round(n_outcome / n * 100, 1),
            "over25_taxa":  round(n_over25  / n * 100, 1),
            "btts_taxa":    round(n_btts    / n * 100, 1),
            "home_prec":    round(n_home_right / n_home_total * 100, 1) if n_home_total else 0.0,
            "draw_prec":    round(n_draw_right / n_draw_total * 100, 1) if n_draw_total else 0.0,
            "away_prec":    round(n_away_right / n_away_total * 100, 1) if n_away_total else 0.0,
        })
        all_evals.extend(evals)

    if not all_evals:
        return {
            "available": False,
            "message": "Nenhum jogo avaliável nas ligas em cache.",
        }

    N         = len(all_evals)
    n_outcome = sum(1 for e in all_evals if e["outcome_correct"])
    n_over25  = sum(1 for e in all_evals if (e["over_25_pct"] > 50) == e["actual_over25"])
    n_btts    = sum(1 for e in all_evals if (e["btts_pct"] > 50) == e["actual_btts"])

    n_home_right = sum(1 for e in all_evals if e["actual_outcome"] == "home" and e["predicted_outcome"] == "home")
    n_home_total = sum(1 for e in all_evals if e["predicted_outcome"] == "home")
    n_draw_right = sum(1 for e in all_evals if e["actual_outcome"] == "draw" and e["predicted_outcome"] == "draw")
    n_draw_total = sum(1 for e in all_evals if e["predicted_outcome"] == "draw")
    n_away_right = sum(1 for e in all_evals if e["actual_outcome"] == "away" and e["predicted_outcome"] == "away")
    n_away_total = sum(1 for e in all_evals if e["predicted_outcome"] == "away")

    conf_buckets = [
        ("40–50%", 40, 50),
        ("50–60%", 50, 60),
        ("60–70%", 60, 70),
        ("70–80%", 70, 80),
        ("80%+",   80, 101),
    ]
    calibration = []
    for label, lo, hi in conf_buckets:
        subset = [
            e for e in all_evals
            if lo <= max(e["home_win_pct"], e["draw_pct"], e["away_win_pct"]) < hi
        ]
        if not subset:
            continue
        n = len(subset)
        c = sum(1 for e in subset if e["outcome_correct"])
        calibration.append({"label": label, "total": n, "correct": c, "taxa": round(c / n * 100, 1)})

    return {
        "available":        True,
        "total_jogos":      N,
        "ligas_analisadas": len(by_league),
        "outcome": {
            "corretos": n_outcome,
            "total":    N,
            "taxa":     round(n_outcome / N * 100, 1),
        },
        "por_tipo": {
            "home": {
                "previsto": n_home_total,
                "correto":  n_home_right,
                "taxa":     round(n_home_right / n_home_total * 100, 1) if n_home_total else 0.0,
            },
            "empate": {
                "previsto": n_draw_total,
                "correto":  n_draw_right,
                "taxa":     round(n_draw_right / n_draw_total * 100, 1) if n_draw_total else 0.0,
            },
            "away": {
                "previsto": n_away_total,
                "correto":  n_away_right,
                "taxa":     round(n_away_right / n_away_total * 100, 1) if n_away_total else 0.0,
            },
        },
        "over25": {
            "corretos": n_over25,
            "total":    N,
            "taxa":     round(n_over25 / N * 100, 1),
        },
        "btts": {
            "corretos": n_btts,
            "total":    N,
            "taxa":     round(n_btts / N * 100, 1),
        },
        "calibration": calibration,
        "por_liga":    sorted(by_league, key=lambda x: x["outcome_taxa"], reverse=True),
    }
