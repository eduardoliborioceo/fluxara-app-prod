import logging

from flask_login import login_required, current_user
from flask import Blueprint, request, jsonify
from app.auth.service import confirm_employee_extra
from app.services import config_service
from app.services import contas_service, cartoes_service

logger = logging.getLogger(__name__)

bp = Blueprint("api", __name__)


@bp.route("/config/tema", methods=["POST"])
@login_required
def config_tema():
    data = request.get_json() or {}
    tema = data.get("tema", "")
    try:
        config_service.save_tema(current_user.id, tema)
        return jsonify({"ok": True, "tema": tema})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/config/categorias", methods=["GET"])
@login_required
def config_categorias():
    from flask import current_app
    tipo = request.args.get("tipo", "")
    try:
        cats = config_service.get_categorias(current_user.id, tipo)
        return jsonify([dict(c) for c in cats])
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        current_app.logger.error("config_categorias error: %s", e)
        return jsonify({"error": str(e)}), 500


@bp.route("/config/categorias", methods=["POST"])
@login_required
def config_add_categoria():
    data = request.get_json() or {}
    try:
        cat = config_service.add_categoria(
            current_user.id,
            data.get("tipo", ""),
            data.get("nome", ""),
            data.get("icone", "bi-tag"),
            cor_fundo=data.get("cor_fundo"),
        )
        return jsonify(dict(cat))
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/config/categorias/<int:cat_id>", methods=["PUT"])
@login_required
def config_edit_categoria(cat_id):
    data = request.get_json() or {}
    try:
        config_service.edit_categoria(
            cat_id,
            current_user.id,
            data.get("nome", ""),
            data.get("icone", "bi-tag"),
            cor_fundo=data.get("cor_fundo"),
        )
        return jsonify({"ok": True})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/config/categorias/<int:cat_id>", methods=["DELETE"])
@login_required
def config_delete_categoria(cat_id):
    config_service.remove_categoria(cat_id, current_user.id)
    return jsonify({"ok": True})


@bp.route("/config/subcategorias", methods=["POST"])
@login_required
def config_add_subcategoria():
    data = request.get_json() or {}
    try:
        sub = config_service.add_subcategoria(
            int(data.get("categoria_id", 0)),
            current_user.id,
            data.get("nome", ""),
        )
        return jsonify(dict(sub))
    except (ValueError, TypeError) as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/config/subcategorias/<int:sub_id>", methods=["PUT"])
@login_required
def config_edit_subcategoria(sub_id):
    data = request.get_json() or {}
    try:
        config_service.edit_subcategoria(sub_id, current_user.id, data.get("nome", ""))
        return jsonify({"ok": True})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/config/subcategorias/<int:sub_id>", methods=["DELETE"])
@login_required
def config_delete_subcategoria(sub_id):
    config_service.remove_subcategoria(sub_id, current_user.id)
    return jsonify({"ok": True})


@bp.route("/push/vapid-key", methods=["GET"])
def push_vapid_key():
    from flask import current_app
    key = current_app.config.get("VAPID_PUBLIC_KEY") or ""
    return jsonify({"key": key})


@bp.route("/push/subscribe", methods=["POST"])
@login_required
def push_subscribe():
    from app.services.push_service import subscribe

    data = request.get_json() or {}
    endpoint = data.get("endpoint")
    keys = data.get("keys") or {}
    p256dh = keys.get("p256dh")
    auth = keys.get("auth")

    if not endpoint or not p256dh or not auth:
        return jsonify({"error": "Dados incompletos"}), 400

    subscribe(current_user.id, endpoint, p256dh, auth)
    return jsonify({"ok": True})


@bp.route("/push/unsubscribe", methods=["POST"])
@login_required
def push_unsubscribe():
    from app.services.push_service import unsubscribe

    data = request.get_json() or {}
    endpoint = data.get("endpoint")
    if endpoint:
        unsubscribe(endpoint)
    return jsonify({"ok": True})


@bp.route("/push/test", methods=["POST"])
@login_required
def push_test():
    from app.services.push_service import _send
    from app.repositories.push_repository import get_subscriptions_by_user

    subs = get_subscriptions_by_user(current_user.id)
    if not subs:
        return jsonify({"ok": False, "reason": "no_subscription"})

    errors = []
    for sub in subs:
        err = _send(sub, {"title": "Fluxara", "body": "Notificações funcionando!", "url": "/"})
        if err:
            errors.append(err)

    if errors:
        return jsonify({"ok": False, "errors": errors})

    return jsonify({"ok": True})


@bp.route("/push/status", methods=["GET"])
@login_required
def push_status():
    from flask import current_app
    from app.repositories.push_repository import get_subscriptions_by_user

    subs = get_subscriptions_by_user(current_user.id)
    vapid_configured = bool(current_app.config.get("VAPID_PRIVATE_KEY"))
    vapid_key = current_app.config.get("VAPID_PUBLIC_KEY") or ""

    return jsonify({
        "vapid_configured": vapid_configured,
        "vapid_public_key_length": len(vapid_key),
        "subscriptions_saved": len(subs),
        "endpoints": [s["endpoint"][:60] + "..." for s in subs],
    })


@bp.route("/push/debug", methods=["GET"])
@login_required
def push_debug():
    from flask import current_app
    from app.repositories.push_repository import get_all_subscriptions

    if not current_user.is_admin:
        return jsonify({"error": "Forbidden"}), 403

    pub = current_app.config.get("VAPID_PUBLIC_KEY") or ""
    priv = current_app.config.get("VAPID_PRIVATE_KEY") or ""
    sub_claim = current_app.config.get("VAPID_CLAIMS_SUB") or ""
    env = current_app.config.get("ENVIRONMENT", "unknown")

    all_subs = get_all_subscriptions()

    return jsonify({
        "environment": env,
        "vapid_public_key_present": bool(pub),
        "vapid_public_key_length": len(pub),
        "vapid_public_key_preview": pub[:20] + "..." if pub else None,
        "vapid_private_key_present": bool(priv),
        "vapid_private_key_length": len(priv),
        "vapid_claims_sub": sub_claim,
        "total_subscriptions": len(all_subs),
        "subscriptions": [
            {"endpoint_preview": s["endpoint"][:80] + "...", "p256dh_length": len(s["p256dh"]), "auth_length": len(s["auth"])}
            for s in all_subs
        ],
        "railway_vars_needed": [
            "VAPID_PUBLIC_KEY",
            "VAPID_PRIVATE_KEY",
            "VAPID_CLAIMS_SUB  (ex: mailto:seuemail@dominio.com)",
        ],
    })


@bp.route("/push/send-to-all", methods=["POST"])
@login_required
def push_send_to_all():
    from app.services.push_service import _send
    from app.repositories.push_repository import get_all_subscriptions

    if not current_user.is_admin:
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json() or {}
    title = (data.get("title") or "Fluxara").strip()[:80]
    body = (data.get("body") or "Teste de notificação").strip()[:200]
    url = (data.get("url") or "/").strip()

    subs = get_all_subscriptions()
    if not subs:
        return jsonify({"ok": False, "reason": "no_subscriptions", "total": 0})

    results = []
    for sub in subs:
        err = _send(sub, {"title": title, "body": body, "url": url})
        results.append({
            "endpoint": sub["endpoint"][:60] + "...",
            "ok": err is None,
            "error": err,
        })

    ok_count = sum(1 for r in results if r["ok"])
    return jsonify({
        "ok": ok_count > 0,
        "total": len(subs),
        "sent": ok_count,
        "failed": len(subs) - ok_count,
        "results": results,
    })


@bp.route("/push/clear-all", methods=["POST"])
@login_required
def push_clear_all():
    from app.extensions import get_db

    if not current_user.is_admin:
        return jsonify({"error": "Forbidden"}), 403

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) AS total FROM push_subscriptions")
            row = cur.fetchone()
            total = row["total"] if row else 0
            cur.execute("DELETE FROM push_subscriptions")
        conn.commit()

    return jsonify({"ok": True, "deleted": total})


@bp.route("/contas", methods=["GET"])
@login_required
def contas_list():
    try:
        mes = int(request.args.get("mes", 0) or 0)
        ano = int(request.args.get("ano", 0) or 0)
        if mes < 1 or mes > 12 or ano < 2000:
            mes = ano = 0
    except (ValueError, TypeError):
        mes = ano = 0
    return jsonify(contas_service.list_contas(current_user.id, mes, ano))


@bp.route("/contas", methods=["POST"])
@login_required
def contas_create():
    data = request.get_json() or {}
    try:
        conta = contas_service.add_conta(
            current_user.id,
            data.get("nome", ""),
            data.get("instituicao", "outro"),
            data.get("categoria_id"),
            data.get("saldo_inicial", 0),
        )
        return jsonify(conta), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/contas/<int:conta_id>", methods=["PUT"])
@login_required
def contas_update(conta_id):
    data = request.get_json() or {}
    try:
        contas_service.edit_conta(
            conta_id,
            current_user.id,
            data.get("nome", ""),
            data.get("instituicao", "outro"),
            data.get("categoria_id"),
            data.get("saldo_inicial", 0),
        )
        return jsonify({"ok": True})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/contas/<int:conta_id>", methods=["DELETE"])
@login_required
def contas_delete(conta_id):
    contas_service.remove_conta(conta_id, current_user.id)
    return jsonify({"ok": True})


@bp.route("/cartoes", methods=["GET"])
@login_required
def cartoes_list():
    try:
        mes = int(request.args.get("mes", 0) or 0)
        ano = int(request.args.get("ano", 0) or 0)
        if mes < 1 or mes > 12 or ano < 2000:
            mes = ano = 0
    except (ValueError, TypeError):
        mes = ano = 0
    return jsonify(cartoes_service.list_cartoes(current_user.id, mes, ano))


@bp.route("/cartoes", methods=["POST"])
@login_required
def cartoes_create():
    data = request.get_json() or {}
    try:
        cartao = cartoes_service.add_cartao(
            current_user.id,
            data.get("nome", ""),
            data.get("limite", 0),
            data.get("bandeira", "outro"),
            data.get("conta_id"),
            data.get("dia_fechamento", 1),
            data.get("dia_vencimento", 10),
            data.get("tipo", "credito"),
        )
        return jsonify(cartao), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/cartoes/<int:cartao_id>", methods=["PUT"])
@login_required
def cartoes_update(cartao_id):
    data = request.get_json() or {}
    try:
        cartoes_service.edit_cartao(
            cartao_id,
            current_user.id,
            data.get("nome", ""),
            data.get("limite", 0),
            data.get("bandeira", "outro"),
            data.get("conta_id"),
            data.get("dia_fechamento", 1),
            data.get("dia_vencimento", 10),
            data.get("tipo", "credito"),
        )
        return jsonify({"ok": True})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/cartoes/<int:cartao_id>", methods=["DELETE"])
@login_required
def cartoes_delete(cartao_id):
    cartoes_service.remove_cartao(cartao_id, current_user.id)
    return jsonify({"ok": True})


@bp.route("/cartoes/transferir-limite", methods=["POST"])
@login_required
def cartoes_transferir_limite():
    data = request.get_json() or {}
    try:
        cartoes_service.transferir_limite(
            int(data.get("cartao_origem_id")),
            int(data.get("cartao_destino_id")),
            current_user.id,
            data.get("valor", 0),
        )
        return jsonify({"ok": True})
    except (ValueError, TypeError) as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/contas/<int:conta_id>/lancamentos", methods=["GET"])
@login_required
def conta_lancamentos(conta_id):
    from app.services import lancamentos_service
    try:
        mes = int(request.args.get("mes", 0) or 0)
        ano = int(request.args.get("ano", 0) or 0)
    except (ValueError, TypeError):
        mes = ano = 0
    return jsonify(lancamentos_service.list_by_conta(conta_id, current_user.id, mes, ano))


@bp.route("/contas/<int:conta_id>/fatura-aberta", methods=["GET"])
@login_required
def conta_fatura_aberta(conta_id):
    from datetime import date
    try:
        mes = int(request.args.get("mes", 0) or 0)
        ano = int(request.args.get("ano", 0) or 0)
        if mes < 1 or mes > 12 or ano < 2000:
            raise ValueError()
    except (ValueError, TypeError):
        today = date.today()
        mes, ano = today.month, today.year
    return jsonify(cartoes_service.get_fatura_aberta_para_conta(conta_id, current_user.id, mes, ano))


@bp.route("/cartoes/<int:cartao_id>/lancamentos", methods=["GET"])
@login_required
def cartao_lancamentos(cartao_id):
    from app.services import lancamentos_service
    from datetime import date
    try:
        mes = int(request.args.get("mes", 0) or 0)
        ano = int(request.args.get("ano", 0) or 0)
        if mes < 1 or mes > 12 or ano < 2000:
            raise ValueError()
    except (ValueError, TypeError):
        today = date.today()
        mes, ano = today.month, today.year
    return jsonify(lancamentos_service.list_by_cartao(cartao_id, current_user.id, mes, ano))


@bp.route("/cartoes/<int:cartao_id>/gerar-fatura-lancamento", methods=["POST"])
@login_required
def cartao_gerar_fatura_lancamento(cartao_id):
    data = request.get_json() or {}
    try:
        mes = int(data.get("mes") or 0)
        ano = int(data.get("ano") or 0)
        valor = float(data.get("valor") or 0)
        data_pagamento = str(data.get("data_pagamento") or "")
        if not mes or not ano or not data_pagamento:
            raise ValueError("Campos obrigatórios ausentes")
        row = cartoes_service.gerar_lancamento_fatura(
            cartao_id, current_user.id, mes, ano, valor, data_pagamento
        )
        return jsonify(row), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        from flask import current_app
        current_app.logger.error("gerar_fatura_lancamento error: %s", e)
        return jsonify({"error": "Erro interno"}), 500


@bp.route("/resumo/projecao-saldo", methods=["GET"])
@login_required
def resumo_projecao_saldo():
    from app.services import lancamentos_service
    contas = contas_service.list_contas(current_user.id)
    saldo_total = sum(float(c.get('saldo_atual') or 0) for c in contas)
    eventos = lancamentos_service.get_future_events(current_user.id, dias=60)
    data = lancamentos_service.build_projecao(saldo_total, eventos)
    return jsonify(data)


@bp.route("/resumo/debitos-vencidos", methods=["GET"])
@login_required
def resumo_debitos_vencidos():
    from app.services import lancamentos_service
    try:
        items = lancamentos_service.get_debitos_vencidos(current_user.id)
        return jsonify(items)
    except Exception as exc:
        logger.exception("resumo_debitos_vencidos error: %s", exc)
        return jsonify({"error": "Erro interno"}), 500


@bp.route("/resumo/visao-geral", methods=["GET"])
@login_required
def resumo_visao_geral():
    from app.services import lancamentos_service
    try:
        mes = int(request.args.get("mes", 0))
        ano = int(request.args.get("ano", 0))
        if mes < 1 or mes > 12 or ano < 2000:
            raise ValueError()
    except (ValueError, TypeError):
        return jsonify({"error": "Parâmetros inválidos"}), 400
    data = lancamentos_service.get_resumo_mes(current_user.id, mes, ano)
    return jsonify(data)


@bp.route("/resumo/despesas-por-conta", methods=["GET"])
@login_required
def resumo_despesas_por_conta():
    from app.services import lancamentos_service
    try:
        mes = int(request.args.get("mes", 0))
        ano = int(request.args.get("ano", 0))
        if mes < 1 or mes > 12 or ano < 2000:
            raise ValueError()
    except (ValueError, TypeError):
        return jsonify({"error": "Parâmetros inválidos"}), 400
    data = lancamentos_service.get_despesas_por_conta(current_user.id, mes, ano)
    return jsonify(data)


@bp.route("/resumo/despesas-por-categoria", methods=["GET"])
@login_required
def resumo_despesas_por_categoria():
    from app.services import lancamentos_service
    try:
        mes = int(request.args.get("mes", 0))
        ano = int(request.args.get("ano", 0))
        if mes < 1 or mes > 12 or ano < 2000:
            raise ValueError()
    except (ValueError, TypeError):
        return jsonify({"error": "Parâmetros inválidos"}), 400
    data = lancamentos_service.get_despesas_por_categoria(current_user.id, mes, ano)
    return jsonify(data)


@bp.route("/resumo/debitos", methods=["GET"])
@login_required
def resumo_debitos():
    from app.services import lancamentos_service
    data = lancamentos_service.get_debitos_resumo(current_user.id)
    return jsonify(data)


@bp.route("/assistente/analise", methods=["GET"])
@login_required
def assistente_analise():
    periodo = request.args.get("periodo", "mes")
    if periodo not in ("semana", "mes", "ano"):
        periodo = "mes"
    try:
        from app.services import assistente_service
        analise = assistente_service.get_analise(current_user.id, periodo)
        return jsonify({"analise": analise, "periodo": periodo})
    except Exception as e:
        logger.error("Assistente Flux error: %s", e, exc_info=True)
        return jsonify({"error": "Não foi possível gerar a análise."}), 500


@bp.route("/assistente/planejamento", methods=["GET"])
@login_required
def assistente_planejamento():
    try:
        from app.services import assistente_service
        data = assistente_service.get_planejamento_quinzenal(current_user.id)
        return jsonify(data)
    except Exception as e:
        logger.error("Assistente planejamento error: %s", e, exc_info=True)
        return jsonify({"error": "Não foi possível gerar o planejamento."}), 500


@bp.route("/lancamentos", methods=["POST"])
@login_required
def api_add_lancamento():
    from app.services import lancamentos_service, orcamentos_service
    from datetime import date
    data = request.get_json() or {}
    try:
        lancamento = lancamentos_service.add_lancamento(current_user.id, data)
        today = date.today()
        orcamentos_service.check_and_notify_thresholds(current_user.id, today.month, today.year)
        return jsonify(lancamento), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/lancamentos/<int:lancamento_id>", methods=["GET"])
@login_required
def api_get_lancamento(lancamento_id):
    from app.services import lancamentos_service
    row = lancamentos_service.get_lancamento(lancamento_id, current_user.id)
    if not row:
        return jsonify({"error": "Não encontrado"}), 404
    return jsonify(row)


@bp.route("/lancamentos/<int:lancamento_id>", methods=["PUT"])
@login_required
def api_update_lancamento(lancamento_id):
    from app.services import lancamentos_service, orcamentos_service
    from datetime import date
    data = request.get_json() or {}
    try:
        row = lancamentos_service.edit_lancamento(lancamento_id, current_user.id, data)
        today = date.today()
        orcamentos_service.check_and_notify_thresholds(current_user.id, today.month, today.year)
        return jsonify(row)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/lancamentos/<int:lancamento_id>", methods=["DELETE"])
@login_required
def api_delete_lancamento(lancamento_id):
    from app.services import lancamentos_service
    escopo = request.args.get("escopo", "este")
    if escopo not in ("este", "futuros", "todos"):
        escopo = "este"
    lancamentos_service.remove_lancamento(lancamento_id, current_user.id, escopo)
    return jsonify({"ok": True})


@bp.route("/transferencias", methods=["POST"])
@login_required
def api_add_transferencia():
    from app.services import transferencias_service
    data = request.get_json() or {}
    try:
        transferencia = transferencias_service.add_transferencia(current_user.id, data)
        return jsonify(transferencia), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/transferencias/sugestoes", methods=["GET"])
@login_required
def api_sugestoes_transferencias():
    from app.services import transferencias_service
    q = request.args.get("q", "").strip()
    return jsonify(transferencias_service.get_sugestoes_descricao(current_user.id, q))


@bp.route("/transferencias/<int:transferencia_id>", methods=["DELETE"])
@login_required
def api_delete_transferencia(transferencia_id):
    from app.services import transferencias_service
    transferencias_service.remove_transferencia(transferencia_id, current_user.id)
    return jsonify({"ok": True})


@bp.route("/orcamentos", methods=["GET"])
@login_required
def api_list_orcamentos():
    from app.services import orcamentos_service
    try:
        mes = int(request.args.get("mes", 0))
        ano = int(request.args.get("ano", 0))
        if mes < 1 or mes > 12 or ano < 2000:
            raise ValueError()
    except (ValueError, TypeError):
        from datetime import date
        today = date.today()
        mes, ano = today.month, today.year
    return jsonify(orcamentos_service.list_orcamentos(current_user.id, mes, ano))


@bp.route("/orcamentos", methods=["POST"])
@login_required
def api_save_orcamento():
    from app.services import orcamentos_service
    data = request.get_json() or {}
    try:
        row = orcamentos_service.save_orcamento(
            current_user.id,
            data.get("categoria_id"),
            int(data.get("mes", 0)),
            int(data.get("ano", 0)),
            data.get("valor", 0),
        )
        return jsonify(row)
    except (ValueError, TypeError) as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/orcamentos/<int:orcamento_id>", methods=["DELETE"])
@login_required
def api_delete_orcamento(orcamento_id):
    from app.services import orcamentos_service
    orcamentos_service.remove_orcamento(orcamento_id, current_user.id)
    return jsonify({"ok": True})


@bp.route("/orcamentos/copiar-mes-anterior", methods=["POST"])
@login_required
def api_copy_orcamentos():
    from app.services import orcamentos_service
    from datetime import date
    data = request.get_json() or {}
    try:
        mes = int(data.get("mes", 0))
        ano = int(data.get("ano", 0))
        if mes < 1 or mes > 12 or ano < 2000:
            raise ValueError()
    except (ValueError, TypeError):
        today = date.today()
        mes, ano = today.month, today.year
    try:
        count = orcamentos_service.copy_from_previous_month(current_user.id, mes, ano)
        return jsonify({"ok": True, "copiados": count})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/lancamentos/sugestoes", methods=["GET"])
@login_required
def api_sugestoes_lancamentos():
    from app.services import lancamentos_service
    q = request.args.get("q", "").strip()
    tipo = request.args.get("tipo", "despesa")
    return jsonify(lancamentos_service.get_sugestoes_descricao(current_user.id, tipo, q))


@bp.route("/suporte/ouvidoria", methods=["GET"])
@login_required
def api_get_ouvidoria():
    from app.services import suporte_service
    return jsonify(suporte_service.get_tickets(current_user.id))


@bp.route("/suporte/ouvidoria", methods=["POST"])
@login_required
def api_send_ouvidoria():
    from app.services import suporte_service
    data = request.get_json() or {}
    try:
        row = suporte_service.send_ticket(
            current_user.id,
            data.get("tipo", ""),
            data.get("mensagem", ""),
        )
        return jsonify(row), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/suporte/chat", methods=["GET"])
@login_required
def api_get_chat():
    from app.services import suporte_service
    after_id = int(request.args.get("after_id", 0))
    return jsonify(suporte_service.get_chat(current_user.id, after_id))


@bp.route("/suporte/chat", methods=["POST"])
@login_required
def api_send_chat():
    from app.services import suporte_service
    data = request.get_json() or {}
    try:
        row = suporte_service.send_chat_message(current_user.id, data.get("mensagem", ""))
        return jsonify(row), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/suporte/admin/conversations", methods=["GET"])
@login_required
def api_admin_conversations():
    if not (current_user.is_admin or current_user.is_owner):
        return jsonify({"error": "Acesso negado"}), 403
    from app.services import suporte_service
    return jsonify(suporte_service.get_all_conversations())


@bp.route("/suporte/admin/chat/<int:user_id>", methods=["GET"])
@login_required
def api_admin_chat_get(user_id):
    if not (current_user.is_admin or current_user.is_owner):
        return jsonify({"error": "Acesso negado"}), 403
    from app.services import suporte_service
    return jsonify(suporte_service.get_chat_admin(user_id))


@bp.route("/suporte/admin/chat/<int:user_id>", methods=["POST"])
@login_required
def api_admin_chat_reply(user_id):
    if not (current_user.is_admin or current_user.is_owner):
        return jsonify({"error": "Acesso negado"}), 403
    from app.services import suporte_service
    data = request.get_json() or {}
    try:
        row = suporte_service.send_especialista_reply(user_id, data.get("mensagem", ""))
        return jsonify(row), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/suporte/admin/tickets", methods=["GET"])
@login_required
def api_admin_tickets():
    if not (current_user.is_admin or current_user.is_owner):
        return jsonify({"error": "Acesso negado"}), 403
    from app.services import suporte_service
    return jsonify(suporte_service.get_all_tickets())


@bp.route("/suporte/admin/tickets/<int:ticket_id>/status", methods=["PATCH"])
@login_required
def api_admin_ticket_status(ticket_id):
    if not (current_user.is_admin or current_user.is_owner):
        return jsonify({"error": "Acesso negado"}), 403
    from app.services import suporte_service
    data = request.get_json() or {}
    try:
        suporte_service.update_ticket_status(ticket_id, data.get("status", ""))
        return jsonify({"ok": True})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/suporte/admin/tickets/<int:ticket_id>/resposta", methods=["POST"])
@login_required
def api_admin_ticket_resposta(ticket_id):
    if not (current_user.is_admin or current_user.is_owner):
        return jsonify({"error": "Acesso negado"}), 403
    from app.services import suporte_service
    data = request.get_json() or {}
    try:
        suporte_service.respond_to_ticket(ticket_id, data.get("resposta", ""))
        return jsonify({"ok": True})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/auth/confirm-extra", methods=["POST"])
def api_confirm_extra():
    data = request.get_json() or {}

    matricula = data.get("matricula")
    password = data.get("password")

    if not matricula or not password:
        return jsonify({
            "success": False,
            "error": "Dados incompletos"
        }), 400

    result = confirm_employee_extra(matricula, password)
    return jsonify(result), (200 if result["success"] else 401)


# =============================================================
# MINHA SAÚDE
# =============================================================

@bp.route("/saude/perfil", methods=["GET"])
@login_required
def saude_get_perfil():
    from app.services import saude_service
    return jsonify(saude_service.get_perfil(current_user.id))


@bp.route("/saude/perfil", methods=["POST"])
@login_required
def saude_save_perfil():
    from app.services import saude_service
    data = request.get_json() or {}
    try:
        perfil = saude_service.save_perfil(
            current_user.id,
            data.get("altura_cm"),
            data.get("peso_atual_kg"),
            data.get("peso_meta_kg"),
        )
        return jsonify(perfil)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/saude/peso-historico", methods=["GET"])
@login_required
def saude_peso_historico():
    from app.services import saude_service
    return jsonify(saude_service.get_peso_historico(current_user.id))


@bp.route("/saude/acordei", methods=["POST"])
@login_required
def saude_acordei():
    from app.services import saude_service
    registro = saude_service.registrar_acordei(current_user.id)
    return jsonify(registro)


@bp.route("/saude/refeicao", methods=["POST"])
@login_required
def saude_add_refeicao():
    from app.services import saude_service
    data = request.get_json() or {}
    try:
        refeicao = saude_service.registrar_refeicao(
            current_user.id,
            data.get("tipo_refeicao", ""),
            data.get("descricao", ""),
            data.get("calorias"),
            data.get("proteinas_g"),
            data.get("carboidratos_g"),
            data.get("gorduras_g"),
            data.get("fonte", "manual"),
        )
        return jsonify(refeicao)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/saude/refeicao/<int:refeicao_id>", methods=["DELETE"])
@login_required
def saude_delete_refeicao(refeicao_id):
    from app.services import saude_service
    saude_service.delete_refeicao(current_user.id, refeicao_id)
    return jsonify({"ok": True})


@bp.route("/saude/agua", methods=["POST"])
@login_required
def saude_add_agua():
    from app.services import saude_service
    data = request.get_json() or {}
    tz = request.cookies.get('user_tz', 'America/Sao_Paulo')
    try:
        registro = saude_service.registrar_agua(
            current_user.id,
            int(data.get("quantidade_ml", 0)),
        )
        total_ml = saude_service.get_agua_hoje(current_user.id, timezone=tz)["total_ml"]
        return jsonify({"registro": registro, "total_ml": total_ml})
    except (ValueError, TypeError) as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/saude/agua/<int:registro_id>", methods=["DELETE"])
@login_required
def saude_delete_agua(registro_id):
    from app.services import saude_service
    tz = request.cookies.get('user_tz', 'America/Sao_Paulo')
    saude_service.delete_agua(current_user.id, registro_id)
    total_ml = saude_service.get_agua_hoje(current_user.id, timezone=tz)["total_ml"]
    return jsonify({"ok": True, "total_ml": total_ml})


@bp.route("/saude/analisar-embalagem", methods=["POST"])
@login_required
def saude_analisar_embalagem():
    from flask import current_app
    from app.services import saude_service

    if "foto" not in request.files:
        return jsonify({"error": "Foto não enviada"}), 400

    foto = request.files["foto"]
    allowed = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    mime_type = foto.mimetype or "image/jpeg"
    if mime_type not in allowed:
        return jsonify({"error": "Formato de imagem inválido"}), 400

    image_bytes = foto.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        return jsonify({"error": "Imagem muito grande (máx 10 MB)"}), 400

    try:
        resultado = saude_service.analisar_foto_embalagem(image_bytes, mime_type)
        return jsonify(resultado)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        current_app.logger.error("analisar_embalagem error: %s", e)
        return jsonify({"error": "Não foi possível analisar a imagem"}), 500


@bp.route("/saude/analisar-prato", methods=["POST"])
@login_required
def saude_analisar_prato():
    from flask import current_app
    from app.services import saude_service

    if "foto" not in request.files:
        return jsonify({"error": "Foto não enviada"}), 400

    foto = request.files["foto"]
    allowed = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    mime_type = foto.mimetype or "image/jpeg"
    if mime_type not in allowed:
        return jsonify({"error": "Formato de imagem inválido"}), 400

    image_bytes = foto.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        return jsonify({"error": "Imagem muito grande (máx 10 MB)"}), 400

    try:
        resultado = saude_service.analisar_foto_prato(image_bytes, mime_type)
        return jsonify(resultado)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        current_app.logger.error("analisar_prato error: %s", e)
        return jsonify({"error": "Não foi possível analisar a imagem"}), 500


@bp.route("/saude/produtos", methods=["GET"])
@login_required
def saude_search_produtos():
    from app.services import saude_service
    q = request.args.get("q", "").strip()
    if q:
        return jsonify(saude_service.search_produtos(current_user.id, q))
    return jsonify(saude_service.get_produtos(current_user.id))


@bp.route("/saude/produto", methods=["POST"])
@login_required
def saude_save_produto():
    from app.services import saude_service
    data = request.get_json() or {}
    try:
        produto = saude_service.save_produto_from_analise(current_user.id, data)
        return jsonify(produto)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/saude/produto/manual", methods=["POST"])
@login_required
def saude_save_produto_manual():
    from app.services import saude_service
    data = request.get_json() or {}
    try:
        produto = saude_service.save_produto_manual(
            current_user.id,
            nome=data.get("nome"),
            marca=data.get("marca"),
            porcao_descricao=data.get("porcao_descricao"),
            porcao_g=data.get("porcao_g"),
            calorias_por_porcao=data.get("calorias_por_porcao"),
            proteinas_g=data.get("proteinas_g"),
            carboidratos_g=data.get("carboidratos_g"),
            gorduras_g=data.get("gorduras_g"),
        )
        return jsonify(produto), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/saude/produto/<int:produto_id>", methods=["DELETE"])
@login_required
def saude_delete_produto(produto_id):
    from app.services import saude_service
    saude_service.delete_produto(current_user.id, produto_id)
    return jsonify({"ok": True})


@bp.route("/saude/produtos/padrao", methods=["POST"])
@login_required
def saude_seed_produtos_padrao():
    from app.services import saude_service
    inseridos = saude_service.seed_produtos_padrao(current_user.id)
    return jsonify({"inseridos": inseridos})


@bp.route("/saude/historico/dia", methods=["GET"])
@login_required
def saude_historico_dia():
    from app.services import saude_service
    data_str = request.args.get("data", "")
    tz = request.cookies.get('user_tz', 'America/Sao_Paulo')
    dados = saude_service.get_dados_por_data(current_user.id, data_str, tz)
    return jsonify(dados)


@bp.route("/saude/historico/calendario", methods=["GET"])
@login_required
def saude_historico_calendario():
    from app.services import saude_service
    from datetime import date
    today = date.today()
    try:
        ano = int(request.args.get("ano", today.year))
        mes = int(request.args.get("mes", today.month))
        if not (2020 <= ano <= 2035) or not (1 <= mes <= 12):
            ano, mes = today.year, today.month
    except (ValueError, TypeError):
        ano, mes = today.year, today.month
    tz = request.cookies.get('user_tz', 'America/Sao_Paulo')
    dados = saude_service.get_calendario_mes(current_user.id, ano, mes, tz)
    return jsonify(dados)


@bp.route("/saude/exercicio", methods=["POST"])
@login_required
def saude_add_exercicio():
    from app.services import saude_service
    data = request.get_json() or {}
    try:
        ex = saude_service.registrar_exercicio(
            current_user.id,
            data.get("tipo", "outro"),
            data.get("nome", ""),
            data.get("duracao_min"),
            data.get("calorias_gasto"),
            data.get("intensidade"),
            data.get("observacao"),
        )
        return jsonify(ex)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/saude/exercicio/<int:exercicio_id>", methods=["DELETE"])
@login_required
def saude_delete_exercicio(exercicio_id):
    from app.services import saude_service
    saude_service.delete_exercicio(current_user.id, exercicio_id)
    return jsonify({"ok": True})


# =============================================================
# SUREBET — ALAVANCAGEM
# =============================================================

@bp.route("/surebet/alavancagem", methods=["GET"])
@login_required
def surebet_list_alavancagem():
    from app.services import surebet_service
    return jsonify(surebet_service.list_alavancagens(current_user.id))


@bp.route("/surebet/alavancagem", methods=["POST"])
@login_required
def surebet_create_alavancagem():
    from app.services import surebet_service
    data = request.get_json() or {}
    try:
        alv = surebet_service.create_alavancagem(
            current_user.id,
            nome=data.get("nome"),
            aposta_inicial=data.get("aposta_inicial"),
            odd=data.get("odd"),
            num_rodadas=data.get("num_rodadas"),
        )
        return jsonify(alv), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/surebet/alavancagem/<int:alv_id>/rodada", methods=["PATCH"])
@login_required
def surebet_update_rodada(alv_id):
    from app.services import surebet_service
    data = request.get_json() or {}
    try:
        alv = surebet_service.update_rodada(
            alv_id, current_user.id, data.get("rodada_atual", 0)
        )
        return jsonify(alv)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/surebet/alavancagem/<int:alv_id>", methods=["DELETE"])
@login_required
def surebet_delete_alavancagem(alv_id):
    from app.services import surebet_service
    surebet_service.delete_alavancagem(alv_id, current_user.id)
    return jsonify({"ok": True})


# ============================================================
# TAGS
# ============================================================

@bp.route("/tags", methods=["GET"])
@login_required
def api_get_tags():
    from app.services import tags_service
    return jsonify(tags_service.get_tags(current_user.id))


@bp.route("/tags", methods=["POST"])
@login_required
def api_create_tag():
    from app.services import tags_service
    data = request.get_json() or {}
    try:
        tag = tags_service.create_tag(
            current_user.id,
            data.get("nome", ""),
            data.get("cor", "#6366f1"),
        )
        return jsonify(tag), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/tags/<int:tag_id>", methods=["DELETE"])
@login_required
def api_delete_tag(tag_id):
    from app.services import tags_service
    tags_service.delete_tag(tag_id, current_user.id)
    return jsonify({"ok": True})


@bp.route("/lancamentos/tags/batch", methods=["POST"])
@login_required
def api_get_lancamento_tags_batch():
    from app.services import tags_service
    from app.repositories import tags_repository
    data = request.get_json() or {}
    ids = [int(i) for i in (data.get("ids") or []) if str(i).isdigit()]
    if not ids:
        return jsonify({})
    result = {}
    for lid in ids:
        result[lid] = tags_service.get_lancamento_tags(lid)
    return jsonify(result)


@bp.route("/lancamentos/<int:lancamento_id>/tags", methods=["GET"])
@login_required
def api_get_lancamento_tags(lancamento_id):
    from app.services import tags_service, lancamentos_service
    row = lancamentos_service.get_lancamento(lancamento_id, current_user.id)
    if not row:
        return jsonify({"error": "Não encontrado"}), 404
    return jsonify(tags_service.get_lancamento_tags(lancamento_id))


@bp.route("/lancamentos/<int:lancamento_id>/tags", methods=["PUT"])
@login_required
def api_set_lancamento_tags(lancamento_id):
    from app.services import tags_service, lancamentos_service
    row = lancamentos_service.get_lancamento(lancamento_id, current_user.id)
    if not row:
        return jsonify({"error": "Não encontrado"}), 404
    data = request.get_json() or {}
    try:
        tag_ids = [int(i) for i in (data.get("tag_ids") or [])]
        tags_service.set_lancamento_tags(lancamento_id, current_user.id, tag_ids)
        escopo = data.get("escopo", "este")
        grupo_id = data.get("grupo_id")
        if escopo in ("futuros", "todos") and grupo_id:
            data_ref = row.get("data_vencimento")
            tags_service.set_group_lancamento_tags(grupo_id, current_user.id, tag_ids, escopo, data_ref)
        return jsonify({"ok": True})
    except Exception as e:
        logger.error("set_lancamento_tags error lancamento=%s: %s", lancamento_id, e)
        return jsonify({"error": str(e)}), 400


# =============================================================
# APOSTAS — ESPN (standings + fixtures)
# =============================================================

@bp.route("/apostas/espn/leagues", methods=["GET"])
@login_required
def apostas_espn_leagues():
    from app.services import apostas_espn_service
    return jsonify(apostas_espn_service.get_leagues())


@bp.route("/apostas/espn/standings/<league_slug>", methods=["GET"])
@login_required
def apostas_espn_standings(league_slug):
    from app.services import apostas_espn_service
    if league_slug not in apostas_espn_service.KNOWN_SLUGS:
        return jsonify({"error": "Campeonato não suportado"}), 400
    try:
        data = apostas_espn_service.get_standings(league_slug)
        return jsonify(data)
    except Exception as exc:
        logger.exception("apostas_espn_standings error league=%s: %s", league_slug, exc)
        return jsonify({"error": "Erro ao buscar tabela"}), 500


@bp.route("/apostas/espn/fixtures/<league_slug>", methods=["GET"])
@login_required
def apostas_espn_fixtures(league_slug):
    from app.services import apostas_espn_service
    if league_slug not in apostas_espn_service.KNOWN_SLUGS:
        return jsonify({"error": "Campeonato não suportado"}), 400
    try:
        days = int(request.args.get("days", 14))
        days = max(1, min(30, days))
        data = apostas_espn_service.get_upcoming_fixtures(league_slug, days)
        return jsonify(data)
    except Exception as exc:
        logger.exception("apostas_espn_fixtures error league=%s: %s", league_slug, exc)
        return jsonify({"error": "Erro ao buscar jogos"}), 500


# =============================================================
# APOSTAS — API-FOOTBALL (standings + fixtures)
# =============================================================

@bp.route("/apostas/apifootball/leagues", methods=["GET"])
@login_required
def apostas_apifootball_leagues():
    from app.services import apostas_apifootball_service
    return jsonify(apostas_apifootball_service.get_leagues())


@bp.route("/apostas/apifootball/standings/<int:league_id>", methods=["GET"])
@login_required
def apostas_apifootball_standings(league_id):
    from app.services import apostas_apifootball_service
    if league_id not in apostas_apifootball_service.KNOWN_IDS:
        return jsonify({"error": "Campeonato não suportado"}), 400
    try:
        data = apostas_apifootball_service.get_standings(league_id)
        return jsonify(data)
    except Exception as exc:
        logger.exception("apostas_apifootball_standings error league=%s: %s", league_id, exc)
        return jsonify({"error": "Erro ao buscar tabela"}), 500


@bp.route("/apostas/apifootball/fixtures/<int:league_id>", methods=["GET"])
@login_required
def apostas_apifootball_fixtures(league_id):
    from app.services import apostas_apifootball_service
    if league_id not in apostas_apifootball_service.KNOWN_IDS:
        return jsonify({"error": "Campeonato não suportado"}), 400
    try:
        days = int(request.args.get("days", 14))
        days = max(1, min(30, days))
        data = apostas_apifootball_service.get_upcoming_fixtures(league_id, days)
        return jsonify(data)
    except Exception as exc:
        logger.exception("apostas_apifootball_fixtures error league=%s: %s", league_id, exc)
        return jsonify({"error": "Erro ao buscar jogos"}), 500


@bp.route("/apostas/apifootball/usage", methods=["GET"])
@login_required
def apostas_apifootball_usage():
    from app.services import apostas_apifootball_service
    if not current_user.is_admin:
        return jsonify({"error": "Sem permissão"}), 403
    return jsonify(apostas_apifootball_service.get_daily_usage())


# =============================================================
# APOSTAS — TIPS (recomendações)
# =============================================================

@bp.route("/apostas/tips", methods=["GET"])
@login_required
def apostas_tips_list():
    from app.services import apostas_tips_service
    try:
        tips = apostas_tips_service.list_tips()
        stats = apostas_tips_service.get_stats()
        return jsonify({"tips": tips, "stats": stats})
    except Exception as exc:
        logger.exception("apostas_tips_list error: %s", exc)
        return jsonify({"error": "Erro ao carregar recomendações"}), 500


@bp.route("/apostas/tips", methods=["POST"])
@login_required
def apostas_tips_create():
    if not current_user.is_admin:
        return jsonify({"error": "Sem permissão"}), 403
    from app.services import apostas_tips_service
    data = request.get_json() or {}
    try:
        tip = apostas_tips_service.create_tip(
            titulo=data.get("titulo", ""),
            stake=data.get("stake", ""),
            link_aposta=data.get("link_aposta", ""),
            jogos=data.get("jogos") or [],
            user_id=current_user.id,
        )
        return jsonify(tip), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as exc:
        logger.exception("apostas_tips_create error: %s", exc)
        return jsonify({"error": "Erro ao criar recomendação"}), 500


@bp.route("/apostas/tips/<int:tip_id>/status", methods=["PATCH"])
@login_required
def apostas_tips_update_status(tip_id):
    if not current_user.is_admin:
        return jsonify({"error": "Sem permissão"}), 403
    from app.services import apostas_tips_service
    data = request.get_json() or {}
    try:
        tip = apostas_tips_service.update_status(tip_id, data.get("status", ""))
        return jsonify(tip)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as exc:
        logger.exception("apostas_tips_update_status error tip=%s: %s", tip_id, exc)
        return jsonify({"error": "Erro ao atualizar status"}), 500


@bp.route("/apostas/tips/<int:tip_id>", methods=["PATCH"])
@login_required
def apostas_tips_update(tip_id):
    if not current_user.is_admin:
        return jsonify({"error": "Sem permissão"}), 403
    from app.services import apostas_tips_service
    data = request.get_json() or {}
    try:
        tip = apostas_tips_service.update_tip(
            tip_id=tip_id,
            titulo=data.get("titulo", ""),
            stake=data.get("stake", ""),
            link_aposta=data.get("link_aposta", ""),
        )
        return jsonify(tip)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as exc:
        logger.exception("apostas_tips_update error tip=%s: %s", tip_id, exc)
        return jsonify({"error": "Erro ao editar recomendação"}), 500


@bp.route("/apostas/tips/<int:tip_id>", methods=["DELETE"])
@login_required
def apostas_tips_delete(tip_id):
    if not current_user.is_admin:
        return jsonify({"error": "Sem permissão"}), 403
    from app.services import apostas_tips_service
    try:
        apostas_tips_service.delete_tip(tip_id)
        return jsonify({"ok": True})
    except Exception as exc:
        logger.exception("apostas_tips_delete error tip=%s: %s", tip_id, exc)
        return jsonify({"error": "Erro ao excluir recomendação"}), 500


@bp.route("/apostas/auto-recommend", methods=["POST"])
@login_required
def apostas_auto_recommend():
    if not current_user.is_admin:
        return jsonify({"error": "Sem permissão"}), 403
    from app.services import apostas_auto_service
    config = request.get_json() or {}
    try:
        result = apostas_auto_service.auto_recommend(config, current_user.id)
        return jsonify(result), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as exc:
        logger.exception("apostas_auto_recommend error: %s", exc)
        return jsonify({"error": "Erro ao gerar recomendação automática"}), 500


@bp.route("/assinaturas/iniciar", methods=["POST"])
@login_required
def assinatura_iniciar():
    from app.services import assinaturas_service
    data = request.get_json() or {}
    try:
        assinatura = assinaturas_service.iniciar_assinatura(
            current_user.id,
            data.get("plano", "apostas"),
            data.get("metodo_pagamento", ""),
        )
        return jsonify(assinatura)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/assinaturas/<int:assinatura_id>/cancelar", methods=["POST"])
@login_required
def assinatura_cancelar(assinatura_id):
    from app.services import assinaturas_service
    try:
        assinatura = assinaturas_service.cancelar_assinatura(assinatura_id, current_user.id)
        return jsonify(assinatura)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/assinaturas/<int:assinatura_id>/ativar", methods=["POST"])
@login_required
def assinatura_ativar(assinatura_id):
    if not (current_user.is_admin or current_user.is_owner):
        return jsonify({"error": "Sem permissão"}), 403
    from app.services import assinaturas_service
    data = request.get_json() or {}
    try:
        assinatura = assinaturas_service.ativar_assinatura(
            assinatura_id,
            data.get("referencia", "manual"),
            int(data.get("meses", 1)),
        )
        return jsonify(assinatura)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/assinaturas/admin", methods=["GET"])
@login_required
def assinaturas_admin():
    if not (current_user.is_admin or current_user.is_owner):
        return jsonify({"error": "Sem permissão"}), 403
    from app.services import assinaturas_service
    return jsonify(assinaturas_service.get_dados_admin())


@bp.route("/assinaturas/pagar-cartao", methods=["POST"])
@login_required
def assinatura_pagar_cartao():
    from app.services import assinaturas_service, mercadopago_service
    data = request.get_json() or {}
    assinatura = None
    try:
        assinatura = assinaturas_service.iniciar_assinatura(
            current_user.id, "apostas", "cartao"
        )
        base_url = _mp_base_url(request)
        payer = data.get("payer") or {}
        payment = mercadopago_service.processar_pagamento(
            token=data.get("token", ""),
            transaction_amount=assinatura["valor_brl"],
            payment_method_id=data.get("payment_method_id", ""),
            issuer_id=data.get("issuer_id"),
            installments=data.get("installments", 1),
            payer_email=current_user.email,
            payer_identification=payer.get("identification", {}),
            external_reference=str(assinatura["id"]),
            base_url=base_url,
        )
        status = payment.get("status")
        payment_id = str(payment.get("id", ""))

        if status == "approved":
            assinaturas_service.ativar_assinatura(assinatura["id"], f"mp-{payment_id}", 1)
            return jsonify({"status": "approved"})

        if status == "in_process":
            return jsonify({"status": "in_process"})

        assinaturas_service.cancelar_assinatura(assinatura["id"], current_user.id)
        detail = payment.get("status_detail", "recusado")
        return jsonify({"error": f"Pagamento não aprovado ({detail}). Verifique os dados e tente novamente."}), 422

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as exc:
        logger.exception("assinatura_pagar_cartao error: %s", exc)
        if assinatura:
            try:
                assinaturas_service.cancelar_assinatura(assinatura["id"], current_user.id)
            except Exception:
                pass
        return jsonify({"error": "Erro ao processar pagamento. Tente novamente."}), 500


# Checkout Pro — rota mantida inativa (não chamada pelo frontend atual)
@bp.route("/assinaturas/checkout-mp", methods=["POST"])
@login_required
def assinatura_checkout_mp():
    import os
    from app.services import assinaturas_service, mercadopago_service
    try:
        assinatura = assinaturas_service.iniciar_assinatura(
            current_user.id, "apostas", "cartao"
        )
        base_url = _mp_base_url(request)
        checkout_url = mercadopago_service.criar_preferencia(
            assinatura_id=assinatura["id"],
            valor_brl=assinatura["valor_brl"],
            plano_nome="Apostas Premium",
            payer_email=current_user.email,
            base_url=base_url,
        )
        return jsonify({"checkout_url": checkout_url})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as exc:
        logger.exception("assinatura_checkout_mp error: %s", exc)
        return jsonify({"error": "Erro ao iniciar pagamento. Tente novamente."}), 500


@bp.route("/webhooks/mercadopago", methods=["POST"])
def webhook_mercadopago():
    from app.services import assinaturas_service, mercadopago_service
    try:
        data = request.get_json(silent=True) or {}

        payment_id = None
        if data.get("type") == "payment":
            payment_id = str(data.get("data", {}).get("id", ""))
        elif data.get("topic") == "payment":
            payment_id = str(data.get("id", ""))

        if not payment_id or payment_id == "None":
            return jsonify({"ok": True})

        payment = mercadopago_service.buscar_pagamento(payment_id)

        if payment.get("status") != "approved":
            return jsonify({"ok": True})

        external_ref = payment.get("external_reference", "")
        if not external_ref:
            return jsonify({"ok": True})

        assinatura_id = int(external_ref)
        assinaturas_service.ativar_assinatura(
            assinatura_id=assinatura_id,
            referencia=f"mp-{payment_id}",
            meses=1,
        )
        logger.info("assinatura %s ativada via MP pagamento %s", assinatura_id, payment_id)
        return jsonify({"ok": True})
    except Exception as exc:
        logger.exception("webhook_mercadopago error: %s", exc)
        return jsonify({"ok": True}), 200


@bp.route("/treino/hoje", methods=["GET"])
@login_required
def treino_hoje():
    from app.services import treino_service
    tz = request.cookies.get('user_tz', 'America/Sao_Paulo')
    data = treino_service.get_treino_hoje(current_user.id, tz)
    return jsonify(data)


@bp.route("/treino/item", methods=["POST"])
@login_required
def treino_add_item():
    from app.services import treino_service
    body = request.get_json() or {}
    try:
        item = treino_service.registrar_item(
            current_user.id,
            body.get('data', ''),
            body.get('grupo', ''),
            body.get('exercicio', ''),
            body.get('reps'),
            body.get('peso_kg'),
            body.get('duracao_seg'),
            body.get('observacao'),
        )
        return jsonify(item)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400


@bp.route("/treino/item/<int:item_id>", methods=["DELETE"])
@login_required
def treino_delete_item(item_id):
    from app.services import treino_service
    treino_service.delete_item(current_user.id, item_id)
    return jsonify({'ok': True})


@bp.route("/treino/historico", methods=["GET"])
@login_required
def treino_historico():
    from app.services import treino_service
    limit = min(int(request.args.get('limit', 30)), 90)
    data = treino_service.get_historico(current_user.id, limit)
    return jsonify(data)


@bp.route("/treino/dia", methods=["GET"])
@login_required
def treino_dia():
    from app.services import treino_service
    data_str = request.args.get('data', '')
    result = treino_service.get_treino_por_data(current_user.id, data_str)
    return jsonify(result)


def _mp_base_url(req) -> str:
    import os
    explicit = os.environ.get("APP_BASE_URL", "").rstrip("/")
    if explicit:
        return explicit
    railway = os.environ.get("RAILWAY_PUBLIC_DOMAIN", "")
    if railway:
        return f"https://{railway}"
    url = req.url_root.rstrip("/")
    if url.startswith("http://") and "localhost" not in url:
        url = "https://" + url[7:]
    return url
