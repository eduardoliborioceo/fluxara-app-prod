import datetime
import uuid
from app.repositories import transferencias_repository as repo
from app.services.lancamentos_service import _avancar_data, _FIXA_HORIZONTE


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

    recorrencia_modo = data.get('recorrencia_modo', 'nao_recorrente')

    if recorrencia_modo == 'fixa':
        return _expand_fixa(user_id, descricao, valor, data, conta_origem_id, conta_destino_id)

    data_venc = data.get('data_vencimento') or None
    efetivado = bool(data.get('efetivado', False))
    recorrente = False
    recorrencia_tipo = None

    if data.get('recorrente'):
        recorrente = True
        recorrencia_tipo = data.get('recorrencia_tipo')

    row = repo.create_transferencia(
        user_id, descricao, valor, data_venc, efetivado,
        recorrente, recorrencia_tipo, conta_origem_id, conta_destino_id
    )
    return dict(row)


def _expand_fixa(user_id: int, descricao: str | None, valor: float, data: dict,
                 conta_origem_id: int, conta_destino_id: int) -> dict:
    periodicidade = data.get('periodicidade', 'mensal')
    horizonte = _FIXA_HORIZONTE.get(periodicidade, 36)
    efetivado_inicial = bool(data.get('efetivado', False))

    data_base = None
    data_venc_raw = data.get('data_vencimento')
    if data_venc_raw:
        try:
            data_base = datetime.date.fromisoformat(data_venc_raw)
        except ValueError:
            pass

    grupo_id = str(uuid.uuid4())
    first_row = None

    for i in range(horizonte):
        venc_str = None
        if data_base:
            venc_str = _avancar_data(data_base, periodicidade, i).isoformat()

        efetivado = efetivado_inicial if i == 0 else False

        row = repo.create_transferencia(
            user_id, descricao, valor, venc_str, efetivado,
            True, periodicidade, conta_origem_id, conta_destino_id, grupo_id
        )
        if first_row is None:
            first_row = row

    return dict(first_row) if first_row else {}


def remove_transferencia(transferencia_id: int, user_id: int) -> None:
    repo.delete_transferencia(transferencia_id, user_id)


def list_transferencias(user_id: int) -> list:
    return [dict(r) for r in repo.get_transferencias_by_user(user_id)]
