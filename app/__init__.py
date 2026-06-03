import os
import decimal
import uuid
import dataclasses
from flask import Flask
from datetime import datetime, date
from werkzeug.middleware.proxy_fix import ProxyFix
from flask.json.provider import DefaultJSONProvider

from app.config import Config
from app.extensions import login_manager


class _ISODateJSONProvider(DefaultJSONProvider):
    @staticmethod
    def default(o):
        if isinstance(o, (date, datetime)):
            return o.isoformat()
        if isinstance(o, (decimal.Decimal, uuid.UUID)):
            return str(o)
        if dataclasses and dataclasses.is_dataclass(o):
            return dataclasses.asdict(o)
        raise TypeError(f"Object of type {type(o).__name__} is not JSON serializable")

from app.routes.pages import bp as pages_bp
from app.routes.api import bp as api_bp
from app.routes.admin import bp as admin_bp
from app.routes.dev import bp as dev_bp
from app.auth.routes import bp as auth_bp
from app.auth.models import User

_static_v = os.getenv("RAILWAY_DEPLOYMENT_ID") or os.getenv("RAILWAY_REVISION") or str(int(datetime.utcnow().timestamp()))


def create_app():
    app = Flask(__name__)
    app.json = _ISODateJSONProvider(app)
    app.config.from_object(Config)

    app.wsgi_app = ProxyFix(
        app.wsgi_app,
        x_for=1,
        x_proto=1,
        x_host=1,
        x_port=1,
        x_prefix=1
    )

    if not app.config.get("SECRET_KEY"):
        raise RuntimeError("SECRET_KEY não configurada")

    login_manager.init_app(app)
    login_manager.login_view = "auth.login"
    login_manager.login_message = None

    @login_manager.user_loader
    def load_user(user_id):
        return User.get(user_id)

    @app.context_processor
    def inject_globals():
        from flask_login import current_user
        from app.services.config_service import get_tema

        tema = "claro"
        if current_user and current_user.is_authenticated:
            try:
                tema = get_tema(current_user.id)
            except Exception:
                pass

        return {
            "now": datetime.utcnow,
            "ENVIRONMENT": app.config.get("ENVIRONMENT", "production"),
            "static_v": _static_v,
            "user_tema": tema,
        }

    app.register_blueprint(pages_bp)
    app.register_blueprint(api_bp, url_prefix="/api")
    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(admin_bp)
    app.register_blueprint(dev_bp)

    from flask import jsonify as _jsonify, request as _request

    def _notify_admin_error(e, status_code):
        try:
            admin_email = app.config.get("ADMIN_NOTIFY_EMAIL")
            if not admin_email:
                return
            from app.services.email_service import send_email
            send_email(
                admin_email,
                f"[Fluxara] Erro {status_code} detectado",
                f"Um erro {status_code} ocorreu.\n\nPath: {_request.path}\nMétodo: {_request.method}\nErro: {e}"
            )
        except Exception:
            pass

    @app.errorhandler(500)
    def internal_error(e):
        app.logger.error(f"500 error: {e}", exc_info=True)
        _notify_admin_error(e, 500)
        if _request.path.startswith("/api/"):
            return _jsonify({"error": "Erro interno do servidor"}), 500
        from flask import render_template as _rt
        try:
            return _rt("errors/500.html"), 500
        except Exception:
            return "<h1>500 — Erro interno</h1><p>Tente novamente em instantes.</p>", 500

    @app.errorhandler(404)
    def not_found(e):
        if _request.path.startswith("/api/"):
            return _jsonify({"error": "Recurso não encontrado"}), 404
        from flask import render_template as _rt
        try:
            return _rt("errors/404.html"), 404
        except Exception:
            return "<h1>404 — Página não encontrada</h1>", 404

    @app.errorhandler(403)
    def forbidden(e):
        if _request.path.startswith("/api/"):
            return _jsonify({"error": "Acesso negado"}), 403
        from flask import render_template as _rt
        try:
            return _rt("errors/403.html"), 403
        except Exception:
            return "<h1>403 — Acesso negado</h1>", 403

    from app.services import backup_service
    backup_service.init_scheduler(app)

    from app.services import cartao_notification_service
    cartao_notification_service.init_notifications(app)

    from app.services import debitos_notification_service
    debitos_notification_service.init_notifications(app)

    from app.services import saude_notification_service
    saude_notification_service.init_saude_notifications(app)

    return app
