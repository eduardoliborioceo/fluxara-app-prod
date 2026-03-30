from flask import Blueprint, render_template, redirect, url_for, flash, request, jsonify
from flask_login import login_required, current_user
from app.services import dev_service

bp = Blueprint("dev", __name__, url_prefix="/dev")


@bp.route("/")
@login_required
def painel():
    projects = dev_service.list_projects(current_user.id)
    return render_template("dev/painel.html", projects=projects, active_menu="dev_painel")


@bp.route("/novo-projeto", methods=["GET"])
@login_required
def novo_projeto():
    cost_types = dev_service.list_cost_types(current_user.id)
    return render_template("dev/novo_projeto.html", projeto=None,
                           cost_types=cost_types, active_menu="dev_novo")


@bp.route("/novo-projeto", methods=["POST"])
@login_required
def criar_projeto():
    nome = request.form.get("nome", "")
    publico_alvo = request.form.get("publico_alvo", "")
    status = request.form.get("status", "ativo")
    quantidade_usuarios = request.form.get("quantidade_usuarios", "")
    data_inicio = request.form.get("data_inicio", "")
    custos = _parse_custos(request.form)
    try:
        dev_service.create_project(current_user.id, nome, publico_alvo, status,
                                   quantidade_usuarios, custos, data_inicio)
        flash("Projeto criado com sucesso.", "success")
        return redirect(url_for("dev.painel"))
    except ValueError as e:
        flash(str(e), "danger")
        return redirect(url_for("dev.novo_projeto"))


@bp.route("/projeto/<int:project_id>/editar", methods=["GET"])
@login_required
def editar_projeto(project_id):
    projeto = dev_service.get_project_detail(project_id, current_user.id)
    if not projeto:
        flash("Projeto não encontrado.", "danger")
        return redirect(url_for("dev.painel"))
    cost_types = dev_service.list_cost_types(current_user.id)
    return render_template("dev/novo_projeto.html", projeto=projeto,
                           cost_types=cost_types, active_menu="dev_novo")


@bp.route("/projeto/<int:project_id>/editar", methods=["POST"])
@login_required
def atualizar_projeto(project_id):
    nome = request.form.get("nome", "")
    publico_alvo = request.form.get("publico_alvo", "")
    status = request.form.get("status", "ativo")
    quantidade_usuarios = request.form.get("quantidade_usuarios", "")
    data_inicio = request.form.get("data_inicio", "")
    custos = _parse_custos(request.form)
    try:
        dev_service.update_project(project_id, current_user.id, nome, publico_alvo,
                                   status, quantidade_usuarios, custos, data_inicio)
        flash("Projeto atualizado com sucesso.", "success")
        return redirect(url_for("dev.painel"))
    except ValueError as e:
        flash(str(e), "danger")
        return redirect(url_for("dev.editar_projeto", project_id=project_id))


@bp.route("/projeto/<int:project_id>/excluir", methods=["POST"])
@login_required
def excluir_projeto(project_id):
    try:
        dev_service.delete_project(project_id, current_user.id)
    except ValueError:
        pass
    return redirect(url_for("dev.painel"))


@bp.route("/api/tipos", methods=["GET"])
@login_required
def api_list_tipos():
    return jsonify(dev_service.list_cost_types(current_user.id))


@bp.route("/api/tipos", methods=["POST"])
@login_required
def api_add_tipo():
    data = request.get_json(silent=True) or {}
    nome = data.get("nome", "")
    tipo = data.get("tipo", "outro")
    try:
        result = dev_service.add_cost_type(current_user.id, nome, tipo)
        return jsonify(result), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/api/tipos/<int:type_id>", methods=["DELETE"])
@login_required
def api_delete_tipo(type_id):
    dev_service.delete_cost_type(type_id, current_user.id)
    return jsonify({"ok": True})


def _parse_custos(form) -> list:
    nomes = form.getlist("custo_nome[]")
    tipos = form.getlist("custo_tipo[]")
    valores = form.getlist("custo_valor[]")
    recorrencias = form.getlist("custo_recorrencia[]")
    compartilhados = form.getlist("custo_compartilhado[]")
    servico_keys = form.getlist("custo_servico_key[]")
    custos = []
    for i, nome in enumerate(nomes):
        custos.append({
            "nome": nome,
            "tipo": tipos[i] if i < len(tipos) else "outro",
            "valor": valores[i] if i < len(valores) else "0",
            "recorrencia": recorrencias[i] if i < len(recorrencias) else "mensal",
            "compartilhado_entre": compartilhados[i] if i < len(compartilhados) else "1",
            "servico_key": servico_keys[i] if i < len(servico_keys) else "",
        })
    return custos
