from app.repositories import assinaturas_repository as repo

PLANOS = {
    'apostas': {
        'nome': 'Apostas Premium',
        'descricao': 'Acesso completo à área de apostas esportivas com análises, surebets e recomendações de IA.',
        'valor_usd': 2.00,
        'valor_brl': 11.40,
        'features': [
            'Painel de apostas esportivas',
            'Recomendações de IA (Apostas Tips)',
            'Calculadora de Surebet',
            'Histórico e análise de apostas',
            'Integração com odds em tempo real',
        ],
    }
}

METODOS_VALIDOS = {'pix', 'cartao'}


def get_assinatura_ativa(user_id: int, plano: str = 'apostas'):
    row = repo.get_assinatura_ativa(user_id, plano)
    return dict(row) if row else None


def get_historico(user_id: int) -> list:
    return [dict(r) for r in repo.get_historico_user(user_id)]


def iniciar_assinatura(user_id: int, plano: str, metodo_pagamento: str) -> dict:
    if plano not in PLANOS:
        raise ValueError('Plano inválido')
    if metodo_pagamento not in METODOS_VALIDOS:
        raise ValueError('Método de pagamento inválido')
    info = PLANOS[plano]
    row = repo.criar_assinatura(
        user_id, plano, metodo_pagamento,
        info['valor_usd'], info['valor_brl']
    )
    return dict(row)


def ativar_assinatura(assinatura_id: int, referencia: str, meses: int = 1) -> dict:
    row = repo.ativar_assinatura(assinatura_id, referencia, meses)
    if not row:
        raise ValueError('Assinatura não encontrada')
    return dict(row)


def cancelar_assinatura(assinatura_id: int, user_id: int) -> dict:
    row = repo.cancelar_assinatura(assinatura_id, user_id)
    if not row:
        raise ValueError('Assinatura não encontrada')
    return dict(row)


def get_dados_admin() -> dict:
    stats = repo.count_stats()
    todas = [dict(r) for r in repo.list_all_admin()]
    return {
        'stats': dict(stats) if stats else {},
        'assinaturas': todas,
    }


def get_assinatura_pendente(user_id: int, plano: str = 'apostas'):
    row = repo.get_assinatura_pendente(user_id, plano)
    return dict(row) if row else None


def get_dados_pagina(user_id: int) -> dict:
    assinatura_ativa = get_assinatura_ativa(user_id)
    assinatura_pendente = get_assinatura_pendente(user_id) if not assinatura_ativa else None
    historico = get_historico(user_id)
    return {
        'planos': PLANOS,
        'assinatura_ativa': assinatura_ativa,
        'assinatura_pendente': assinatura_pendente,
        'historico': historico,
    }
