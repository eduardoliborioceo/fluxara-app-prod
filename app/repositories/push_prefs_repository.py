from app.extensions import get_db
from psycopg.rows import dict_row

CATEGORIES = [
    "vencimentos",
    "atrasos",
    "faturas",
    "limite_cartao",
    "orcamentos",
    "saude_refeicoes",
    "saude_resumo",
]


def get_prefs(user_id: int) -> dict:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                "SELECT category, enabled FROM push_notification_prefs WHERE user_id = %s",
                (user_id,)
            )
            rows = cur.fetchall()
    prefs = {cat: True for cat in CATEGORIES}
    for row in rows:
        if row["category"] in prefs:
            prefs[row["category"]] = row["enabled"]
    return prefs


def set_pref(user_id: int, category: str, enabled: bool) -> None:
    if category not in CATEGORIES:
        raise ValueError(f"Unknown category: {category}")
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO push_notification_prefs (user_id, category, enabled)
                VALUES (%s, %s, %s)
                ON CONFLICT (user_id, category)
                DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = NOW()
                """,
                (user_id, category, enabled)
            )
        conn.commit()


def is_enabled(user_id: int, category: str) -> bool:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                "SELECT enabled FROM push_notification_prefs WHERE user_id = %s AND category = %s",
                (user_id, category)
            )
            row = cur.fetchone()
    return row["enabled"] if row else True
