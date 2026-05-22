from app.repositories import apostas_tips_repository as repo

_VALID_STATUSES = {"pendente", "green", "red", "void"}


def _serialize(tip: dict) -> dict:
    result = dict(tip)
    if result.get("created_at"):
        result["created_at"] = result["created_at"].isoformat()
    if result.get("updated_at"):
        result["updated_at"] = result["updated_at"].isoformat()
    if result.get("data_partida"):
        result["data_partida"] = str(result["data_partida"])
    if result.get("odd") is not None:
        result["odd"] = float(result["odd"])
    if result.get("jogos") is None:
        result["jogos"] = []
    return result


def list_tips() -> list[dict]:
    return [_serialize(t) for t in repo.list_tips()]


def get_stats() -> dict:
    row = repo.get_stats()
    total = int(row["total"] or 0)
    green = int(row["green"] or 0)
    red = int(row["red"] or 0)
    pendente = int(row["pendente"] or 0)
    taxa = round(green / total * 100, 1) if total > 0 else 0.0
    return {"total": total, "green": green, "red": red, "pendente": pendente, "taxa_acerto": taxa}


def create_tip(titulo: str, stake: str, link_aposta: str,
               jogos: list, user_id: int) -> dict:
    titulo = (titulo or "").strip()
    if not titulo:
        raise ValueError("Título é obrigatório")
    if len(titulo) > 200:
        raise ValueError("Título muito longo (máx 200 caracteres)")

    if not jogos:
        raise ValueError("Adicione pelo menos um jogo à recomendação")

    odd_total = 1.0
    clean_jogos = []
    for i, jogo in enumerate(jogos, 1):
        partida = (jogo.get("partida") or "").strip()
        if not partida:
            raise ValueError(f"Jogo {i}: Partida é obrigatória")

        mercado = (jogo.get("mercado") or "").strip()
        if not mercado:
            raise ValueError(f"Jogo {i}: Mercado é obrigatório")

        try:
            odd_jogo = float(jogo["odd"])
        except (KeyError, TypeError, ValueError):
            raise ValueError(f"Jogo {i}: Odd inválida")
        if odd_jogo <= 1.0:
            raise ValueError(f"Jogo {i}: Odd deve ser maior que 1.00")

        odd_total *= odd_jogo
        clean_jogos.append({
            "partida": partida,
            "campeonato": (jogo.get("campeonato") or "").strip(),
            "mercado": mercado,
            "odd": round(odd_jogo, 2),
            "data_partida": (jogo.get("data_partida") or "").strip() or None,
        })

    odd_total = round(odd_total, 2)

    return _serialize(repo.create_tip(
        titulo=titulo,
        partida=None,
        campeonato=None,
        odd=odd_total,
        stake=stake or None,
        data_partida=None,
        created_by=user_id,
        jogos=clean_jogos,
        link_aposta=(link_aposta or "").strip() or None,
    ))


def update_status(tip_id: int, status: str) -> dict:
    if status not in _VALID_STATUSES:
        raise ValueError(f"Status inválido: {status}")
    row = repo.update_status(tip_id, status)
    if not row:
        raise ValueError("Recomendação não encontrada")
    return _serialize(row)


def delete_tip(tip_id: int) -> None:
    repo.delete_tip(tip_id)
