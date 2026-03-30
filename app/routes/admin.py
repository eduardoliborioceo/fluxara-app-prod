import threading
from flask import Blueprint, render_template, request, jsonify, send_file, redirect, url_for, abort
from flask_login import login_required, current_user

from app.repositories import backup_repository as repo
from app.services import backup_service

bp = Blueprint('admin', __name__, url_prefix='/admin')


def _require_admin():
    if not (current_user.is_admin or current_user.is_owner):
        abort(403)


@bp.route('/backups')
@login_required
def backups():
    _require_admin()
    repo.ensure_tables()
    config = repo.get_config()
    logs = repo.list_logs(50)
    return render_template('admin/backups.html', config=config, logs=logs, active_menu='admin')


@bp.route('/backups/config', methods=['POST'])
@login_required
def save_config():
    _require_admin()
    db_url = request.form.get('db_url', '').strip()
    frequencia = request.form.get('frequencia', 'daily')
    hora = max(0, min(23, int(request.form.get('hora', 2) or 2)))
    minuto = max(0, min(59, int(request.form.get('minuto', 0) or 0)))
    retencao_dias = max(1, int(request.form.get('retencao_dias', 30) or 30))
    ativo = request.form.get('ativo') == '1'

    repo.save_config(db_url, frequencia, hora, minuto, retencao_dias, ativo)

    from flask import current_app
    backup_service.reschedule(current_app._get_current_object())

    return redirect(url_for('admin.backups'))


@bp.route('/backups/run', methods=['POST'])
@login_required
def run_backup():
    _require_admin()
    frequencia = request.form.get('frequencia', 'daily')
    if frequencia not in ('daily', 'weekly', 'monthly', 'bimonthly', 'yearly'):
        frequencia = 'daily'

    from flask import current_app
    app = current_app._get_current_object()

    def _run():
        with app.app_context():
            try:
                backup_service.run_backup(frequencia)
            except Exception:
                pass

    threading.Thread(target=_run, daemon=True).start()
    return jsonify({'ok': True})


@bp.route('/suporte')
@login_required
def suporte_admin():
    _require_admin()
    from app.services import suporte_service
    tickets = suporte_service.get_all_tickets()
    conversations = suporte_service.get_all_conversations()
    return render_template('admin/suporte.html', tickets=tickets, conversations=conversations, active_menu='admin')


@bp.route('/backups/<int:log_id>/download')
@login_required
def download_backup(log_id):
    _require_admin()
    log = repo.get_log(log_id)
    if not log or not log.get('arquivo'):
        abort(404)

    path = backup_service.get_backup_path(log['arquivo'])
    if path is None:
        abort(404)

    return send_file(path, as_attachment=True)
