from datetime import date

from app.repositories.push_repository import (
    get_distinct_subscribed_users,
    is_lancamento_push_sent,
    mark_lancamento_push_sent,
)
from app.repositories.lancamentos_repository import (
    get_lancamentos_vencendo_em,
    get_debitos_vencidos,
)
from app.repositories.push_prefs_repository import is_enabled
from app.services.push_service import send_to_user


def _fmt_money(v: float) -> str:
    return f"R$ {v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _fmt_date(d) -> str:
    if hasattr(d, "strftime"):
        return d.strftime("%d/%m/%Y")
    return str(d)


def check_debitos_notifications(app):
    with app.app_context():
        try:
            _run_checks()
        except Exception as e:
            app.logger.error("debitos_notification_service error: %s", e)


def _run_checks():
    for user_id in get_distinct_subscribed_users():
        _check_vencendo_em(user_id, dias=1, tipo="vence_amanha")
        _check_vencendo_em(user_id, dias=3, tipo="vence_3dias")
        _check_vencidos(user_id)


def _check_vencendo_em(user_id: int, dias: int, tipo: str):
    lancamentos = get_lancamentos_vencendo_em(user_id, dias)
    for l in lancamentos:
        lid = l["id"]
        if is_lancamento_push_sent(user_id, lid, tipo):
            continue

        descricao = l["descricao"] or "Lançamento"
        valor = float(l["valor"] or 0)
        data_str = _fmt_date(l["data_vencimento"])

        if dias == 1:
            title = "📅 Vence amanhã"
            body = f"{descricao} — {_fmt_money(valor)}. Vencimento: {data_str}"
        else:
            title = f"📅 Vence em {dias} dias"
            body = f"{descricao} — {_fmt_money(valor)}. Vencimento: {data_str}"

        if is_enabled(user_id, "vencimentos"):
            send_to_user(user_id, title, body, "/")
        mark_lancamento_push_sent(user_id, lid, tipo)


def _check_vencidos(user_id: int):
    lancamentos = get_debitos_vencidos(user_id)
    for l in lancamentos:
        lid = l["id"]
        if is_lancamento_push_sent(user_id, lid, "vencido"):
            continue

        descricao = l["descricao"] or "Lançamento"
        valor = float(l["valor"] or 0)
        dias_atraso = int(l["dias_atraso"] or 1)
        sufixo = "dia" if dias_atraso == 1 else "dias"

        if is_enabled(user_id, "atrasos"):
            send_to_user(
                user_id,
                "⚠️ Pagamento em atraso",
                f"{descricao} — venceu há {dias_atraso} {sufixo}. {_fmt_money(valor)}",
                "/",
            )
        mark_lancamento_push_sent(user_id, lid, "vencido")


def init_notifications(app):
    from apscheduler.schedulers.background import BackgroundScheduler

    scheduler = BackgroundScheduler(timezone="UTC")
    scheduler.add_job(
        check_debitos_notifications,
        "cron",
        hour=7,
        minute=0,
        args=[app],
        id="debitos_notifications",
        replace_existing=True,
    )
    if not scheduler.running:
        scheduler.start()
