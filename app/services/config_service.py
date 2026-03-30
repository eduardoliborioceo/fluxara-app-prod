from app.repositories import config_repository as repo

_DEFAULTS = {
    "despesa": [
        {"nome": "Alimentação",         "icone": "bi-bag",           "subs": ["Mercado/Supermercado", "Restaurante", "Delivery", "Padaria", "Lanchonete", "Bar/Bebidas"]},
        {"nome": "Moradia",             "icone": "bi-house",         "subs": ["Aluguel", "Condomínio", "IPTU", "Água", "Energia Elétrica", "Gás", "Internet"]},
        {"nome": "Transporte",          "icone": "bi-car-front",     "subs": ["Combustível", "Aplicativo (Uber/99)", "Transporte Público", "Estacionamento", "Manutenção", "IPVA", "Seguro Auto"]},
        {"nome": "Saúde",               "icone": "bi-heart-pulse",   "subs": ["Plano de Saúde", "Consulta Médica", "Farmácia", "Dentista", "Exames", "Academia"]},
        {"nome": "Educação",            "icone": "bi-book",          "subs": ["Mensalidade", "Curso/Faculdade", "Material Escolar", "Curso Online", "Idiomas"]},
        {"nome": "Lazer",               "icone": "bi-controller",    "subs": ["Cinema/Teatro", "Viagens", "Streaming", "Jogos", "Eventos/Shows", "Hobbies"]},
        {"nome": "Vestuário",           "icone": "bi-bag-heart",     "subs": ["Roupas", "Calçados", "Acessórios"]},
        {"nome": "Cuidados Pessoais",   "icone": "bi-person-hearts", "subs": ["Salão/Barbearia", "Cosméticos", "Perfumes", "Higiene"]},
        {"nome": "Pet",                 "icone": "bi-heart",         "subs": ["Ração", "Veterinário", "Banho/Tosa", "Acessórios Pet"]},
        {"nome": "Serviços Digitais",   "icone": "bi-phone",         "subs": ["Celular/Plano", "Apps e Softwares", "TV por Assinatura"]},
        {"nome": "Finanças",            "icone": "bi-credit-card",   "subs": ["Tarifas Bancárias", "Juros", "Parcelas", "IOF"]},
        {"nome": "Impostos",            "icone": "bi-file-text",     "subs": ["IPTU", "IPVA", "Imposto de Renda", "Outras Taxas"]},
        {"nome": "Presentes e Doações", "icone": "bi-gift",          "subs": ["Presentes", "Doações", "Dízimo"]},
        {"nome": "Outros",              "icone": "bi-three-dots",    "subs": ["Imprevistos", "Outros"]},
    ],
    "receita": [
        {"nome": "Salário",      "icone": "bi-briefcase",       "subs": ["Salário Mensal", "13º Salário", "Férias", "PLR/Bônus"]},
        {"nome": "Freelance",    "icone": "bi-laptop",          "subs": ["Projetos", "Consultorias", "Trabalho Extra"]},
        {"nome": "Investimentos","icone": "bi-graph-up-arrow",  "subs": ["Dividendos", "Juros/CDB", "Poupança", "Aluguel Recebido", "Venda de Ações"]},
        {"nome": "Benefícios",   "icone": "bi-gift",            "subs": ["Vale Alimentação", "Vale Refeição", "Auxílio Home Office"]},
        {"nome": "Vendas",       "icone": "bi-tag",             "subs": ["Venda de Produtos", "Marketplace", "Brechó/Usados"]},
        {"nome": "Outros",       "icone": "bi-plus-circle",     "subs": ["Prêmios", "Reembolso", "Outros"]},
    ],
    "conta": [
        {"nome": "Carteira",        "icone": "bi-wallet2",    "subs": ["Dinheiro em Espécie"]},
        {"nome": "Conta Corrente",  "icone": "bi-bank2",      "subs": ["Conta Digital", "Conta Tradicional"]},
        {"nome": "Poupança",        "icone": "bi-piggy-bank", "subs": ["Poupança"]},
        {"nome": "Investimento",    "icone": "bi-graph-up",   "subs": ["Renda Fixa", "Renda Variável", "Tesouro Direto", "Criptomoedas"]},
        {"nome": "Outros",          "icone": "bi-three-dots", "subs": ["Outros"]},
    ],
}


def seed_defaults(user_id: int):
    if repo.count_categorias(user_id) > 0:
        return

    for tipo, cats in _DEFAULTS.items():
        for ordem, cat in enumerate(cats):
            c = repo.create_categoria(user_id, tipo, cat["nome"], cat["icone"], ordem)
            for s_ordem, sub in enumerate(cat["subs"]):
                repo.create_subcategoria(c["id"], user_id, sub, s_ordem)


def get_tema(user_id: int) -> str:
    prefs = repo.get_preferences(user_id)
    return prefs["tema"] if prefs else "claro"


def save_tema(user_id: int, tema: str):
    if tema not in ("claro", "escuro"):
        raise ValueError("Tema inválido")
    repo.upsert_preferences(user_id, tema)


def get_categorias(user_id: int, tipo: str) -> list:
    if tipo not in ("despesa", "receita", "conta"):
        raise ValueError("Tipo inválido")
    seed_defaults(user_id)
    return repo.get_categorias(user_id, tipo)


def add_categoria(user_id: int, tipo: str, nome: str, icone: str) -> dict:
    nome = nome.strip()[:100]
    icone = icone.strip() or "bi-tag"
    if not nome:
        raise ValueError("Nome obrigatório")
    if tipo not in ("despesa", "receita", "conta"):
        raise ValueError("Tipo inválido")
    return repo.create_categoria(user_id, tipo, nome, icone)


def edit_categoria(categoria_id: int, user_id: int, nome: str, icone: str):
    nome = nome.strip()[:100]
    icone = icone.strip() or "bi-tag"
    if not nome:
        raise ValueError("Nome obrigatório")
    repo.update_categoria(categoria_id, user_id, nome, icone)


def remove_categoria(categoria_id: int, user_id: int):
    repo.delete_categoria(categoria_id, user_id)


def add_subcategoria(categoria_id: int, user_id: int, nome: str) -> dict:
    nome = nome.strip()[:100]
    if not nome:
        raise ValueError("Nome obrigatório")
    result = repo.create_subcategoria(categoria_id, user_id, nome)
    if not result:
        raise ValueError("Categoria não encontrada")
    return result


def edit_subcategoria(sub_id: int, user_id: int, nome: str):
    nome = nome.strip()[:100]
    if not nome:
        raise ValueError("Nome obrigatório")
    repo.update_subcategoria(sub_id, user_id, nome)


def remove_subcategoria(sub_id: int, user_id: int):
    repo.delete_subcategoria(sub_id, user_id)
