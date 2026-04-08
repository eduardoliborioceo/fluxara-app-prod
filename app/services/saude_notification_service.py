from app.repositories.push_repository import get_distinct_subscribed_users
from app.services.push_service import send_to_user

_REFEICOES_NOTIF = [
    ("cafe_manha",    "06:30",  6, 30, "Café da manhã",   "07:00 – 08:00"),
    ("lanche_manha",  "09:30",  9, 30, "Lanche da manhã", "10:00 – 10:30"),
    ("almoco",        "11:30", 11, 30, "Almoço",          "12:00 – 14:00"),
    ("lanche_tarde",  "15:30", 15, 30, "Lanche da tarde", "16:00 – 17:00"),
    ("janta",         "17:30", 17, 30, "Jantar",          "18:00 – 20:00"),
    ("ceia",          "20:30", 20, 30, "Ceia",            "21:00 – 22:00"),
]


def _acquire_scheduler_lock(lock_path: str) -> bool:
    import sys
    if sys.platform == "win32":
        return True
    try:
        import fcntl
        fd = open(lock_path, "w")
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        return True
    except (IOError, OSError):
        return False


def _notificar_refeicao(app, tipo: str, label: str, horario: str):
    with app.app_context():
        try:
            from app.repositories import saude_repository as repo
            from app.repositories.push_repository import is_saude_push_sent, mark_saude_push_sent
            from datetime import date

            hoje = str(date.today())
            for user_id in get_distinct_subscribed_users():
                if is_saude_push_sent(user_id, tipo, hoje):
                    continue
                registros = repo.get_refeicoes_hoje(user_id)
                ja_registrou = any(r["tipo_refeicao"] == tipo for r in registros)
                if not ja_registrou:
                    send_to_user(
                        user_id,
                        f"🍽️ Em 30 min: {label}",
                        f"Horário: {horario}. Prepare-se para a refeição!",
                        "/minha-saude",
                    )
                    mark_saude_push_sent(user_id, tipo, hoje)
        except Exception as e:
            app.logger.error("saude_notif refeicao=%s error: %s", tipo, e)


def _notificar_resumo_calorias(app):
    with app.app_context():
        try:
            from app.repositories import saude_repository as repo
            from app.repositories.push_repository import is_saude_push_sent, mark_saude_push_sent
            from app.services import saude_service
            from datetime import date

            hoje = str(date.today())
            tipo = "resumo_calorias"

            for user_id in get_distinct_subscribed_users():
                if is_saude_push_sent(user_id, tipo, hoje):
                    continue
                total_kcal = sum(
                    (r.get("calorias") or 0)
                    for r in repo.get_refeicoes_hoje(user_id)
                )
                perfil = saude_service.get_perfil(user_id)
                meta = perfil.get("meta_calorias")

                if meta:
                    pct = round(total_kcal / meta * 100)
                    if pct < 50:
                        status = "Atenção: consumo abaixo do esperado."
                    elif pct <= 110:
                        status = "Ótimo! Continue assim."
                    else:
                        status = f"Atenção: você já passou {pct - 100}% da meta."
                    body = f"{total_kcal} kcal de {meta} kcal ({pct}%). {status}"
                else:
                    body = f"Você consumiu {total_kcal} kcal hoje."

                send_to_user(
                    user_id,
                    "📊 Resumo calórico do dia",
                    body,
                    "/minha-saude",
                )
                mark_saude_push_sent(user_id, tipo, hoje)
        except Exception as e:
            app.logger.error("saude_notif resumo_calorias error: %s", e)


def init_saude_notifications(app):
    if not _acquire_scheduler_lock("/tmp/fluxara_saude_notif.lock"):
        return

    from apscheduler.schedulers.background import BackgroundScheduler

    tz = app.config.get("SCHEDULER_TIMEZONE", "America/Manaus")
    scheduler = BackgroundScheduler(timezone=tz)

    for tipo, _, hora, minuto, label, horario in _REFEICOES_NOTIF:
        scheduler.add_job(
            _notificar_refeicao,
            "cron",
            hour=hora,
            minute=minuto,
            args=[app, tipo, label, horario],
            id=f"saude_notif_{tipo}",
            replace_existing=True,
        )

    scheduler.add_job(
        _notificar_resumo_calorias,
        "cron",
        hour=18,
        minute=0,
        args=[app],
        id="saude_notif_resumo_calorias",
        replace_existing=True,
    )

    if not scheduler.running:
        scheduler.start()
