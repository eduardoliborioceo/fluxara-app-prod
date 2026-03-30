from app.extensions import get_db


def already_sent(user_id: int, categoria_id: int, mes: int, ano: int, limiar: int) -> bool:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 1 FROM notificacoes_orcamento_enviadas
                WHERE user_id = %s AND categoria_id = %s AND mes = %s AND ano = %s AND limiar = %s
            """, (user_id, categoria_id, mes, ano, limiar))
            return cur.fetchone() is not None


def mark_sent(user_id: int, categoria_id: int, mes: int, ano: int, limiar: int) -> None:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO notificacoes_orcamento_enviadas (user_id, categoria_id, mes, ano, limiar)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING
            """, (user_id, categoria_id, mes, ano, limiar))
        conn.commit()
