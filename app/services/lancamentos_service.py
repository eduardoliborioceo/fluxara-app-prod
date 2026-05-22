import datetime
import uuid
from app.repositories import lancamentos_repository as repo
from app.repositories import cartoes_repository as cartao_repo

_TIPOS_VALIDOS = {'receita', 'despesa', 'despesa_cartao', 'pagamento_fatura'}

_FIXA_HORIZONTE = {
    'mensal': 36,
    'trimestral': 20,
    'anual': 10,
    'semanal': 52,
    'diario': 90,
}


def _calcular_fatura_mes_ano(cartao_id: int, user_id: int) -> tuple[int, int]:
    cartao = cartao_repo.get_cartao(cartao_id, user_id)
    if not cartao:
        today = datetime.date.today()
        return today.month, today.year
    dia_fechamento = int(cartao['dia_fechamento'] or 1)
    today = datetime.date.today()
    if today.day <= dia_fechamento:
        return today.month, today.year
    m = today.month + 1
    y = today.year
    if m > 12:
        m = 1
        y += 1
    return m, y


def add_lancamento(user_id: int, data: dict) -> dict:
    tipo = data.get('tipo', '')
    if tipo not in _TIPOS_VALIDOS:
        raise ValueError('Tipo inválido')
    descricao = (data.get('descricao') or '').strip()[:200] or None
    try:
        valor = float(data.get('valor') or 0)
    except (TypeError, ValueError):
        raise ValueError('Valor inválido')
    if valor <= 0:
        raise ValueError('Valor deve ser positivo')

    recorrencia_modo = data.get('recorrencia_modo', 'nao_recorrente')

    if recorrencia_modo == 'parcela':
        return _create_parcelas(user_id, tipo, descricao, valor, data)

    if recorrencia_modo == 'fixa':
        return _expand_fixa(user_id, tipo, descricao, valor, data)

    data_venc = data.get('data_vencimento') or None
    efetivado = bool(data.get('efetivado', False))
    recorrente = False
    recorrencia_tipo = None

    if data.get('recorrente'):
        recorrente = True
        recorrencia_tipo = data.get('recorrencia_tipo')

    categoria_id = int(data['categoria_id']) if data.get('categoria_id') else None
    subcategoria_id = int(data['subcategoria_id']) if data.get('subcategoria_id') else None
    conta_id = int(data['conta_id']) if data.get('conta_id') else None
    cartao_id = int(data['cartao_id']) if data.get('cartao_id') else None
    fatura_mes = int(data['fatura_mes']) if data.get('fatura_mes') else None
    fatura_ano = int(data['fatura_ano']) if data.get('fatura_ano') else None

    if tipo == 'despesa_cartao' and cartao_id and (not fatura_mes or not fatura_ano):
        fatura_mes, fatura_ano = _calcular_fatura_mes_ano(cartao_id, user_id)

    row = repo.create_lancamento(
        user_id, tipo, descricao, valor, data_venc, efetivado,
        recorrente, recorrencia_tipo, categoria_id, subcategoria_id,
        conta_id, cartao_id, fatura_mes, fatura_ano
    )
    return dict(row)


def _create_parcelas(user_id: int, tipo: str, descricao_base: str | None, valor_total: float, data: dict) -> dict:
    try:
        parcelas_total = max(1, int(data.get('parcelas_total', 1)))
        parcela_inicial = max(1, int(data.get('parcela_inicial', 1)))
        periodicidade = data.get('periodicidade', 'mensal')
        calculo_tipo = data.get('calculo_tipo', 'total')
    except (TypeError, ValueError):
        raise ValueError('Dados de parcelamento inválidos')

    if calculo_tipo == 'total':
        valor_parcela = round(valor_total / parcelas_total, 2)
    else:
        valor_parcela = valor_total

    efetivado = bool(data.get('efetivado', False))
    categoria_id = int(data['categoria_id']) if data.get('categoria_id') else None
    subcategoria_id = int(data['subcategoria_id']) if data.get('subcategoria_id') else None
    conta_id = int(data['conta_id']) if data.get('conta_id') else None
    cartao_id = int(data['cartao_id']) if data.get('cartao_id') else None
    fatura_mes_base = int(data['fatura_mes']) if data.get('fatura_mes') else None
    fatura_ano_base = int(data['fatura_ano']) if data.get('fatura_ano') else None

    if tipo == 'despesa_cartao' and cartao_id and (not fatura_mes_base or not fatura_ano_base):
        fatura_mes_base, fatura_ano_base = _calcular_fatura_mes_ano(cartao_id, user_id)

    data_base = None
    data_venc_raw = data.get('data_vencimento')
    if data_venc_raw:
        try:
            data_base = datetime.date.fromisoformat(data_venc_raw)
        except ValueError:
            pass

    total_parcelas = parcelas_total + parcela_inicial - 1
    grupo_id = str(uuid.uuid4())
    first_row = None

    for i in range(parcelas_total):
        n = parcela_inicial + i
        sufixo = f" ({n}/{total_parcelas})"
        desc = ((descricao_base or '') + sufixo).strip()[:200] or sufixo.strip()

        venc_str = None
        if data_base:
            venc_str = _avancar_data(data_base, periodicidade, i).isoformat()

        f_mes = fatura_mes_base
        f_ano = fatura_ano_base
        if fatura_mes_base and fatura_ano_base and tipo == 'despesa_cartao' and i > 0:
            m = fatura_mes_base + i
            f_ano = fatura_ano_base + (m - 1) // 12
            f_mes = ((m - 1) % 12) + 1

        efetivado_i = efetivado if i == 0 else False

        row = repo.create_lancamento(
            user_id, tipo, desc, valor_parcela, venc_str, efetivado_i,
            False, None, categoria_id, subcategoria_id,
            conta_id, cartao_id, f_mes, f_ano, grupo_id
        )
        if first_row is None:
            first_row = row

    return dict(first_row) if first_row else {}


def _expand_fixa(user_id: int, tipo: str, descricao: str | None, valor: float, data: dict) -> dict:
    periodicidade = data.get('periodicidade', 'mensal')
    horizonte = _FIXA_HORIZONTE.get(periodicidade, 36)

    efetivado_inicial = bool(data.get('efetivado', False))
    categoria_id = int(data['categoria_id']) if data.get('categoria_id') else None
    subcategoria_id = int(data['subcategoria_id']) if data.get('subcategoria_id') else None
    conta_id = int(data['conta_id']) if data.get('conta_id') else None
    cartao_id = int(data['cartao_id']) if data.get('cartao_id') else None
    fatura_mes_base = int(data['fatura_mes']) if data.get('fatura_mes') else None
    fatura_ano_base = int(data['fatura_ano']) if data.get('fatura_ano') else None

    if tipo == 'despesa_cartao' and cartao_id and (not fatura_mes_base or not fatura_ano_base):
        fatura_mes_base, fatura_ano_base = _calcular_fatura_mes_ano(cartao_id, user_id)

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

        f_mes = fatura_mes_base
        f_ano = fatura_ano_base
        if fatura_mes_base and fatura_ano_base and tipo == 'despesa_cartao' and i > 0:
            m = fatura_mes_base + i
            f_ano = fatura_ano_base + (m - 1) // 12
            f_mes = ((m - 1) % 12) + 1

        efetivado = efetivado_inicial if i == 0 else False

        row = repo.create_lancamento(
            user_id, tipo, descricao, valor, venc_str, efetivado,
            True, periodicidade, categoria_id, subcategoria_id,
            conta_id, cartao_id, f_mes, f_ano, grupo_id
        )
        if first_row is None:
            first_row = row

    return dict(first_row) if first_row else {}


def _avancar_data(base: datetime.date, periodicidade: str, steps: int) -> datetime.date:
    if periodicidade == 'mensal':
        m = base.month + steps
        y = base.year + (m - 1) // 12
        m = ((m - 1) % 12) + 1
        last_day = (datetime.date(y, m % 12 + 1, 1) - datetime.timedelta(days=1)).day if m < 12 else 31
        return base.replace(year=y, month=m, day=min(base.day, last_day))
    if periodicidade == 'trimestral':
        m = base.month + steps * 3
        y = base.year + (m - 1) // 12
        m = ((m - 1) % 12) + 1
        last_day = (datetime.date(y, m % 12 + 1, 1) - datetime.timedelta(days=1)).day if m < 12 else 31
        return base.replace(year=y, month=m, day=min(base.day, last_day))
    if periodicidade == 'anual':
        return base.replace(year=base.year + steps)
    if periodicidade == 'semanal':
        return base + datetime.timedelta(weeks=steps)
    if periodicidade == 'diario':
        return base + datetime.timedelta(days=steps)
    m = base.month + steps
    y = base.year + (m - 1) // 12
    m = ((m - 1) % 12) + 1
    return base.replace(year=y, month=m)


def list_lancamentos(user_id: int) -> list:
    return [dict(r) for r in repo.get_lancamentos_by_user(user_id)]


def list_by_conta(conta_id: int, user_id: int, mes: int = 0, ano: int = 0) -> list:
    return [dict(r) for r in repo.get_by_conta(conta_id, user_id, mes, ano)]


def list_by_cartao(cartao_id: int, user_id: int, fatura_mes: int, fatura_ano: int) -> list:
    return [dict(r) for r in repo.get_by_cartao(cartao_id, user_id, fatura_mes, fatura_ano)]


def get_lancamento(lancamento_id: int, user_id: int) -> dict | None:
    row = repo.get_by_id(lancamento_id, user_id)
    return dict(row) if row else None


def edit_lancamento(lancamento_id: int, user_id: int, data: dict) -> dict:
    descricao = (data.get('descricao') or '').strip()[:200] or None
    try:
        valor = float(data.get('valor') or 0)
    except (TypeError, ValueError):
        raise ValueError('Valor inválido')
    if valor <= 0:
        raise ValueError('Valor deve ser positivo')
    data_venc = data.get('data_vencimento') or None
    efetivado = bool(data.get('efetivado', False))
    categoria_id = int(data['categoria_id']) if data.get('categoria_id') else None
    subcategoria_id = int(data['subcategoria_id']) if data.get('subcategoria_id') else None
    escopo = data.get('escopo', 'este')

    row = repo.update_lancamento(lancamento_id, user_id, descricao, valor,
                                 data_venc, efetivado, categoria_id, subcategoria_id)
    if not row:
        raise ValueError('Lançamento não encontrado')

    grupo_id = row.get('grupo_recorrencia_id')
    if grupo_id and escopo in ('futuros', 'todos'):
        data_ref = row.get('data_vencimento')
        if escopo == 'futuros':
            repo.update_by_grupo_futuros(grupo_id, user_id, data_ref,
                                          descricao, valor, efetivado, categoria_id, subcategoria_id)
        else:
            repo.update_by_grupo_todos(grupo_id, user_id,
                                        descricao, valor, efetivado, categoria_id, subcategoria_id)

    return dict(row)


def remove_lancamento(lancamento_id: int, user_id: int, escopo: str = 'este') -> None:
    if escopo == 'este':
        repo.delete_lancamento(lancamento_id, user_id)
        return

    current = repo.get_by_id(lancamento_id, user_id)
    if not current:
        return

    grupo_id = current.get('grupo_recorrencia_id')
    if not grupo_id:
        repo.delete_lancamento(lancamento_id, user_id)
        return

    if escopo == 'futuros':
        repo.delete_by_grupo_futuros(grupo_id, user_id, current.get('data_vencimento'))
    else:
        repo.delete_by_grupo_todos(grupo_id, user_id)


def get_future_events(user_id: int, dias: int = 90) -> list:
    rows = repo.get_future_events(user_id, dias)
    return [dict(r) for r in rows]


def get_pending_pagamento_faturas(user_id: int, dias: int = 90) -> list:
    rows = repo.get_pending_pagamento_faturas(user_id, dias)
    return [dict(r) for r in rows]


def build_projecao(saldo_inicial: float, eventos: list) -> dict:
    saldo = float(saldo_inicial)
    projecao = []
    for ev in eventos:
        valor = float(ev['valor'])
        if ev['tipo'] == 'receita':
            saldo += valor
        else:
            saldo -= valor
        projecao.append({
            'data': ev['data'].isoformat() if hasattr(ev['data'], 'isoformat') else str(ev['data']),
            'descricao': ev['descricao'],
            'valor': valor,
            'tipo': ev['tipo'],
            'conta_nome': ev['conta_nome'],
            'saldo_acumulado': round(saldo, 2),
        })
    return {'saldo_atual': round(float(saldo_inicial), 2), 'eventos': projecao}


def get_resumo_mes(user_id: int, mes: int, ano: int) -> dict:
    row = repo.get_resumo_mes(user_id, mes, ano)
    if not row:
        return {'receitas': 0, 'despesas_conta': 0, 'despesas_cartao': 0}
    return dict(row)


def get_despesas_por_conta(user_id: int, mes: int, ano: int) -> list:
    rows = repo.get_despesas_por_conta(user_id, mes, ano)
    return [dict(r) for r in rows]


def get_despesas_por_categoria(user_id: int, mes: int, ano: int) -> list:
    rows = repo.get_despesas_por_categoria(user_id, mes, ano)
    return [dict(r) for r in rows]


def get_sugestoes_descricao(user_id: int, tipo: str, query: str, limit: int = 6) -> list:
    if not query or len(query.strip()) < 2:
        return []
    if tipo not in _TIPOS_VALIDOS:
        return []
    rows = repo.get_sugestoes_descricao(user_id, tipo, query.strip(), limit)
    return [dict(r) for r in rows]
