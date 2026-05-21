import datetime
import os

import anthropic

from app.services import contas_service, cartoes_service, lancamentos_service

_SYSTEM_PROMPT = (
    "Você é o Flux, assistente financeiro pessoal do sistema Fluxara. "
    "Sua personalidade é direta, amigável e prática — como um parceiro financeiro de confiança. "
    "Analise os dados e ofereça insights concretos em português brasileiro informal mas profissional. "
    "Regras: seja conciso (3 a 5 frases curtas), cite valores e datas reais dos dados fornecidos, "
    "termine sempre com uma recomendação acionável, "
    "use perspectiva de parceiro ('você tem', 'suas contas', 'sua fatura'), "
    "escreva em parágrafo fluido sem bullet points, sem cabeçalhos e sem negrito."
)


def _fmt_brl(valor) -> str:
    try:
        v = float(valor)
        s = f"{v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        return f"R$ {s}"
    except (TypeError, ValueError):
        return "R$ 0,00"


def _date_str(val) -> str:
    if hasattr(val, 'strftime'):
        return val.strftime('%d/%m/%Y')
    return str(val)


def _build_context_semana(user_id: int) -> str:
    today = datetime.date.today()
    contas = contas_service.list_contas(user_id)
    saldo_total = sum(float(c.get('saldo_atual') or 0) for c in contas)
    eventos = lancamentos_service.get_future_events(user_id, dias=7)

    lines = [
        f"Data de hoje: {today.strftime('%d/%m/%Y')}",
        f"Saldo total em todas as contas: {_fmt_brl(saldo_total)}",
    ]

    if contas:
        lines.append("Contas:")
        for c in contas:
            lines.append(f"  - {c['nome']}: {_fmt_brl(c.get('saldo_atual', 0))}")

    if eventos:
        lines.append("\nLançamentos pendentes nos próximos 7 dias:")
        for ev in eventos:
            sinal = "+" if ev['tipo'] == 'receita' else "-"
            lines.append(
                f"  - {_date_str(ev['data'])} | {ev.get('descricao', '?')} | "
                f"{sinal}{_fmt_brl(ev.get('valor', 0))} ({ev.get('conta_nome', '?')})"
            )
    else:
        lines.append("\nNenhum lançamento pendente nos próximos 7 dias.")

    return "\n".join(lines)


def _build_context_mes(user_id: int) -> str:
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
    resultado = receitas - desp_conta - desp_cartao

    lines = [
        f"Mês de análise: {today.strftime('%B de %Y')}",
        f"Saldo total atual: {_fmt_brl(saldo_total)}",
        f"Receitas no mês: {_fmt_brl(receitas)}",
        f"Despesas em conta no mês: {_fmt_brl(desp_conta)}",
        f"Despesas no cartão no mês: {_fmt_brl(desp_cartao)}",
        f"Resultado do mês: {_fmt_brl(resultado)} ({'positivo' if resultado >= 0 else 'negativo'})",
    ]

    if contas:
        lines.append("\nContas:")
        for c in contas:
            lines.append(
                f"  - {c['nome']} ({c.get('instituicao', '')}): "
                f"saldo atual {_fmt_brl(c.get('saldo_atual', 0))} | "
                f"previsto {_fmt_brl(c.get('saldo_previsto', 0))}"
            )

    if cartoes:
        lines.append("\nCartões de crédito:")
        for ct in cartoes:
            lines.append(
                f"  - {ct['nome']}: fatura {_fmt_brl(ct.get('fatura_atual', 0))} / "
                f"limite {_fmt_brl(ct.get('limite', 0))} "
                f"(disponível: {_fmt_brl(ct.get('limite_disponivel', 0))})"
            )

    if categorias:
        lines.append("\nTop despesas por categoria:")
        for cat in categorias[:5]:
            lines.append(f"  - {cat.get('categoria_nome', '?')}: {_fmt_brl(cat.get('total', 0))}")

    eventos_pendentes = projecao.get('eventos', [])
    if eventos_pendentes:
        saldo_proj = float(eventos_pendentes[-1].get('saldo_acumulado', saldo_total))
        lines.append(f"\n{len(eventos_pendentes)} evento(s) pendente(s) nos próximos 30 dias.")
        lines.append(f"Saldo projetado ao final dos 30 dias: {_fmt_brl(saldo_proj)}")

    return "\n".join(lines)


def _build_context_ano(user_id: int) -> str:
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
    resultado_mensal = receitas - desp_conta - desp_cartao

    lines = [
        f"Análise anual — referência: {today.strftime('%B de %Y')} ({ano})",
        f"Saldo total atual (todas as contas): {_fmt_brl(saldo_total)}",
        f"Receitas no mês atual: {_fmt_brl(receitas)}",
        f"Despesas totais no mês atual: {_fmt_brl(desp_conta + desp_cartao)}",
        f"Resultado mensal atual: {_fmt_brl(resultado_mensal)} ({'positivo' if resultado_mensal >= 0 else 'negativo'})",
    ]

    if resultado_mensal > 0:
        lines.append(f"Projeção de economia anual (mantendo ritmo atual): {_fmt_brl(resultado_mensal * 12)}")

    if cartoes:
        total_faturas = sum(float(ct.get('fatura_atual', 0)) for ct in cartoes)
        total_limite = sum(float(ct.get('limite', 0)) for ct in cartoes)
        utilizacao = (total_faturas / total_limite * 100) if total_limite > 0 else 0
        lines.append(
            f"\nCartões: {len(cartoes)} cartão(ões) | "
            f"Faturas totais: {_fmt_brl(total_faturas)} | "
            f"Limite total: {_fmt_brl(total_limite)} | "
            f"Utilização: {utilizacao:.0f}%"
        )

    if categorias:
        lines.append("\nTop categorias de despesa (mês atual):")
        for cat in categorias[:5]:
            lines.append(f"  - {cat.get('categoria_nome', '?')}: {_fmt_brl(cat.get('total', 0))}")

    eventos_pendentes = projecao.get('eventos', [])
    if eventos_pendentes:
        saldo_60d = float(eventos_pendentes[-1].get('saldo_acumulado', saldo_total))
        lines.append(f"\nSaldo projetado em 60 dias: {_fmt_brl(saldo_60d)}")
        lines.append(f"Eventos financeiros pendentes nos próximos 60 dias: {len(eventos_pendentes)}")

    return "\n".join(lines)


def get_analise(user_id: int, periodo: str) -> str:
    if periodo == 'semana':
        context = _build_context_semana(user_id)
        periodo_label = "a semana (próximos 7 dias)"
    elif periodo == 'ano':
        context = _build_context_ano(user_id)
        periodo_label = "o ano (visão anual com base nos dados atuais)"
    else:
        context = _build_context_mes(user_id)
        periodo_label = "o mês atual"

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return "Assistente Flux não configurado. Defina a variável de ambiente ANTHROPIC_API_KEY."

    client = anthropic.Anthropic(api_key=api_key)
    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=400,
        system=[
            {
                "type": "text",
                "text": _SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[
            {
                "role": "user",
                "content": f"Analise minha situação financeira para {periodo_label}.\n\n{context}",
            }
        ],
    )
    return message.content[0].text
