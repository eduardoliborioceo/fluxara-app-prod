import datetime
from app.repositories import cartoes_repository as repo
from app.repositories import lancamentos_repository as lanc_repo

_BANDEIRAS_VALIDAS = {"visa", "mastercard", "elo", "amex", "hipercard", "outro"}
_TIPOS_VALIDOS = {"credito", "debito", "credito_debito"}


def list_cartoes(user_id: int, mes: int = 0, ano: int = 0) -> list:
    rows = repo.list_cartoes(user_id, mes, ano)
    return [dict(r) for r in rows]


def add_cartao(user_id: int, nome: str, limite, bandeira: str, conta_id, dia_fechamento: int, dia_vencimento: int, tipo: str = 'credito') -> dict:
    nome = nome.strip()[:100]
    if not nome:
        raise ValueError("Nome obrigatório")
    bandeira = bandeira.strip().lower() if bandeira else "outro"
    if bandeira not in _BANDEIRAS_VALIDAS:
        bandeira = "outro"
    tipo = tipo.strip().lower() if tipo else "credito"
    if tipo not in _TIPOS_VALIDOS:
        tipo = "credito"
    lim = _parse_money(limite)
    cid = int(conta_id) if conta_id else None
    dia_f = _parse_dia(dia_fechamento)
    dia_v = _parse_dia(dia_vencimento)
    row = repo.create_cartao(user_id, nome, lim, bandeira, cid, dia_f, dia_v, tipo)
    return dict(row)


def edit_cartao(cartao_id: int, user_id: int, nome: str, limite, bandeira: str, conta_id, dia_fechamento: int, dia_vencimento: int, tipo: str = 'credito'):
    nome = nome.strip()[:100]
    if not nome:
        raise ValueError("Nome obrigatório")
    bandeira = bandeira.strip().lower() if bandeira else "outro"
    if bandeira not in _BANDEIRAS_VALIDAS:
        bandeira = "outro"
    tipo = tipo.strip().lower() if tipo else "credito"
    if tipo not in _TIPOS_VALIDOS:
        tipo = "credito"
    lim = _parse_money(limite)
    cid = int(conta_id) if conta_id else None
    dia_f = _parse_dia(dia_fechamento)
    dia_v = _parse_dia(dia_vencimento)
    repo.update_cartao(cartao_id, user_id, nome, lim, bandeira, cid, dia_f, dia_v, tipo)


def remove_cartao(cartao_id: int, user_id: int):
    repo.delete_cartao(cartao_id, user_id)


def transferir_limite(cartao_origem_id: int, cartao_destino_id: int, user_id: int, valor) -> None:
    if cartao_origem_id == cartao_destino_id:
        raise ValueError("Cartão de origem e destino não podem ser o mesmo")
    valor = _parse_money(valor)
    if valor <= 0:
        raise ValueError("Valor deve ser positivo")
    repo.transfer_limite(cartao_origem_id, cartao_destino_id, user_id, valor)


_MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
              'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']


def gerar_lancamento_fatura(cartao_id: int, user_id: int, mes: int, ano: int,
                            valor: float, data_pagamento: str) -> dict:
    cartao = repo.get_cartao(cartao_id, user_id)
    if not cartao:
        raise ValueError("Cartão não encontrado")
    if not cartao.get('conta_id'):
        raise ValueError("Cartão sem conta bancária vinculada")
    if valor <= 0:
        raise ValueError("Valor deve ser positivo")

    try:
        data_pg = datetime.date.fromisoformat(data_pagamento)
    except (ValueError, TypeError):
        raise ValueError("Data de pagamento inválida")

    nome_mes = _MESES_PT[mes - 1] if 1 <= mes <= 12 else str(mes)
    descricao = f"Fatura {nome_mes}/{ano} - {cartao['nome']}"

    row = lanc_repo.create_lancamento(
        user_id=user_id,
        tipo='pagamento_fatura',
        descricao=descricao,
        valor=valor,
        data_vencimento=data_pg,
        efetivado=True,
        recorrente=False,
        recorrencia_tipo=None,
        categoria_id=None,
        subcategoria_id=None,
        conta_id=int(cartao['conta_id']),
        cartao_id=cartao_id,
        fatura_mes=mes,
        fatura_ano=ano,
    )

    try:
        from app.services.push_service import send_to_user
        valor_fmt = f"R$ {valor:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        send_to_user(
            user_id,
            f"✅ Fatura paga — {cartao['nome']}",
            f"Pagamento de {valor_fmt} registrado. Fatura {nome_mes}/{ano}.",
        )
    except Exception:
        pass

    return dict(row)


def get_faturas_futuras(user_id: int, dias: int) -> list:
    import calendar
    hoje = datetime.date.today()
    limite = hoje + datetime.timedelta(days=dias)

    faturas = repo.get_faturas_pendentes(user_id)
    eventos = []

    for f in faturas:
        fatura_mes = int(f['fatura_mes'])
        fatura_ano = int(f['fatura_ano'])
        dia_venc = int(f['dia_vencimento'] or 1)
        dia_fech = int(f['dia_fechamento'] or 1)

        # Se vencimento > fechamento, a fatura vence no mesmo mês que fecha
        # (ex: fecha dia 7, vence dia 18 → ambos em junho)
        # Se vencimento <= fechamento, vence no mês seguinte
        if dia_venc > dia_fech:
            venc_mes = fatura_mes
            venc_ano = fatura_ano
        else:
            venc_mes = fatura_mes + 1 if fatura_mes < 12 else 1
            venc_ano = fatura_ano if fatura_mes < 12 else fatura_ano + 1

        ultimo_dia = calendar.monthrange(venc_ano, venc_mes)[1]
        try:
            data_venc = datetime.date(venc_ano, venc_mes, min(dia_venc, ultimo_dia))
        except ValueError:
            continue

        if data_venc < hoje or data_venc > limite:
            continue

        eventos.append({
            'data': data_venc,
            'descricao': f"Fatura {f['cartao_nome']}",
            'valor': float(f['saldo_fatura']),
            'tipo': 'despesa',
            'conta_nome': f['cartao_nome'],
        })

    return sorted(eventos, key=lambda x: x['data'])


def get_fatura_aberta_para_conta(conta_id: int, user_id: int, mes: int, ano: int) -> list:
    rows = repo.get_open_invoices_for_conta(conta_id, user_id, mes, ano)
    result = []
    for r in rows:
        r = dict(r)
        dia_v = int(r.get('dia_vencimento') or 1)
        try:
            due = datetime.date(ano, mes, min(dia_v, 28))
        except ValueError:
            due = datetime.date(ano, mes, 28)
        result.append({
            'cartao_id': r['id'],
            'cartao_nome': r['nome'],
            'bandeira': r.get('bandeira', 'outro'),
            'fatura_total': float(r['fatura_total']),
            'data_vencimento': due.isoformat(),
        })
    return result


def _parse_money(value) -> float:
    if value is None:
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    s = str(value).strip().replace("R$", "").replace(" ", "")
    s = s.replace(".", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return 0.0


def _parse_dia(value) -> int:
    try:
        d = int(value)
        return max(1, min(31, d))
    except (TypeError, ValueError):
        return 1
