import datetime

from app.repositories import apostas_tips_repository as repo
from app.repositories import lancamentos_repository as lanc_repo

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
    if "aprovada" not in result:
        result["aprovada"] = True
    if "numero_publico" not in result:
        result["numero_publico"] = None
    if result.get("numero_publico") is not None:
        result["numero_publico"] = int(result["numero_publico"])
    return result


def list_tips(is_admin: bool = False) -> list[dict]:
    return [_serialize(t) for t in repo.list_tips(admin=is_admin)]


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


def update_tip(tip_id: int, titulo: str, stake: str, link_aposta: str, odd=None) -> dict:
    titulo = (titulo or "").strip()
    if not titulo:
        raise ValueError("Título é obrigatório")
    if len(titulo) > 200:
        raise ValueError("Título muito longo (máx 200 caracteres)")
    odd_val = None
    if odd is not None:
        try:
            odd_val = float(odd)
        except (ValueError, TypeError):
            raise ValueError("Odd inválida")
        if odd_val <= 0:
            raise ValueError("Odd deve ser maior que zero")
    row = repo.update_tip(tip_id, titulo, stake or None, link_aposta or None, odd=odd_val)
    if not row:
        raise ValueError("Recomendação não encontrada")
    return _serialize(row)


def update_status(tip_id: int, status: str) -> dict:
    if status not in _VALID_STATUSES:
        raise ValueError(f"Status inválido: {status}")
    row = repo.update_status(tip_id, status)
    if not row:
        raise ValueError("Recomendação não encontrada")
    return _serialize(row)


def toggle_aprovada(tip_id: int) -> dict:
    row = repo.toggle_aprovada(tip_id)
    if not row:
        raise ValueError("Recomendação não encontrada")
    return _serialize(row)


def delete_tip(tip_id: int) -> None:
    repo.delete_tip(tip_id)


def registrar_aposta(tip_id: int, user_id: int, conta_id: int,
                     valor_apostado: float,
                     categoria_despesa_id, subcategoria_despesa_id,
                     categoria_receita_id, subcategoria_receita_id,
                     data_vencimento: str | None = None) -> dict:
    tip = repo.get_tip_by_id(tip_id)
    if not tip:
        raise ValueError("Recomendação não encontrada")
    if valor_apostado <= 0:
        raise ValueError("Valor da aposta deve ser positivo")
    if not conta_id:
        raise ValueError("Conta obrigatória")

    odd = float(tip.get("odd") or 0)
    if odd <= 1.0:
        raise ValueError("Odd inválida")

    retorno = round(valor_apostado * odd, 2)
    data = data_vencimento or datetime.date.today().isoformat()
    titulo = (tip.get("titulo") or "Aposta")[:180]

    cat_d = int(categoria_despesa_id) if categoria_despesa_id else None
    sub_d = int(subcategoria_despesa_id) if subcategoria_despesa_id else None
    cat_r = int(categoria_receita_id) if categoria_receita_id else None
    sub_r = int(subcategoria_receita_id) if subcategoria_receita_id else None

    despesa = lanc_repo.create_lancamento(
        user_id=user_id, tipo="despesa",
        descricao=f"Aposta: {titulo}",
        valor=valor_apostado, data_vencimento=data,
        efetivado=True, recorrente=False, recorrencia_tipo=None,
        categoria_id=cat_d, subcategoria_id=sub_d,
        conta_id=conta_id, cartao_id=None,
        fatura_mes=None, fatura_ano=None,
    )

    receita = lanc_repo.create_lancamento(
        user_id=user_id, tipo="receita",
        descricao=f"Retorno: {titulo}",
        valor=retorno, data_vencimento=data,
        efetivado=False, recorrente=False, recorrencia_tipo=None,
        categoria_id=cat_r, subcategoria_id=sub_r,
        conta_id=conta_id, cartao_id=None,
        fatura_mes=None, fatura_ano=None,
    )

    return {
        "despesa_id": despesa["id"],
        "receita_id": receita["id"],
        "valor_apostado": float(valor_apostado),
        "retorno_potencial": retorno,
    }
