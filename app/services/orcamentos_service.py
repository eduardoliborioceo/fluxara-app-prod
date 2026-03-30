from app.repositories import orcamentos_repository as repo
from app.repositories import notificacoes_orcamento_repository as notif_repo


def list_orcamentos(user_id: int, mes: int, ano: int) -> list:
    from app.services.config_service import seed_defaults
    seed_defaults(user_id)
    rows = repo.list_orcamentos_com_gasto(user_id, mes, ano)
    return [dict(r) for r in rows]


def save_orcamento(user_id: int, categoria_id: int, mes: int, ano: int, valor) -> dict:
    if not categoria_id:
        raise ValueError('Categoria obrigatória')
    if mes < 1 or mes > 12 or ano < 2000:
        raise ValueError('Mês/ano inválido')
    try:
        v = float(valor or 0)
    except (TypeError, ValueError):
        raise ValueError('Valor inválido')
    if v < 0:
        raise ValueError('Valor deve ser positivo')
    row = repo.upsert_orcamento(user_id, int(categoria_id), mes, ano, v)
    return dict(row)


def remove_orcamento(orcamento_id: int, user_id: int) -> None:
    repo.delete_orcamento(orcamento_id, user_id)


def copy_from_previous_month(user_id: int, mes: int, ano: int) -> int:
    if mes < 1 or mes > 12 or ano < 2000:
        raise ValueError('Mês/ano inválido')
    return repo.copy_from_previous_month(user_id, mes, ano)


def check_and_notify_thresholds(user_id: int, mes: int, ano: int) -> None:
    from flask import current_app
    try:
        from app.services.push_service import send_to_user
        rows = repo.list_orcamentos_com_gasto(user_id, mes, ano)
        for row in rows:
            if row['tipo'] != 'despesa':
                continue
            orc = float(row['orcamento_valor'] or 0)
            if orc <= 0:
                continue
            gasto = float(row['gasto_real'] or 0)
            pct = gasto / orc * 100
            cat_id = row['categoria_id']
            cat_nome = row['categoria_nome']

            if pct >= 100 and not notif_repo.already_sent(user_id, cat_id, mes, ano, 100):
                send_to_user(
                    user_id,
                    title='Orçamento atingido: ' + cat_nome,
                    body='Você atingiu 100% do orçamento de ' + cat_nome + ' este mês.',
                    url='/planejamento',
                )
                notif_repo.mark_sent(user_id, cat_id, mes, ano, 100)

            elif pct >= 80 and not notif_repo.already_sent(user_id, cat_id, mes, ano, 80):
                send_to_user(
                    user_id,
                    title='Alerta de orçamento: ' + cat_nome,
                    body='Você usou ' + str(round(pct)) + '% do orçamento de ' + cat_nome + ' este mês.',
                    url='/planejamento',
                )
                notif_repo.mark_sent(user_id, cat_id, mes, ano, 80)
    except Exception as e:
        try:
            current_app.logger.error('check_and_notify_thresholds error: %s', e)
        except Exception:
            pass
