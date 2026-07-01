import calendar
import datetime

from app.repositories import recorrencias_repository as repo
from app.repositories import lancamentos_repository as lanc_repo


def _parse_money(value) -> float:
    if value is None:
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    s = str(value).strip().replace("R$", "").replace(" ", "")
    if "," in s:
        s = s.replace(".", "").replace(",", ".")
    try:
        return float(s)
    except (ValueError, TypeError):
        return 0.0


def _fatura_mes_ano(dia_fechamento: int, ref_date: datetime.date) -> tuple[int, int]:
    dia_fech = dia_fechamento or 1
    if ref_date.day > dia_fech:
        if ref_date.month == 12:
            return 1, ref_date.year + 1
        return ref_date.month + 1, ref_date.year
    return ref_date.month, ref_date.year


def list_recorrencias(user_id: int) -> list:
    return [dict(r) for r in repo.list_recorrencias(user_id)]


def get_recorrencia(recorrencia_id: int, user_id: int) -> dict | None:
    row = repo.get_recorrencia(recorrencia_id, user_id)
    return dict(row) if row else None


def create_recorrencia(user_id: int, data: dict) -> dict:
    nome = (data.get("nome") or "").strip()[:200]
    if not nome:
        raise ValueError("Nome obrigatório")
    tipo = data.get("tipo")
    if tipo not in ("debito", "credito"):
        raise ValueError("Tipo inválido")
    valor = _parse_money(data.get("valor"))
    if valor <= 0:
        raise ValueError("Valor deve ser positivo")
    dia = int(data.get("dia_vencimento") or 0)
    if not 1 <= dia <= 31:
        raise ValueError("Dia de vencimento inválido")
    categoria_id = int(data["categoria_id"]) if data.get("categoria_id") else None
    conta_id = int(data["conta_id"]) if data.get("conta_id") and tipo == "debito" else None
    cartao_id = int(data["cartao_id"]) if data.get("cartao_id") and tipo == "credito" else None
    if tipo == "debito" and not conta_id:
        raise ValueError("Conta obrigatória para débito automático")
    if tipo == "credito" and not cartao_id:
        raise ValueError("Cartão obrigatório para crédito automático")
    row = repo.create_recorrencia(user_id, nome, tipo, valor, categoria_id, conta_id, cartao_id, dia)
    return dict(row)


def update_recorrencia(recorrencia_id: int, user_id: int, data: dict):
    nome = (data.get("nome") or "").strip()[:200]
    if not nome:
        raise ValueError("Nome obrigatório")
    valor = _parse_money(data.get("valor"))
    if valor <= 0:
        raise ValueError("Valor deve ser positivo")
    dia = int(data.get("dia_vencimento") or 0)
    if not 1 <= dia <= 31:
        raise ValueError("Dia de vencimento inválido")
    categoria_id = int(data["categoria_id"]) if data.get("categoria_id") else None
    existing = repo.get_recorrencia(recorrencia_id, user_id)
    if not existing:
        raise ValueError("Recorrência não encontrada")
    conta_id = int(data["conta_id"]) if data.get("conta_id") else None
    cartao_id = int(data["cartao_id"]) if data.get("cartao_id") else None
    repo.update_recorrencia(recorrencia_id, user_id, nome, valor, categoria_id, conta_id, cartao_id, dia)


def toggle_ativo(recorrencia_id: int, user_id: int) -> bool:
    return repo.toggle_ativo(recorrencia_id, user_id)


def delete_recorrencia(recorrencia_id: int, user_id: int):
    repo.delete_recorrencia(recorrencia_id, user_id)


def processar_recorrencias(user_id: int):
    today = datetime.date.today()
    ativas = repo.list_ativas(user_id)

    for r in ativas:
        last_day = calendar.monthrange(today.year, today.month)[1]
        due_day = min(r['dia_vencimento'], last_day)
        due_date = datetime.date(today.year, today.month, due_day)

        if today < due_date:
            continue

        ultimo = r['ultimo_lancamento']
        if ultimo and ultimo.year == today.year and ultimo.month == today.month:
            continue

        if r['tipo'] == 'debito':
            lanc_repo.create_lancamento(
                user_id=user_id,
                tipo='despesa',
                descricao=r['nome'],
                valor=float(r['valor']),
                data_vencimento=due_date.isoformat(),
                efetivado=True,
                recorrente=False,
                recorrencia_tipo=None,
                categoria_id=r['categoria_id'],
                subcategoria_id=None,
                conta_id=r['conta_id'],
                cartao_id=None,
                fatura_mes=None,
                fatura_ano=None,
            )

        elif r['tipo'] == 'credito':
            dia_fech = r.get('dia_fechamento') or 1
            fatura_mes, fatura_ano = _fatura_mes_ano(dia_fech, due_date)
            lanc_repo.create_lancamento(
                user_id=user_id,
                tipo='despesa_cartao',
                descricao=r['nome'],
                valor=float(r['valor']),
                data_vencimento=due_date.isoformat(),
                efetivado=False,
                recorrente=False,
                recorrencia_tipo=None,
                categoria_id=r['categoria_id'],
                subcategoria_id=None,
                conta_id=None,
                cartao_id=r['cartao_id'],
                fatura_mes=fatura_mes,
                fatura_ano=fatura_ano,
            )

        repo.mark_lancado(r['id'], user_id, today)
