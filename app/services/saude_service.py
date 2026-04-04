import base64
import json
from datetime import datetime
from app.repositories import saude_repository as repo

REFEICOES = [
    ("cafe_manha",    "07:00", "08:00", "Café da manhã"),
    ("lanche_manha",  "10:00", "10:30", "Lanche da manhã"),
    ("almoco",        "12:00", "14:00", "Almoço"),
    ("lanche_tarde",  "16:00", "17:00", "Lanche da tarde"),
    ("janta",         "18:00", "20:00", "Jantar"),
    ("ceia",          "21:00", "22:00", "Ceia"),
]

_TIPOS_VALIDOS = {r[0] for r in REFEICOES}


def _calcular_imc(altura_cm, peso_kg):
    if not altura_cm or not peso_kg:
        return {"valor": None, "categoria": None, "cor": None}
    altura_m = float(altura_cm) / 100
    imc = float(peso_kg) / (altura_m ** 2)
    if imc < 18.5:
        categoria, cor = "Abaixo do peso", "warning"
    elif imc < 25:
        categoria, cor = "Peso normal", "success"
    elif imc < 30:
        categoria, cor = "Sobrepeso", "warning"
    elif imc < 35:
        categoria, cor = "Obesidade grau I", "danger"
    elif imc < 40:
        categoria, cor = "Obesidade grau II", "danger"
    else:
        categoria, cor = "Obesidade grau III", "danger"
    return {"valor": round(imc, 1), "categoria": categoria, "cor": cor}


def _meta_agua_ml(peso_kg) -> int:
    if not peso_kg:
        return 2000
    return max(1500, int(float(peso_kg) * 35))


def _calcular_meta_calorias(peso_atual_kg, peso_meta_kg, imc_valor) -> dict | None:
    if not peso_atual_kg:
        return None
    peso = float(peso_atual_kg)
    manutencao = int(peso * 30)

    if peso_meta_kg:
        meta = float(peso_meta_kg)
        if meta < peso - 0.5:
            alvo = max(1200, manutencao - 400)
            modo = "perda"
            semanas = round((peso - meta) / 0.5)
        elif meta > peso + 0.5:
            alvo = manutencao + 300
            modo = "ganho"
            semanas = round((meta - peso) / 0.3)
        else:
            alvo = manutencao
            modo = "manutencao"
            semanas = None
    elif imc_valor:
        imc = float(imc_valor)
        if imc >= 25:
            alvo = max(1200, manutencao - 400)
            modo = "perda"
            semanas = None
        elif imc < 18.5:
            alvo = manutencao + 300
            modo = "ganho"
            semanas = None
        else:
            alvo = manutencao
            modo = "manutencao"
            semanas = None
    else:
        return None

    return {
        "meta_kcal": alvo,
        "manutencao_kcal": manutencao,
        "modo": modo,
        "semanas_estimadas": semanas,
    }


def get_perfil(user_id: int) -> dict:
    row = repo.get_perfil(user_id)
    if not row:
        return {
            "altura_cm": None,
            "peso_atual_kg": None,
            "peso_meta_kg": None,
            "imc": {"valor": None, "categoria": None, "cor": None},
            "meta_agua_ml": 2000,
            "meta_calorias": None,
        }
    p = dict(row)
    imc = _calcular_imc(p.get("altura_cm"), p.get("peso_atual_kg"))
    p["imc"] = imc
    p["meta_agua_ml"] = _meta_agua_ml(p.get("peso_atual_kg"))
    calorie_meta = _calcular_meta_calorias(
        p.get("peso_atual_kg"), p.get("peso_meta_kg"), imc.get("valor")
    )
    p["meta_calorias"] = calorie_meta
    p["meta_kcal"] = calorie_meta["meta_kcal"] if calorie_meta else None
    return p


def save_perfil(user_id: int, altura_cm, peso_atual_kg, peso_meta_kg) -> dict:
    altura_cm = float(altura_cm) if altura_cm else None
    peso_atual_kg = float(peso_atual_kg) if peso_atual_kg else None
    peso_meta_kg = float(peso_meta_kg) if peso_meta_kg else None

    if altura_cm is not None and not (50 <= altura_cm <= 300):
        raise ValueError("Altura inválida (50–300 cm)")
    if peso_atual_kg is not None and not (20 <= peso_atual_kg <= 500):
        raise ValueError("Peso inválido (20–500 kg)")
    if peso_meta_kg is not None and not (20 <= peso_meta_kg <= 500):
        raise ValueError("Peso meta inválido (20–500 kg)")

    row = repo.upsert_perfil(user_id, altura_cm, peso_atual_kg, peso_meta_kg)
    if peso_atual_kg is not None:
        repo.registrar_peso(user_id, peso_atual_kg)
    p = dict(row)
    imc = _calcular_imc(p.get("altura_cm"), p.get("peso_atual_kg"))
    p["imc"] = imc
    p["meta_agua_ml"] = _meta_agua_ml(p.get("peso_atual_kg"))
    calorie_meta = _calcular_meta_calorias(
        p.get("peso_atual_kg"), p.get("peso_meta_kg"), imc.get("valor")
    )
    p["meta_calorias"] = calorie_meta
    p["meta_kcal"] = calorie_meta["meta_kcal"] if calorie_meta else None
    return p


def get_peso_historico(user_id: int) -> list:
    return [dict(r) for r in repo.get_peso_historico(user_id)]


def get_acordei_hoje(user_id: int):
    row = repo.get_acordei_hoje(user_id)
    return dict(row) if row else None


def registrar_acordei(user_id: int) -> dict:
    return dict(repo.registrar_acordei(user_id))


def get_refeicoes_hoje(user_id: int) -> list:
    return [dict(r) for r in repo.get_refeicoes_hoje(user_id)]


def registrar_refeicao(user_id: int, tipo_refeicao: str, descricao: str,
                       calorias, proteinas_g=None, carboidratos_g=None,
                       gorduras_g=None, fonte: str = "manual") -> dict:
    if tipo_refeicao not in _TIPOS_VALIDOS:
        raise ValueError("Tipo de refeição inválido")
    calorias = int(calorias) if calorias else 0
    proteinas_g = float(proteinas_g) if proteinas_g else None
    carboidratos_g = float(carboidratos_g) if carboidratos_g else None
    gorduras_g = float(gorduras_g) if gorduras_g else None
    return dict(repo.registrar_refeicao(
        user_id, tipo_refeicao, descricao.strip(), calorias,
        proteinas_g, carboidratos_g, gorduras_g, fonte
    ))


def delete_refeicao(user_id: int, refeicao_id: int):
    repo.delete_refeicao(user_id, refeicao_id)


def get_agua_hoje(user_id: int) -> dict:
    return {
        "total_ml": repo.get_agua_hoje_total(user_id),
        "registros": [dict(r) for r in repo.get_agua_registros_hoje(user_id)],
    }


def registrar_agua(user_id: int, quantidade_ml: int) -> dict:
    quantidade_ml = int(quantidade_ml)
    if not (50 <= quantidade_ml <= 5000):
        raise ValueError("Quantidade deve ser entre 50 ml e 5000 ml")
    return dict(repo.registrar_agua(user_id, quantidade_ml))


def delete_agua(user_id: int, registro_id: int):
    repo.delete_agua(user_id, registro_id)


def get_dados_hoje(user_id: int) -> dict:
    perfil = get_perfil(user_id)
    refeicoes_hoje = get_refeicoes_hoje(user_id)
    agua_hoje = get_agua_hoje(user_id)
    acordei = get_acordei_hoje(user_id)

    tipos_registrados = {r["tipo_refeicao"] for r in refeicoes_hoje}
    agora = datetime.now().time()

    schedule = []
    for tipo, inicio, fim, label in REFEICOES:
        h_ini = datetime.strptime(inicio, "%H:%M").time()
        h_fim = datetime.strptime(fim, "%H:%M").time()

        if tipo in tipos_registrados:
            status = "registrado"
        elif h_ini <= agora <= h_fim:
            status = "agora"
        elif agora < h_ini:
            status = "pendente"
        else:
            status = "passado"

        registros = [r for r in refeicoes_hoje if r["tipo_refeicao"] == tipo]
        calorias_total = sum((r.get("calorias") or 0) for r in registros)

        schedule.append({
            "tipo": tipo,
            "label": label,
            "inicio": inicio,
            "fim": fim,
            "status": status,
            "registros": registros,
            "calorias_total": calorias_total,
        })

    calorias_dia = sum((r.get("calorias") or 0) for r in refeicoes_hoje)

    return {
        "perfil": perfil,
        "schedule": schedule,
        "agua": agua_hoje,
        "acordei": acordei,
        "calorias_dia": calorias_dia,
    }


def analisar_foto_embalagem(image_bytes: bytes, mime_type: str = "image/jpeg") -> dict:
    from flask import current_app
    import anthropic

    api_key = current_app.config.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY não configurada")

    client = anthropic.Anthropic(api_key=api_key)
    image_b64 = base64.standard_b64encode(image_bytes).decode("utf-8")

    prompt = (
        "Analise a tabela nutricional desta embalagem de alimento. "
        "Retorne APENAS um JSON com esta estrutura, sem texto adicional:\n"
        '{"produto_nome":"nome","porcao_g":30,"calorias_por_porcao":120,'
        '"proteinas_g":2.5,"carboidratos_g":20.0,"gorduras_totais_g":3.0,'
        '"sodio_mg":150,"fibras_g":1.5}\n'
        "Se não conseguir identificar algum campo, use null."
    )

    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=512,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {"type": "base64", "media_type": mime_type, "data": image_b64},
                },
                {"type": "text", "text": prompt},
            ],
        }]
    )

    text = message.content[0].text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1])
    return json.loads(text)


def analisar_foto_prato(image_bytes: bytes, mime_type: str = "image/jpeg") -> dict:
    from flask import current_app
    import anthropic

    api_key = current_app.config.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY não configurada")

    client = anthropic.Anthropic(api_key=api_key)
    image_b64 = base64.standard_b64encode(image_bytes).decode("utf-8")

    prompt = (
        "Analise esta foto de refeição e estime as calorias. "
        "Retorne APENAS um JSON com esta estrutura, sem texto adicional:\n"
        '{"descricao":"resumo do prato",'
        '"itens":[{"nome":"arroz","quantidade_estimada":"4 col","calorias_estimadas":200}],'
        '"calorias_totais_estimadas":650,"proteinas_g_estimadas":35,'
        '"carboidratos_g_estimados":80,"gorduras_g_estimadas":15,'
        '"nivel_confianca":"medio"}\n'
        'nivel_confianca deve ser "alto", "medio" ou "baixo".'
    )

    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {"type": "base64", "media_type": mime_type, "data": image_b64},
                },
                {"type": "text", "text": prompt},
            ],
        }]
    )

    text = message.content[0].text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1])
    return json.loads(text)


# ── Produtos ─────────────────────────────────────────────────────────────────

def search_produtos(user_id: int, query: str) -> list:
    if not query or len(query.strip()) < 2:
        return []
    return [dict(r) for r in repo.search_produtos(user_id, query.strip())]


def get_produtos(user_id: int) -> list:
    return [dict(r) for r in repo.get_produtos(user_id)]


def save_produto_from_analise(user_id: int, analise: dict) -> dict:
    nome = (analise.get("produto_nome") or "").strip()
    if not nome:
        raise ValueError("Nome do produto não identificado")
    row = repo.save_produto(
        user_id,
        nome=nome,
        marca=None,
        porcao_g=analise.get("porcao_g"),
        calorias_por_porcao=analise.get("calorias_por_porcao"),
        proteinas_g=analise.get("proteinas_g"),
        carboidratos_g=analise.get("carboidratos_g"),
        gorduras_totais_g=analise.get("gorduras_totais_g"),
        sodio_mg=analise.get("sodio_mg"),
        fibras_g=analise.get("fibras_g"),
    )
    return dict(row)


def delete_produto(user_id: int, produto_id: int):
    repo.delete_produto(user_id, produto_id)
