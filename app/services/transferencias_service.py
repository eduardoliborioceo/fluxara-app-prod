from app.repositories import transferencias_repository as repo


def add_transferencia(user_id: int, data: dict) -> dict:
    descricao = (data.get('descricao') or '').strip()[:200] or None
    try:
        valor = float(data.get('valor') or 0)
    except (TypeError, ValueError):
        raise ValueError('Valor inválido')
    if valor <= 0:
        raise ValueError('Valor deve ser positivo')
    conta_origem_id = int(data['conta_origem_id']) if data.get('conta_origem_id') else None
    conta_destino_id = int(data['conta_destino_id']) if data.get('conta_destino_id') else None
    if not conta_origem_id or not conta_destino_id:
        raise ValueError('Contas de origem e destino são obrigatórias')
    if conta_origem_id == conta_destino_id:
        raise ValueError('Conta origem e destino não podem ser iguais')
    data_venc = data.get('data_vencimento') or None
    efetivado = bool(data.get('efetivado', False))

    recorrencia_modo = data.get('recorrencia_modo', 'nao_recorrente')
    recorrente = recorrencia_modo == 'fixa'
    recorrencia_tipo = data.get('periodicidade') if recorrente else None

    if not recorrente and data.get('recorrente'):
        recorrente = True
        recorrencia_tipo = data.get('recorrencia_tipo')

    row = repo.create_transferencia(
        user_id, descricao, valor, data_venc, efetivado,
        recorrente, recorrencia_tipo, conta_origem_id, conta_destino_id
    )
    return dict(row)


def remove_transferencia(transferencia_id: int, user_id: int) -> None:
    repo.delete_transferencia(transferencia_id, user_id)


def list_transferencias(user_id: int) -> list:
    return [dict(r) for r in repo.get_transferencias_by_user(user_id)]
