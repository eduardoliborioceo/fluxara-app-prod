import datetime

from app.services import contas_service, cartoes_service, lancamentos_service

_MESES_PT = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']


def _as_date(d) -> datetime.date:
    if isinstance(d, datetime.datetime):
        return d.date()
    if isinstance(d, str):
        return datetime.date.fromisoformat(d[:10])
    return d


def _fmt_desp_list(despesas: list) -> list:
    return [
        {
            'descricao': d['descricao'],
            'valor': round(float(d['valor']), 2),
            'data': _as_date(d['data']).strftime('%d/%m'),
        }
        for d in despesas
    ]


def _fmt_brl(valor) -> str:
    try:
        v = float(valor)
        s = f"{v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        return f"R$ {s}"
    except (TypeError, ValueError):
        return "R$ 0,00"


def _dias_ate(data_alvo) -> int:
    if hasattr(data_alvo, 'date'):
        data_alvo = data_alvo.date()
    return (data_alvo - datetime.date.today()).days


def _nome_mes(mes: int) -> str:
    nomes = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
             'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
    return nomes[mes - 1]


# ── Semana ───────────────────────────────────────────────────────────────────

def _analise_semana(user_id: int) -> str:
    today = datetime.date.today()
    contas = contas_service.list_contas(user_id)
    saldo_total = sum(float(c.get('saldo_atual') or 0) for c in contas)
    eventos = lancamentos_service.get_future_events(user_id, dias=7)
    cartoes = cartoes_service.list_cartoes(user_id, today.month, today.year)

    receitas_semana = sum(float(e['valor']) for e in eventos if e['tipo'] == 'receita')
    despesas_semana = sum(float(e['valor']) for e in eventos if e['tipo'] == 'despesa')
    saldo_projetado = saldo_total + receitas_semana - despesas_semana

    urgentes = [e for e in eventos if e['tipo'] == 'despesa'
                and hasattr(e['data'], 'date') and _dias_ate(e['data']) <= 2
                or e['tipo'] == 'despesa' and isinstance(e['data'], datetime.date)
                and (e['data'] - today).days <= 2]

    partes = []

    if not eventos:
        partes.append(
            f"Sua semana começa tranquila: você tem {_fmt_brl(saldo_total)} em conta "
            f"e nenhum lançamento pendente nos próximos 7 dias."
        )
    else:
        partes.append(
            f"Você começa a semana com {_fmt_brl(saldo_total)} em conta."
        )
        if receitas_semana > 0 and despesas_semana > 0:
            partes.append(
                f"Nos próximos 7 dias entram {_fmt_brl(receitas_semana)} e saem "
                f"{_fmt_brl(despesas_semana)}, deixando um saldo projetado de {_fmt_brl(saldo_projetado)}."
            )
        elif despesas_semana > 0:
            partes.append(
                f"Você tem {_fmt_brl(despesas_semana)} em despesas pendentes esta semana, "
                f"o que projeta seu saldo em {_fmt_brl(saldo_projetado)}."
            )
        elif receitas_semana > 0:
            partes.append(
                f"Você tem {_fmt_brl(receitas_semana)} a receber esta semana — bom sinal."
            )

    if saldo_projetado < 0:
        partes.append(
            f"Atenção: seu saldo pode ficar negativo essa semana. "
            f"Avalie quais despesas podem ser adiadas."
        )
    elif urgentes:
        ev = urgentes[0]
        data_ev = ev['data'] if isinstance(ev['data'], datetime.date) else ev['data'].date()
        partes.append(
            f"Lembre de pagar '{ev.get('descricao', 'lançamento')}' "
            f"({_fmt_brl(ev.get('valor', 0))}) que vence em {data_ev.strftime('%d/%m')}."
        )

    cartoes_venc = []
    for ct in cartoes:
        dia_venc = ct.get('dia_vencimento')
        if dia_venc:
            try:
                venc = datetime.date(today.year, today.month, int(dia_venc))
                if venc < today:
                    m = today.month + 1 if today.month < 12 else 1
                    y = today.year if today.month < 12 else today.year + 1
                    venc = datetime.date(y, m, int(dia_venc))
                if 0 <= (venc - today).days <= 7:
                    cartoes_venc.append((ct, venc))
            except ValueError:
                pass

    if cartoes_venc:
        ct, venc = cartoes_venc[0]
        partes.append(
            f"Sua fatura do {ct['nome']} ({_fmt_brl(ct.get('fatura_atual', 0))}) "
            f"vence em {venc.strftime('%d/%m')} — não deixe passar."
        )

    if saldo_projetado >= 0 and not cartoes_venc and not urgentes:
        partes.append("Semana tranquila pela frente. Aproveite para adiantar alguma reserva.")

    return " ".join(partes)


# ── Mês ──────────────────────────────────────────────────────────────────────

def _analise_mes(user_id: int) -> str:
    today = datetime.date.today()
    mes, ano = today.month, today.year

    contas = contas_service.list_contas(user_id, mes, ano)
    saldo_total = sum(float(c.get('saldo_atual') or 0) for c in contas)
    cartoes = cartoes_service.list_cartoes(user_id, mes, ano)
    resumo = lancamentos_service.get_resumo_mes(user_id, mes, ano)
    categorias = lancamentos_service.get_despesas_por_categoria(user_id, mes, ano)
    eventos = lancamentos_service.get_future_events(user_id, dias=30)
    projecao = lancamentos_service.build_projecao(saldo_total, eventos)

    receitas = float(resumo.get('receitas', 0))
    desp_conta = float(resumo.get('despesas_conta', 0))
    desp_cartao = float(resumo.get('despesas_cartao', 0))
    total_desp = desp_conta + desp_cartao
    resultado = receitas - total_desp

    eventos_pendentes = projecao.get('eventos', [])
    saldo_proj_30d = (
        float(eventos_pendentes[-1].get('saldo_acumulado', saldo_total))
        if eventos_pendentes else saldo_total
    )

    partes = []

    mes_label = f"{_nome_mes(mes).capitalize()} de {ano}"

    if receitas == 0 and total_desp == 0:
        partes.append(
            f"Ainda não há movimentação registrada em {mes_label}. "
            f"Seu saldo atual é de {_fmt_brl(saldo_total)}."
        )
        partes.append("Assim que os lançamentos forem registrados, a análise ficará mais completa.")
    else:
        if resultado >= 0:
            partes.append(
                f"Em {mes_label} você está no positivo: "
                f"{_fmt_brl(receitas)} de receitas contra {_fmt_brl(total_desp)} em despesas, "
                f"sobrando {_fmt_brl(resultado)}."
            )
        else:
            partes.append(
                f"Atenção: em {mes_label} suas despesas ({_fmt_brl(total_desp)}) "
                f"estão superando as receitas ({_fmt_brl(receitas)}) em {_fmt_brl(abs(resultado))}."
            )

    if categorias:
        top = categorias[0]
        partes.append(
            f"Sua maior categoria de gasto é {top.get('categoria_nome', '?')} "
            f"com {_fmt_brl(top.get('total', 0))}."
        )

    cartoes_alerta = [
        ct for ct in cartoes
        if ct.get('limite') and ct.get('fatura_atual') and
        float(ct.get('fatura_atual', 0)) / float(ct.get('limite', 1)) > 0.7
    ]
    if cartoes_alerta:
        ct = cartoes_alerta[0]
        pct = float(ct['fatura_atual']) / float(ct['limite']) * 100
        partes.append(
            f"O cartão {ct['nome']} está com {pct:.0f}% do limite utilizado "
            f"({_fmt_brl(ct['fatura_atual'])} de {_fmt_brl(ct['limite'])}) — use com cuidado."
        )
    elif cartoes and any(float(ct.get('fatura_atual', 0)) > 0 for ct in cartoes):
        total_fatura = sum(float(ct.get('fatura_atual', 0)) for ct in cartoes)
        partes.append(
            f"Suas faturas somam {_fmt_brl(total_fatura)} no total — dentro do esperado."
        )

    if eventos_pendentes:
        if saldo_proj_30d < 0:
            partes.append(
                f"Com os lançamentos futuros, seu saldo pode chegar a {_fmt_brl(saldo_proj_30d)} "
                f"em 30 dias. Reveja despesas não essenciais."
            )
        elif saldo_proj_30d < saldo_total * 0.5 and saldo_total > 0:
            partes.append(
                f"Seu saldo projetado nos próximos 30 dias é de {_fmt_brl(saldo_proj_30d)}. "
                f"Fique de olho nos gastos desta quinzena."
            )
        else:
            partes.append(
                f"Seu saldo projetado em 30 dias é de {_fmt_brl(saldo_proj_30d)} — "
                f"você está caminhando bem."
            )
    else:
        if resultado > 0:
            partes.append("Nenhum lançamento futuro registrado. Bom momento para guardar o que sobrou.")
        else:
            partes.append("Registre os próximos lançamentos para acompanhar sua projeção.")

    return " ".join(partes)


# ── Ano ──────────────────────────────────────────────────────────────────────

def _analise_ano(user_id: int) -> str:
    today = datetime.date.today()
    mes, ano = today.month, today.year

    contas = contas_service.list_contas(user_id)
    saldo_total = sum(float(c.get('saldo_atual') or 0) for c in contas)
    cartoes = cartoes_service.list_cartoes(user_id, mes, ano)
    resumo = lancamentos_service.get_resumo_mes(user_id, mes, ano)
    categorias = lancamentos_service.get_despesas_por_categoria(user_id, mes, ano)
    eventos = lancamentos_service.get_future_events(user_id, dias=60)
    projecao = lancamentos_service.build_projecao(saldo_total, eventos)

    receitas = float(resumo.get('receitas', 0))
    desp_conta = float(resumo.get('despesas_conta', 0))
    desp_cartao = float(resumo.get('despesas_cartao', 0))
    total_desp = desp_conta + desp_cartao
    resultado_mensal = receitas - total_desp

    eventos_pendentes = projecao.get('eventos', [])
    saldo_60d = (
        float(eventos_pendentes[-1].get('saldo_acumulado', saldo_total))
        if eventos_pendentes else saldo_total
    )

    partes = []

    meses_restantes = 12 - mes + 1

    if receitas == 0 and total_desp == 0:
        partes.append(
            f"Ainda sem movimentação registrada em {ano} para calcular projeções. "
            f"Seu patrimônio atual soma {_fmt_brl(saldo_total)}."
        )
    else:
        if resultado_mensal > 0:
            projecao_anual = resultado_mensal * meses_restantes
            partes.append(
                f"No ritmo atual de {_nome_mes(mes)}, você está economizando "
                f"{_fmt_brl(resultado_mensal)} por mês. "
                f"Se manter esse ritmo, pode acumular mais {_fmt_brl(projecao_anual)} "
                f"até o fim de {ano}."
            )
        else:
            deficit_anual = abs(resultado_mensal) * meses_restantes
            partes.append(
                f"No ritmo atual, você está gastando {_fmt_brl(abs(resultado_mensal))} "
                f"a mais do que recebe por mês. "
                f"Projetando até dezembro, isso representa {_fmt_brl(deficit_anual)} de deficit — "
                f"é hora de rever o orçamento."
            )

    if saldo_total > 0:
        meses_reserva = saldo_total / total_desp if total_desp > 0 else 0
        if meses_reserva >= 3:
            partes.append(
                f"Seu saldo atual de {_fmt_brl(saldo_total)} cobre cerca de "
                f"{meses_reserva:.0f} meses de despesas — uma reserva saudável."
            )
        elif meses_reserva > 0:
            partes.append(
                f"Seu saldo atual de {_fmt_brl(saldo_total)} cobre cerca de "
                f"{meses_reserva:.1f} meses de despesas. "
                f"O ideal é ter pelo menos 3 meses de reserva."
            )

    if cartoes:
        total_faturas = sum(float(ct.get('fatura_atual', 0)) for ct in cartoes)
        total_limite = sum(float(ct.get('limite', 0)) for ct in cartoes)
        if total_limite > 0:
            utilizacao = total_faturas / total_limite * 100
            if utilizacao > 70:
                partes.append(
                    f"Seus cartões estão com {utilizacao:.0f}% do limite comprometido "
                    f"({_fmt_brl(total_faturas)} de {_fmt_brl(total_limite)}). "
                    f"Tente manter abaixo de 70%."
                )
            else:
                partes.append(
                    f"Uso de cartões saudável: {utilizacao:.0f}% do limite utilizado."
                )

    if categorias:
        top = categorias[0]
        partes.append(
            f"Sua principal categoria de gasto este mês é {top.get('categoria_nome', '?')} "
            f"com {_fmt_brl(top.get('total', 0))} — avalie se há espaço para reduzir."
        )

    if eventos_pendentes and saldo_60d != saldo_total:
        partes.append(
            f"Com os lançamentos futuros, seu saldo projetado em 60 dias é {_fmt_brl(saldo_60d)}."
        )

    return " ".join(partes)


# ── Ponto de entrada ─────────────────────────────────────────────────────────

def get_analise(user_id: int, periodo: str) -> str:
    if periodo == 'semana':
        return _analise_semana(user_id)
    if periodo == 'ano':
        return _analise_ano(user_id)
    return _analise_mes(user_id)


# ── Planejamento por recebimento ─────────────────────────────────────────────

def get_planejamento_quinzenal(user_id: int) -> dict:
    today = datetime.date.today()
    contas = contas_service.list_contas(user_id)
    saldo_atual = sum(float(c.get('saldo_atual') or 0) for c in contas)

    eventos = list(lancamentos_service.get_future_events(user_id, dias=60))
    faturas = cartoes_service.get_faturas_futuras(user_id, dias=60)
    eventos += [dict(f) for f in faturas]
    eventos.sort(key=lambda x: _as_date(x['data']))

    receitas = sorted(
        [e for e in eventos if e['tipo'] == 'receita'],
        key=lambda x: _as_date(x['data'])
    )
    despesas = sorted(
        [e for e in eventos if e['tipo'] == 'despesa'],
        key=lambda x: _as_date(x['data'])
    )

    periodos = []

    if not receitas:
        total_desp = sum(float(d['valor']) for d in despesas)
        if despesas:
            periodos.append({
                'tipo': 'saldo',
                'label': 'Saldo disponível',
                'data': today.isoformat(),
                'disponivel': round(saldo_atual, 2),
                'despesas': _fmt_desp_list(despesas),
                'total_despesas': round(total_desp, 2),
                'sobra': round(saldo_atual - total_desp, 2),
            })
        return {
            'saldo_atual': round(saldo_atual, 2),
            'has_receitas': False,
            'periodos': periodos,
        }

    primeira_data = _as_date(receitas[0]['data'])

    desp_periodo0 = [d for d in despesas if _as_date(d['data']) < primeira_data]
    total_desp0 = sum(float(d['valor']) for d in desp_periodo0)
    periodos.append({
        'tipo': 'saldo',
        'label': 'Saldo disponível',
        'data': today.isoformat(),
        'disponivel': round(saldo_atual, 2),
        'despesas': _fmt_desp_list(desp_periodo0),
        'total_despesas': round(total_desp0, 2),
        'sobra': round(saldo_atual - total_desp0, 2),
    })

    for i, receita in enumerate(receitas):
        data_rec = _as_date(receita['data'])
        valor_rec = float(receita['valor'])
        proxima_data = _as_date(receitas[i + 1]['data']) if i + 1 < len(receitas) else None

        if proxima_data:
            desp_periodo = [d for d in despesas
                            if data_rec <= _as_date(d['data']) < proxima_data]
        else:
            desp_periodo = [d for d in despesas if _as_date(d['data']) >= data_rec]

        total_desp = sum(float(d['valor']) for d in desp_periodo)
        mes_label = _MESES_PT[data_rec.month - 1]

        periodos.append({
            'tipo': 'receita',
            'label': f"Dia {data_rec.day}/{mes_label}",
            'data': data_rec.isoformat(),
            'receita': {
                'descricao': receita['descricao'],
                'valor': round(valor_rec, 2),
                'conta': receita.get('conta_nome', ''),
            },
            'disponivel': round(valor_rec, 2),
            'despesas': _fmt_desp_list(desp_periodo),
            'total_despesas': round(total_desp, 2),
            'sobra': round(valor_rec - total_desp, 2),
        })

    return {
        'saldo_atual': round(saldo_atual, 2),
        'has_receitas': True,
        'periodos': periodos,
    }
