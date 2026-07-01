from flask import Blueprint, render_template, redirect, url_for, request
from flask_login import login_required, current_user

bp = Blueprint("pages", __name__)


@bp.route("/")
@login_required
def resumo():
    from app.services import recorrencias_service
    try:
        recorrencias_service.processar_recorrencias(current_user.id)
    except Exception:
        pass
    return render_template("resumo.html", active_menu="resumo")


@bp.route("/contas")
@login_required
def contas():
    return render_template("contas.html", active_menu="contas")


@bp.route("/planejamento")
@login_required
def planejamento():
    return render_template("planejamento.html", active_menu="planejamento")


@bp.route("/configuracoes")
@login_required
def configuracoes():
    import os
    from datetime import datetime
    app_version = os.getenv("APP_VERSION", "1.0.0")
    current_year = datetime.now().year
    return render_template("configuracoes.html", active_menu="configuracoes", app_version=app_version, current_year=current_year)


@bp.route("/suporte")
@login_required
def suporte():
    return render_template("suporte.html", active_menu="suporte")


@bp.route("/mais")
@login_required
def mais():
    return render_template("mais.html", active_menu="mais")


@bp.route("/surebet")
@login_required
def surebet():
    return render_template("surebet.html", active_menu="surebet")


@bp.route("/apostas")
@login_required
def apostas():
    return render_template("apostas.html", active_menu="apostas")


@bp.route("/recorrencias")
@login_required
def recorrencias():
    return render_template("recorrencias.html", active_menu="recorrencias")


@bp.route("/calculadoras")
@login_required
def calculadoras():
    return render_template("calculadoras.html", active_menu="calculadoras")


@bp.route("/ferramentas/curriculo")
@login_required
def curriculo():
    return render_template("curriculo.html", active_menu="curriculo")


@bp.route("/minha-saude")
@login_required
def minha_saude():
    from app.services import saude_service
    tz = request.cookies.get('user_tz', 'America/Sao_Paulo')
    dados = saude_service.get_dados_hoje(current_user.id, timezone=tz)
    historico_peso = saude_service.get_peso_historico(current_user.id)
    return render_template(
        "minha_saude.html",
        active_menu="minha_saude",
        dados=dados,
        historico_peso=historico_peso,
    )


@bp.route("/treino")
@login_required
def treino():
    from app.services import treino_service
    from datetime import datetime
    from zoneinfo import ZoneInfo
    tz_str = request.cookies.get('user_tz', 'America/Sao_Paulo')
    try:
        data_hoje = datetime.now(ZoneInfo(tz_str)).strftime('%Y-%m-%d')
    except Exception:
        data_hoje = datetime.now().strftime('%Y-%m-%d')
    return render_template(
        "treino.html",
        active_menu="treino",
        grupos=treino_service.GRUPOS,
        exercicios_padrao=treino_service.EXERCICIOS_PADRAO,
        data_hoje=data_hoje,
    )


@bp.route("/nova-transferencia")
@login_required
def nova_transferencia():
    return render_template("nova_transferencia.html", active_menu="resumo")


@bp.route("/novo-lancamento")
@login_required
def novo_lancamento():
    tipo = request.args.get("tipo", "despesa")
    if tipo not in ("despesa", "receita", "despesa_cartao"):
        tipo = "despesa"
    return render_template("novo_lancamento.html", tipo=tipo, active_menu="resumo")


@bp.route("/conta/<int:conta_id>/extrato")
@login_required
def extrato_conta(conta_id):
    from app.services import contas_service
    contas = contas_service.list_contas(current_user.id)
    conta = next((c for c in contas if c["id"] == conta_id), None)
    if not conta:
        return redirect(url_for("pages.resumo"))
    return render_template("extrato_conta.html",
                           conta_id=conta_id,
                           conta_nome=conta["nome"],
                           conta_instituicao=conta.get("instituicao", "outro"),
                           active_menu="resumo")


@bp.route("/cartao/<int:cartao_id>/extrato")
@login_required
def extrato_cartao(cartao_id):
    from app.services import cartoes_service
    cartoes = cartoes_service.list_cartoes(current_user.id)
    cartao = next((c for c in cartoes if c["id"] == cartao_id), None)
    if not cartao:
        return redirect(url_for("pages.resumo"))
    return render_template("extrato_cartao.html",
                           cartao_id=cartao_id,
                           cartao_nome=cartao["nome"],
                           cartao_bandeira=cartao.get("bandeira", "outro"),
                           active_menu="resumo")


@bp.route("/privacy-policy")
def privacy_policy():
    return render_template("legal/privacy.html")


@bp.route("/cookie-policy")
def cookie_policy():
    return render_template("legal/cookies.html")


@bp.route("/debug/push")
@login_required
def push_debug_page():
    if not current_user.is_admin:
        return redirect(url_for("pages.resumo"))
    return render_template("debug/push.html", active_menu="")


@bp.route("/usuario/debug-push")
@login_required
def usuario_debug_push():
    return render_template("usuario/debug_push.html", active_menu="usuario")


@bp.route("/offline", endpoint="offline_page")
def offline():
    return render_template("offline.html")


@bp.route("/manifest.webmanifest", endpoint="pwa_manifest")
def manifest():
    from flask import current_app, send_from_directory, make_response
    import os

    static_dir = os.path.join(current_app.root_path, "static")
    resp = make_response(send_from_directory(static_dir, "manifest.webmanifest"))
    resp.headers["Content-Type"] = "application/manifest+json; charset=utf-8"
    resp.headers["Cache-Control"] = "public, max-age=3600"
    return resp


@bp.route("/sw.js", endpoint="service_worker")
def service_worker():
    from flask import current_app, send_from_directory, make_response
    import os

    static_dir = os.path.join(current_app.root_path, "static")
    resp = make_response(send_from_directory(static_dir, "sw.js"))
    resp.headers["Content-Type"] = "application/javascript"
    resp.headers["Service-Worker-Allowed"] = "/"
    resp.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    return resp
