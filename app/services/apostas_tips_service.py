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


def create_tip(titulo: str, partida: str, campeonato: str, odd,
               stake: str, data_partida, user_id: int) -> dict:
    titulo = (titulo or "").strip()
    if not titulo:
        raise ValueError("Título é obrigatório")
    if len(titulo) > 200:
        raise ValueError("Título muito longo (máx 200 caracteres)")

    odd_val = None
    if odd is not None and odd != "":
        try:
            odd_val = float(odd)
        except (TypeError, ValueError):
            raise ValueError("Odd inválida")
        if odd_val <= 1.0:
            raise ValueError("Odd deve ser maior que 1.00")

    return _serialize(repo.create_tip(titulo, partida, campeonato, odd_val, stake, data_partida, user_id))


def update_status(tip_id: int, status: str) -> dict:
    if status not in _VALID_STATUSES:
        raise ValueError(f"Status inválido: {status}")
    row = repo.update_status(tip_id, status)
    if not row:
        raise ValueError("Recomendação não encontrada")
    return _serialize(row)


def delete_tip(tip_id: int) -> None:
    repo.delete_tip(tip_id)
