from app.repositories import surebet_repository as repo


def list_alavancagens(user_id: int) -> list:
    return [dict(r) for r in repo.list_alavancagens(user_id)]


def create_alavancagem(user_id: int, nome: str, aposta_inicial,
                       odd, num_rodadas) -> dict:
    aposta_inicial = float(aposta_inicial)
    odd = float(odd)
    num_rodadas = int(num_rodadas)
    if aposta_inicial <= 0:
        raise ValueError("Aposta inicial inválida")
    if odd <= 1:
        raise ValueError("Odd deve ser maior que 1")
    if not (2 <= num_rodadas <= 10):
        raise ValueError("Número de rodadas deve ser entre 2 e 10")
    nome = (nome or "").strip() or "Alavancagem"
    return dict(repo.create_alavancagem(user_id, nome, aposta_inicial, odd, num_rodadas))


def update_rodada(alavancagem_id: int, user_id: int, rodada_atual: int) -> dict:
    rodada_atual = int(rodada_atual)
    if rodada_atual < 0:
        raise ValueError("Rodada inválida")
    row = repo.update_rodada(alavancagem_id, user_id, rodada_atual)
    if not row:
        raise ValueError("Alavancagem não encontrada")
    return dict(row)


def delete_alavancagem(alavancagem_id: int, user_id: int):
    repo.delete_alavancagem(alavancagem_id, user_id)


# ─── Partidas monitoradas ────────────────────────────────────────────────────

def _surebet_status(odd_mandante: float, odd_visitante: float,
                    odd_empate_gols: float, total_apostar: float) -> dict:
    inv_sum = 1 / odd_mandante + 1 / odd_visitante + 1 / odd_empate_gols
    retorno = total_apostar / inv_sum
    lucro = retorno - total_apostar
    margem = (1 - inv_sum) * 100
    is_surebet = inv_sum < 1
    stakes = [
        {"label": "Mandante", "odd": odd_mandante,
         "stake": total_apostar * (1 / odd_mandante) / inv_sum},
        {"label": "Visitante", "odd": odd_visitante,
         "stake": total_apostar * (1 / odd_visitante) / inv_sum},
        {"label": "Empate c/ gols", "odd": odd_empate_gols,
         "stake": total_apostar * (1 / odd_empate_gols) / inv_sum},
    ]
    return {
        "is_surebet": is_surebet,
        "inv_sum": round(inv_sum, 6),
        "retorno": round(retorno, 2),
        "lucro": round(lucro, 2),
        "margem": round(margem, 4),
        "stakes": [
            {**s, "stake": round(s["stake"], 2), "odd": round(s["odd"], 2)}
            for s in stakes
        ],
    }


def list_partidas(user_id: int) -> list:
    rows = repo.list_partidas(user_id)
    result = []
    for r in rows:
        item = dict(r)
        item["status"] = _surebet_status(
            float(r["odd_mandante"]),
            float(r["odd_visitante"]),
            float(r["odd_empate_gols"]),
            float(r["total_apostar"]),
        )
        result.append(item)
    return result


def create_partida(user_id: int, nome: str, odd_mandante, odd_visitante,
                   odd_empate_gols, total_apostar) -> dict:
    nome = (nome or "").strip() or "Partida"
    odd_mandante = float(odd_mandante)
    odd_visitante = float(odd_visitante)
    odd_empate_gols = float(odd_empate_gols)
    total_apostar = float(total_apostar)
    if any(o <= 1 for o in (odd_mandante, odd_visitante, odd_empate_gols)):
        raise ValueError("Todas as odds devem ser maiores que 1")
    if total_apostar <= 0:
        raise ValueError("Total a apostar inválido")
    row = repo.create_partida(user_id, nome, odd_mandante, odd_visitante,
                               odd_empate_gols, total_apostar)
    item = dict(row)
    item["status"] = _surebet_status(odd_mandante, odd_visitante,
                                      odd_empate_gols, total_apostar)
    return item


def update_partida(partida_id: int, user_id: int, nome: str, odd_mandante,
                   odd_visitante, odd_empate_gols, total_apostar) -> dict:
    nome = (nome or "").strip() or "Partida"
    odd_mandante = float(odd_mandante)
    odd_visitante = float(odd_visitante)
    odd_empate_gols = float(odd_empate_gols)
    total_apostar = float(total_apostar)
    if any(o <= 1 for o in (odd_mandante, odd_visitante, odd_empate_gols)):
        raise ValueError("Todas as odds devem ser maiores que 1")
    if total_apostar <= 0:
        raise ValueError("Total a apostar inválido")
    row = repo.update_partida(partida_id, user_id, nome, odd_mandante,
                               odd_visitante, odd_empate_gols, total_apostar)
    if not row:
        raise ValueError("Partida não encontrada")
    item = dict(row)
    item["status"] = _surebet_status(odd_mandante, odd_visitante,
                                      odd_empate_gols, total_apostar)
    return item


def delete_partida(partida_id: int, user_id: int):
    repo.delete_partida(partida_id, user_id)
