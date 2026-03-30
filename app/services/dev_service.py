from app.repositories import dev_repository as repo

_VALID_STATUS = ('ativo', 'pausado', 'encerrado')
_VALID_TIPO = (
    'dominio', 'cdn', 'email', 'cloud', 'store',
    'monitoring', 'storage', 'ci_cd', 'api_service',
    'servidor', 'outro',
)
_VALID_RECORRENCIA = ('mensal', 'anual', 'unico')

_FASES_INFRA = [
    (0,     0,     'inicial', 'Sem usuários',       'bi-question-circle', 'muted'),
    (1,     1000,  'hobby',   'Railway Hobby',       'bi-rocket',          'success'),
    (1001,  10000, 'pro',     'Railway PRO',         'bi-arrow-up-circle', 'warning'),
    (10001, None,  'aws',     'Migrar para AWS',     'bi-cloud-arrow-up',  'danger'),
]


def list_projects(user_id: int) -> list:
    rows = repo.list_projects(user_id)
    result = []
    for r in rows:
        d = dict(r)
        d['despesa_mensal'] = float(d.get('despesa_mensal') or 0)
        d['projecao_anual'] = d['despesa_mensal'] * 12
        d['fase_infra'] = _get_fase_infra(d.get('quantidade_usuarios'))
        result.append(d)
    return result


def get_project_detail(project_id: int, user_id: int) -> dict | None:
    project = repo.get_project(project_id, user_id)
    if not project:
        return None
    d = dict(project)
    d['custos'] = [dict(c) for c in repo.get_costs(project_id)]
    return d


def create_project(user_id: int, nome: str, publico_alvo: str, status: str,
                   quantidade_usuarios, custos: list, data_inicio: str = '') -> dict:
    nome = nome.strip()[:200]
    if not nome:
        raise ValueError("Nome do projeto é obrigatório")
    publico_alvo = (publico_alvo or '').strip()[:200]
    status = status if status in _VALID_STATUS else 'ativo'
    qtd = _parse_int(quantidade_usuarios)
    data_inicio = _parse_date(data_inicio)
    project = repo.create_project(user_id, nome, publico_alvo, status, qtd, data_inicio)
    for c in custos:
        _save_cost(project['id'], c)
    return dict(project)


def update_project(project_id: int, user_id: int, nome: str, publico_alvo: str,
                   status: str, quantidade_usuarios, custos: list, data_inicio: str = ''):
    if not repo.get_project(project_id, user_id):
        raise ValueError("Projeto não encontrado")
    nome = nome.strip()[:200]
    if not nome:
        raise ValueError("Nome do projeto é obrigatório")
    publico_alvo = (publico_alvo or '').strip()[:200]
    status = status if status in _VALID_STATUS else 'ativo'
    qtd = _parse_int(quantidade_usuarios)
    data_inicio = _parse_date(data_inicio)
    repo.update_project(project_id, user_id, nome, publico_alvo, status, qtd, data_inicio)
    repo.delete_costs(project_id)
    for c in custos:
        _save_cost(project_id, c)


def delete_project(project_id: int, user_id: int):
    if not repo.get_project(project_id, user_id):
        raise ValueError("Projeto não encontrado")
    repo.delete_project(project_id, user_id)


def list_cost_types(user_id: int) -> list:
    return [dict(r) for r in repo.list_cost_types(user_id)]


def add_cost_type(user_id: int, nome: str, tipo: str) -> dict:
    nome = (nome or '').strip()[:100]
    if not nome:
        raise ValueError("Nome do tipo é obrigatório")
    tipo = tipo if tipo in _VALID_TIPO else 'outro'
    return dict(repo.add_cost_type(user_id, nome, tipo))


def delete_cost_type(type_id: int, user_id: int):
    repo.delete_cost_type(type_id, user_id)


def _get_fase_infra(qtd) -> dict:
    if not qtd:
        qtd = 0
    for minv, maxv, fase, label, icon, cor in _FASES_INFRA:
        if maxv is None or qtd <= maxv:
            if qtd >= minv:
                return {'fase': fase, 'label': label, 'icon': icon, 'cor': cor}
    last = _FASES_INFRA[-1]
    return {'fase': last[2], 'label': last[3], 'icon': last[4], 'cor': last[5]}


def _parse_date(value) -> str | None:
    from datetime import datetime
    try:
        return datetime.strptime(str(value or '').strip(), '%Y-%m-%d').date().isoformat()
    except (ValueError, TypeError):
        return None


def _parse_int(value) -> int | None:
    try:
        v = int(str(value or '').replace(',', '.').split('.')[0])
        return v if v > 0 else None
    except (ValueError, TypeError):
        return None


def _save_cost(project_id: int, c: dict):
    nome = (c.get('nome') or '').strip()[:200]
    if not nome:
        return
    tipo = c.get('tipo', 'outro')
    if tipo not in _VALID_TIPO:
        tipo = 'outro'
    try:
        valor = float(str(c.get('valor') or '0').replace(',', '.'))
        valor = max(0.0, valor)
    except (ValueError, TypeError):
        valor = 0.0
    recorrencia = c.get('recorrencia', 'mensal')
    if recorrencia not in _VALID_RECORRENCIA:
        recorrencia = 'mensal'
    try:
        compartilhado = max(1, int(c.get('compartilhado_entre') or 1))
    except (ValueError, TypeError):
        compartilhado = 1
    servico_key = (c.get('servico_key') or '').strip()[:150] or None
    repo.add_cost(project_id, nome, tipo, valor, recorrencia, compartilhado, servico_key)
