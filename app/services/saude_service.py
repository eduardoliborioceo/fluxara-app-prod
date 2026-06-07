import base64
import json
import re
from datetime import datetime
from app.repositories import saude_repository as repo

_TZ_PATTERN  = re.compile(r'^[A-Za-z]+(/[A-Za-z_]+){0,2}$')
_DATE_PATTERN = re.compile(r'^\d{4}-\d{2}-\d{2}$')


def _safe_timezone(tz: str) -> str:
    if tz and _TZ_PATTERN.match(tz):
        return tz
    return 'America/Sao_Paulo'


def _safe_date(date_str: str) -> str:
    from datetime import date
    if date_str and _DATE_PATTERN.match(date_str):
        return date_str
    return date.today().isoformat()


REFEICOES = [
    ("cafe_manha",    "07:00", "08:00", "Café da manhã"),
    ("lanche_manha",  "10:00", "10:30", "Lanche da manhã"),
    ("almoco",        "12:00", "14:00", "Almoço"),
    ("lanche_tarde",  "16:00", "17:00", "Lanche da tarde"),
    ("janta",         "18:00", "20:00", "Jantar"),
    ("ceia",          "21:00", "22:00", "Ceia"),
]

_TIPOS_VALIDOS  = {r[0] for r in REFEICOES}
_LABEL_REFEICAO = {r[0]: r[3] for r in REFEICOES}

TIPOS_EXERCICIO = {
    'cardio':        'Cardio',
    'musculacao':    'Musculação',
    'flexibilidade': 'Flexibilidade',
    'esporte':       'Esporte',
    'outro':         'Outro',
}
_INTENSIDADES_VALIDAS = {'leve', 'moderado', 'intenso'}


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

    semanas = None
    dias_estimados = None

    if peso_meta_kg:
        meta = float(peso_meta_kg)
        if meta < peso - 0.5:
            alvo = max(1200, manutencao - 400)
            modo = "perda"
            semanas = round((peso - meta) / 0.5)
            dias_estimados = semanas * 7
        elif meta > peso + 0.5:
            alvo = manutencao + 300
            modo = "ganho"
            semanas = round((meta - peso) / 0.3)
            dias_estimados = semanas * 7
        else:
            alvo = manutencao
            modo = "manutencao"
    elif imc_valor:
        imc = float(imc_valor)
        if imc >= 25:
            alvo = max(1200, manutencao - 400)
            modo = "perda"
        elif imc < 18.5:
            alvo = manutencao + 300
            modo = "ganho"
        else:
            alvo = manutencao
            modo = "manutencao"
    else:
        return None

    return {
        "meta_kcal": alvo,
        "manutencao_kcal": manutencao,
        "modo": modo,
        "semanas_estimadas": semanas,
        "dias_estimados": dias_estimados,
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


def get_acordei_hoje(user_id: int, timezone: str = 'America/Sao_Paulo'):
    row = repo.get_acordei_hoje(user_id, _safe_timezone(timezone))
    return dict(row) if row else None


def registrar_acordei(user_id: int) -> dict:
    return dict(repo.registrar_acordei(user_id))


def get_refeicoes_hoje(user_id: int, timezone: str = 'America/Sao_Paulo') -> list:
    return [dict(r) for r in repo.get_refeicoes_hoje(user_id, _safe_timezone(timezone))]


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


def get_agua_hoje(user_id: int, timezone: str = 'America/Sao_Paulo') -> dict:
    tz = _safe_timezone(timezone)
    return {
        "total_ml": repo.get_agua_hoje_total(user_id, tz),
        "registros": [dict(r) for r in repo.get_agua_registros_hoje(user_id, tz)],
    }


def registrar_agua(user_id: int, quantidade_ml: int) -> dict:
    quantidade_ml = int(quantidade_ml)
    if not (50 <= quantidade_ml <= 5000):
        raise ValueError("Quantidade deve ser entre 50 ml e 5000 ml")
    return dict(repo.registrar_agua(user_id, quantidade_ml))


def delete_agua(user_id: int, registro_id: int):
    repo.delete_agua(user_id, registro_id)


def get_exercicios_hoje(user_id: int, timezone: str = 'America/Sao_Paulo') -> list:
    return [dict(r) for r in repo.get_exercicios_hoje(user_id, _safe_timezone(timezone))]


def registrar_exercicio(user_id: int, tipo: str, nome: str,
                        duracao_min=None, calorias_gasto=None,
                        intensidade=None, observacao=None) -> dict:
    if tipo not in TIPOS_EXERCICIO:
        raise ValueError("Tipo de exercício inválido")
    nome = nome.strip()[:100]
    if not nome:
        raise ValueError("Nome do exercício é obrigatório")
    duracao_min = int(duracao_min) if duracao_min else None
    calorias_gasto = int(calorias_gasto) if calorias_gasto else None
    intensidade = intensidade if intensidade in _INTENSIDADES_VALIDAS else None
    observacao = observacao.strip()[:500] if observacao else None
    return dict(repo.registrar_exercicio(user_id, tipo, nome, duracao_min, calorias_gasto, intensidade, observacao))


def delete_exercicio(user_id: int, exercicio_id: int):
    repo.delete_exercicio(user_id, exercicio_id)


def get_dados_hoje(user_id: int, timezone: str = 'America/Sao_Paulo') -> dict:
    tz = _safe_timezone(timezone)
    perfil = get_perfil(user_id)
    refeicoes_hoje = get_refeicoes_hoje(user_id, tz)
    agua_hoje = get_agua_hoje(user_id, tz)
    acordei = get_acordei_hoje(user_id, tz)
    exercicios = get_exercicios_hoje(user_id, tz)

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
    total_min_exercicio = sum((e.get("duracao_min") or 0) for e in exercicios)
    total_kcal_exercicio = sum((e.get("calorias_gasto") or 0) for e in exercicios)

    return {
        "perfil": perfil,
        "schedule": schedule,
        "agua": agua_hoje,
        "acordei": acordei,
        "calorias_dia": calorias_dia,
        "exercicios": exercicios,
        "total_min_exercicio": total_min_exercicio,
        "total_kcal_exercicio": total_kcal_exercicio,
    }


def get_dados_por_data(user_id: int, data_str: str, timezone: str = 'America/Sao_Paulo') -> dict:
    tz = _safe_timezone(timezone)
    data_str = _safe_date(data_str)

    refeicoes = [dict(r) for r in repo.get_refeicoes_por_data(user_id, data_str, tz)]
    agua_registros = [dict(r) for r in repo.get_agua_por_data(user_id, data_str, tz)]

    agua_total = sum(r.get('quantidade_ml', 0) for r in agua_registros)
    calorias_dia = sum((r.get('calorias') or 0) for r in refeicoes)
    proteinas = sum((float(r.get('proteinas_g') or 0)) for r in refeicoes)
    carboidratos = sum((float(r.get('carboidratos_g') or 0)) for r in refeicoes)
    gorduras = sum((float(r.get('gorduras_g') or 0)) for r in refeicoes)

    agrupadas: dict = {}
    for r in refeicoes:
        tipo = r['tipo_refeicao']
        if tipo not in agrupadas:
            agrupadas[tipo] = {
                'label': _LABEL_REFEICAO.get(tipo, tipo),
                'registros': [],
                'calorias_total': 0,
            }
        agrupadas[tipo]['registros'].append(r)
        agrupadas[tipo]['calorias_total'] += (r.get('calorias') or 0)

    return {
        'data': data_str,
        'refeicoes_agrupadas': list(agrupadas.values()),
        'agua': {
            'total_ml': agua_total,
            'registros': agua_registros,
        },
        'calorias_dia': calorias_dia,
        'macros': {
            'proteinas_g': round(proteinas, 1),
            'carboidratos_g': round(carboidratos, 1),
            'gorduras_g': round(gorduras, 1),
        },
    }


def get_calendario_mes(user_id: int, ano: int, mes: int, timezone: str = 'America/Sao_Paulo') -> dict:
    from datetime import date, timedelta
    tz = _safe_timezone(timezone)

    resumo = repo.get_resumo_mes(user_id, tz, ano, mes)
    lookup = {str(r['dia']): dict(r) for r in resumo}

    first_day = date(ano, mes, 1)
    last_day = date(ano + 1, 1, 1) - timedelta(days=1) if mes == 12 else date(ano, mes + 1, 1) - timedelta(days=1)
    today = date.today()

    dias = []
    current = first_day
    while current <= last_day:
        data_str = current.isoformat()
        info = lookup.get(data_str, {})
        dias.append({
            'data': data_str,
            'dia': current.day,
            'dia_semana': current.isoweekday(),
            'tem_refeicao': int(info.get('refeicoes_count', 0)) > 0,
            'calorias_total': int(info.get('calorias_total', 0)),
            'agua_total_ml': int(info.get('agua_total_ml', 0)),
            'is_today': current == today,
        })
        current += timedelta(days=1)

    return {'ano': ano, 'mes': mes, 'dias': dias}


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
        porcao_descricao=None,
        porcao_g=analise.get("porcao_g"),
        calorias_por_porcao=analise.get("calorias_por_porcao"),
        proteinas_g=analise.get("proteinas_g"),
        carboidratos_g=analise.get("carboidratos_g"),
        gorduras_totais_g=analise.get("gorduras_totais_g"),
        sodio_mg=analise.get("sodio_mg"),
        fibras_g=analise.get("fibras_g"),
    )
    return dict(row)


def save_produto_manual(user_id: int, nome: str, marca: str, porcao_descricao: str,
                        porcao_g, calorias_por_porcao,
                        proteinas_g=None, carboidratos_g=None, gorduras_g=None) -> dict:
    nome = (nome or "").strip()
    if not nome:
        raise ValueError("Nome obrigatório")
    if not calorias_por_porcao:
        raise ValueError("Calorias por porção obrigatórias")
    row = repo.save_produto(
        user_id,
        nome=nome,
        marca=(marca or "").strip() or None,
        porcao_descricao=(porcao_descricao or "").strip() or None,
        porcao_g=float(porcao_g) if porcao_g else None,
        calorias_por_porcao=int(calorias_por_porcao),
        proteinas_g=float(proteinas_g) if proteinas_g else None,
        carboidratos_g=float(carboidratos_g) if carboidratos_g else None,
        gorduras_totais_g=float(gorduras_g) if gorduras_g else None,
        sodio_mg=None,
        fibras_g=None,
    )
    return dict(row)


def delete_produto(user_id: int, produto_id: int):
    repo.delete_produto(user_id, produto_id)


_PRODUTOS_PADRAO = [
    # Cereais, pães e massas
    {"nome": "Arroz branco cozido",         "kcal": 128, "prot": 2.7,  "carb": 28.1, "gord": 0.2,  "fibras": 1.6, "sodio": 1.0},
    {"nome": "Arroz integral cozido",       "kcal": 124, "prot": 2.6,  "carb": 25.8, "gord": 1.0,  "fibras": 2.7, "sodio": 1.0},
    {"nome": "Macarrão cozido",             "kcal": 148, "prot": 5.6,  "carb": 28.2, "gord": 1.0,  "fibras": 1.6, "sodio": 1.0},
    {"nome": "Pão francês",                 "kcal": 289, "prot": 9.4,  "carb": 58.6, "gord": 1.3,  "fibras": 2.3, "sodio": 440.0},
    {"nome": "Farinha de mandioca",         "kcal": 354, "prot": 1.5,  "carb": 85.3, "gord": 0.5,  "fibras": 6.5, "sodio": 7.0},
    {"nome": "Farinha de trigo",            "kcal": 360, "prot": 9.8,  "carb": 76.2, "gord": 1.4,  "fibras": 2.3, "sodio": 2.0},
    {"nome": "Pão de forma integral",       "kcal": 253, "prot": 9.5,  "carb": 43.9, "gord": 4.6,  "fibras": 5.2, "sodio": 390.0},
    {"nome": "Aveia em flocos",             "kcal": 394, "prot": 13.9, "carb": 66.6, "gord": 8.5,  "fibras": 9.1, "sodio": 2.0},
    {"nome": "Granola",                     "kcal": 424, "prot": 9.4,  "carb": 63.7, "gord": 16.5, "fibras": 6.0, "sodio": 30.0},
    {"nome": "Tapioca (goma hidratada)",    "kcal": 348, "prot": 0.3,  "carb": 86.4, "gord": 0.0,  "fibras": 0.9, "sodio": None},
    # Tubérculos
    {"nome": "Batata cozida",               "kcal": 87,  "prot": 1.7,  "carb": 19.7, "gord": 0.1,  "fibras": 1.5, "sodio": 4.0},
    {"nome": "Batata doce cozida",          "kcal": 77,  "prot": 1.4,  "carb": 17.7, "gord": 0.1,  "fibras": 2.2, "sodio": 27.0},
    {"nome": "Mandioca cozida",             "kcal": 125, "prot": 0.8,  "carb": 30.1, "gord": 0.1,  "fibras": 1.9, "sodio": 13.0},
    # Carnes e ovos
    {"nome": "Frango grelhado (peito)",     "kcal": 159, "prot": 32.5, "carb": 0.0,  "gord": 3.2,  "fibras": 0.0, "sodio": 68.0},
    {"nome": "Frango cozido (coxa)",        "kcal": 200, "prot": 24.5, "carb": 0.0,  "gord": 11.0, "fibras": 0.0, "sodio": 75.0},
    {"nome": "Carne bovina (patinho)",      "kcal": 219, "prot": 31.1, "carb": 0.0,  "gord": 10.2, "fibras": 0.0, "sodio": 62.0},
    {"nome": "Carne bovina (acém)",         "kcal": 261, "prot": 26.5, "carb": 0.0,  "gord": 17.3, "fibras": 0.0, "sodio": 65.0},
    {"nome": "Ovo inteiro cozido",          "kcal": 146, "prot": 12.1, "carb": 0.6,  "gord": 10.0, "fibras": 0.0, "sodio": 139.0},
    {"nome": "Atum em conserva",            "kcal": 128, "prot": 27.0, "carb": 0.0,  "gord": 2.1,  "fibras": 0.0, "sodio": 324.0},
    {"nome": "Tilápia grelhada",            "kcal": 108, "prot": 22.5, "carb": 0.0,  "gord": 2.1,  "fibras": 0.0, "sodio": 52.0},
    # Leguminosas
    {"nome": "Feijão preto cozido",         "kcal": 77,  "prot": 4.5,  "carb": 14.0, "gord": 0.5,  "fibras": 8.4, "sodio": 2.0},
    {"nome": "Feijão carioca cozido",       "kcal": 76,  "prot": 4.8,  "carb": 13.6, "gord": 0.5,  "fibras": 8.5, "sodio": 2.0},
    {"nome": "Lentilha cozida",             "kcal": 93,  "prot": 6.9,  "carb": 16.3, "gord": 0.4,  "fibras": 3.7, "sodio": 2.0},
    {"nome": "Grão-de-bico cozido",         "kcal": 164, "prot": 8.9,  "carb": 27.4, "gord": 2.6,  "fibras": 7.6, "sodio": 7.0},
    # Laticínios
    {"nome": "Leite integral",              "kcal": 61,  "prot": 3.2,  "carb": 4.7,  "gord": 3.3,  "fibras": 0.0, "sodio": 49.0},
    {"nome": "Leite desnatado",             "kcal": 35,  "prot": 3.4,  "carb": 5.1,  "gord": 0.1,  "fibras": 0.0, "sodio": 52.0},
    {"nome": "Iogurte natural integral",    "kcal": 61,  "prot": 3.5,  "carb": 4.7,  "gord": 3.3,  "fibras": 0.0, "sodio": 49.0},
    {"nome": "Queijo mussarela",            "kcal": 300, "prot": 21.6, "carb": 3.3,  "gord": 22.4, "fibras": 0.0, "sodio": 397.0},
    {"nome": "Queijo cottage",              "kcal": 98,  "prot": 11.1, "carb": 3.4,  "gord": 4.5,  "fibras": 0.0, "sodio": 371.0},
    # Frutas
    {"nome": "Banana",                      "kcal": 89,  "prot": 1.1,  "carb": 22.8, "gord": 0.3,  "fibras": 2.6, "sodio": 1.0},
    {"nome": "Maçã",                        "kcal": 56,  "prot": 0.3,  "carb": 15.6, "gord": 0.1,  "fibras": 1.3, "sodio": None},
    {"nome": "Laranja",                     "kcal": 47,  "prot": 0.9,  "carb": 12.5, "gord": 0.1,  "fibras": 0.8, "sodio": None},
    {"nome": "Mamão",                       "kcal": 45,  "prot": 0.5,  "carb": 11.8, "gord": 0.1,  "fibras": 1.8, "sodio": None},
    {"nome": "Morango",                     "kcal": 32,  "prot": 0.7,  "carb": 7.7,  "gord": 0.3,  "fibras": 2.0, "sodio": 1.0},
    {"nome": "Abacate",                     "kcal": 160, "prot": 2.0,  "carb": 9.0,  "gord": 14.7, "fibras": 6.7, "sodio": 7.0},
    {"nome": "Manga",                       "kcal": 65,  "prot": 0.5,  "carb": 17.0, "gord": 0.3,  "fibras": 1.6, "sodio": None},
    # Verduras e legumes
    {"nome": "Brócolis cozido",             "kcal": 28,  "prot": 2.4,  "carb": 5.1,  "gord": 0.3,  "fibras": 3.3, "sodio": 7.0},
    {"nome": "Cenoura crua",                "kcal": 34,  "prot": 0.9,  "carb": 7.7,  "gord": 0.2,  "fibras": 3.2, "sodio": 83.0},
    {"nome": "Abobrinha cozida",            "kcal": 16,  "prot": 1.1,  "carb": 3.1,  "gord": 0.2,  "fibras": 1.6, "sodio": 1.0},
    {"nome": "Espinafre cozido",            "kcal": 22,  "prot": 2.5,  "carb": 3.7,  "gord": 0.3,  "fibras": 2.2, "sodio": 79.0},
    {"nome": "Tomate",                      "kcal": 20,  "prot": 0.9,  "carb": 3.9,  "gord": 0.2,  "fibras": 1.2, "sodio": 5.0},
    {"nome": "Chuchu cozido",               "kcal": 19,  "prot": 0.9,  "carb": 4.5,  "gord": 0.1,  "fibras": 1.8, "sodio": 1.0},
    # Gorduras e temperos
    {"nome": "Azeite de oliva",             "kcal": 884, "prot": 0.0,  "carb": 0.0,  "gord": 100.0,"fibras": 0.0, "sodio": None},
    {"nome": "Manteiga",                    "kcal": 741, "prot": 0.9,  "carb": 0.1,  "gord": 83.5, "fibras": 0.0, "sodio": 535.0},
    {"nome": "Mel",                         "kcal": 309, "prot": 0.3,  "carb": 84.0, "gord": 0.0,  "fibras": 0.2, "sodio": 4.0},
    # Bebidas
    {"nome": "Café preto",                  "kcal": 2,   "prot": 0.3,  "carb": 0.0,  "gord": 0.0,  "fibras": 0.0, "sodio": 2.0},
    {"nome": "Café com açúcar",             "kcal": 42,  "prot": 0.3,  "carb": 10.5, "gord": 0.0,  "fibras": 0.0, "sodio": 2.0},
    {"nome": "Suco de laranja natural",     "kcal": 45,  "prot": 0.7,  "carb": 10.7, "gord": 0.2,  "fibras": 0.2, "sodio": 1.0},
    # Suplementos e oleaginosas
    {"nome": "Whey protein (pó)",           "kcal": 370, "prot": 80.0, "carb": 5.0,  "gord": 5.0,  "fibras": 0.0, "sodio": 150.0},
    {"nome": "Pasta de amendoim",           "kcal": 589, "prot": 24.0, "carb": 20.0, "gord": 48.0, "fibras": 6.0, "sodio": 17.0},
    {"nome": "Amendoim torrado",            "kcal": 585, "prot": 26.0, "carb": 19.5, "gord": 46.1, "fibras": 8.5, "sodio": 4.0},
    {"nome": "Castanha-do-pará",            "kcal": 656, "prot": 14.3, "carb": 12.3, "gord": 63.5, "fibras": 7.9, "sodio": 3.0},
]


def seed_produtos_padrao(user_id: int) -> int:
    existing = {p['nome'].lower() for p in repo.get_produtos(user_id, limit=9999)}
    inseridos = 0
    for p in _PRODUTOS_PADRAO:
        if p['nome'].lower() not in existing:
            repo.save_produto(
                user_id,
                nome=p['nome'],
                marca=None,
                porcao_descricao='100g',
                porcao_g=100.0,
                calorias_por_porcao=p['kcal'],
                proteinas_g=p['prot'],
                carboidratos_g=p['carb'],
                gorduras_totais_g=p['gord'],
                fibras_g=p['fibras'],
                sodio_mg=p['sodio'],
            )
            inseridos += 1
    return inseridos
