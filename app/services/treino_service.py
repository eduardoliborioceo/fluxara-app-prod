import re
from datetime import date
from decimal import Decimal

from app.repositories import treino_repository as repo

_DATE_PATTERN = re.compile(r'^\d{4}-\d{2}-\d{2}$')
_TZ_PATTERN = re.compile(r'^[A-Za-z]+(/[A-Za-z_]+){0,2}$')

GRUPOS = ['Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps', 'Pernas', 'Core', 'Cardio', 'Outro']

EXERCICIOS_PADRAO = {
    'Peito': ['Supino plano', 'Supino inclinado', 'Supino declinado', 'Crucifixo', 'Flexão de braços', 'Pullover'],
    'Costas': ['Puxada frontal', 'Remada curvada', 'Remada cavalinho', 'Levantamento terra', 'Serrote', 'Hiperextensão'],
    'Ombros': ['Desenvolvimento', 'Elevação lateral', 'Elevação frontal', 'Encolhimento'],
    'Bíceps': ['Rosca direta', 'Rosca alternada', 'Rosca martelo', 'Rosca concentrada'],
    'Tríceps': ['Tríceps pulley', 'Tríceps testa', 'Mergulho', 'Tríceps corda'],
    'Pernas': ['Agachamento livre', 'Leg press', 'Afundo', 'Stiff', 'Cadeira extensora', 'Cadeira flexora', 'Panturrilha'],
    'Core': ['Abdominal', 'Prancha', 'Russian twist', 'Elevação de pernas', 'Crunch'],
    'Cardio': ['Corrida', 'Caminhada', 'Ciclismo', 'Elíptico', 'Pular corda', 'Natação'],
    'Outro': [],
}

_GRUPOS_VALIDOS = set(GRUPOS)

_DIAS_SEMANA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']


def _safe_tz(tz: str) -> str:
    if tz and _TZ_PATTERN.match(tz):
        return tz
    return 'America/Sao_Paulo'


def _safe_date(date_str: str) -> str:
    if date_str and _DATE_PATTERN.match(date_str):
        return date_str
    return date.today().isoformat()


def _row_to_dict(row: dict) -> dict:
    result = {}
    for k, v in row.items():
        if isinstance(v, Decimal):
            result[k] = float(v)
        elif isinstance(v, date):
            result[k] = v.isoformat()
        elif hasattr(v, 'isoformat'):
            result[k] = v.isoformat()
        else:
            result[k] = v
    return result


def _agrupar_por_exercicio(items: list) -> list:
    seen = {}
    order = []
    for item in items:
        chave = (item['exercicio'], item['grupo'])
        if chave not in seen:
            seen[chave] = {'nome': item['exercicio'], 'grupo': item['grupo'], 'series': []}
            order.append(chave)
        seen[chave]['series'].append(item)
    return [seen[k] for k in order]


def _calcular_stats(items: list) -> dict:
    exercicios = len({item['exercicio'] for item in items})
    series = len(items)
    volume = sum(
        float(item.get('peso_kg') or 0) * max(int(item.get('reps') or 1), 1)
        for item in items
    )
    return {
        'total_exercicios': exercicios,
        'total_series': series,
        'volume_total_kg': round(volume, 1),
    }


def get_treino_hoje(user_id: int, timezone: str) -> dict:
    tz = _safe_tz(timezone)
    items = [_row_to_dict(dict(r)) for r in repo.get_treino_hoje(user_id, tz)]
    return {
        'stats': _calcular_stats(items),
        'exercicios': _agrupar_por_exercicio(items),
    }


def get_treino_por_data(user_id: int, data_str: str) -> dict:
    data_str = _safe_date(data_str)
    items = [_row_to_dict(dict(r)) for r in repo.get_treino_por_data(user_id, data_str)]
    return {
        'data': data_str,
        'stats': _calcular_stats(items),
        'exercicios': _agrupar_por_exercicio(items),
    }


def get_historico(user_id: int, limit: int = 30) -> list:
    rows = repo.get_treino_historico(user_id, limit)
    result = []
    for row in rows:
        d = row['data']
        if isinstance(d, str):
            from datetime import datetime
            d = datetime.strptime(d, '%Y-%m-%d').date()
        dia_semana = _DIAS_SEMANA[d.weekday()]
        result.append({
            'data': d.isoformat(),
            'data_formatada': f'{dia_semana}, {d.strftime("%d/%m")}',
            'total_exercicios': int(row['total_exercicios']),
            'total_series': int(row['total_series']),
            'volume_total_kg': float(row['volume_total_kg']),
        })
    return result


def registrar_item(user_id: int, data_str: str, grupo: str, exercicio: str,
                   reps=None, peso_kg=None, duracao_seg=None, observacao=None) -> dict:
    if grupo not in _GRUPOS_VALIDOS:
        raise ValueError('Grupo muscular inválido')
    exercicio = exercicio.strip()[:100]
    if not exercicio:
        raise ValueError('Nome do exercício é obrigatório')
    data_str = _safe_date(data_str)
    reps = int(reps) if reps else None
    peso_kg = float(peso_kg) if peso_kg else None
    duracao_seg = int(duracao_seg) if duracao_seg else None
    observacao = observacao.strip()[:500] if observacao else None
    row = repo.registrar_treino_item(user_id, data_str, grupo, exercicio, reps, peso_kg, duracao_seg, observacao)
    return _row_to_dict(dict(row))


def delete_item(user_id: int, item_id: int):
    repo.delete_treino_item(user_id, item_id)
