import calendar
from datetime import date

from app.repositories.push_repository import (
    get_distinct_subscribed_users,
    is_push_sent,
    mark_push_sent,
)
from app.repositories.cartoes_repository import (
    get_cartoes_usage_for_user,
    get_fatura_total,
)
from app.repositories.push_prefs_repository import is_enabled
from app.services.push_service import send_to_user

_MESES_PT = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]


def _ref_mes(mes: int, ano: int) -> str:
    return f"{mes:02d}/{ano}"


def check_cartao_notifications(app):
    with app.app_context():
        try:
            _run_checks()
        except Exception as e:
            app.logger.error("cartao_notification_service error: %s", e)


def _run_checks():
    today = date.today()
    mes_atual = today.month
    ano_atual = today.year

    for user_id in get_distinct_subscribed_users():
        cartoes = get_cartoes_usage_for_user(user_id)
        for c in cartoes:
            _check_limit(user_id, c, mes_atual, ano_atual)
            _check_fatura_fechamento(user_id, c, today)


def _check_limit(user_id: int, cartao: dict, mes: int, ano: int):
    limite = float(cartao["limite"] or 0)
    if limite <= 0:
        return

    fatura = float(cartao["fatura_atual"] or 0)
    uso = fatura / limite
    ref = _ref_mes(mes, ano)
    cartao_id = cartao["id"]
    nome = cartao["nome"]

    if uso >= 1.0 and not is_push_sent(user_id, cartao_id, "100pct", ref):
        if is_enabled(user_id, "limite_cartao"):
            send_to_user(
                user_id,
                f"⚠️ Limite atingido — {nome}",
                f"Você usou 100% do limite do cartão {nome}. Disponível: R$ 0,00.",
                "/",
            )
        mark_push_sent(user_id, cartao_id, "100pct", ref)

    elif 0.8 <= uso < 1.0 and not is_push_sent(user_id, cartao_id, "80pct", ref):
        if is_enabled(user_id, "limite_cartao"):
            disponivel = limite - fatura
            send_to_user(
                user_id,
                f"💳 Limite 80% usado — {nome}",
                f"Você já usou {uso*100:.0f}% do limite do {nome}. Restam R$ {disponivel:,.2f}.",
                "/",
            )
        mark_push_sent(user_id, cartao_id, "80pct", ref)


def _check_fatura_fechamento(user_id: int, cartao: dict, today: date):
    dia_fechamento = int(cartao["dia_fechamento"] or 1)
    dia_vencimento = int(cartao["dia_vencimento"] or 10)
    cartao_id = cartao["id"]
    nome = cartao["nome"]

    if today.day == 1:
        prev_month = 12 if today.month == 1 else today.month - 1
        prev_year = today.year - 1 if today.month == 1 else today.year
        last_day = calendar.monthrange(prev_year, prev_month)[1]
        if dia_fechamento != last_day:
            return
        fatura_mes, fatura_ano = prev_month, prev_year
    elif today.day - 1 == dia_fechamento:
        fatura_mes = today.month
        fatura_ano = today.year
    else:
        return

    ref = _ref_mes(fatura_mes, fatura_ano)
    if is_push_sent(user_id, cartao_id, "fatura", ref):
        return

    total = get_fatura_total(cartao_id, user_id, fatura_mes, fatura_ano)

    next_month = fatura_mes + 1 if fatura_mes < 12 else 1
    next_year = fatura_ano if fatura_mes < 12 else fatura_ano + 1
    max_day = calendar.monthrange(next_year, next_month)[1]
    venc_day = min(dia_vencimento, max_day)
    venc_str = f"{venc_day:02d}/{next_month:02d}/{next_year}"

    mes_nome = _MESES_PT[fatura_mes - 1]

    if is_enabled(user_id, "faturas"):
        send_to_user(
            user_id,
            f"📄 Fatura {nome} — {mes_nome}/{fatura_ano}",
            f"Sua fatura fechou em R$ {total:,.2f}. Vencimento: {venc_str}.",
            "/",
        )
    mark_push_sent(user_id, cartao_id, "fatura", ref)


def init_notifications(app):
    from apscheduler.schedulers.background import BackgroundScheduler

    scheduler = BackgroundScheduler(timezone="UTC")
    scheduler.add_job(
        check_cartao_notifications,
        "cron",
        hour=8,
        minute=0,
        args=[app],
        id="cartao_notifications",
        replace_existing=True,
    )
    if not scheduler.running:
        scheduler.start()
